import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import { renderAuthorizationMigration } from "../../packages/db/src/authorization-migration.js";
import {
  agencyMembershipSchema,
  agentGrantSchema,
} from "../../packages/schemas/src/authorization.js";

it("rejects ambiguous or unbounded persisted grants", () => {
  const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const member = {
    id,
    tenantId: id,
    userId: id,
    createdAt: new Date(),
    role: "founder",
    clientId: "human",
    status: "active",
    revokedAt: null,
  };
  expect(agencyMembershipSchema.safeParse(member).success).toBe(true);
  expect(
    agencyMembershipSchema.safeParse({ ...member, role: "customer_admin" })
      .success,
  ).toBe(false);
  const grant = {
    id,
    tenantId: id,
    agentId: id,
    createdAt: new Date(),
    kind: "m2m",
    subject: "synthetic@clients",
    clientId: "synthetic",
    organizationId: null,
    view: "agency",
    scopes: ["customers:write"],
    expiresAt: new Date(),
    status: "active",
    revokedAt: null,
  };
  expect(agentGrantSchema.safeParse(grant).success).toBe(true);
  for (const change of [
    { scopes: ["*"] },
    { scopes: [42] },
    { scopes: Array(101).fill("customers:write") },
    { status: "revoked" },
    { expiresAt: null },
  ])
    expect(agentGrantSchema.safeParse({ ...grant, ...change }).success).toBe(
      false,
    );
});
it("generates new migration without rewriting applied migrations", () => {
  expect(
    readFileSync(
      "packages/db/migrations/0005_authorization.sql",
      "utf8",
    ).replaceAll("\r\n", "\n"),
  ).toBe(renderAuthorizationMigration());
});
it("rejects authenticated mutation when no authorization executor is installed", async () => {
  let called = false;
  const api = createApp({
    store: {
      create: async () => {
        called = true;
        throw new Error("Must not run");
      },
      close: async () => {},
    },
    authenticate: async () => ({
      kind: "human",
      tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      actorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      subject: "auth0|synthetic",
      scopes: ["customers:write"],
      expiresAt: Math.floor(Date.now() / 1000) + 60,
    }),
  });
  const response = await api.request("/customers", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": "synthetic-001",
    },
    body: JSON.stringify({ name: "Synthetic" }),
  });
  expect(response.status).toBe(403);
  expect(called).toBe(false);
});
