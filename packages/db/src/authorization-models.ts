import { authorizationRecords } from "@roaswell/schemas";
import { sql } from "drizzle-orm";
import {
  foreignKey,
  pgPolicy,
  pgRole,
  pgSchema,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { accessStorageShape, organizations } from "./access-models.js";
import { columns, models } from "./models.js";

const namespace = pgSchema("beacon");
const app = pgRole("beacon_app").existing();
const founder = pgRole("beacon_founder").existing();
const tenant = sql`NULLIF(current_setting('app.tenant_id', true), '')::uuid`;
const actor = sql`NULLIF(current_setting('app.actor_id', true), '')::uuid`;
export const agencyMemberships = namespace
  .table(
    "agency_memberships",
    columns(accessStorageShape(authorizationRecords.agencyMemberships)),
    (t) => [
      primaryKey({ columns: [t.tenantId, t.id] }),
      foreignKey({ columns: [t.tenantId], foreignColumns: [organizations.id] }),
      foreignKey({
        columns: [t.tenantId, t.userId],
        foreignColumns: [models.users.tenantId, models.users.id],
      }),
      uniqueIndex("agency_membership_user").on(t.tenantId, t.userId),
      pgPolicy("founder_management", {
        to: founder,
        for: "all",
        using: sql`${t.tenantId}=${tenant}`,
        withCheck: sql`${t.tenantId}=${tenant}`,
      }),
      pgPolicy("own_grant", {
        to: app,
        for: "select",
        using: sql`${t.tenantId}=${tenant} AND ${t.userId}=${actor}`,
      }),
    ],
  )
  .enableRLS();
export const agentGrants = namespace
  .table(
    "agent_grants",
    columns(accessStorageShape(authorizationRecords.agentGrants)),
    (t) => [
      primaryKey({ columns: [t.tenantId, t.id] }),
      foreignKey({ columns: [t.tenantId], foreignColumns: [organizations.id] }),
      foreignKey({
        columns: [t.tenantId, t.agentId],
        foreignColumns: [models.agents.tenantId, models.agents.id],
      }),
      uniqueIndex("agent_grant_identity").on(
        t.tenantId,
        t.agentId,
        t.kind,
        t.subject,
        t.clientId,
      ),
      pgPolicy("founder_management", {
        to: founder,
        for: "all",
        using: sql`${t.tenantId}=${tenant}`,
        withCheck: sql`${t.tenantId}=${tenant}`,
      }),
      pgPolicy("own_grant", {
        to: app,
        for: "select",
        using: sql`${t.tenantId}=${tenant} AND ${t.agentId}=${actor}`,
      }),
    ],
  )
  .enableRLS();
export const authorizationModels = { agencyMemberships, agentGrants };
