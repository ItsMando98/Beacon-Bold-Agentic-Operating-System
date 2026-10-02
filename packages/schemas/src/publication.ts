import { z } from "zod";
import {
  accessContextSchema,
  customerRoleSchema,
  decideVersionApprovalInputSchema,
  resultReferenceSchema,
  versionApprovalSchema,
  visibilitySchema,
} from "./access.js";

const text = z.string().trim().min(1).max(2000);
const customerTarget = resultReferenceSchema.extend({
  kind: resultReferenceSchema.shape.kind.exclude([
    "internal_note",
    "calculation",
  ]),
});
// Trusted service envelopes, not public mutation contracts or a persistence model.
export const resultSnapshotSchema = z.strictObject({
  tenantId: z.uuid(),
  target: resultReferenceSchema,
  createdAt: z.date(),
  visibility: visibilitySchema,
  title: text,
  summary: text,
  internal: z.record(z.string(), z.json()),
  requiresCustomerReview: z.boolean(),
});
export const reviseResultInputSchema = resultSnapshotSchema.pick({
  visibility: true,
  title: true,
  summary: true,
  internal: true,
  requiresCustomerReview: true,
});
export const qualityEvidenceSchema = z.strictObject({
  tenantId: z.uuid(),
  target: resultReferenceSchema,
  status: z.enum(["pending", "passed", "failed"]),
  checkedAt: z.date(),
});
// A trusted repository must attest the decider's role; an approval alone is insufficient.
export const decisionActorSchema = z.strictObject({
  tenantId: z.uuid(),
  userId: z.uuid(),
  role: z.enum(["founder", ...customerRoleSchema.options]),
});
export const publicationEvidenceSchema = z
  .strictObject({
    now: z.date(),
    approvals: z.array(versionApprovalSchema).max(1000),
    decisionActors: z.array(decisionActorSchema).max(1000),
    quality: z.array(qualityEvidenceSchema).max(1000),
  })
  .superRefine((value, context) => {
    const ids = value.approvals.map((approval) => approval.id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["approvals"],
        message: "Duplicate approval evidence",
      });
  });
export const revokeResultApprovalInputSchema =
  decideVersionApprovalInputSchema.pick({
    approvalId: true,
    reason: true,
  });
export const customerProjectionInputSchema = z.strictObject({
  context: accessContextSchema,
  snapshot: resultSnapshotSchema,
  evidence: publicationEvidenceSchema,
});
export const externalPublicationInputSchema = z.strictObject({
  tenantId: z.uuid(),
  snapshot: resultSnapshotSchema,
  evidence: publicationEvidenceSchema,
});
export const customerResultSchema = z.strictObject({
  target: customerTarget,
  title: text,
  summary: text,
});
export const customerSearchResultSchema = customerResultSchema
  .omit({ summary: true })
  .extend({ excerpt: z.string().max(280) });
export const customerDownloadSchema = z.strictObject({
  fileName: z.string().regex(/^[0-9a-f-]+-v[0-9]+\.txt$/),
  contentType: z.literal("text/plain; charset=utf-8"),
  body: z.string().max(4002),
});
export const customerResultEventSchema = z.strictObject({
  type: z.literal("result.visible"),
  result: customerResultSchema,
});
export const customerSearchInputSchema = z.strictObject({
  query: z.string().trim().max(200),
});
export type ResultSnapshot = z.output<typeof resultSnapshotSchema>;
export type PublicationEvidence = z.output<typeof publicationEvidenceSchema>;
export type CustomerProjectionInput = z.input<
  typeof customerProjectionInputSchema
>;
