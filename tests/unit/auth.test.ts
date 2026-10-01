import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { expect, test } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import { createMemoryCustomerStore } from "../../packages/integrations/src/api.js";
import { createAuth0Authenticator } from "../../packages/integrations/src/auth.js";

const issuer = "https://synthetic.auth0.com/";
const tenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const agentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const keys = await generateKeyPair("RS256");
const jwks = createLocalJWKSet({
  keys: [{ ...(await exportJWK(keys.publicKey)), kid: "test" }],
});
const auth = createAuth0Authenticator(
  {
    issuer,
    humanClientId: "human_app",
    audience: "https://api.example.invalid",
    bindings: [
      {
        kind: "m2m",
        organizationId: "org_test",
        tenantId,
        clientId: "agent_test",
        agentId,
        scopes: ["customers:write"],
      },
    ],
  },
  jwks,
);
async function token(
  scope = "customers:write",
  exp = Math.floor(Date.now() / 1000) + 60,
) {
  return new SignJWT({
    sub: "agent_test@clients",
    azp: "agent_test",
    gty: "client-credentials",
    org_id: "org_test",
    scope,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: "test" })
    .setIssuer(issuer)
    .setAudience("https://api.example.invalid")
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(keys.privateKey);
}
async function post(bearer: string) {
  return createApp({
    store: createMemoryCustomerStore(),
    authenticate: auth,
  }).request("/customers", {
    method: "POST",
    headers: {
      authorization: `Bearer ${bearer}`,
      "content-type": "application/json",
      "idempotency-key": "auth-test-001",
    },
    body: JSON.stringify({ name: "Synthetic customer" }),
  });
}
test("agent without scope receives 403 and expired token receives 401", async () => {
  expect((await post(await token(""))).status).toBe(403);
  expect(
    (
      await post(
        await token("customers:write", Math.floor(Date.now() / 1000) - 10),
      )
    ).status,
  ).toBe(401);
  const response = await post(await token());
  expect(response.status).toBe(201);
  expect((await response.json()).tenantId).toBe(tenantId);
});
async function signed(
  overrides: Record<string, unknown> = {},
  audience = "https://api.example.invalid",
  tokenIssuer = issuer,
) {
  return new SignJWT({
    sub: "agent_test@clients",
    azp: "agent_test",
    gty: "client-credentials",
    org_id: "org_test",
    scope: "customers:write",
    ...overrides,
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: "test" })
    .setIssuer(tokenIssuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("1m")
    .sign(keys.privateKey);
}
test("rejects wrong issuer, audience, manipulated signature and future tokens", async () => {
  for (const bearer of [
    await signed({}, "https://other.invalid"),
    await signed({}, undefined, "https://other.auth0.com/"),
    await signed({ nbf: Math.floor(Date.now() / 1000) + 100 }),
  ])
    expect((await post(bearer)).status).toBe(401);
  const genuine = await token();
  const parts = genuine.split(".");
  parts[1] = Buffer.from(
    JSON.stringify({ sub: "forged", scope: "customers:write" }),
  ).toString("base64url");
  const response = await post(parts.join("."));
  expect(response.status).toBe(401);
  expect(response.headers.get("www-authenticate")).toBe("Bearer");
  const error = await response.json();
  expect(error.error.code).toBe("UNAUTHORIZED");
  expect(error.error.requestId).toBe(response.headers.get("x-request-id"));
  expect(JSON.stringify(error)).not.toContain(genuine);
});
test("only explicit organization and client bindings grant access", async () => {
  expect((await post(await signed({ org_id: "org_other" }))).status).toBe(403);
  expect(
    (
      await post(
        await signed({ azp: "unregistered", sub: "unregistered@clients" }),
      )
    ).status,
  ).toBe(403);
  expect((await post(await signed({ sub: "auth0|person" }))).status).toBe(401);
});
test("token scopes cannot exceed the locally granted permissions", async () => {
  const denied = createAuth0Authenticator(
    {
      issuer,
      audience: "https://api.example.invalid",
      humanClientId: "human_app",
      bindings: [
        {
          kind: "m2m",
          organizationId: "org_test",
          tenantId,
          clientId: "agent_test",
          agentId,
          scopes: [],
        },
      ],
    },
    jwks,
  );
  const response = await createApp({
    store: createMemoryCustomerStore(),
    authenticate: denied,
  }).request("/customers", {
    method: "POST",
    headers: {
      authorization: `Bearer ${await token()}`,
      "content-type": "application/json",
      "idempotency-key": "denied-key-001",
    },
    body: JSON.stringify({ name: "Synthetic" }),
  });
  expect(response.status).toBe(403);
});
test("humans and delegated agents keep distinct local identities", async () => {
  const subject = "auth0|synthetic";
  const humanId = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
  const authenticate = createAuth0Authenticator(
    {
      issuer,
      audience: "https://api.example.invalid",
      humanClientId: "human_app",
      bindings: [
        {
          kind: "human",
          subject,
          organizationId: "org_test",
          tenantId,
          userId: humanId,
          scopes: ["customers:write"],
        },
        {
          kind: "oauth",
          subject,
          clientId: "external_app",
          organizationId: "org_test",
          tenantId,
          agentId,
          scopes: ["customers:write"],
        },
      ],
    },
    jwks,
  );
  const human = await authenticate(
    new Request("https://api.example.invalid", {
      headers: {
        authorization: `Bearer ${await signed({ sub: subject, azp: "human_app", gty: undefined })}`,
      },
    }),
  );
  const agent = await authenticate(
    new Request("https://api.example.invalid", {
      headers: {
        authorization: `Bearer ${await signed({ sub: subject, azp: "external_app", gty: undefined })}`,
      },
    }),
  );
  expect(human).toMatchObject({ kind: "human", actorId: humanId, tenantId });
  expect(agent).toMatchObject({ kind: "oauth", actorId: agentId, tenantId });
});
test("public tenant headers never select a tenant", async () => {
  const api = createApp({
    store: createMemoryCustomerStore(),
    authenticate: auth,
  });
  const response = await api.request("/customers", {
    method: "POST",
    headers: {
      authorization: `Bearer ${await token()}`,
      "x-tenant-id": "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
      "content-type": "application/json",
      "idempotency-key": "tenant-header-001",
    },
    body: JSON.stringify({ name: "Synthetic" }),
  });
  expect((await response.json()).tenantId).toBe(tenantId);
  expect(
    (
      await api.request("/customers", {
        method: "POST",
        headers: { "x-tenant-id": tenantId },
      })
    ).status,
  ).toBe(401);
});
test("a missing local actor cannot authorize a valid external token", async () => {
  const authenticate = createAuth0Authenticator(
    {
      issuer,
      audience: "https://api.example.invalid",
      humanClientId: "human_app",
      bindings: [
        {
          kind: "m2m",
          organizationId: "org_test",
          tenantId,
          clientId: "agent_test",
          agentId,
          scopes: ["customers:write"],
        },
      ],
      verifyIdentity: async () => false,
    },
    jwks,
  );
  await expect(
    authenticate(
      new Request("https://api.example.invalid", {
        headers: { authorization: `Bearer ${await token()}` },
      }),
    ),
  ).rejects.toMatchObject({ status: 403 });
});
