import { accessRecordSchemas, z } from "@roaswell/schemas";
import { sql } from "drizzle-orm";
import {
  foreignKey,
  pgPolicy,
  pgRole,
  pgSchema,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { columns, tenants, users } from "./models.js";

const namespace = pgSchema("beacon");
const founder = pgRole("beacon_founder").existing();
const customer = pgRole("beacon_app").existing();
const tenant = sql`NULLIF(current_setting('app.tenant_id', true), '')::uuid`;
const actor = sql`NULLIF(current_setting('app.user_id', true), '')::uuid`;

/** Flatten only storage columns; the discriminated record is validated on reads/writes. */
export function accessStorageShape<S extends z.ZodType>(
  contract: S,
): { [K in keyof z.output<S>]: z.ZodType<z.output<S>[K]> } {
  const variants =
    contract instanceof z.ZodDiscriminatedUnion ? contract.options : [contract];
  const fields: Record<string, z.ZodType[]> = {};
  for (const variant of variants) {
    if (!(variant instanceof z.ZodObject))
      throw new Error("Expected record object");
    for (const [key, value] of Object.entries(variant.shape) as [
      string,
      z.ZodType,
    ][]) {
      fields[key] ??= [];
      fields[key].push(value);
    }
  }
  return Object.fromEntries(
    Object.entries(fields).map(([key, values]) => {
      const storage = values[0].meta()?.storage;
      if (
        !storage ||
        values.length !== variants.length ||
        values.some((value) => value.meta()?.storage !== storage)
      )
        throw new Error(`Inconsistent storage: ${key}`);
      return [
        key,
        values.length === 1
          ? values[0]
          : z
              .union(values as [z.ZodType, z.ZodType, ...z.ZodType[]])
              .meta({ storage }),
      ];
    }),
  ) as { [K in keyof z.output<S>]: z.ZodType<z.output<S>[K]> };
}

export const organizations = namespace
  .table(
    "organizations",
    columns(accessStorageShape(accessRecordSchemas.organizations)),
    (t) => [
      primaryKey({ columns: [t.id] }),
      foreignKey({ columns: [t.id], foreignColumns: [tenants.id] }),
      uniqueIndex("single_agency_customer")
        .on(t.isAgencyCustomer)
        .where(sql`${t.isAgencyCustomer} = true`),
      pgPolicy("founder_organization", {
        to: founder,
        for: "all",
        using: sql`${t.id} = ${tenant}`,
        withCheck: sql`${t.id} = ${tenant}`,
      }),
      pgPolicy("customer_organization", {
        to: customer,
        for: "select",
        using: sql`${t.id} = ${tenant} AND EXISTS (SELECT 1 FROM beacon.memberships m WHERE m.tenant_id = ${t.id} AND m.user_id = ${actor} AND m.status = 'active')`,
      }),
    ],
  )
  .enableRLS();

export const memberships = namespace
  .table(
    "memberships",
    columns(accessStorageShape(accessRecordSchemas.memberships)),
    (t) => [
      primaryKey({ columns: [t.tenantId, t.id] }),
      foreignKey({ columns: [t.tenantId], foreignColumns: [organizations.id] }),
      foreignKey({
        columns: [t.tenantId, t.userId],
        foreignColumns: [users.tenantId, users.id],
      }),
      uniqueIndex("membership_user").on(t.tenantId, t.userId),
      pgPolicy("founder_membership", {
        to: founder,
        for: "all",
        using: sql`${t.tenantId} = ${tenant}`,
        withCheck: sql`${t.tenantId} = ${tenant}`,
      }),
      pgPolicy("customer_membership", {
        to: customer,
        for: "select",
        using: sql`${t.tenantId} = ${tenant} AND ${t.userId} = ${actor} AND ${t.status} = 'active'`,
      }),
    ],
  )
  .enableRLS();

export const versionApprovals = namespace
  .table(
    "version_approvals",
    columns(accessStorageShape(accessRecordSchemas.versionApprovals)),
    (t) => [
      primaryKey({ columns: [t.tenantId, t.id] }),
      foreignKey({ columns: [t.tenantId], foreignColumns: [organizations.id] }),
      // Customer publication rules are implemented in R1-05. Drafts stay founder-only.
      pgPolicy("founder_version_approval", {
        to: founder,
        for: "all",
        using: sql`${t.tenantId} = ${tenant}`,
        withCheck: sql`${t.tenantId} = ${tenant}`,
      }),
    ],
  )
  .enableRLS();

export const accessModels = { organizations, memberships, versionApprovals };
