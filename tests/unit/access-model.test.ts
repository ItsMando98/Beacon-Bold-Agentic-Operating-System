import { readFileSync } from "node:fs";
import { getTableColumns } from "drizzle-orm";
import { getTableConfig } from "drizzle-orm/pg-core";
import { expect, it } from "vitest";
import { renderAccessMigration } from "../../packages/db/src/access-migration.js";
import {
  accessModels,
  accessStorageShape,
} from "../../packages/db/src/access-models.js";
import { accessRecordSchemas, z } from "../../packages/schemas/src/index.js";

it("derives access storage from every discriminated Zod branch", () => {
  for (const name of Object.keys(
    accessModels,
  ) as (keyof typeof accessModels)[]) {
    const shape = accessStorageShape(accessRecordSchemas[name]);
    const columns = getTableColumns(accessModels[name]);
    expect(Object.keys(columns)).toEqual(Object.keys(shape));
    for (const [key, contract] of Object.entries(shape)) {
      const column = columns[key as keyof typeof columns];
      expect(column.getSQLType()).toBe(contract.meta()?.storage);
      expect(column.notNull).toBe(!contract.safeParse(null).success);
    }
    expect(getTableConfig(accessModels[name]).enableRLS).toBe(true);
  }
  expect(() => accessStorageShape(z.string())).toThrow(
    "Expected record object",
  );
  expect(() => accessStorageShape(z.object({ id: z.uuid() }))).toThrow(
    "Inconsistent storage",
  );
});

it("keeps generated forward SQL current and leaves applied history intact", () => {
  expect(
    readFileSync("packages/db/migrations/0004_access.sql", "utf8").replaceAll(
      "\r\n",
      "\n",
    ),
  ).toBe(renderAccessMigration());
  expect(renderAccessMigration()).toContain("NOLOGIN NOSUPERUSER NOBYPASSRLS");
  expect(renderAccessMigration()).not.toContain(
    "GRANT beacon_founder TO beacon_app",
  );
});
