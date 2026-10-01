import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { expect, it } from "vitest";
import { migrate } from "../../packages/db/migrate.mjs";
import {
  models,
  sqlName,
  tenantReferences,
} from "../../packages/db/src/models.js";
import { withTenant } from "../../packages/db/src/tenant.js";
import {
  type EntityName,
  entitySchemas,
} from "../../packages/schemas/src/index.js";

const names = Object.keys(models) as EntityName[];
const now = new Date("2026-10-01T10:00:00.000Z");
function fixture(tenantId: string, id: string) {
  const base = { id, tenantId, createdAt: now };
  return {
    tenants: { id: tenantId, name: "Fictional tenant", createdAt: now },
    users: {
      ...base,
      name: "Fictional user",
      externalSubject: `fictional-${id}`,
    },
    agents: { ...base, name: "Fictional agent", paused: false },
    agentRuns: {
      ...base,
      agentId: id,
      status: "queued",
      input: {},
      output: null,
      costMinor: 0,
      currency: "EUR",
    },
    auditLogs: {
      ...base,
      agentId: id,
      userId: null,
      runId: id,
      action: "fixture",
      reason: "Synthetic acceptance",
      outcome: "succeeded",
      details: {},
    },
    approvals: {
      ...base,
      agentId: id,
      runId: id,
      requestedByUserId: id,
      decidedByUserId: null,
      reason: "Synthetic request",
      status: "pending",
      amountMinor: 100,
      currency: "EUR",
      expiresAt: new Date("2026-10-02T10:00:00.000Z"),
      decidedAt: null,
    },
    customers: { ...base, name: "Fictional customer" },
    contacts: {
      ...base,
      customerId: id,
      name: "Fictional contact",
      email: "fictional@example.invalid",
    },
    deals: {
      ...base,
      customerId: id,
      name: "Fictional deal",
      status: "open",
      amountMinor: 100,
      currency: "EUR",
    },
    projects: { ...base, customerId: id, name: "Fictional project" },
    tasks: {
      ...base,
      projectId: id,
      assignedAgentId: id,
      assignedUserId: null,
      title: "Fictional task",
      status: "todo",
      dueAt: null,
    },
    assets: {
      ...base,
      projectId: id,
      name: "Fictional asset",
      storageKey: "synthetic/example",
      provenance: {},
    },
    invoices: {
      ...base,
      customerId: id,
      projectId: id,
      amountMinor: 100,
      currency: "EUR",
      status: "draft",
    },
  };
}
function insert(
  client: Client,
  name: EntityName,
  row: Record<string, unknown>,
) {
  const keys = Object.keys(row);
  return client.query(
    `INSERT INTO beacon."${sqlName(name)}" (${keys.map((key) => `"${sqlName(key)}"`).join(",")}) VALUES (${keys.map((_, index) => `$${index + 1}`).join(",")})`,
    Object.values(row),
  );
}
async function denied(
  client: Client,
  operation: () => Promise<unknown>,
  code = "42501",
) {
  await client.query("SAVEPOINT denied_operation");
  await expect(operation()).rejects.toMatchObject({ code });
  await client.query("ROLLBACK TO SAVEPOINT denied_operation");
}

it("migrates all 13 real models and isolates every read, write and relationship", async () => {
  // Fixed local development endpoint; no environment override can target customer/staging data.
  const databaseName = `beacon_model_${randomUUID().replaceAll("-", "")}`;
  const owner = "postgresql://beacon_owner:local-owner-only@127.0.0.1:15432/";
  const administrator = new Client({ connectionString: `${owner}beacon` });
  const migrationClient = new Client({
    connectionString: `${owner}${databaseName}`,
  });
  const appUrl = `postgresql://beacon_app:local-development-only@127.0.0.1:15432/${databaseName}`;
  const client = new Client({ connectionString: appUrl });
  const pool = new Pool({ connectionString: appUrl, max: 1 });
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const idA = randomUUID();
  const idB = randomUUID();
  const a = fixture(tenantA, idA);
  const b = fixture(tenantB, idB);
  await administrator.connect();
  try {
    await administrator.query(`CREATE DATABASE "${databaseName}"`);
    await migrationClient.connect();
    await migrate(migrationClient, "packages/db/migrations");
    await migrate(migrationClient, "packages/db/migrations");
    const flags = await migrationClient.query(
      "SELECT relname, relrowsecurity, relforcerowsecurity FROM pg_class JOIN pg_namespace n ON n.oid=relnamespace WHERE n.nspname='beacon' AND relkind='r' ORDER BY relname",
    );
    expect(flags.rows).toHaveLength(13);
    expect(
      flags.rows.every((row) => row.relrowsecurity && row.relforcerowsecurity),
    ).toBe(true);
    const keys = await migrationClient.query(
      "SELECT count(*)::int AS count FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='beacon' AND c.contype='f'",
    );
    expect(keys.rows[0].count).toBe(12 + tenantReferences.length);
    for (const name of names) {
      entitySchemas[name].parse(a[name]);
      entitySchemas[name].parse(b[name]);
      await insert(migrationClient, name, a[name]);
      await insert(migrationClient, name, b[name]);
    }
    await client.connect();
    await client.query("BEGIN");
    for (const name of names) {
      expect(
        (await client.query(`SELECT * FROM beacon."${sqlName(name)}"`)).rows,
      ).toHaveLength(0);
      await denied(client, () =>
        insert(client, name, { ...a[name], id: randomUUID() }),
      );
    }
    await client.query("SELECT set_config('app.tenant_id',$1,true)", [tenantA]);
    for (const name of names) {
      const table = `beacon."${sqlName(name)}"`;
      const tenantColumn = name === "tenants" ? "id" : "tenant_id";
      const rows = await client.query(`SELECT * FROM ${table}`);
      expect(rows.rows).toHaveLength(1);
      expect(rows.rows[0][tenantColumn]).toBe(tenantA);
      if (name !== "tenants") {
        await client.query("SAVEPOINT own_insert");
        expect(
          (await insert(client, name, { ...a[name], id: randomUUID() }))
            .rowCount,
        ).toBe(1);
        await client.query("ROLLBACK TO SAVEPOINT own_insert");
      }
      await denied(client, () =>
        insert(client, name, { ...b[name], id: randomUUID() }),
      );
      if (name === "auditLogs") {
        await denied(client, () =>
          client.query(`UPDATE ${table} SET action='tampered'`),
        );
        await denied(client, () => client.query(`DELETE FROM ${table}`));
      } else {
        expect(
          (await client.query(`UPDATE ${table} SET created_at=$1`, [now]))
            .rowCount,
        ).toBe(1);
        expect(
          (
            await client.query(
              `UPDATE ${table} SET created_at=$1 WHERE "${tenantColumn}"=$2`,
              [now, tenantB],
            )
          ).rowCount,
        ).toBe(0);
        expect(
          (
            await client.query(
              `DELETE FROM ${table} WHERE "${tenantColumn}"=$1`,
              [tenantB],
            )
          ).rowCount,
        ).toBe(0);
        await denied(client, () =>
          client.query(`UPDATE ${table} SET "${tenantColumn}"=$1`, [
            randomUUID(),
          ]),
        );
      }
    }
    for (const [name, field] of tenantReferences) {
      await denied(
        client,
        () =>
          insert(client, name, { ...a[name], id: randomUUID(), [field]: idB }),
        "23503",
      );
    }
    await denied(
      client,
      () =>
        insert(client, "invoices", {
          ...a.invoices,
          id: randomUUID(),
          amountMinor: -1,
        }),
      "23514",
    );
    await denied(
      client,
      () =>
        insert(client, "invoices", {
          ...a.invoices,
          id: randomUUID(),
          currency: "eur",
        }),
      "23514",
    );
    await denied(
      client,
      () =>
        insert(client, "invoices", {
          ...a.invoices,
          id: randomUUID(),
          status: "paid",
        }),
      "23514",
    );
    await denied(client, () => client.query("TRUNCATE beacon.customers"));
    await denied(client, () =>
      client.query("ALTER TABLE beacon.customers DISABLE ROW LEVEL SECURITY"),
    );
    await client.query("ROLLBACK");

    const database = drizzle(pool, { schema: models });
    for (const [tenant, id] of [
      [tenantA, idA],
      [tenantB, idB],
    ]) {
      const selected = await withTenant(database, tenant, (transaction) =>
        transaction.select().from(models.customers),
      );
      expect(selected).toEqual([
        a.customers.tenantId === tenant ? a.customers : b.customers,
      ]);
      expect(selected[0].id).toBe(id);
      const joined = await withTenant(database, tenant, (transaction) =>
        transaction.execute(
          sql`SELECT c.tenant_id FROM beacon.customers c JOIN beacon.projects p ON c.id=p.customer_id AND c.tenant_id=p.tenant_id`,
        ),
      );
      expect(joined.rows).toEqual([{ tenant_id: tenant }]);
    }
    expect(await database.select().from(models.customers)).toEqual([]);
    await expect(
      withTenant(database, tenantA, async () => {
        throw new Error("synthetic rollback");
      }),
    ).rejects.toThrow("synthetic rollback");
    expect(await database.select().from(models.customers)).toEqual([]);
    await expect(
      withTenant(database, "invalid", async () => undefined),
    ).rejects.toThrow();
    await expect(
      withTenant(
        drizzle(migrationClient, { schema: models }),
        tenantA,
        async () => undefined,
      ),
    ).rejects.toThrow("restricted beacon_app");
    // Successful writes and deletes must remain possible inside the authenticated tenant.
    await withTenant(database, tenantA, async (transaction) => {
      const customer = { ...a.customers, id: randomUUID() };
      await transaction.insert(models.customers).values(customer);
      await transaction.execute(
        sql`DELETE FROM beacon.customers WHERE id=${customer.id}`,
      );
    });
  } finally {
    await client.end();
    await pool.end();
    await migrationClient.end();
    await administrator.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await administrator.end();
  }
}, 60000);
