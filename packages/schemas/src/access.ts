import { z } from "zod";
import { entitySchemas } from "./domain.js";
import { toWireSchema } from "./wire.js";

const id = z.uuid().meta({ storage: "uuid" });
const text = z.string().trim().min(1).max(2000).meta({ storage: "text" });
const timestamp = z.date().meta({ storage: "timestamptz" });
const version = z
  .number()
  .int()
  .min(1)
  .max(2147483647)
  .meta({ storage: "integer" });
const base = { id, tenantId: id, createdAt: timestamp };

export const organizationPhaseSchema = z.enum([
  "prospect",
  "customer",
  "suspended",
  "archived",
]);
export const customerRoleSchema = z.enum(["customer_admin", "customer_member"]);
export const agencyRoleSchema = z.literal("founder");
export const visibilitySchema = z.enum(["internal", "customer"]);
export const resultKindSchema = z.enum([
  "project_progress",
  "analysis",
  "report",
  "offer",
  "external_content",
  "campaign",
  "internal_note",
  "calculation",
]);

// Organization IDs are existing tenant IDs, not a second isolation boundary.
export const organizationSchema = entitySchemas.tenants.extend({
  phase: organizationPhaseSchema.meta({ storage: "text" }),
  isAgencyCustomer: z.boolean().meta({ storage: "boolean" }),
});
export const membershipSchema = z.discriminatedUnion("status", [
  z.strictObject({
    ...base,
    userId: id,
    role: customerRoleSchema.meta({ storage: "text" }),
    status: z.literal("active").meta({ storage: "text" }),
    revokedAt: z.null().meta({ storage: "timestamptz" }),
  }),
  z.strictObject({
    ...base,
    userId: id,
    role: customerRoleSchema.meta({ storage: "text" }),
    status: z.literal("revoked").meta({ storage: "text" }),
    revokedAt: timestamp,
  }),
]);
export const accessContextSchema = z.discriminatedUnion("view", [
  z.strictObject({
    view: z.literal("agency"),
    tenantId: id,
    userId: id,
    agencyRole: agencyRoleSchema,
  }),
  z.strictObject({
    view: z.literal("customer"),
    tenantId: id,
    userId: id,
    customerRole: customerRoleSchema,
  }),
]);

export const resultReferenceSchema = z.strictObject({
  kind: resultKindSchema,
  recordId: id,
  version,
});
export const resultVisibilitySchema = z.discriminatedUnion("visibility", [
  z.strictObject({
    tenantId: id,
    target: resultReferenceSchema,
    visibility: z.literal("internal"),
  }),
  z.strictObject({
    tenantId: id,
    target: resultReferenceSchema.extend({
      kind: resultKindSchema.exclude(["internal_note", "calculation"]),
    }),
    visibility: z.literal("customer"),
  }),
]);
export const approvalKindSchema = z.enum([
  "offer_publication",
  "external_publication",
  "customer_review",
]);
export const approvalTargetSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("offer_publication"),
    target: resultReferenceSchema.extend({ kind: z.literal("offer") }),
  }),
  z.strictObject({
    kind: z.literal("external_publication"),
    target: resultReferenceSchema.extend({
      kind: z.enum(["external_content", "campaign"]),
    }),
  }),
  z.strictObject({
    kind: z.literal("customer_review"),
    target: resultReferenceSchema.extend({
      kind: z.enum(["external_content", "campaign"]),
    }),
  }),
]);
const requester = z
  .discriminatedUnion("kind", [
    z.strictObject({ kind: z.literal("human"), userId: id }),
    z.strictObject({ kind: z.literal("agent"), agentId: id }),
  ])
  .meta({ storage: "jsonb" });
const approvalBase = {
  ...base,
  publication: approvalTargetSchema.meta({ storage: "jsonb" }),
  requestedBy: requester,
  reason: text,
  expiresAt: timestamp,
};
const decision = z
  .strictObject({
    userId: id,
    reason: text,
  })
  .meta({ storage: "jsonb" });

// Literal states keep required actor/closure fields in generated JSON schemas too.
export const versionApprovalSchema = z.discriminatedUnion("status", [
  z.strictObject({
    ...approvalBase,
    status: z.literal("pending").meta({ storage: "text" }),
    closedAt: z.null().meta({ storage: "timestamptz" }),
    decision: z.null().meta({ storage: "jsonb" }),
  }),
  z.strictObject({
    ...approvalBase,
    status: z
      .enum(["approved", "rejected", "revoked"])
      .meta({ storage: "text" }),
    closedAt: timestamp,
    decision,
  }),
  z.strictObject({
    ...approvalBase,
    status: z.literal("expired").meta({ storage: "text" }),
    closedAt: timestamp,
    decision: z.null().meta({ storage: "jsonb" }),
  }),
]);

// Caller inputs omit organisation, actor, persisted status and timestamps.
export const grantMembershipInputSchema = z.strictObject({
  userId: id,
  role: customerRoleSchema,
});
export const requestVersionApprovalInputSchema = z.strictObject({
  publication: approvalTargetSchema,
  reason: text,
});
export const decideVersionApprovalInputSchema = z.strictObject({
  approvalId: id,
  targetVersion: version,
  decision: z.enum(["approved", "rejected"]),
  reason: text,
});
export const listAccessInputSchema = z.strictObject({
  cursor: z.uuid().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

export const accessRecordSchemas = {
  organizations: organizationSchema,
  memberships: membershipSchema,
  versionApprovals: versionApprovalSchema,
} as const;
// Trusted operator setup only; never a public registration command or MCP tool.
export const agencyCustomerSetupSchema = z.strictObject({
  organization: organizationSchema,
  user: entitySchemas.users,
  membership: membershipSchema,
});
export const wireOrganizationSchema = toWireSchema(organizationSchema);
export const wireMembershipSchema = toWireSchema(membershipSchema);
export const wireVersionApprovalSchema = toWireSchema(versionApprovalSchema);

export type Organization = z.output<typeof organizationSchema>;
export type Membership = z.output<typeof membershipSchema>;
export type AccessContext = z.output<typeof accessContextSchema>;
export type ResultReference = z.output<typeof resultReferenceSchema>;
export type VersionApproval = z.output<typeof versionApprovalSchema>;
