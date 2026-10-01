import { randomUUID } from "node:crypto";
import {
  createCustomerOnce,
  customerRequestHash,
  IdempotencyConflict,
  models,
  withTenant,
} from "@roaswell/db";
import {
  type AuthIdentity,
  type CustomerCommand,
  type CustomerResponse,
  customerCommandSchema,
  wireEntitySchemas,
} from "@roaswell/schemas";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export { IdempotencyConflict };
export interface CustomerStore {
  create(command: CustomerCommand): Promise<CustomerResponse>;
  close(): Promise<void>;
  verifyIdentity(identity: AuthIdentity): Promise<boolean>;
}
export function createPostgresCustomerStore(
  connectionString: string,
): CustomerStore {
  const pool = new Pool({ connectionString, max: 5 });
  const database = drizzle(pool, { schema: models });
  return {
    create: (command) => createCustomerOnce(database, command),
    verifyIdentity: (identity) =>
      withTenant(database, identity.tenantId, async (tx) => {
        if (identity.kind === "human") {
          const rows = await tx
            .select({ id: models.users.id })
            .from(models.users)
            .where(
              and(
                eq(models.users.id, identity.actorId),
                eq(models.users.externalSubject, identity.subject),
              ),
            )
            .limit(1);
          return rows.length === 1;
        }
        const rows = await tx
          .select({ id: models.agents.id })
          .from(models.agents)
          .where(
            and(
              eq(models.agents.id, identity.actorId),
              eq(models.agents.paused, false),
            ),
          )
          .limit(1);
        return rows.length === 1;
      }),
    close: () => pool.end(),
  };
}
/** Development only: no network or real customer accounts. */
export function createMemoryCustomerStore(): CustomerStore {
  const records = new Map<
    string,
    { hash: string; response: CustomerResponse }
  >();
  return {
    async create(command) {
      const parsed = customerCommandSchema.parse(command);
      const key = JSON.stringify([
        parsed.tenantId,
        "createCustomer",
        parsed.key,
      ]);
      const hash = customerRequestHash(parsed.input);
      const previous = records.get(key);
      if (previous) {
        if (previous.hash !== hash) throw new IdempotencyConflict();
        return structuredClone(previous.response);
      }
      const response = wireEntitySchemas.customers.parse({
        id: randomUUID(),
        tenantId: parsed.tenantId,
        name: parsed.input.name,
        createdAt: new Date().toISOString(),
      });
      records.set(key, { hash, response });
      return structuredClone(response);
    },
    async verifyIdentity() {
      return true;
    },
    async close() {
      records.clear();
    },
  };
}
