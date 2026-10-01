import { randomUUID } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { Client } from "pg";
import { expect, it } from "vitest";
import { migrate } from "../../packages/db/migrate.mjs";

it("records each forward migration once and rejects changed or missing history", async () => {
  const database = `beacon_migration_${randomUUID().replaceAll("-", "")}`;
  const ownerUrl =
    "postgresql://beacon_owner:local-owner-only@127.0.0.1:15432/";
  const administrator = new Client({ connectionString: `${ownerUrl}beacon` });
  const client = new Client({ connectionString: `${ownerUrl}${database}` });
  await administrator.connect();
  try {
    await administrator.query(`CREATE DATABASE "${database}"`);
    await client.connect();
    await migrate(client, "packages/db/migrations");
    await migrate(client, "packages/db/migrations");
    const rows = await client.query(
      "SELECT checksum FROM beacon_meta.migrations ORDER BY name",
    );
    const migrationNames = (await readdir("packages/db/migrations")).filter(
      (name) => /^\d{4}_[a-z_]+\.sql$/.test(name),
    );
    expect(rows.rows).toHaveLength(migrationNames.length);
    await client.query(
      "UPDATE beacon_meta.migrations SET checksum='fictional-change' WHERE name='0001_foundation.sql'",
    );
    await expect(migrate(client, "packages/db/migrations")).rejects.toThrow(
      "Applied migration changed",
    );
    await client.query(
      "UPDATE beacon_meta.migrations SET checksum=$1 WHERE name='0001_foundation.sql'",
      [rows.rows[0].checksum],
    );
    await client.query(
      "INSERT INTO beacon_meta.migrations(name,checksum) VALUES ('9999_missing.sql','fictional')",
    );
    await expect(migrate(client, "packages/db/migrations")).rejects.toThrow(
      "Applied migration missing",
    );
  } finally {
    await client.end();
    // The quoted identifier is generated exclusively from UUID hex, never user input.
    await administrator.query(`DROP DATABASE IF EXISTS "${database}"`);
    await administrator.end();
  }
});

it("runs foundation forward and enforces tenant isolation on a disposable fixture", async () => {
  // Synthetic local owner only; never point this test at staging or a customer DB.
  const client = new Client({
    connectionString:
      "postgresql://beacon_owner:local-owner-only@127.0.0.1:15432/beacon",
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      await readFile("packages/db/migrations/0001_foundation.sql", "utf8"),
    );
    await client.query(
      await readFile("packages/db/migrations/0001_foundation.sql", "utf8"),
    );
    await client.query(`CREATE TABLE beacon.tenant_probe (
      tenant_id uuid NOT NULL, value text NOT NULL
    );
    ALTER TABLE beacon.tenant_probe ENABLE ROW LEVEL SECURITY;
    ALTER TABLE beacon.tenant_probe FORCE ROW LEVEL SECURITY;
    CREATE POLICY tenant_probe ON beacon.tenant_probe
      USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
      WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);
    GRANT SELECT, INSERT ON beacon.tenant_probe TO beacon_app;
    INSERT INTO beacon.tenant_probe VALUES
      ('00000000-0000-0000-0000-000000000001', 'fictional-a'),
      ('00000000-0000-0000-0000-000000000002', 'fictional-b');
    SET LOCAL ROLE beacon_app;`);
    expect(
      (await client.query("SELECT * FROM beacon.tenant_probe")).rows,
    ).toHaveLength(0);
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [
      "00000000-0000-0000-0000-000000000001",
    ]);
    expect(
      (await client.query("SELECT value FROM beacon.tenant_probe")).rows,
    ).toEqual([{ value: "fictional-a" }]);
    await client.query("SAVEPOINT denied_insert");
    await expect(
      client.query(
        "INSERT INTO beacon.tenant_probe VALUES ('00000000-0000-0000-0000-000000000002','forbidden')",
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await client.query("ROLLBACK TO SAVEPOINT denied_insert");
    const role = await client.query(
      "SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname=current_user",
    );
    expect(role.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
