import { randomUUID } from "node:crypto";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { Client } from "pg";
import { expect, test } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import { migrate } from "../../packages/db/migrate.mjs";
import { createPostgresCustomerStore } from "../../packages/integrations/src/api.js";
import { createAuth0Authenticator } from "../../packages/integrations/src/auth.js";

test("signed Auth0 identities must belong to the tenant and cannot use paused agents", async () => {
  const name = `beacon_auth_${randomUUID().replaceAll("-", "")}`;
  const owner = "postgresql://beacon_owner:local-owner-only@127.0.0.1:15432/";
  const admin = new Client({ connectionString: `${owner}beacon` });
  const fixture = new Client({ connectionString: owner + name });
  const store = createPostgresCustomerStore(
    `postgresql://beacon_app:local-development-only@127.0.0.1:15432/${name}`,
  );
  const tenantA = randomUUID(),
    tenantB = randomUUID(),
    agentId = randomUUID(),
    userId = randomUUID();
  const keys = await generateKeyPair("RS256");
  const jwks = createLocalJWKSet({
    keys: [{ ...(await exportJWK(keys.publicKey)), kid: "synthetic" }],
  });
  const issuer = "https://synthetic.auth0.com/",
    audience = "https://api.example.invalid";
  const auth = (tenantId: string) =>
    createAuth0Authenticator(
      {
        issuer,
        audience,
        humanClientId: "human",
        bindings: [
          {
            kind: "m2m",
            tenantId,
            clientId: "agent",
            agentId,
            scopes: ["customers:write"],
          },
          {
            kind: "human",
            tenantId,
            subject: "auth0|synthetic",
            userId,
            scopes: ["customers:write"],
          },
        ],
        verifyIdentity: store.verifyIdentity,
      },
      jwks,
    );
  const token = async (human = false) =>
    new SignJWT({
      sub: human ? "auth0|synthetic" : "agent@clients",
      azp: human ? "human" : "agent",
      gty: human ? undefined : "client-credentials",
      scope: "customers:write",
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: "synthetic" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("1m")
      .sign(keys.privateKey);
  const post = async (tenantId: string, human = false) =>
    createApp({ store, authenticate: auth(tenantId) }).request("/customers", {
      method: "POST",
      headers: {
        authorization: `Bearer ${await token(human)}`,
        "content-type": "application/json",
        "idempotency-key": randomUUID(),
      },
      body: JSON.stringify({ name: "Synthetic auth customer" }),
    });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    await fixture.connect();
    await migrate(fixture, "packages/db/migrations");
    await fixture.query(
      "INSERT INTO beacon.tenants (id,name,created_at) VALUES ($1,'Synthetic A',now()),($2,'Synthetic B',now())",
      [tenantA, tenantB],
    );
    await fixture.query(
      "INSERT INTO beacon.agents (id,tenant_id,name,paused,created_at) VALUES ($1,$2,'Synthetic agent',false,now())",
      [agentId, tenantA],
    );
    await fixture.query(
      "INSERT INTO beacon.users (id,tenant_id,name,external_subject,created_at) VALUES ($1,$2,'Synthetic user','auth0|synthetic',now())",
      [userId, tenantA],
    );
    expect((await post(tenantA)).status).toBe(201);
    expect((await post(tenantA, true)).status).toBe(201);
    expect((await post(tenantB)).status).toBe(403);
    expect((await post(tenantB, true)).status).toBe(403);
    await fixture.query("UPDATE beacon.agents SET paused=true WHERE id=$1", [
      agentId,
    ]);
    expect((await post(tenantA)).status).toBe(403);
    expect(
      (
        await fixture.query(
          "SELECT count(*)::int AS count FROM beacon.customers",
        )
      ).rows[0].count,
    ).toBe(2);
  } finally {
    await store.close();
    await fixture.end();
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.end();
  }
}, 30_000);
