import { randomUUID } from "node:crypto";
import {
  type AuthIdentity,
  accessRecordSchemas,
  authorizationAuditDetailsSchema,
  authorizationRecords,
  authorizedCustomerCommandSchema,
  type CustomerCommand,
  type CustomerResponse,
  customerCommandSchema,
  liveOperationContracts,
  wireOrganizationSchema,
  type z,
} from "@roaswell/schemas";
import { and, eq, sql } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { memberships, organizations } from "./access-models.js";
import { authorizationModels } from "./authorization-models.js";
import { createCustomerInTransaction } from "./idempotency.js";
import { models } from "./models.js";
import { type TenantTransaction, withTenant } from "./tenant.js";
export class AuthorizationError extends Error {
  readonly status = 403;
  constructor() {
    super("Access denied");
  }
}
type Details = z.output<typeof authorizationAuditDetailsSchema>;
type Operation = Details["operationId"];
type Verdict = {
  reason: Details["reason"];
  userId: string | null;
  agentId: string | null;
};
const viewFor = (operation: Operation) =>
  operation === "createCustomer" ? ("agency" as const) : ("customer" as const);
async function assess(
  tx: TenantTransaction,
  identity: AuthIdentity,
  operation: Operation,
): Promise<Verdict> {
  const verdict: Verdict = {
    reason: "actor_missing",
    userId: null,
    agentId: null,
  };
  const scopes = liveOperationContracts.find(
    (contract) => contract.operationId === operation,
  )?.scopes;
  if (!scopes) throw new Error("Unknown authorization operation");
  const view = viewFor(operation);
  if (identity.kind === "human") {
    if (view === "agency" && identity.surface === "customer")
      return { ...verdict, reason: "membership_missing" };
    const actor = await tx
      .select()
      .from(models.users)
      .where(
        and(
          eq(models.users.id, identity.actorId),
          eq(models.users.externalSubject, identity.subject),
        ),
      );
    if (actor.length !== 1) return verdict;
    verdict.userId = identity.actorId;
    const table =
      view === "agency" ? authorizationModels.agencyMemberships : memberships;
    const rows = await tx
      .select()
      .from(table)
      .where(eq(table.userId, identity.actorId));
    const member =
      rows[0] &&
      (view === "agency"
        ? authorizationRecords.agencyMemberships
        : accessRecordSchemas.memberships
      ).parse(rows[0]);
    if (member?.status !== "active")
      return { ...verdict, reason: "membership_missing" };
    if (
      view === "agency" &&
      (!("clientId" in member) || member.clientId !== identity.clientId)
    )
      return { ...verdict, reason: "membership_missing" };
  } else {
    const actors = await tx
      .select()
      .from(models.agents)
      .where(eq(models.agents.id, identity.actorId));
    if (actors.length !== 1) return verdict;
    verdict.agentId = identity.actorId;
    if (actors[0].paused) return { ...verdict, reason: "grant_missing" };
    const rows = await tx
      .select()
      .from(authorizationModels.agentGrants)
      .where(eq(authorizationModels.agentGrants.agentId, identity.actorId));
    const grant = rows
      .map((row) => authorizationRecords.agentGrants.parse(row))
      .find(
        (row) =>
          row.status === "active" &&
          row.kind === identity.kind &&
          row.subject === identity.subject &&
          row.clientId === identity.clientId &&
          row.organizationId === (identity.organizationId ?? null) &&
          row.view === view &&
          row.expiresAt.getTime() > Date.now(),
      );
    if (!grant) return { ...verdict, reason: "grant_missing" };
    if (!scopes.every((scope) => grant.scopes.includes(scope)))
      return { ...verdict, reason: "scope_missing" };
  }
  const org = await tx
    .select()
    .from(organizations)
    .where(eq(organizations.id, identity.tenantId));
  if (org.length !== 1 || ["suspended", "archived"].includes(org[0].phase))
    return { ...verdict, reason: "organization_inactive" };
  if (identity.expiresAt <= Date.now() / 1000)
    return { ...verdict, reason: "token_expired" };
  return {
    ...verdict,
    reason: scopes.every((scope) => identity.scopes.includes(scope))
      ? "allowed"
      : "scope_missing",
  };
}
async function audit(
  tx: TenantTransaction,
  identity: AuthIdentity,
  requestId: string,
  operation: Operation,
  verdict: Verdict,
  outcome: "succeeded" | "denied" | "failed",
) {
  if (
    (await tx.select({ id: models.tenants.id }).from(models.tenants)).length !==
    1
  )
    return;
  await tx.insert(models.auditLogs).values({
    id: randomUUID(),
    tenantId: identity.tenantId,
    createdAt: new Date(),
    userId: verdict.userId,
    agentId: verdict.agentId,
    runId: null,
    action: `authorization.${operation}`,
    reason: verdict.reason,
    outcome,
    details: authorizationAuditDetailsSchema.parse({
      requestId,
      actorId: identity.actorId,
      kind: identity.kind,
      operationId: operation,
      view: viewFor(operation),
      reason: verdict.reason,
    }),
  });
}
async function boundary<T>(
  database: NodePgDatabase<typeof models>,
  identity: AuthIdentity,
  operation: (tx: TenantTransaction) => Promise<T>,
) {
  return withTenant(database, identity.tenantId, async (tx) => {
    const role = await tx.execute<{ privileged: boolean }>(
      sql`SELECT pg_has_role(current_user,'beacon_founder','MEMBER') OR rolcreaterole OR rolcreatedb AS privileged FROM pg_roles WHERE rolname=current_user`,
    );
    if (role.rows[0]?.privileged !== false)
      throw new Error("Restricted authorization role required");
    await tx.execute(
      sql`SELECT set_config('lock_timeout','5s',true),set_config('app.actor_id',${identity.actorId},true),set_config('app.user_id',${identity.kind === "human" ? identity.actorId : ""},true)`,
    );
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`roaswell-access/${identity.tenantId}`},0))`,
    );
    return operation(tx);
  });
}
async function runAuthorized<T>(
  database: NodePgDatabase<typeof models>,
  input: z.input<typeof authorizedCustomerCommandSchema>,
  operation: Operation,
  action: (tx: TenantTransaction) => Promise<T>,
): Promise<T> {
  const { identity, requestId } = authorizedCustomerCommandSchema.parse(input);
  let actor: Verdict | undefined;
  try {
    const result = await boundary(database, identity, async (tx) => {
      actor = await assess(tx, identity, operation);
      if (actor.reason !== "allowed") {
        await audit(tx, identity, requestId, operation, actor, "denied");
        return { allowed: false as const };
      }
      const value = await action(tx);
      await audit(tx, identity, requestId, operation, actor, "succeeded");
      return { allowed: true as const, value };
    });
    if (!result.allowed) throw new AuthorizationError();
    return result.value;
  } catch (error) {
    if (!(error instanceof AuthorizationError) && actor?.reason === "allowed")
      await boundary(database, identity, async (tx) => {
        const current = await assess(tx, identity, operation);
        await audit(
          tx,
          identity,
          requestId,
          operation,
          { ...current, reason: "operation_failed" },
          "failed",
        );
      });
    throw error;
  }
}
export async function createAuthorizedCustomer(
  database: NodePgDatabase<typeof models>,
  command: CustomerCommand,
  input: z.input<typeof authorizedCustomerCommandSchema>,
): Promise<CustomerResponse> {
  const parsed = customerCommandSchema.parse(command);
  if (parsed.tenantId !== input.identity.tenantId)
    throw new AuthorizationError();
  return runAuthorized(database, input, "createCustomer", (tx) =>
    createCustomerInTransaction(tx, parsed),
  );
}
export async function readAuthorizedOrganization(
  database: NodePgDatabase<typeof models>,
  input: z.input<typeof authorizedCustomerCommandSchema>,
) {
  return runAuthorized(database, input, "getOrganization", async (tx) => {
    const [row] = await tx
      .select()
      .from(organizations)
      .where(eq(organizations.id, input.identity.tenantId));
    return wireOrganizationSchema.parse(
      JSON.parse(JSON.stringify(accessRecordSchemas.organizations.parse(row))),
    );
  });
}
