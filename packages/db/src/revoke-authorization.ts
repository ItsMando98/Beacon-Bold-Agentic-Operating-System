import { randomUUID } from "node:crypto";
import {
  type AccessContext,
  authorizationChangeDetailsSchema,
  revokeAuthorizationInputSchema,
  type z,
} from "@roaswell/schemas";
import { and, eq, sql } from "drizzle-orm";
import { type AccessDatabase, withAccess } from "./access.js";
import { memberships } from "./access-models.js";
import { authorizationModels } from "./authorization-models.js";
import { models } from "./models.js";
/** Trusted internal operator channel; no remote grant-management route is active. */
export async function revokeAuthorization(
  database: AccessDatabase,
  context: AccessContext,
  input: z.input<typeof revokeAuthorizationInputSchema>,
) {
  const command = revokeAuthorizationInputSchema.parse(input);
  if (context.view !== "agency") throw new Error("Founder context required");
  return withAccess(database, context, async (tx) => {
    await tx.execute(sql`SELECT set_config('lock_timeout','5s',true)`);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtextextended(${`roaswell-access/${context.tenantId}`},0))`,
    );
    const table =
      command.kind === "customer_membership"
        ? memberships
        : command.kind === "agency_membership"
          ? authorizationModels.agencyMemberships
          : authorizationModels.agentGrants;
    const condition = and(
      eq(table.tenantId, context.tenantId),
      eq(table.id, command.id),
    );
    const [target] = await tx
      .select({ status: table.status })
      .from(table)
      .where(condition);
    if (!target) throw new Error("Authorization record not found");
    if (target.status !== "revoked")
      await tx
        .update(table)
        .set({ status: "revoked", revokedAt: new Date() })
        .where(condition);
    await tx.insert(models.auditLogs).values({
      id: randomUUID(),
      tenantId: context.tenantId,
      createdAt: new Date(),
      userId: context.userId,
      agentId: null,
      runId: null,
      action: "authorization.revoke",
      reason: command.reason,
      outcome: "succeeded",
      details: authorizationChangeDetailsSchema.parse({
        ...command,
        operationId: "revokeAuthorization",
      }),
    });
  });
}
