import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client, Pool } from "pg";
import { expect, it } from "vitest";
import {
  agencyModels,
  setupAgencyCustomer,
  withAccess,
} from "../../packages/db/src/access.js";
import { accessModels } from "../../packages/db/src/access-models.js";
import { sqlName } from "../../packages/db/src/models.js";
import {
  type AccessContext,
  accessRecordSchemas,
} from "../../packages/schemas/src/index.js";

const now = new Date("2026-10-01T10:00:00Z");
function fixture(tenantId = randomUUID(), userId = randomUUID()) {
  return {
    organization: {
      id: tenantId,
      name: "Fictional organization",
      createdAt: now,
      phase: "customer" as const,
      isAgencyCustomer: false,
    },
    user: {
      id: userId,
      tenantId,
      createdAt: now,
      name: "Fictional person",
      externalSubject: `fictional|${userId}`,
    },
    membership: {
      id: randomUUID(),
      tenantId,
      userId,
      createdAt: now,
      role: "customer_admin" as const,
      status: "active" as const,
      revokedAt: null,
    },
    approval: {
      id: randomUUID(),
      tenantId,
      createdAt: now,
      publication: {
        kind: "offer_publication" as const,
        target: { kind: "offer" as const, recordId: randomUUID(), version: 1 },
      },
      requestedBy: { kind: "human" as const, userId },
      reason: "Fictional proposal",
      expiresAt: new Date("2026-10-02T10:00:00Z"),
      status: "pending" as const,
      closedAt: null,
      decision: null,
    },
  };
}
function insert(client: Client, table: string, row: Record<string, unknown>) {
  const keys = Object.keys(row);
  return client.query(
    `INSERT INTO beacon."${table}" (${keys.map((key) => `"${sqlName(key)}"`).join(",")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(",")})`,
    Object.values(row),
  );
}
async function denied(
  client: Client,
  operation: () => Promise<unknown>,
  code = "42501",
) {
  await client.query("SAVEPOINT denied_operation");
  await expect(operation()).rejects.toMatchObject({ code });
  await client.query("ROLLBACK TO SAVEPOINT denied_operation");
}

it("upgrades existing tenants and enforces customer/founder isolation on real PostgreSQL", async () => {
  const databaseName = `roaswell_access_${randomUUID().replaceAll("-", "")}`;
  const owner = "postgresql://beacon_owner:local-owner-only@127.0.0.1:15432/";
  const administrator = new Client({ connectionString: `${owner}beacon` });
  const migrationClient = new Client({
    connectionString: `${owner}${databaseName}`,
  });
  const appUrl = `postgresql://beacon_app:local-development-only@127.0.0.1:15432/${databaseName}`;
  const customer = new Client({ connectionString: appUrl });
  const pool = new Pool({ connectionString: appUrl, max: 1 });
  const founder = new Client({ connectionString: `${owner}${databaseName}` });
  const a = fixture();
  const b = fixture();
  const legacyId = randomUUID();
  await administrator.connect();
  try {
    await administrator.query(`CREATE DATABASE "${databaseName}"`);
    await migrationClient.connect();
    // Prove upgrade from the already deployed schema, not just a fresh database.
    for (const name of [
      "0001_foundation.sql",
      "0002_data_model.sql",
      "0003_idempotency.sql",
    ])
      await migrationClient.query(
        await readFile(`packages/db/migrations/${name}`, "utf8"),
      );
    await insert(migrationClient, "tenants", {
      id: legacyId,
      name: "ROASWELL",
      createdAt: now,
    });
    await migrationClient.query(
      await readFile("packages/db/migrations/0004_access.sql", "utf8"),
    );
    expect(
      (
        await migrationClient.query(
          "SELECT phase,is_agency_customer FROM beacon.organizations WHERE id=$1",
          [legacyId],
        )
      ).rows,
    ).toEqual([{ phase: "prospect", is_agency_customer: false }]);
    expect(
      (await migrationClient.query("SELECT * FROM beacon.memberships")).rows,
    ).toEqual([]);
    // A separate fresh DB is covered by every existing migration integration test.
    for (const f of [a, b]) {
      for (const [name, row] of [
        [
          "tenants",
          { id: f.organization.id, name: f.organization.name, createdAt: now },
        ],
        ["organizations", f.organization],
        ["users", f.user],
        ["memberships", f.membership],
        ["version_approvals", f.approval],
      ] as const)
        await insert(migrationClient, name, row);
    }
    const flags = await migrationClient.query(
      "SELECT relname,relrowsecurity,relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='beacon' AND relname=ANY($1)",
      [["organizations", "memberships", "version_approvals"]],
    );
    expect(flags.rows).toHaveLength(3);
    expect(
      flags.rows.every((r) => r.relrowsecurity && r.relforcerowsecurity),
    ).toBe(true);
    const role = await migrationClient.query(
      "SELECT rolcanlogin,rolsuper,rolbypassrls,rolcreaterole,rolcreatedb FROM pg_roles WHERE rolname='beacon_founder'",
    );
    expect(role.rows[0]).toEqual({
      rolcanlogin: false,
      rolsuper: false,
      rolbypassrls: false,
      rolcreaterole: false,
      rolcreatedb: false,
    });
    await customer.connect();
    await customer.query("BEGIN");
    for (const table of ["organizations", "memberships"])
      expect(
        (await customer.query(`SELECT * FROM beacon.${table}`)).rows,
      ).toEqual([]);
    await denied(customer, () => customer.query("SET ROLE beacon_founder"));
    await denied(customer, () =>
      customer.query("SELECT * FROM beacon.version_approvals"),
    );
    await customer.query(
      "SELECT set_config('app.tenant_id',$1,true), set_config('app.user_id',$2,true),set_config('app.view','agency',true),set_config('app.agency_role','founder',true)",
      [a.organization.id, a.user.id],
    );
    expect(
      (await customer.query("SELECT id FROM beacon.organizations")).rows,
    ).toEqual([{ id: a.organization.id }]);
    expect(
      (await customer.query("SELECT id FROM beacon.memberships")).rows,
    ).toEqual([{ id: a.membership.id }]);
    for (const table of ["organizations", "memberships", "version_approvals"]) {
      await denied(customer, () =>
        customer.query(`DELETE FROM beacon.${table}`),
      );
      await denied(customer, () =>
        customer.query(`UPDATE beacon.${table} SET created_at=now()`),
      );
      await denied(customer, () => customer.query(`TRUNCATE beacon.${table}`));
      await denied(customer, () =>
        customer.query(
          `ALTER TABLE beacon.${table} DISABLE ROW LEVEL SECURITY`,
        ),
      );
    }
    await denied(customer, () =>
      insert(customer, "memberships", {
        ...a.membership,
        id: randomUUID(),
        userId: b.user.id,
      }),
    );
    await customer.query("SELECT set_config('app.tenant_id',$1,true)", [
      b.organization.id,
    ]);
    // Merely selecting a different tenant without its user membership grants nothing.
    expect(
      (await customer.query("SELECT * FROM beacon.organizations")).rows,
    ).toEqual([]);
    expect(
      (await customer.query("SELECT * FROM beacon.memberships")).rows,
    ).toEqual([]);
    await customer.query("ROLLBACK");
    await founder.connect();
    await founder.query("SET ROLE beacon_founder");
    const founderDb = drizzle(founder, { schema: agencyModels });
    expect(await founderDb.select().from(accessModels.organizations)).toEqual(
      [],
    );
    await founder.query("BEGIN");
    await founder.query("SELECT set_config('app.tenant_id',$1,true)", [
      a.organization.id,
    ]);
    for (const table of ["organizations", "memberships", "version_approvals"]) {
      expect(
        (await founder.query(`SELECT * FROM beacon.${table}`)).rows,
      ).toHaveLength(1);
      const tenantColumn = table === "organizations" ? "id" : "tenant_id";
      expect(
        (
          await founder.query(
            `UPDATE beacon.${table} SET created_at=$1 WHERE ${tenantColumn}=$2`,
            [now, b.organization.id],
          )
        ).rowCount,
      ).toBe(0);
      expect(
        (
          await founder.query(
            `DELETE FROM beacon.${table} WHERE ${tenantColumn}=$1`,
            [b.organization.id],
          )
        ).rowCount,
      ).toBe(0);
      await denied(founder, () =>
        founder.query(`UPDATE beacon.${table} SET ${tenantColumn}=$1`, [
          b.organization.id,
        ]),
      );
    }
    await denied(
      founder,
      () =>
        insert(founder, "memberships", {
          ...a.membership,
          id: randomUUID(),
          userId: b.user.id,
        }),
      "23503",
    );
    await denied(
      founder,
      () =>
        insert(founder, "memberships", {
          ...a.membership,
          id: randomUUID(),
          status: "revoked",
        }),
      "23514",
    );
    await denied(
      founder,
      () =>
        insert(founder, "memberships", {
          ...a.membership,
          id: randomUUID(),
          role: "founder",
        }),
      "23514",
    );
    await denied(
      founder,
      () =>
        insert(founder, "memberships", { ...a.membership, id: randomUUID() }),
      "23505",
    );
    for (const patch of [
      { requestedBy: { kind: "human", userId: b.user.id } },
      { requestedBy: { kind: "agent", agentId: randomUUID() } },
      {
        status: "approved",
        closedAt: now,
        decision: { userId: b.user.id, reason: "Fictional" },
      },
    ])
      await denied(
        founder,
        () =>
          insert(founder, "version_approvals", {
            ...a.approval,
            id: randomUUID(),
            ...patch,
          }),
        "23503",
      );
    for (const patch of [
      { status: "approved" },
      { decision: { userId: a.user.id, reason: "Fictional" } },
      { requestedBy: { kind: "human", userId: a.user.id, role: "founder" } },
      {
        publication: {
          kind: "offer_publication",
          target: { kind: "campaign", recordId: randomUUID(), version: 1 },
        },
      },
      {
        publication: {
          kind: "offer_publication",
          target: { kind: "offer", recordId: randomUUID(), version: 0 },
        },
      },
      {
        publication: {
          kind: "offer_publication",
          target: { kind: "offer", recordId: randomUUID(), version: "invalid" },
        },
      },
      { reason: " " },
    ])
      await denied(
        founder,
        () =>
          insert(founder, "version_approvals", {
            ...a.approval,
            id: randomUUID(),
            ...patch,
          }),
        "23514",
      );
    await founder.query("ROLLBACK");
    const database = drizzle(pool, { schema: agencyModels });
    const context: AccessContext = {
      view: "customer",
      tenantId: a.organization.id,
      userId: a.user.id,
      customerRole: "customer_admin",
    };
    const orgs = await withAccess(database, context, (tx) =>
      tx.select().from(accessModels.organizations),
    );
    expect(
      orgs.map((row) => accessRecordSchemas.organizations.parse(row)),
    ).toEqual([a.organization]);
    await expect(
      withAccess(
        database,
        { ...context, tenantId: b.organization.id },
        async () => undefined,
      ),
    ).rejects.toThrow("Active customer membership");
    await expect(
      withAccess(
        database,
        { ...context, customerRole: "customer_member" },
        async () => undefined,
      ),
    ).rejects.toThrow("Active customer membership");
    await expect(
      withAccess(
        database,
        {
          view: "agency",
          tenantId: a.organization.id,
          userId: a.user.id,
          agencyRole: "founder",
        },
        async () => undefined,
      ),
    ).rejects.toThrow("restricted beacon_founder");
    await expect(
      withAccess(
        drizzle(migrationClient, { schema: agencyModels }),
        context,
        async () => undefined,
      ),
    ).rejects.toThrow("restricted beacon_app");
    await expect(
      withAccess(database, context, async () => {
        throw new Error("fictional rollback");
      }),
    ).rejects.toThrow("fictional rollback");
    expect(await database.select().from(accessModels.organizations)).toEqual(
      [],
    );
    await migrationClient.query(
      "UPDATE beacon.memberships SET status='revoked',revoked_at=$1 WHERE tenant_id=$2",
      [now, a.organization.id],
    );
    await expect(
      withAccess(database, context, async () => undefined),
    ).rejects.toThrow("Active customer membership");
    // Explicit self-customer provisioning creates ordinary customer rights, plus audit.
    const self = fixture();
    const selfOrganization = {
      ...self.organization,
      name: "ROASWELL",
      isAgencyCustomer: true,
    };
    await expect(
      setupAgencyCustomer(database, {
        organization: selfOrganization,
        user: self.user,
        membership: self.membership,
      }),
    ).rejects.toThrow("restricted beacon_founder");
    expect(
      await setupAgencyCustomer(founderDb, {
        organization: selfOrganization,
        user: self.user,
        membership: self.membership,
      }),
    ).toEqual(selfOrganization);
    const selfContext: AccessContext = {
      view: "customer",
      tenantId: self.organization.id,
      userId: self.user.id,
      customerRole: "customer_admin",
    };
    expect(
      await withAccess(database, selfContext, (tx) =>
        tx.select().from(accessModels.organizations),
      ),
    ).toEqual([selfOrganization]);
    await expect(
      withAccess(database, selfContext, (tx) =>
        tx.select().from(accessModels.versionApprovals),
      ),
    ).rejects.toMatchObject({ cause: { code: "42501" } });
    const founderContext: AccessContext = {
      view: "agency",
      tenantId: self.organization.id,
      userId: self.user.id,
      agencyRole: "founder",
    };
    expect(
      await withAccess(founderDb, founderContext, (tx) =>
        tx.select().from(accessModels.memberships),
      ),
    ).toEqual([self.membership]);
    await expect(
      withAccess(
        founderDb,
        { ...founderContext, userId: randomUUID() },
        async () => undefined,
      ),
    ).rejects.toThrow("Founder actor must exist");
    const second = fixture();
    await expect(
      setupAgencyCustomer(founderDb, {
        organization: { ...second.organization, isAgencyCustomer: true },
        user: second.user,
        membership: second.membership,
      }),
    ).rejects.toMatchObject({ cause: { code: "23505" } });
    expect(
      (
        await migrationClient.query(
          "SELECT * FROM beacon.tenants WHERE id=$1",
          [second.organization.id],
        )
      ).rows,
    ).toEqual([]);
    expect(
      (
        await migrationClient.query(
          "SELECT action FROM beacon.audit_logs WHERE tenant_id=$1",
          [self.organization.id],
        )
      ).rows,
    ).toEqual([{ action: "organization.agency_customer.setup" }]);
    // Founder access can deliberately choose another organization, without wildcard RLS.
    expect(
      await withAccess(
        founderDb,
        {
          view: "agency",
          tenantId: b.organization.id,
          userId: b.user.id,
          agencyRole: "founder",
        },
        (tx) => tx.select().from(accessModels.versionApprovals),
      ),
    ).toEqual([b.approval]);
    expect(await founderDb.select().from(accessModels.organizations)).toEqual(
      [],
    );
    // Stored rows are parsed back into discriminated records at the repository boundary.
    await withAccess(
      founderDb,
      {
        view: "agency",
        tenantId: b.organization.id,
        userId: b.user.id,
        agencyRole: "founder",
      },
      async (tx) => {
        const rows = await tx
          .select()
          .from(accessModels.versionApprovals)
          .where(eq(accessModels.versionApprovals.id, b.approval.id));
        expect(accessRecordSchemas.versionApprovals.parse(rows[0])).toEqual(
          b.approval,
        );
        await tx.execute(
          sql`UPDATE beacon.version_approvals SET status='approved',closed_at=${now.toISOString()},decision=${JSON.stringify({ userId: b.user.id, reason: "Fictional review" })}::jsonb WHERE id=${b.approval.id}`,
        );
      },
    );
  } finally {
    await customer.end();
    await pool.end();
    await founder.end();
    await migrationClient.end();
    await administrator.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await administrator.end();
  }
}, 60000);
