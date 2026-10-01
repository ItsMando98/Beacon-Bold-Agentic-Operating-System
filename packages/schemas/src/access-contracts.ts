import { z } from "zod";
import {
  decideVersionApprovalInputSchema,
  grantMembershipInputSchema,
  listAccessInputSchema,
  requestVersionApprovalInputSchema,
  wireMembershipSchema,
  wireOrganizationSchema,
  wireVersionApprovalSchema,
} from "./access.js";
import { defineContract } from "./contracts.js";

// Specification only. Do not add these to the live registry before R1-03/R1-05.
export const accessOperationContracts = [
  defineContract({
    operationId: "getOrganization",
    toolName: "get_organization",
    method: "get",
    path: "/v1/organization",
    title: "Read organization",
    description:
      "Read the organization selected by verified server-side access context.",
    successStatus: 200,
    scopes: ["organizations:read"],
    readOnly: true,
    input: z.strictObject({}),
    output: wireOrganizationSchema,
  }),
  defineContract({
    operationId: "listMemberships",
    toolName: "list_memberships",
    method: "get",
    path: "/v1/memberships",
    title: "List customer memberships",
    description:
      "List memberships in the verified organization; role checks are enforced by the future service.",
    successStatus: 200,
    scopes: ["memberships:read"],
    readOnly: true,
    input: listAccessInputSchema,
    output: z.strictObject({
      items: z.array(wireMembershipSchema).max(100),
      nextCursor: z.uuid().nullable(),
    }),
  }),
  defineContract({
    operationId: "grantMembership",
    toolName: "grant_membership",
    method: "post",
    path: "/v1/memberships",
    title: "Grant customer membership",
    description:
      "Grant a customer role to a recipient user. This cannot grant founder access.",
    successStatus: 201,
    scopes: ["memberships:write"],
    readOnly: false,
    input: grantMembershipInputSchema,
    output: z.strictObject({ membership: wireMembershipSchema }),
  }),
  defineContract({
    operationId: "listVersionApprovals",
    toolName: "list_version_approvals",
    method: "get",
    path: "/v1/approvals",
    title: "List version-bound approvals",
    description:
      "List approval records allowed by the verified actor and customer visibility policy.",
    successStatus: 200,
    scopes: ["approvals:read"],
    readOnly: true,
    input: listAccessInputSchema,
    output: z.strictObject({
      items: z.array(wireVersionApprovalSchema).max(100),
      nextCursor: z.uuid().nullable(),
    }),
  }),
  defineContract({
    operationId: "requestVersionApproval",
    toolName: "request_version_approval",
    method: "post",
    path: "/v1/approvals",
    title: "Request version-bound approval",
    description:
      "Request publication or customer review of one exact version. The server assigns requester and state.",
    successStatus: 201,
    scopes: ["approvals:request"],
    readOnly: false,
    input: requestVersionApprovalInputSchema,
    output: z.strictObject({ approval: wireVersionApprovalSchema }),
  }),
  defineContract({
    operationId: "decideVersionApproval",
    toolName: "decide_version_approval",
    method: "post",
    path: "/v1/approvals/decisions",
    title: "Decide version-bound approval",
    description:
      "A permitted human approves or rejects the exact requested version; the service checks role, expiry and current version.",
    successStatus: 200,
    scopes: ["approvals:decide"],
    readOnly: false,
    input: decideVersionApprovalInputSchema,
    output: z.strictObject({ approval: wireVersionApprovalSchema }),
  }),
] as const;
