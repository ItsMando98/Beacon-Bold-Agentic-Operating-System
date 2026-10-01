import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from "jose";
import { Client } from "pg";
import { expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import { migrate } from "../../packages/db/migrate.mjs";
import { agencyModels } from "../../packages/db/src/access.js";
import { revokeAuthorization } from "../../packages/db/src/revoke-authorization.js";
import { createPostgresCustomerStore } from "../../packages/integrations/src/api.js";
import { createAuth0Authenticator } from "../../packages/integrations/src/auth.js";

it("enforces persisted rights, scope expiry, audit and concurrent revocation on signed requests", async () => {
  const name = `roaswell_authorization_${randomUUID().replaceAll("-", "")}`;
  const owner = "postgresql://beacon_owner:local-owner-only@127.0.0.1:15432/";
  const admin = new Client({ connectionString: `${owner}beacon` });
  const fixture = new Client({ connectionString: owner + name });
  const observer = new Client({ connectionString: owner + name });
  const appClient = new Client({
    connectionString: `postgresql://beacon_app:local-development-only@127.0.0.1:15432/${name}`,
  });
  const store = createPostgresCustomerStore(
    `postgresql://beacon_app:local-development-only@127.0.0.1:15432/${name}`,
  );
  const tenantId = randomUUID(),
    otherTenant = randomUUID(),
    userId = randomUUID(),
    agentId = randomUUID(),
    grantId = randomUUID();
  const keypair = await generateKeyPair("RS256");
  const jwks = createLocalJWKSet({
    keys: [{ ...(await exportJWK(keypair.publicKey)), kid: "synthetic" }],
  });
  const issuer = "https://synthetic.auth0.com/",
    audience = "https://api.example.invalid";
  const authenticator = (tenant = tenantId) =>
    createAuth0Authenticator(
      {
        issuer,
        audience,
        humanClientId: "human",
        bindings: [
          {
            kind: "human",
            tenantId: tenant,
            subject: "auth0|synthetic",
            userId,
            scopes: ["customers:write", "organizations:read"],
          },
          {
            kind: "m2m",
            tenantId: tenant,
            clientId: "agent",
            agentId,
            scopes: ["customers:write", "organizations:read"],
          },
          {
            kind: "oauth",
            tenantId: tenant,
            subject: "auth0|synthetic",
            clientId: "delegated",
            agentId,
            scopes: ["customers:write", "organizations:read"],
          },
        ],
      },
      jwks,
    );
  async function token(
    kind = "human",
    scope = "customers:write organizations:read",
  ) {
    return new SignJWT({
      sub: kind === "m2m" ? "agent@clients" : "auth0|synthetic",
      azp: kind === "human" ? "human" : kind === "m2m" ? "agent" : "delegated",
      gty: kind === "m2m" ? "client-credentials" : undefined,
      scope,
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT", kid: "synthetic" })
      .setIssuer(issuer)
      .setAudience(audience)
      .setIssuedAt()
      .setExpirationTime("3m")
      .sign(keypair.privateKey);
  }
  async function call(
    method = "GET",
    kind = "human",
    key = randomUUID(),
    scope?: string,
    tenant = tenantId,
    bodyName = "Private fixture briefing",
  ) {
    return createApp({ store, authenticate: authenticator(tenant) }).request(
      method === "GET"
        ? `/v1/organization?tenantId=${otherTenant}`
        : "/customers",
      {
        method,
        headers: {
          authorization: `Bearer ${await token(kind, scope)}`,
          "x-tenant-id": otherTenant,
          "x-agency-role": "founder",
          "x-view": "agency",
          "idempotency-key": key,
          "content-type": "application/json",
        },
        ...(method === "POST"
          ? { body: JSON.stringify({ name: bodyName }) }
          : {}),
      },
    );
  }
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    await fixture.connect();
    await observer.connect();
    await appClient.connect();
    await migrate(fixture, "packages/db/migrations");
    await migrate(fixture, "packages/db/migrations");
    await fixture.query(
      "INSERT INTO beacon.tenants VALUES($1,'Synthetic A',now()),($2,'Synthetic B',now())",
      [tenantId, otherTenant],
    );
    await fixture.query(
      "INSERT INTO beacon.organizations SELECT id,name,created_at,'customer',false FROM beacon.tenants",
    );
    await fixture.query(
      "INSERT INTO beacon.users VALUES($1,$2,now(),'Synthetic user','auth0|synthetic')",
      [userId, tenantId],
    );
    await fixture.query(
      "INSERT INTO beacon.agents VALUES($1,$2,now(),'Synthetic agent',false)",
      [agentId, tenantId],
    );
    expect((await call()).status).toBe(403);
    await fixture.query(
      "INSERT INTO beacon.memberships VALUES($1,$2,now(),$3,'customer_admin','active',null)",
      [randomUUID(), tenantId, userId],
    );
    const organization = await call();
    expect(organization.status).toBe(200);
    expect((await organization.json()).id).toBe(tenantId);
    expect((await call("POST")).status).toBe(403);
    expect((await call("GET", "human", randomUUID(), "")).status).toBe(403);
    expect(
      (await call("GET", "human", randomUUID(), undefined, otherTenant)).status,
    ).toBe(403);
    await fixture.query(
      "INSERT INTO beacon.agency_memberships VALUES($1,$2,now(),$3,'founder','active',null,'human')",
      [randomUUID(), tenantId, userId],
    );
    const replayKey = randomUUID();
    await fixture.query(
      "UPDATE beacon.agency_memberships SET client_id='portal' WHERE tenant_id=$1",
      [tenantId],
    );
    expect((await call("POST")).status).toBe(403);
    await fixture.query(
      "UPDATE beacon.agency_memberships SET client_id='human' WHERE tenant_id=$1",
      [tenantId],
    );
    const first = await call("POST", "human", replayKey);
    expect(first.status).toBe(201);
    const created = await first.json();
    expect(await (await call("POST", "human", replayKey)).json()).toEqual(
      created,
    );
    expect(
      (
        await call(
          "POST",
          "human",
          replayKey,
          undefined,
          tenantId,
          "Different fixture",
        )
      ).status,
    ).toBe(409);
    await fixture.query(
      "UPDATE beacon.agency_memberships SET status='revoked',revoked_at=now() WHERE tenant_id=$1",
      [tenantId],
    );
    expect((await call("POST", "human", replayKey)).status).toBe(403);
    expect((await call()).status).toBe(200);
    await fixture.query(
      "UPDATE beacon.memberships SET status='revoked',revoked_at=now() WHERE tenant_id=$1",
      [tenantId],
    );
    expect((await call()).status).toBe(403);
    await fixture.query(
      "UPDATE beacon.agency_memberships SET status='active',revoked_at=null WHERE tenant_id=$1",
      [tenantId],
    );
    expect((await call("POST")).status).toBe(201);
    // No customer membership means even a founder cannot use the customer resource view.
    expect((await call()).status).toBe(403);
    expect((await call("POST", "m2m")).status).toBe(403);
    await fixture.query(
      "INSERT INTO beacon.agent_grants VALUES($1,$2,now(),$3,'m2m','agent@clients','agent',null,'customer','[\"organizations:read\"]',now()+interval '1 hour','active',null)",
      [grantId, tenantId, agentId],
    );
    expect((await call("GET", "m2m")).status).toBe(200);
    expect((await call("POST", "m2m")).status).toBe(403);
    expect((await call("GET", "oauth")).status).toBe(403);
    await fixture.query(
      "UPDATE beacon.agent_grants SET kind='oauth',subject='auth0|synthetic',client_id='delegated' WHERE id=$1",
      [grantId],
    );
    expect((await call("GET", "oauth")).status).toBe(200);
    await fixture.query(
      "UPDATE beacon.agent_grants SET kind='m2m',subject='agent@clients',client_id='agent' WHERE id=$1",
      [grantId],
    );
    await fixture.query(
      "UPDATE beacon.agent_grants SET view='agency',scopes='[\"customers:write\"]' WHERE id=$1",
      [grantId],
    );
    expect((await call("POST", "m2m")).status).toBe(201);
    expect((await call("GET", "m2m")).status).toBe(403);
    expect((await call("POST", "m2m", randomUUID(), "")).status).toBe(403);
    await fixture.query(
      "UPDATE beacon.agent_grants SET client_id='different' WHERE id=$1",
      [grantId],
    );
    expect((await call("POST", "m2m")).status).toBe(403);
    await fixture.query(
      "UPDATE beacon.agent_grants SET client_id='agent',expires_at=now()-interval '1 second' WHERE id=$1",
      [grantId],
    );
    expect((await call("POST", "m2m")).status).toBe(403);
    await fixture.query(
      "UPDATE beacon.agent_grants SET expires_at=now()+interval '1 hour',status='revoked',revoked_at=now() WHERE id=$1",
      [grantId],
    );
    expect((await call("POST", "m2m")).status).toBe(403);
    await fixture.query(
      "UPDATE beacon.agent_grants SET status='active',revoked_at=null WHERE id=$1",
      [grantId],
    );
    await fixture.query("UPDATE beacon.agents SET paused=true WHERE id=$1", [
      agentId,
    ]);
    expect((await call("POST", "m2m")).status).toBe(403);
    await fixture.query("UPDATE beacon.agents SET paused=false WHERE id=$1", [
      agentId,
    ]);
    await fixture.query(
      "UPDATE beacon.organizations SET phase='suspended' WHERE id=$1",
      [tenantId],
    );
    expect((await call("POST", "m2m")).status).toBe(403);
    expect((await call("POST")).status).toBe(403);
    await fixture.query(
      "UPDATE beacon.organizations SET phase='customer' WHERE id=$1",
      [tenantId],
    );
    // SQL constraints also protect raw operator writes and cross-tenant references.
    await fixture.query("BEGIN");
    for (const scopes of [
      "[42]",
      '["*"]',
      JSON.stringify(Array(101).fill("customers:write")),
    ]) {
      await fixture.query("SAVEPOINT invalid_grant");
      await expect(
        fixture.query("UPDATE beacon.agent_grants SET scopes=$1 WHERE id=$2", [
          scopes,
          grantId,
        ]),
      ).rejects.toMatchObject({ code: "23514" });
      await fixture.query("ROLLBACK TO SAVEPOINT invalid_grant");
    }
    await fixture.query("SAVEPOINT invalid_grant");
    await expect(
      fixture.query(
        "INSERT INTO beacon.agency_memberships VALUES($1,$2,now(),$3,'founder','active',null,'human')",
        [randomUUID(), otherTenant, userId],
      ),
    ).rejects.toMatchObject({ code: "23503" });
    await fixture.query("ROLLBACK");
    await appClient.query("BEGIN");
    await appClient.query(
      "SELECT set_config('app.tenant_id',$1,true),set_config('app.actor_id',$2,true)",
      [otherTenant, agentId],
    );
    expect(
      (await appClient.query("SELECT * FROM beacon.agent_grants")).rows,
    ).toEqual([]);
    await appClient.query("SAVEPOINT readonly_grant");
    await expect(
      appClient.query("UPDATE beacon.agent_grants SET status='active'"),
    ).rejects.toMatchObject({ code: "42501" });
    await appClient.query("ROLLBACK");
    // In-flight authorized action commits first; revocation then blocks all follow-ups.
    await fixture.query(
      "CREATE FUNCTION beacon.slow_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_sleep(1); RETURN NEW; END $$; CREATE TRIGGER slow_fixture BEFORE INSERT ON beacon.customers FOR EACH ROW EXECUTE FUNCTION beacon.slow_fixture()",
    );
    const concurrentKey = randomUUID();
    const inFlight = call("POST", "m2m", concurrentKey);
    await expect
      .poll(
        async () =>
          (
            await observer.query(
              "SELECT pg_try_advisory_xact_lock(hashtextextended($1,0)) AS unlocked",
              [`roaswell-access/${tenantId}`],
            )
          ).rows[0].unlocked,
        { timeout: 5000, interval: 20 },
      )
      .toBe(false);
    const revocation = fixture.query(
      "UPDATE beacon.agent_grants SET status='revoked',revoked_at=now() WHERE id=$1",
      [grantId],
    );
    expect((await inFlight).status).toBe(201);
    await revocation;
    expect((await call("POST", "m2m", concurrentKey)).status).toBe(403);
    const context = {
      view: "agency" as const,
      tenantId,
      userId,
      agencyRole: "founder" as const,
    };
    await expect(
      revokeAuthorization(
        drizzle(appClient, { schema: agencyModels }),
        context,
        { kind: "agent_grant", id: grantId, reason: "Synthetic revoke" },
      ),
    ).rejects.toThrow("restricted beacon_founder");
    await fixture.query("SET ROLE beacon_founder");
    await revokeAuthorization(
      drizzle(fixture, { schema: agencyModels }),
      context,
      { kind: "agent_grant", id: grantId, reason: "Synthetic revoke" },
    );
    await fixture.query("RESET ROLE");
    const logs = (
      await fixture.query(
        "SELECT tenant_id,user_id,agent_id,outcome,details FROM beacon.audit_logs ORDER BY created_at",
      )
    ).rows;
    expect(
      logs.some(
        (row) =>
          row.outcome === "failed" && row.details.reason === "operation_failed",
      ),
    ).toBe(true);
    expect(
      logs.some(
        (row) => row.outcome === "denied" && row.details.actorId === agentId,
      ),
    ).toBe(true);
    expect(
      logs.some((row) => row.outcome === "succeeded" && row.user_id === userId),
    ).toBe(true);
    for (const row of logs) {
      if (row.details.operationId !== "revokeAuthorization")
        expect(row.details.requestId).toMatch(/^[0-9a-f-]{36}$/);
      expect(row.details.operationId).toMatch(
        /^(getOrganization|createCustomer|revokeAuthorization)$/,
      );
    }
    expect(JSON.stringify(logs)).not.toContain("Private fixture briefing");
    expect(JSON.stringify(logs)).not.toContain("auth0|synthetic");
    expect(
      (
        await fixture.query(
          "SELECT count(*)::int AS count FROM beacon.customers",
        )
      ).rows[0].count,
    ).toBe(4);
  } finally {
    await store.close();
    await appClient.end();
    await observer.end();
    await fixture.end();
    await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.end();
  }
}, 30000);
