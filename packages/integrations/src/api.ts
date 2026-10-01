import { randomUUID } from "node:crypto";
import {
  createCustomerOnce,
  customerRequestHash,
  IdempotencyConflict,
  models,
} from "@beacon/db";
import {
  type CustomerCommand,
  type CustomerResponse,
  customerCommandSchema,
  wireEntitySchemas,
} from "@beacon/schemas";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export { IdempotencyConflict };
export interface CustomerStore {
  create(command: CustomerCommand): Promise<CustomerResponse>;
  close(): Promise<void>;
}
export function createPostgresCustomerStore(
  connectionString: string,
): CustomerStore {
  const pool = new Pool({ connectionString, max: 5 });
  const database = drizzle(pool, { schema: models });
  return {
    create: (command) => createCustomerOnce(database, command),
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
    async close() {
      records.clear();
    },
  };
}
