import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, test } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import { migrate } from "../../packages/db/migrate.mjs";
import { createPostgresCustomerStore } from "../../packages/integrations/src/api.js";
import {
  apiErrorSchema,
  wireEntitySchemas,
} from "../../packages/schemas/src/index.js";

test("HTTP customer creation is atomic, persistent and isolated by tenant on real PostgreSQL", async () => {
  const databaseName = `beacon_api_${randomUUID().replaceAll("-", "")}`;
  const owner = "postgresql://beacon_owner:local-owner-only@127.0.0.1:15432/";
  const admin = new Client({ connectionString: `${owner}beacon` });
  const migration = new Client({ connectionString: owner + databaseName });
  const appUrl = `postgresql://beacon_app:local-development-only@127.0.0.1:15432/${databaseName}`;
  const tenantA = randomUUID(),
    tenantB = randomUUID();
  const stores: ReturnType<typeof createPostgresCustomerStore>[] = [];
  const restricted = new Client({ connectionString: appUrl });
  const makeApp = (tenantId: string) => {
    const store = createPostgresCustomerStore(appUrl);
    stores.push(store);
    return createApp({ store, resolveTenant: async () => tenantId });
  };
  const request = (name = "Invented Customer") => ({
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": "persistent-key-001",
    },
    body: JSON.stringify({ name }),
  });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    await migration.connect();
    await migrate(migration, "packages/db/migrations");
    await migrate(migration, "packages/db/migrations");
    await migration.query(
      "INSERT INTO beacon.tenants (id,name,created_at) VALUES ($1,'Invented A',now()),($2,'Invented B',now())",
      [tenantA, tenantB],
    );
    const appA = makeApp(tenantA),
      appB = makeApp(tenantB);
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => appA.request("/customers", request())),
    );
    expect(responses.every((response) => response.status === 201)).toBe(true);
    const customers = await Promise.all(
      responses.map(async (response) =>
        wireEntitySchemas.customers.parse(await response.json()),
      ),
    );
    expect(new Set(customers.map((customer) => customer.id)).size).toBe(1);
    expect(customers[0].tenantId).toBe(tenantA);
    const restartedApp = makeApp(tenantA);
    const replay = await restartedApp.request("/customers", request());
    expect(await replay.json()).toEqual(customers[0]);
    const conflict = await restartedApp.request(
      "/customers",
      request("Different Customer"),
    );
    expect(conflict.status).toBe(409);
    expect(apiErrorSchema.parse(await conflict.json()).error.code).toBe(
      "CONFLICT",
    );
    const other = wireEntitySchemas.customers.parse(
      await (await appB.request("/customers", request())).json(),
    );
    expect(other.tenantId).toBe(tenantB);
    expect(other.id).not.toBe(customers[0].id);
    expect(
      (
        await migration.query(
          "SELECT count(*)::int AS count FROM beacon.customers",
        )
      ).rows[0].count,
    ).toBe(2);
    expect(
      (
        await migration.query(
          "SELECT count(*)::int AS count FROM beacon.idempotency",
        )
      ).rows[0].count,
    ).toBe(2);
    await restricted.connect();
    expect(
      (await restricted.query("SELECT * FROM beacon.idempotency")).rows,
    ).toEqual([]);
    await restricted.query("BEGIN");
    await restricted.query("SELECT set_config('app.tenant_id',$1,true)", [
      tenantA,
    ]);
    expect(
      (await restricted.query("SELECT tenant_id FROM beacon.idempotency")).rows,
    ).toEqual([{ tenant_id: tenantA }]);
    await restricted.query("SAVEPOINT foreign_write");
    await expect(
      restricted.query(
        "INSERT INTO beacon.idempotency SELECT $1, operation, key, request_hash, response, created_at FROM beacon.idempotency",
        [tenantB],
      ),
    ).rejects.toMatchObject({ code: "42501" });
    await restricted.query("ROLLBACK TO SAVEPOINT foreign_write");
    await restricted.query("SAVEPOINT immutable");
    await expect(
      restricted.query("DELETE FROM beacon.idempotency"),
    ).rejects.toMatchObject({ code: "42501" });
    await restricted.query("ROLLBACK TO SAVEPOINT immutable");
    await restricted.query("COMMIT");
    expect(
      (await restricted.query("SELECT * FROM beacon.idempotency")).rows,
    ).toEqual([]);
    // An insert failure rolls the customer back together with its response ledger.
    await migration.query(
      "CREATE FUNCTION beacon.reject_test_ledger() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'synthetic failure'; END $$",
    );
    await migration.query(
      "CREATE TRIGGER test_reject_ledger BEFORE INSERT ON beacon.idempotency FOR EACH ROW EXECUTE FUNCTION beacon.reject_test_ledger()",
    );
    const failed = await appA.request("/customers", {
      ...request(),
      headers: { ...request().headers, "idempotency-key": "rollback-key-001" },
    });
    expect(failed.status).toBe(500);
    expect(
      (
        await migration.query(
          "SELECT count(*)::int AS count FROM beacon.customers",
        )
      ).rows[0].count,
    ).toBe(2);
    await migration.query(
      "DROP TRIGGER test_reject_ledger ON beacon.idempotency",
    );
    const retried = await appA.request("/customers", {
      ...request(),
      headers: { ...request().headers, "idempotency-key": "rollback-key-001" },
    });
    expect(retried.status).toBe(201);
    expect(
      (
        await migration.query(
          "SELECT count(*)::int AS count FROM beacon.customers",
        )
      ).rows[0].count,
    ).toBe(3);
  } finally {
    await Promise.all(stores.map((store) => store.close()));
    await restricted.end();
    await migration.end();
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
    await admin.end();
  }
}, 30_000);
