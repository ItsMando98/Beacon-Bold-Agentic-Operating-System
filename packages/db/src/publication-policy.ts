import {
  type AccessContext,
  accessContextSchema,
  type CustomerProjectionInput,
  customerDownloadSchema,
  customerProjectionInputSchema,
  customerResultEventSchema,
  customerResultSchema,
  customerSearchInputSchema,
  customerSearchResultSchema,
  decideVersionApprovalInputSchema,
  externalPublicationInputSchema,
  type PublicationEvidence,
  type ResultReference,
  type ResultSnapshot,
  resultSnapshotSchema,
  reviseResultInputSchema,
  revokeResultApprovalInputSchema,
  type VersionApproval,
  versionApprovalSchema,
  type z,
} from "@roaswell/schemas";

export const publicationPolicyVersion = "r1-05-01/v1";
function sameTarget(a: ResultReference, b: ResultReference) {
  return (
    a.kind === b.kind && a.recordId === b.recordId && a.version === b.version
  );
}
function validApproval(
  snapshot: ResultSnapshot,
  evidence: PublicationEvidence,
  kind: VersionApproval["publication"]["kind"],
) {
  const matching = evidence.approvals
    .filter(
      (approval) =>
        approval.tenantId === snapshot.tenantId &&
        approval.publication.kind === kind &&
        sameTarget(approval.publication.target, snapshot.target),
    )
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const approval = matching[0];
  if (
    !approval ||
    (matching[1] &&
      matching[1].createdAt.getTime() === approval.createdAt.getTime())
  )
    return false;
  return (
    approval.status === "approved" &&
    approval.createdAt.getTime() >= snapshot.createdAt.getTime() &&
    approval.createdAt.getTime() <= approval.closedAt.getTime() &&
    approval.closedAt.getTime() <= evidence.now.getTime() &&
    approval.closedAt.getTime() < approval.expiresAt.getTime() &&
    evidence.now.getTime() < approval.expiresAt.getTime() &&
    evidence.decisionActors.some(
      (actor) =>
        actor.tenantId === snapshot.tenantId &&
        actor.userId === approval.decision.userId &&
        actor.role ===
          (kind === "customer_review" ? "customer_admin" : "founder"),
    )
  );
}
function customerVisible(
  input: z.output<typeof customerProjectionInputSchema>,
) {
  const { context, snapshot, evidence } = input;
  if (
    context.view !== "customer" ||
    context.tenantId !== snapshot.tenantId ||
    snapshot.createdAt.getTime() > evidence.now.getTime() ||
    snapshot.visibility !== "customer" ||
    ["internal_note", "calculation"].includes(snapshot.target.kind)
  )
    return false;
  if (["analysis", "report"].includes(snapshot.target.kind)) {
    const relevant = evidence.quality.filter(
      (check) =>
        check.tenantId === snapshot.tenantId &&
        sameTarget(check.target, snapshot.target),
    );
    if (!relevant.length) return false;
    // Conflicting or future evidence closes the gate until the repository resolves it.
    if (
      relevant.some(
        (check) =>
          check.status !== "passed" ||
          check.checkedAt.getTime() < snapshot.createdAt.getTime() ||
          check.checkedAt.getTime() > evidence.now.getTime(),
      )
    )
      return false;
  }
  return (
    snapshot.target.kind !== "offer" ||
    validApproval(snapshot, evidence, "offer_publication")
  );
}
/** Caller must already authenticate and verify current membership/grants. */
export function projectCustomerResult(input: CustomerProjectionInput) {
  const parsed = customerProjectionInputSchema.safeParse(input);
  if (!parsed.success || !customerVisible(parsed.data)) return undefined;
  const { snapshot } = parsed.data;
  // Explicit allowlist: never spread a stored/internal record into customer output.
  return customerResultSchema.parse({
    target: snapshot.target,
    title: snapshot.title,
    summary: snapshot.summary,
  });
}
export function searchCustomerResults(
  inputs: CustomerProjectionInput[],
  query: string,
) {
  const { query: parsed } = customerSearchInputSchema.parse({ query });
  const needle = parsed.toLocaleLowerCase("de");
  return inputs.flatMap((input) => {
    const result = projectCustomerResult(input);
    if (
      !result ||
      !`${result.title}\n${result.summary}`
        .toLocaleLowerCase("de")
        .includes(needle)
    )
      return [];
    return [
      customerSearchResultSchema.parse({
        target: result.target,
        title: result.title,
        excerpt: result.summary.slice(0, 280),
      }),
    ];
  });
}
export function downloadCustomerResult(input: CustomerProjectionInput) {
  const result = projectCustomerResult(input);
  if (!result) return undefined;
  return customerDownloadSchema.parse({
    fileName: `${result.target.recordId.toLowerCase()}-v${result.target.version}.txt`,
    contentType: "text/plain; charset=utf-8",
    body: `${result.title}\n\n${result.summary}`,
  });
}
export function customerResultEvent(input: CustomerProjectionInput) {
  const result = projectCustomerResult(input);
  return result
    ? customerResultEventSchema.parse({ type: "result.visible", result })
    : undefined;
}
/** Gate only: does not authorize an actor, spend money or call an external provider. */
export function canPublishExternally(
  input: z.input<typeof externalPublicationInputSchema>,
) {
  const parsed = externalPublicationInputSchema.safeParse(input);
  if (!parsed.success) return false;
  const { tenantId, snapshot, evidence } = parsed.data;
  return (
    tenantId === snapshot.tenantId &&
    snapshot.visibility === "customer" &&
    snapshot.createdAt.getTime() <= evidence.now.getTime() &&
    ["external_content", "campaign"].includes(snapshot.target.kind) &&
    validApproval(snapshot, evidence, "external_publication") &&
    (!snapshot.requiresCustomerReview ||
      validApproval(snapshot, evidence, "customer_review"))
  );
}
/** The repository must persist this as a new immutable version, atomically. */
export function reviseResult(
  source: ResultSnapshot,
  changes: z.input<typeof reviseResultInputSchema>,
  now: Date,
) {
  const original = resultSnapshotSchema.parse(source);
  if (!Number.isFinite(now.getTime()) || now < original.createdAt)
    throw new Error("Invalid revision time");
  return resultSnapshotSchema.parse({
    ...original,
    ...reviseResultInputSchema.parse(changes),
    target: { ...original.target, version: original.target.version + 1 },
    createdAt: new Date(now.getTime()),
  });
}
function canDecide(approval: VersionApproval, context: AccessContext) {
  return (
    approval.tenantId === context.tenantId &&
    (approval.publication.kind === "customer_review"
      ? context.view === "customer" && context.customerRole === "customer_admin"
      : context.view === "agency" && context.agencyRole === "founder")
  );
}
/** Transition only; the repository must lock/read current version and persist with audit. */
export function decideResultApproval(
  source: VersionApproval,
  current: ResultSnapshot,
  trustedContext: AccessContext,
  command: z.input<typeof decideVersionApprovalInputSchema>,
  now: Date,
) {
  const approval = versionApprovalSchema.parse(source);
  const snapshot = resultSnapshotSchema.parse(current);
  const context = accessContextSchema.parse(trustedContext);
  const input = decideVersionApprovalInputSchema.parse(command);
  if (
    !Number.isFinite(now.getTime()) ||
    !canDecide(approval, context) ||
    snapshot.tenantId !== context.tenantId ||
    approval.id !== input.approvalId ||
    approval.status !== "pending" ||
    approval.publication.target.version !== input.targetVersion ||
    !sameTarget(approval.publication.target, snapshot.target) ||
    (approval.publication.kind === "customer_review" &&
      snapshot.visibility !== "customer") ||
    snapshot.createdAt > approval.createdAt ||
    approval.createdAt > now ||
    now >= approval.expiresAt
  )
    throw new Error("Approval decision refused");
  return versionApprovalSchema.parse({
    ...approval,
    status: input.decision,
    closedAt: new Date(now.getTime()),
    decision: { userId: context.userId, reason: input.reason },
  });
}
export function revokeResultApproval(
  source: VersionApproval,
  trustedContext: AccessContext,
  command: z.input<typeof revokeResultApprovalInputSchema>,
  now: Date,
) {
  const approval = versionApprovalSchema.parse(source);
  const context = accessContextSchema.parse(trustedContext);
  const input = revokeResultApprovalInputSchema.parse(command);
  if (
    !Number.isFinite(now.getTime()) ||
    !canDecide(approval, context) ||
    approval.id !== input.approvalId ||
    approval.status !== "approved" ||
    now < approval.closedAt
  )
    throw new Error("Approval revocation refused");
  return versionApprovalSchema.parse({
    ...approval,
    status: "revoked",
    closedAt: new Date(now.getTime()),
    decision: { userId: context.userId, reason: input.reason },
  });
}
