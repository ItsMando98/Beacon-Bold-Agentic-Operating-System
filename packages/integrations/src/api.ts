import { randomUUID } from "node:crypto";
import {
  AuthorizationError,
  createAuthorizedCustomer,
  createCustomerOnce,
  customerRequestHash,
  IdempotencyConflict,
  models,
  readAuthorizedOrganization,
  withTenant,
} from "@roaswell/db";
import {
  type AuthIdentity,
  type CustomerCommand,
  type CustomerResponse,
  customerCommandSchema,
  wireEntitySchemas,
  type wireOrganizationSchema,
  type z,
} from "@roaswell/schemas";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export { AuthorizationError, IdempotencyConflict };
export interface CustomerStore {
  getOrganization?(
    identity: AuthIdentity,
    requestId: string,
  ): Promise<z.output<typeof wireOrganizationSchema>>;
  create(command: CustomerCommand): Promise<CustomerResponse>;
  close(): Promise<void>;
  verifyIdentity(identity: AuthIdentity): Promise<boolean>;
  createAuthorized?(
    command: CustomerCommand,
    identity: AuthIdentity,
    requestId: string,
  ): Promise<CustomerResponse>;
}
export function createPostgresCustomerStore(
  connectionString: string,
): CustomerStore {
  const pool = new Pool({ connectionString, max: 5 });
  const database = drizzle(pool, { schema: models });
  return {
    getOrganization: (identity, requestId) =>
      readAuthorizedOrganization(database, { identity, requestId }),
    create: (command) => createCustomerOnce(database, command),
    createAuthorized: (command, identity, requestId) =>
      createAuthorizedCustomer(database, command, { identity, requestId }),
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
  const store: CustomerStore = {
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
  store.createAuthorized = async (command, identity) => {
    // Explicit development fixture only. Live authorization always uses PostgreSQL.
    if (
      command.tenantId !== identity.tenantId ||
      !identity.scopes.includes("customers:write")
    )
      throw new AuthorizationError();
    return store.create(command);
  };
  return store;
}
