import { expect, it } from "vitest";
import {
  canPublishExternally,
  customerResultEvent,
  decideResultApproval,
  downloadCustomerResult,
  projectCustomerResult,
  reviseResult,
  revokeResultApproval,
  searchCustomerResults,
} from "../../packages/db/src/publication-policy.js";
import {
  type AccessContext,
  type CustomerProjectionInput,
  publicationEvidenceSchema,
  type ResultSnapshot,
  resultSnapshotSchema,
  type VersionApproval,
} from "../../packages/schemas/src/index.js";

const tenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const userId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const recordId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const approvalId = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const createdAt = new Date("2026-10-02T08:00:00Z");
const requestedAt = new Date("2026-10-02T08:30:00Z");
const now = new Date("2026-10-02T09:00:00Z");
const later = new Date("2026-10-02T10:00:00Z");
const customer: AccessContext = {
  view: "customer",
  tenantId,
  userId,
  customerRole: "customer_admin",
};
const founder: AccessContext = {
  view: "agency",
  tenantId,
  userId,
  agencyRole: "founder",
};
function snapshot(
  kind: ResultSnapshot["target"]["kind"] = "project_progress",
): ResultSnapshot {
  return {
    tenantId,
    target: { kind, recordId, version: 1 },
    createdAt,
    visibility: "customer",
    title: "Synthetic progress",
    summary: "Ready for review",
    internal: {
      notes: "SECRET INTERNAL",
      nested: { price: "SECRET CALCULATION" },
    },
    requiresCustomerReview: false,
  };
}
function pending(
  kind: VersionApproval["publication"]["kind"] = "offer_publication",
): VersionApproval {
  const targetKind =
    kind === "offer_publication" ? "offer" : "external_content";
  return {
    id: approvalId,
    tenantId,
    createdAt: requestedAt,
    publication: {
      kind,
      target: { kind: targetKind, recordId, version: 1 },
    } as VersionApproval["publication"],
    requestedBy: { kind: "human", userId },
    reason: "Synthetic request",
    expiresAt: later,
    status: "pending",
    closedAt: null,
    decision: null,
  };
}
function input(source = snapshot()): CustomerProjectionInput {
  return {
    snapshot: source,
    context: customer,
    evidence: { now, approvals: [], decisionActors: [], quality: [] },
  };
}
function approvedOffer() {
  const current = snapshot("offer");
  const approved = decideResultApproval(
    pending(),
    current,
    founder,
    {
      approvalId,
      targetVersion: 1,
      decision: "approved",
      reason: "Synthetic approval",
    },
    now,
  );
  return {
    ...input(current),
    evidence: {
      now,
      quality: [],
      approvals: [approved],
      decisionActors: [{ tenantId, userId, role: "founder" as const }],
    },
  };
}
function allChannels(source: CustomerProjectionInput) {
  return [
    projectCustomerResult(source),
    searchCustomerResults([source], ""),
    downloadCustomerResult(source),
    customerResultEvent(source),
  ];
}
function expectHidden(source: CustomerProjectionInput) {
  expect(allChannels(source)).toEqual([undefined, [], undefined, undefined]);
}
it("uses one explicit customer projection for portal, search, download and event", () => {
  const result = input();
  expect(projectCustomerResult(result)).toEqual({
    target: result.snapshot.target,
    title: result.snapshot.title,
    summary: result.snapshot.summary,
  });
  const serialized = JSON.stringify(allChannels(result));
  expect(serialized).not.toContain("SECRET");
  expect(serialized).not.toContain("internal");
  expect(serialized).not.toContain("tenantId");
  expect(searchCustomerResults([result], "SECRET")).toEqual([]);
  expect(searchCustomerResults([result], "READY")).toHaveLength(1);
  expect(downloadCustomerResult(result)?.fileName).toBe(`${recordId}-v1.txt`);
});
it.each(["internal_note", "calculation"] as const)(
  "never exposes %s, even marked customer",
  (kind) => {
    expectHidden(input(snapshot(kind)));
  },
);
it("refuses internal visibility, wrong tenant, founder view and malformed source", () => {
  expectHidden(input({ ...snapshot(), visibility: "internal" }));
  expectHidden({ ...input(), context: { ...customer, tenantId: other } });
  expectHidden({ ...input(), context: founder });
  expectHidden(input({ ...snapshot(), createdAt: later }));
  const malformed = {
    ...input(),
    snapshot: {
      ...snapshot(),
      visibility: "customer" as const,
      unexpected: "SECRET",
    },
  };
  expectHidden(malformed);
});
it.each(["analysis", "report"] as const)(
  "requires exact passing quality evidence for %s",
  (kind) => {
    const source = input(snapshot(kind));
    expectHidden(source);
    const proof = {
      tenantId,
      target: source.snapshot.target,
      status: "passed" as const,
      checkedAt: now,
    };
    const passing = {
      ...source,
      evidence: { ...source.evidence, quality: [proof] },
    };
    expect(projectCustomerResult(passing)).toBeDefined();
    for (const change of [
      { tenantId: other },
      { status: "failed" as const },
      { status: "pending" as const },
      { checkedAt: later },
      { checkedAt: new Date("2026-10-01T08:00:00Z") },
      { target: { ...proof.target, version: 2 } },
    ])
      expectHidden({
        ...source,
        evidence: { ...source.evidence, quality: [{ ...proof, ...change }] },
      });
    expectHidden({
      ...passing,
      evidence: {
        ...passing.evidence,
        quality: [proof, { ...proof, status: "failed" }],
      },
    });
  },
);
it("keeps offers private until a verified founder approves that exact version", () => {
  expectHidden(input(snapshot("offer")));
  const valid = approvedOffer();
  expect(projectCustomerResult(valid)).toBeDefined();
  for (const actors of [
    [],
    [{ tenantId, userId, role: "customer_admin" as const }],
    [{ tenantId: other, userId, role: "founder" as const }],
    [{ tenantId, userId: other, role: "founder" as const }],
  ])
    expectHidden({
      ...valid,
      evidence: { ...valid.evidence, decisionActors: actors },
    });
  expectHidden({ ...valid, evidence: { ...valid.evidence, now: later } });
  const wrong = { ...valid.evidence.approvals[0], tenantId: other };
  expectHidden({
    ...valid,
    evidence: { ...valid.evidence, approvals: [wrong] },
  });
});
it("does not revive an old approval when newer evidence is pending or contradictory", () => {
  const valid = approvedOffer();
  const newer = {
    ...pending(),
    id: other,
    createdAt: new Date("2026-10-02T08:45:00Z"),
  };
  expectHidden({
    ...valid,
    evidence: {
      ...valid.evidence,
      approvals: [...valid.evidence.approvals, newer],
    },
  });
  const duplicate = { ...valid.evidence.approvals[0] };
  expect(
    publicationEvidenceSchema.safeParse({
      ...valid.evidence,
      approvals: [duplicate, duplicate],
    }).success,
  ).toBe(false);
  expectHidden({
    ...valid,
    evidence: { ...valid.evidence, approvals: [duplicate, duplicate] },
  });
});
it("automatically advances the version and invalidates all old publication evidence", () => {
  const valid = approvedOffer();
  const revised = reviseResult(
    valid.snapshot,
    {
      title: "Revised offer",
      summary: valid.snapshot.summary,
      internal: valid.snapshot.internal,
      visibility: "customer",
      requiresCustomerReview: false,
    },
    now,
  );
  expect(revised.target).toEqual({ ...valid.snapshot.target, version: 2 });
  expect(valid.snapshot.target.version).toBe(1);
  expectHidden({ ...valid, snapshot: revised });
  expect(() =>
    reviseResult(
      {
        ...valid.snapshot,
        target: { ...valid.snapshot.target, version: 2147483647 },
      },
      {
        title: valid.snapshot.title,
        summary: valid.snapshot.summary,
        internal: valid.snapshot.internal,
        visibility: "customer",
        requiresCustomerReview: false,
      },
      now,
    ),
  ).toThrow();
});
it("refuses stale, expired, foreign or unauthorized publication decisions", () => {
  const source = pending();
  const current = snapshot("offer");
  const command = {
    approvalId,
    targetVersion: 1,
    decision: "approved" as const,
    reason: "Synthetic approval",
  };
  for (const context of [customer, { ...founder, tenantId: other }])
    expect(() =>
      decideResultApproval(source, current, context, command, now),
    ).toThrow();
  expect(() =>
    decideResultApproval(
      source,
      { ...current, target: { ...current.target, version: 2 } },
      founder,
      command,
      now,
    ),
  ).toThrow();
  expect(() =>
    decideResultApproval(
      source,
      current,
      founder,
      { ...command, targetVersion: 2 },
      now,
    ),
  ).toThrow();
  expect(() =>
    decideResultApproval(source, current, founder, command, later),
  ).toThrow();
  expect(() =>
    decideResultApproval(
      source,
      current,
      founder,
      { ...command, approvalId: other },
      now,
    ),
  ).toThrow();
  const approved = decideResultApproval(source, current, founder, command, now);
  expect(() =>
    decideResultApproval(approved, current, founder, command, now),
  ).toThrow();
  expect(source.status).toBe("pending");
});
it("revocation closes every customer channel and cannot be performed by a customer", () => {
  const valid = approvedOffer();
  const command = { approvalId, reason: "Synthetic revocation" };
  expect(() =>
    revokeResultApproval(valid.evidence.approvals[0], customer, command, now),
  ).toThrow();
  const revoked = revokeResultApproval(
    valid.evidence.approvals[0],
    founder,
    command,
    now,
  );
  expectHidden({
    ...valid,
    evidence: { ...valid.evidence, approvals: [revoked] },
  });
});
it("allows customer review of a visible creative before permitting external publication", () => {
  const source = snapshot("external_content");
  source.requiresCustomerReview = true;
  expect(projectCustomerResult(input(source))).toBeDefined();
  const external = decideResultApproval(
    pending("external_publication"),
    source,
    founder,
    {
      approvalId,
      targetVersion: 1,
      decision: "approved",
      reason: "Synthetic approval",
    },
    now,
  );
  const evidence = {
    ...input(source).evidence,
    approvals: [external],
    decisionActors: [{ tenantId, userId, role: "founder" as const }],
  };
  expect(canPublishExternally({ tenantId, snapshot: source, evidence })).toBe(
    false,
  );
  const reviewRequest = { ...pending("customer_review"), id: other };
  expect(() =>
    decideResultApproval(
      reviewRequest,
      { ...source, visibility: "internal" },
      customer,
      {
        approvalId: other,
        targetVersion: 1,
        decision: "approved",
        reason: "Synthetic",
      },
      now,
    ),
  ).toThrow();
  const review = decideResultApproval(
    reviewRequest,
    source,
    customer,
    {
      approvalId: other,
      targetVersion: 1,
      decision: "approved",
      reason: "Synthetic customer review",
    },
    now,
  );
  const complete = {
    ...evidence,
    approvals: [external, review],
    decisionActors: [
      ...evidence.decisionActors,
      { tenantId, userId, role: "customer_admin" as const },
    ],
  };
  expect(
    canPublishExternally({ tenantId, snapshot: source, evidence: complete }),
  ).toBe(true);
  expect(
    canPublishExternally({
      tenantId: other,
      snapshot: source,
      evidence: complete,
    }),
  ).toBe(false);
  expect(
    canPublishExternally({
      tenantId,
      snapshot: { ...source, target: { ...source.target, version: 2 } },
      evidence: complete,
    }),
  ).toBe(false);
  expect(() =>
    decideResultApproval(
      reviewRequest,
      source,
      founder,
      {
        approvalId: other,
        targetVersion: 1,
        decision: "approved",
        reason: "Synthetic",
      },
      now,
    ),
  ).toThrow();
  expect(() =>
    decideResultApproval(
      reviewRequest,
      source,
      { ...customer, customerRole: "customer_member" },
      {
        approvalId: other,
        targetVersion: 1,
        decision: "approved",
        reason: "Synthetic",
      },
      now,
    ),
  ).toThrow();
});
it("rejects extra public fields while retaining adaptive private data in trusted source", () => {
  expect(resultSnapshotSchema.parse(snapshot()).internal).toEqual(
    snapshot().internal,
  );
  expectHidden({
    ...input(),
    evidence: { ...input().evidence, now: new Date("invalid") },
  });
});
