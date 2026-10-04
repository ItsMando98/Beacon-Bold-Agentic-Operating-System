import { readFileSync } from "node:fs";
import { validate } from "@scalar/openapi-parser";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, expectTypeOf, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import {
  accessContextSchema,
  accessOperationContracts,
  agencyRoleSchema,
  approvalTargetSchema,
  type ContractInput,
  type ContractOutput,
  customerRoleSchema,
  decideVersionApprovalInputSchema,
  generateJsonSchema,
  generateOpenApi,
  generateToolDefinitions,
  grantMembershipInputSchema,
  membershipSchema,
  organizationSchema,
  requestVersionApprovalInputSchema,
  resultVisibilitySchema,
  versionApprovalSchema,
  wireMembershipSchema,
  wireOrganizationSchema,
  wireVersionApprovalSchema,
  type z,
} from "../../packages/schemas/src/index.js";

const tenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const userId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const recordId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const createdAt = new Date("2026-10-01T10:00:00.000Z");
const publication = {
  kind: "offer_publication",
  target: { kind: "offer", recordId, version: 2 },
};
const pending = {
  id: recordId,
  tenantId,
  createdAt,
  publication,
  requestedBy: { kind: "human", userId },
  reason: "Synthetic offer review",
  expiresAt: new Date("2026-10-02T10:00:00.000Z"),
  status: "pending",
  closedAt: null,
  decision: null,
};
function validator(schema: z.ZodType) {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  return ajv.compile(generateJsonSchema(schema, "input"));
}
function parity(schema: z.ZodType, values: unknown[]) {
  const accepts = validator(schema);
  for (const value of values)
    expect(accepts(value), JSON.stringify(value)).toBe(
      schema.safeParse(value).success,
    );
}
function wire(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}
const plannedOptions = {
  includeSupportRoutes: false,
  title: "ROASWELL access specification",
  description:
    "R1 access specification. getOrganization is implemented; the other operations remain planned and are not registered in the live API.",
};

describe("R1-01 organisation and access contracts", () => {
  it("requires organisation identity and an explicit lifecycle without altering existing tenants", () => {
    const row = {
      id: tenantId,
      name: "Synthetic Studio",
      createdAt,
      phase: "prospect",
      isAgencyCustomer: false,
    };
    expect(organizationSchema.safeParse(row).success).toBe(true);
    expect(
      organizationSchema.safeParse({ ...row, phase: "unknown" }).success,
    ).toBe(false);
    const { id: _, ...withoutId } = row;
    expect(organizationSchema.safeParse(withoutId).success).toBe(false);
    expect(
      organizationSchema.safeParse({ ...row, founder: true }).success,
    ).toBe(false);
    parity(wireOrganizationSchema, [
      wire(row),
      { ...wire(row), phase: "unknown" },
      wire(withoutId),
      { ...wire(row), createdAt: "not-a-date" },
    ]);
  });

  it("keeps founder access outside customer roles, including the ROASWELL customer view", () => {
    expect(agencyRoleSchema.parse("founder")).toBe("founder");
    for (const role of ["customer_admin", "customer_member"])
      expect(customerRoleSchema.safeParse(role).success).toBe(true);
    for (const role of ["founder", "admin", "unknown"])
      expect(customerRoleSchema.safeParse(role).success).toBe(false);
    const customer = {
      view: "customer",
      tenantId,
      userId,
      customerRole: "customer_admin",
    };
    expect(accessContextSchema.safeParse(customer).success).toBe(true);
    expect(
      accessContextSchema.safeParse({ ...customer, agencyRole: "founder" })
        .success,
    ).toBe(false);
    expect(
      accessContextSchema.safeParse({ ...customer, customerRole: "founder" })
        .success,
    ).toBe(false);
    expect(
      accessContextSchema.safeParse({
        view: "agency",
        tenantId,
        userId,
        agencyRole: "founder",
      }).success,
    ).toBe(true);
    parity(accessContextSchema, [
      customer,
      { ...customer, agencyRole: "founder" },
      { ...customer, tenantId: undefined },
    ]);
  });

  it("validates active and revoked memberships consistently in Zod and JSON Schema", () => {
    const active = {
      id: recordId,
      tenantId,
      userId,
      createdAt,
      role: "customer_member",
      status: "active",
      revokedAt: null,
    };
    expect(membershipSchema.safeParse(active).success).toBe(true);
    const revoked = { ...active, status: "revoked", revokedAt: createdAt };
    expect(membershipSchema.safeParse(revoked).success).toBe(true);
    for (const invalid of [
      { ...active, revokedAt: createdAt },
      { ...revoked, revokedAt: null },
      { ...active, role: "founder" },
      { ...active, tenantId: undefined },
      { ...active, status: "invited" },
    ])
      expect(membershipSchema.safeParse(invalid).success).toBe(false);
    parity(wireMembershipSchema, [
      wire(active),
      wire(revoked),
      { ...wire(active), role: "founder" },
      { ...wire(active), revokedAt: createdAt.toISOString() },
      { ...wire(revoked), revokedAt: null },
    ]);
    expectTypeOf<
      z.output<typeof wireMembershipSchema>["createdAt"]
    >().toEqualTypeOf<string>();
  });

  it("rejects actor, tenant, state and founder injection into caller commands", () => {
    const grant = { userId, role: "customer_member" };
    const request = { publication, reason: "Synthetic offer review" };
    const decide = {
      approvalId: recordId,
      targetVersion: 2,
      decision: "approved",
      reason: "Synthetic decision",
    };
    for (const [schema, valid] of [
      [grantMembershipInputSchema, grant],
      [requestVersionApprovalInputSchema, request],
      [decideVersionApprovalInputSchema, decide],
    ] as const) {
      const injections = [
        "tenantId",
        "organizationId",
        "actorId",
        "agencyRole",
        "status",
        "createdAt",
        "decidedByUserId",
      ].map((field) => ({ ...valid, [field]: userId }));
      expect(schema.safeParse(valid).success).toBe(true);
      for (const invalid of injections)
        expect(schema.safeParse(invalid).success).toBe(false);
      parity(schema, [valid, ...injections]);
    }
    expect(
      grantMembershipInputSchema.safeParse({ ...grant, role: "founder" })
        .success,
    ).toBe(false);
    expect(
      decideVersionApprovalInputSchema.safeParse({
        ...decide,
        decision: "expired",
      }).success,
    ).toBe(false);
    expectTypeOf<
      ContractInput<(typeof accessOperationContracts)[2]>
    >().toEqualTypeOf<{
      userId: string;
      role: "customer_admin" | "customer_member";
    }>();
    expectTypeOf<
      ContractOutput<(typeof accessOperationContracts)[0]>["createdAt"]
    >().toEqualTypeOf<string>();
  });

  it("never models internal notes or calculations as customer-visible results", () => {
    const result = {
      tenantId,
      visibility: "customer",
      target: { kind: "report", recordId, version: 1 },
    };
    expect(resultVisibilitySchema.safeParse(result).success).toBe(true);
    for (const kind of ["internal_note", "calculation"]) {
      expect(
        resultVisibilitySchema.safeParse({
          ...result,
          target: { ...result.target, kind },
        }).success,
      ).toBe(false);
      expect(
        resultVisibilitySchema.safeParse({
          ...result,
          visibility: "internal",
          target: { ...result.target, kind },
        }).success,
      ).toBe(true);
    }
    parity(resultVisibilitySchema, [
      result,
      { ...result, visibility: "public" },
      { ...result, target: { ...result.target, kind: "internal_note" } },
      { ...result, tenantId: undefined },
    ]);
  });

  it("binds publication approvals to valid result kinds and a positive version", () => {
    expect(approvalTargetSchema.safeParse(publication).success).toBe(true);
    const invalids = [
      { ...publication, target: { ...publication.target, version: 0 } },
      { ...publication, target: { ...publication.target, version: 1.5 } },
      { ...publication, target: { ...publication.target, version: undefined } },
      { ...publication, target: { ...publication.target, kind: "report" } },
      { kind: "external_publication", target: publication.target },
      { kind: "customer_review", target: publication.target },
    ];
    for (const invalid of invalids)
      expect(approvalTargetSchema.safeParse(invalid).success).toBe(false);
    parity(approvalTargetSchema, [publication, ...invalids]);
    expect(
      approvalTargetSchema.safeParse({
        kind: "customer_review",
        target: { kind: "external_content", recordId, version: 3 },
      }).success,
    ).toBe(true);
  });

  it("requires a human decision for resolved approvals and leaves pending or expired states undecided", () => {
    const approved = {
      ...pending,
      status: "approved",
      closedAt: createdAt,
      decision: { userId, reason: "Synthetic human decision" },
    };
    const expired = { ...pending, status: "expired", closedAt: createdAt };
    expect(versionApprovalSchema.safeParse(pending).success).toBe(true);
    for (const status of ["approved", "rejected", "revoked"])
      expect(
        versionApprovalSchema.safeParse({ ...approved, status }).success,
      ).toBe(true);
    expect(versionApprovalSchema.safeParse(expired).success).toBe(true);
    const invalids = [
      { ...approved, decision: null },
      { ...approved, closedAt: null },
      { ...approved, decision: { agentId: userId, reason: "Synthetic agent" } },
      { ...pending, decision: approved.decision },
      { ...pending, closedAt: createdAt },
      { ...expired, decision: approved.decision },
      { ...pending, status: "unknown" },
    ];
    for (const invalid of invalids)
      expect(versionApprovalSchema.safeParse(invalid).success).toBe(false);
    parity(wireVersionApprovalSchema, [
      wire(pending),
      wire(approved),
      wire(expired),
      ...invalids.map(wire),
    ]);
  });

  it("generates separate contracts and advertises only the implemented organization read", async () => {
    const document = generateOpenApi(accessOperationContracts, plannedOptions);
    expect((await validate(JSON.stringify(document))).valid).toBe(true);
    expect(Object.keys(document.paths)).toEqual([
      "/v1/organization",
      "/v1/memberships",
      "/v1/approvals",
      "/v1/approvals/decisions",
    ]);
    const tools = generateToolDefinitions(accessOperationContracts);
    expect(tools).toHaveLength(6);
    for (const [index, contract] of accessOperationContracts.entries()) {
      const tool = tools[index];
      expect(tool.inputSchema).toEqual(
        document.components.schemas[`${contract.operationId}Input`],
      );
      expect(tool.outputSchema).toEqual(
        document.components.schemas[`${contract.operationId}Output`],
      );
      expect(validator(contract.input)).toBeTypeOf("function");
      expect(validator(contract.output)).toBeTypeOf("function");
      const api = createApp();
      const response = await api.request(contract.path, {
        method: contract.method.toUpperCase(),
      });
      expect(response.status).toBe(index === 0 ? 401 : 404);
    }
    expect(
      JSON.parse(
        readFileSync("packages/schemas/generated/access-openapi.json", "utf8"),
      ),
    ).toEqual(document);
    expect(
      JSON.parse(
        readFileSync("packages/schemas/generated/access-tools.json", "utf8"),
      ),
    ).toEqual(tools);
    expect(Object.keys(generateOpenApi().paths)).toContain("/v1/organization");
    expect(generateToolDefinitions()).toHaveLength(9);
    expect(JSON.stringify(document)).not.toContain('"storage"');
  });
});
