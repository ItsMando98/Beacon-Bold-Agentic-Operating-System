import { z } from "zod";
import { agencyRoleSchema, membershipSchema } from "./access.js";
import { authIdentitySchema, authScopeSchema } from "./auth.js";

const id = z.uuid().meta({ storage: "uuid" });
const timestamp = z.date().meta({ storage: "timestamptz" });
const text = z.string().min(1).max(200).meta({ storage: "text" });
const founderRole = agencyRoleSchema.meta({ storage: "text" });
export const agencyMembershipSchema = z.discriminatedUnion("status", [
  membershipSchema.options[0].extend({ role: founderRole, clientId: text }),
  membershipSchema.options[1].extend({ role: founderRole, clientId: text }),
]);
const base = {
  id,
  tenantId: id,
  createdAt: timestamp,
  agentId: id,
  kind: z.enum(["oauth", "m2m"]).meta({ storage: "text" }),
  subject: text,
  clientId: text,
  organizationId: text.nullable().meta({ storage: "text" }),
  view: z.enum(["agency", "customer"]).meta({ storage: "text" }),
  scopes: z.array(authScopeSchema).max(100).meta({ storage: "jsonb" }),
  expiresAt: timestamp,
};
export const agentGrantSchema = z.discriminatedUnion("status", [
  z.strictObject({
    ...base,
    status: z.literal("active").meta({ storage: "text" }),
    revokedAt: z.null().meta({ storage: "timestamptz" }),
  }),
  z.strictObject({
    ...base,
    status: z.literal("revoked").meta({ storage: "text" }),
    revokedAt: timestamp,
  }),
]);
export const authorizationRecords = {
  agencyMemberships: agencyMembershipSchema,
  agentGrants: agentGrantSchema,
};
export const authorizedCustomerCommandSchema = z.strictObject({
  identity: authIdentitySchema,
  requestId: z.uuid(),
});
export const authorizationReasonSchema = z.enum([
  "allowed",
  "actor_missing",
  "organization_inactive",
  "membership_missing",
  "grant_missing",
  "scope_missing",
  "token_expired",
  "operation_failed",
]);
export const authorizationAuditDetailsSchema = z.strictObject({
  requestId: z.uuid(),
  actorId: z.uuid(),
  kind: authIdentitySchema.shape.kind,
  operationId: z.enum(["createCustomer", "getOrganization"]),
  view: z.enum(["agency", "customer"]),
  reason: authorizationReasonSchema,
});
export type AgentGrant = z.output<typeof agentGrantSchema>;
export const revokeAuthorizationInputSchema = z.strictObject({
  kind: z.enum(["customer_membership", "agency_membership", "agent_grant"]),
  id: z.uuid(),
  reason: z.string().trim().min(1).max(200),
});
export const authorizationChangeDetailsSchema =
  revokeAuthorizationInputSchema.extend({
    operationId: z.literal("revokeAuthorization"),
  });
