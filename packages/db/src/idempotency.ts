import { createHash, randomUUID } from "node:crypto";
import {
  type CustomerCommand,
  customerCommandSchema,
  idempotencyRecordSchema,
  serializeEntity,
} from "@roaswell/schemas";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import {
  foreignKey,
  getTableConfig,
  pgPolicy,
  pgRole,
  pgSchema,
  primaryKey,
} from "drizzle-orm/pg-core";
import { columns, models } from "./models.js";
import { withTenant } from "./tenant.js";

export const idempotency = pgSchema("beacon")
  .table("idempotency", columns(idempotencyRecordSchema.shape), (table) => {
    const predicate = sql`${table.tenantId} = NULLIF(current_setting('app.tenant_id', true), '')::uuid`;
    return [
      primaryKey({ columns: [table.tenantId, table.operation, table.key] }),
      foreignKey({
        columns: [table.tenantId],
        foreignColumns: [models.tenants.id],
      }),
      pgPolicy("tenant_isolation", {
        to: pgRole("beacon_app").existing(),
        for: "all",
        using: predicate,
        withCheck: predicate,
      }),
    ];
  })
  .enableRLS();
export class IdempotencyConflict extends Error {
  constructor() {
    super("Idempotency key already used for a different request");
  }
}
export function customerRequestHash(input: CustomerCommand["input"]) {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}
export async function createCustomerOnce(
  database: NodePgDatabase<typeof models>,
  command: CustomerCommand,
) {
  const parsed = customerCommandSchema.parse(command);
  const requestHash = customerRequestHash(parsed.input);
  return withTenant(database, parsed.tenantId, async (transaction) => {
    await transaction.execute(
      sql`SELECT set_config('lock_timeout', '5s', true)`,
    );
    await transaction.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${JSON.stringify([parsed.tenantId, "createCustomer", parsed.key])}, 0))`,
    );
    const [existing] = await transaction
      .select()
      .from(idempotency)
      .where(
        and(
          eq(idempotency.tenantId, parsed.tenantId),
          eq(idempotency.operation, "createCustomer"),
          eq(idempotency.key, parsed.key),
        ),
      );
    if (existing) {
      if (existing.requestHash !== requestHash) throw new IdempotencyConflict();
      return idempotencyRecordSchema.parse(existing).response;
    }
    const [created] = await transaction
      .insert(models.customers)
      .values({
        id: randomUUID(),
        tenantId: parsed.tenantId,
        createdAt: new Date(),
        name: parsed.input.name,
      })
      .returning();
    const response = serializeEntity("customers", created);
    await transaction.insert(idempotency).values({
      tenantId: parsed.tenantId,
      operation: "createCustomer",
      key: parsed.key,
      requestHash,
      response,
      createdAt: new Date(),
    });
    return response;
  });
}
export function renderIdempotencyMigration() {
  const config = getTableConfig(idempotency);
  const definitions = config.columns.map(
    (column) =>
      `"${column.name}" ${column.getSQLType()}${column.notNull ? " NOT NULL" : ""}`,
  );
  return `${[
    "-- P1-3: schema-derived append-only idempotency ledger. Forward migration only.",
    `CREATE TABLE "beacon"."idempotency" (\n  ${definitions.join(",\n  ")},\n  PRIMARY KEY ("tenant_id", "operation", "key"),\n  FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id")\n);`,
    'ALTER TABLE "beacon"."idempotency" ENABLE ROW LEVEL SECURITY;',
    'ALTER TABLE "beacon"."idempotency" FORCE ROW LEVEL SECURITY;',
    `CREATE POLICY "tenant_isolation" ON "beacon"."idempotency" TO "beacon_app" USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);`,
    'GRANT SELECT, INSERT ON "beacon"."idempotency" TO "beacon_app";',
  ].join("\n\n")}\n`;
}
