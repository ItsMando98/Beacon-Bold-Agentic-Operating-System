import type { SQL } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { models } from "./models.js";

const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
const qualified = (name: string) => `"beacon".${quote(name)}`;
function expression(value: SQL): string {
  const query = new PgDialect().sqlToQuery(value);
  return query.sql.replace(/\$(\d+)/g, (_, index: string) => {
    const parameter = query.params[Number(index) - 1];
    if (typeof parameter === "number") return String(parameter);
    if (typeof parameter === "string")
      return `'${parameter.replaceAll("'", "''")}'`;
    throw new Error("Unsupported migration literal");
  });
}

/** Deterministic snapshot generator. Existing applied SQL is never overwritten by runtime. */
export function renderDataModelMigration(): string {
  const configs = Object.values(models).map(getTableConfig);
  const statements = [
    "-- P1-1: generated from the Zod-derived Drizzle model. Forward migration only.",
  ];
  for (const config of configs) {
    const definitions = config.columns.map(
      (column) =>
        `${quote(column.name)} ${column.getSQLType()}${column.notNull ? " NOT NULL" : ""}`,
    );
    for (const key of config.primaryKeys)
      definitions.push(
        `PRIMARY KEY (${key.columns.map((column) => quote(column.name)).join(", ")})`,
      );
    for (const constraint of config.checks)
      definitions.push(
        `CONSTRAINT ${quote(constraint.name)} CHECK (${expression(constraint.value)})`,
      );
    statements.push(
      `CREATE TABLE ${qualified(config.name)} (\n  ${definitions.join(",\n  ")}\n);`,
    );
  }
  for (const config of configs) {
    for (const key of config.foreignKeys) {
      const reference = key.reference();
      const target = getTableConfig(reference.foreignTable).name;
      statements.push(
        `ALTER TABLE ${qualified(config.name)} ADD CONSTRAINT ${quote(key.getName())} FOREIGN KEY (${reference.columns.map((column) => quote(column.name)).join(", ")}) REFERENCES ${qualified(target)} (${reference.foreignColumns.map((column) => quote(column.name)).join(", ")});`,
      );
      // Tenant-leading indexes support joins and the referencing side of integrity checks.
      if (reference.columns.length > 1)
        statements.push(
          `CREATE INDEX ${quote(`${config.name}_${reference.columns[1].name}_idx`)} ON ${qualified(config.name)} (${reference.columns.map((column) => quote(column.name)).join(", ")});`,
        );
    }
    statements.push(
      `ALTER TABLE ${qualified(config.name)} ENABLE ROW LEVEL SECURITY;`,
    );
    statements.push(
      `ALTER TABLE ${qualified(config.name)} FORCE ROW LEVEL SECURITY;`,
    );
    for (const policy of config.policies) {
      if (!policy.using || !policy.withCheck)
        throw new Error("Tenant policy must cover reads and writes");
      statements.push(
        `CREATE POLICY ${quote(policy.name)} ON ${qualified(config.name)} TO beacon_app USING (${expression(policy.using)}) WITH CHECK (${expression(policy.withCheck)});`,
      );
    }
    const privileges =
      config.name === "audit_logs"
        ? "SELECT, INSERT"
        : "SELECT, INSERT, UPDATE, DELETE";
    statements.push(
      `GRANT ${privileges} ON ${qualified(config.name)} TO beacon_app;`,
    );
  }
  return `${statements.join("\n\n")}\n`;
}
