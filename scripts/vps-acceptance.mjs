import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { createClient } from "redis";
import { migrationEnvironmentSchema } from "../packages/schemas/src/index.ts";
import { hydrateSecrets } from "./secret-files.mjs";

async function main() {
  await hydrateSecrets(process.env);
  migrationEnvironmentSchema.parse(process.env);
  const database = new Client({ ssl: false, connectionTimeoutMillis: 10000 });
  const cache = createClient({
    url: (await readFile("/run/secrets/redis_url", "utf8")).trim(),
    socket: {
      tls: true,
      ca: await readFile("/run/secrets/redis_ca"),
      rejectUnauthorized: true,
      connectTimeout: 10000,
    },
  });
  cache.on("error", () => {});
  try {
    await database.connect();
    const ledger = await database.query(
      "SELECT name FROM beacon_meta.migrations",
    );
    assert.equal(ledger.rows.length, 1);
    await database.query("BEGIN");
    await database.query(`CREATE TABLE beacon.staging_tenant_probe (tenant_id uuid NOT NULL, value text NOT NULL);
    ALTER TABLE beacon.staging_tenant_probe ENABLE ROW LEVEL SECURITY;
    ALTER TABLE beacon.staging_tenant_probe FORCE ROW LEVEL SECURITY;
    CREATE POLICY tenant_probe ON beacon.staging_tenant_probe
      USING (tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id',true),'')::uuid);
    GRANT SELECT, INSERT ON beacon.staging_tenant_probe TO beacon_app;
    INSERT INTO beacon.staging_tenant_probe VALUES ('00000000-0000-0000-0000-000000000001','fictional-a'),('00000000-0000-0000-0000-000000000002','fictional-b');
    SET LOCAL ROLE beacon_app;`);
    assert.equal(
      (await database.query("SELECT * FROM beacon.staging_tenant_probe")).rows
        .length,
      0,
    );
    await database.query("SELECT set_config('app.tenant_id',$1,true)", [
      "00000000-0000-0000-0000-000000000001",
    ]);
    assert.deepEqual(
      (await database.query("SELECT value FROM beacon.staging_tenant_probe"))
        .rows,
      [{ value: "fictional-a" }],
    );
    await database.query("SAVEPOINT denied_write");
    await assert.rejects(
      database.query(
        "INSERT INTO beacon.staging_tenant_probe VALUES ('00000000-0000-0000-0000-000000000002','forbidden')",
      ),
      { code: "42501" },
    );
    await database.query("ROLLBACK TO SAVEPOINT denied_write");
    const role = await database.query(
      "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
    );
    assert.deepEqual(role.rows[0], { rolsuper: false, rolbypassrls: false });
    await database.query("ROLLBACK");
    await cache.connect();
    assert.equal(await cache.ping(), "PONG");
    console.log(
      "VPS acceptance passed: migration ledger, tenant isolation, restricted role, verified Redis TLS",
    );
  } catch {
    console.error("VPS acceptance failed; inspect staging privately");
    process.exitCode = 1;
  } finally {
    await database.end();
    if (cache.isOpen) await cache.destroy();
  }
}
main().catch(() => {
  console.error("VPS acceptance configuration failed");
  process.exitCode = 1;
});
