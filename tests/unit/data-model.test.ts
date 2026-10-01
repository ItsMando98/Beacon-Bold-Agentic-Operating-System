import { readFileSync } from "node:fs";
import { getTableColumns } from "drizzle-orm";
import { type AnyPgColumn, getTableConfig } from "drizzle-orm/pg-core";
import { expect, expectTypeOf, it } from "vitest";
import { renderDataModelMigration } from "../../packages/db/src/model-migration.js";
import { models } from "../../packages/db/src/models.js";
import {
  type Entity,
  type EntityName,
  entitySchemas,
} from "../../packages/schemas/src/index.js";

it("derives every column, nullability and row type from the common contracts", () => {
  expect(Object.keys(models)).toEqual(Object.keys(entitySchemas));
  expectTypeOf<typeof models.customers.$inferSelect>().toEqualTypeOf<
    Entity<"customers">
  >();
  expectTypeOf<typeof models.approvals.$inferSelect>().toEqualTypeOf<
    Entity<"approvals">
  >();
  for (const name of Object.keys(models) as EntityName[]) {
    const columns: Record<string, AnyPgColumn> = getTableColumns(models[name]);
    const shape = entitySchemas[name].shape;
    expect(Object.keys(columns)).toEqual(Object.keys(shape));
    for (const [key, contract] of Object.entries(shape)) {
      expect(columns[key].getSQLType()).toBe(contract.meta()?.storage);
      expect(columns[key].notNull).toBe(!contract.safeParse(null).success);
    }
    const config = getTableConfig(models[name]);
    expect(config.enableRLS).toBe(true);
    expect(config.policies).toHaveLength(1);
    for (const key of config.foreignKeys) {
      const reference = key.reference();
      if (getTableConfig(reference.foreignTable).name !== "tenants") {
        expect(reference.columns[0].name).toBe("tenant_id");
        expect(reference.foreignColumns[0].name).toBe("tenant_id");
      }
    }
  }
});

it("keeps the forward migration in sync with the derived Drizzle model", () => {
  expect(
    readFileSync(
      "packages/db/migrations/0002_data_model.sql",
      "utf8",
    ).replaceAll("\r\n", "\n"),
  ).toBe(renderDataModelMigration());
});

it("rejects invalid amounts and unplanned invoice states in the contract", () => {
  const invoice = {
    id: "00000000-0000-4000-8000-000000000001",
    tenantId: "00000000-0000-4000-8000-000000000002",
    createdAt: new Date(),
    customerId: "00000000-0000-4000-8000-000000000003",
    projectId: null,
    amountMinor: 100,
    currency: "EUR",
    status: "draft",
  };
  expect(entitySchemas.invoices.safeParse(invoice).success).toBe(true);
  for (const change of [
    { amountMinor: -1 },
    { amountMinor: 0.1 },
    { currency: "eur" },
    { status: "paid" },
  ]) {
    expect(
      entitySchemas.invoices.safeParse({ ...invoice, ...change }).success,
    ).toBe(false);
  }
});
