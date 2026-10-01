import {
  type AccessContext,
  accessContextSchema,
  accessRecordSchemas,
  agencyCustomerSetupSchema,
  entitySchemas,
  type Membership,
  type Organization,
  type z,
} from "@roaswell/schemas";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { and, eq, sql } from "drizzle-orm";
import type {
  NodePgDatabase,
  NodePgTransaction,
} from "drizzle-orm/node-postgres";
import { accessModels } from "./access-models.js";
import { models } from "./models.js";

export const agencyModels = { ...models, ...accessModels };
export type AccessDatabase = NodePgDatabase<typeof agencyModels>;
export type AccessTransaction = NodePgTransaction<
  typeof agencyModels,
  ExtractTablesWithRelations<typeof agencyModels>
>;

async function checkRole(
  transaction: AccessTransaction,
  expected: "beacon_app" | "beacon_founder",
) {
  const result = await transaction.execute<{
    current_user: string;
    rolsuper: boolean;
    rolbypassrls: boolean;
    rolcreaterole: boolean;
    rolcreatedb: boolean;
    founder_member: boolean;
    app_member: boolean;
  }>(
    sql`SELECT current_user, rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, pg_has_role(current_user, 'beacon_founder', 'MEMBER') AS founder_member, pg_has_role(current_user, 'beacon_app', 'MEMBER') AS app_member FROM pg_roles WHERE rolname=current_user`,
  );
  const role = result.rows[0];
  if (
    !role ||
    role.current_user !== expected ||
    role.rolsuper ||
    role.rolbypassrls ||
    role.rolcreaterole ||
    role.rolcreatedb ||
    (expected === "beacon_app" && role.founder_member) ||
    (expected === "beacon_founder" && role.app_member)
  )
    throw new Error(`Access requires the restricted ${expected} role`);
}

/** Accept only a server-authenticated context. HTTP integration follows in R1-03. */
export async function withAccess<T>(
  database: AccessDatabase,
  input: AccessContext,
  operation: (transaction: AccessTransaction) => Promise<T>,
): Promise<T> {
  const context = accessContextSchema.parse(input);
  return database.transaction(async (transaction) => {
    await checkRole(
      transaction,
      context.view === "agency" ? "beacon_founder" : "beacon_app",
    );
    await transaction.execute(
      sql`SELECT set_config('app.tenant_id', ${context.tenantId}, true), set_config('app.user_id', ${context.userId}, true)`,
    );
    if (context.view === "customer") {
      const rows = await transaction
        .select()
        .from(accessModels.memberships)
        .where(
          and(
            eq(accessModels.memberships.userId, context.userId),
            eq(accessModels.memberships.tenantId, context.tenantId),
          ),
        );
      const member = rows[0] && accessRecordSchemas.memberships.parse(rows[0]);
      if (member?.status !== "active" || member.role !== context.customerRole)
        throw new Error("Active customer membership required");
    } else {
      const rows = await transaction
        .select()
        .from(models.users)
        .where(
          and(
            eq(models.users.tenantId, context.tenantId),
            eq(models.users.id, context.userId),
          ),
        );
      if (rows.length !== 1)
        throw new Error(
          "Founder actor must exist in the selected organization",
        );
    }
    return operation(transaction);
  });
}

/** Explicit operator setup, never a migration seed or public registration action. */
export async function setupAgencyCustomer(
  database: AccessDatabase,
  input: z.input<typeof agencyCustomerSetupSchema>,
): Promise<Organization> {
  const setup = agencyCustomerSetupSchema.parse(input);
  const { organization, user } = setup;
  const membership: Membership = setup.membership;
  if (
    !organization.isAgencyCustomer ||
    organization.phase !== "customer" ||
    user.tenantId !== organization.id ||
    membership.tenantId !== organization.id ||
    membership.userId !== user.id ||
    membership.status !== "active"
  )
    throw new Error(
      "Agency customer setup requires one consistent active customer organization",
    );
  return database.transaction(async (transaction) => {
    await checkRole(transaction, "beacon_founder");
    await transaction.execute(
      sql`SELECT set_config('app.tenant_id', ${organization.id}, true), set_config('app.user_id', ${user.id}, true)`,
    );
    await transaction.insert(models.tenants).values(
      entitySchemas.tenants.parse({
        id: organization.id,
        name: organization.name,
        createdAt: organization.createdAt,
      }),
    );
    await transaction.insert(accessModels.organizations).values(organization);
    await transaction.insert(models.users).values(user);
    await transaction.insert(accessModels.memberships).values(membership);
    await transaction.insert(models.auditLogs).values({
      id: crypto.randomUUID(),
      tenantId: organization.id,
      createdAt: new Date(),
      agentId: null,
      userId: user.id,
      runId: null,
      action: "organization.agency_customer.setup",
      reason: "Explicit operator setup",
      outcome: "succeeded",
      details: {},
    });
    return organization;
  });
}
