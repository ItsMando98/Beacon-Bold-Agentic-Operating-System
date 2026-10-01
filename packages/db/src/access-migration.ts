import { accessRecordSchemas, toWireSchema, z } from "@roaswell/schemas";
import type { SQL } from "drizzle-orm";
import { getTableConfig, PgDialect } from "drizzle-orm/pg-core";
import { accessModels } from "./access-models.js";
import { models, sqlName } from "./models.js";

const quote = (name: string) => `"${name.replaceAll('"', '""')}"`;
const literal = (value: string) => `'${value.replaceAll("'", "''")}'`;
const qualified = (name: string) => `"beacon".${quote(name)}`;
export function expression(value: SQL) {
  const query = new PgDialect().sqlToQuery(value);
  return query.sql.replace(/\$(\d+)/g, (_, index: string) => {
    const parameter = query.params[Number(index) - 1];
    if (typeof parameter === "string") return literal(parameter);
    if (typeof parameter === "number" || typeof parameter === "boolean")
      return String(parameter);
    throw new Error("Unsupported migration literal");
  });
}

/** Compile this bounded JSON Schema subset, refusing unsupported constraints. */
export function validation(
  schema: z.core.JSONSchema._JSONSchema,
  value: string,
): string {
  if (typeof schema === "boolean")
    throw new Error("Boolean schema is not supported");
  const allowed = new Set([
    "$schema",
    "type",
    "properties",
    "required",
    "additionalProperties",
    "anyOf",
    "enum",
    "const",
    "minimum",
    "maximum",
    "minLength",
    "maxLength",
    "format",
    "pattern",
    "storage",
    "items",
    "maxItems",
  ]);
  for (const key of Object.keys(schema))
    if (!allowed.has(key))
      throw new Error(`Unsupported contract keyword: ${key}`);
  const checks: string[] = [];
  if (schema.anyOf)
    checks.push(
      `(${schema.anyOf.map((item) => validation(item, value)).join(" OR ")})`,
    );
  if (schema.type) {
    const type = schema.type === "integer" ? "number" : schema.type;
    if (typeof type !== "string")
      throw new Error("Expected scalar schema type");
    if (
      !["number", "string", "boolean", "object", "null", "array"].includes(type)
    )
      throw new Error(`Unsupported storage type: ${type}`);
    checks.push(`jsonb_typeof(${value}) = ${literal(type)}`);
    if (type === "array") {
      const item = schema.items;
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item) ||
        item.type !== "string" ||
        !item.pattern ||
        Object.keys(item).some((key) => !["type", "pattern"].includes(key))
      )
        throw new Error("Only constrained scope arrays are supported");
      const path = `strict $[*] ? (@.type() != "string" || !(@ like_regex ${JSON.stringify(item.pattern)}))`;
      checks.push(
        `CASE WHEN jsonb_typeof(${value}) = 'array' THEN ${schema.maxItems === undefined ? "true" : `jsonb_array_length(${value}) <= ${schema.maxItems}`} AND NOT jsonb_path_exists(${value}, ${literal(path)}::jsonpath) ELSE false END`,
      );
    }
    if (type === "object") {
      if (
        schema.additionalProperties !== false ||
        Object.keys(schema.properties ?? {}).some(
          (key) => !schema.required?.includes(key),
        )
      )
        throw new Error("Expected closed object with required fields");
      for (const [key, child] of Object.entries(schema.properties ?? {}))
        checks.push(validation(child, `(${value}->${literal(key)})`));
      if (schema.additionalProperties === false)
        checks.push(
          `(${value} - ARRAY[${Object.keys(schema.properties ?? {})
            .map(literal)
            .join(", ")}]::text[]) = '{}'::jsonb`,
        );
      for (const key of schema.required ?? [])
        checks.push(`${value} ? ${literal(key)}`);
    }
    if (type === "string") {
      if (schema.minLength !== undefined)
        checks.push(`length(btrim(${value} #>> '{}')) >= ${schema.minLength}`);
      if (schema.maxLength !== undefined)
        checks.push(`length(${value} #>> '{}') <= ${schema.maxLength}`);
      if (schema.pattern && schema.format !== "date-time")
        checks.push(`(${value} #>> '{}') ~ ${literal(schema.pattern)}`);
      // Timestamps are native PostgreSQL values; JSON date-time spelling can differ.
      if (schema.format && !["uuid", "date-time"].includes(schema.format))
        throw new Error(`Unsupported format: ${schema.format}`);
    }
    if (type === "number") {
      const number = `(${value} #>> '{}')::numeric`;
      const numericChecks = [];
      if (schema.type === "integer")
        numericChecks.push(`${number} = trunc(${number})`);
      if (schema.minimum !== undefined)
        numericChecks.push(`${number} >= ${schema.minimum}`);
      if (schema.maximum !== undefined)
        numericChecks.push(`${number} <= ${schema.maximum}`);
      if (numericChecks.length)
        checks.push(
          `CASE WHEN jsonb_typeof(${value}) = 'number' THEN ${numericChecks.join(" AND ")} ELSE false END`,
        );
    }
  }
  if (schema.enum)
    checks.push(
      `${value} IN (${schema.enum.map((item) => `${literal(JSON.stringify(item))}::jsonb`).join(", ")})`,
    );
  if (schema.const !== undefined)
    checks.push(`${value} = ${literal(JSON.stringify(schema.const))}::jsonb`);
  if (!checks.length) throw new Error("Unconstrained persisted field");
  return `COALESCE((${checks.join(" AND ")}), false)`;
}

export function renderAccessMigration(): string {
  const statements = [
    "-- R1-02: Zod-derived access records. Forward only; no automatic operator identities.",
    "DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='beacon_founder') THEN CREATE ROLE beacon_founder NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT; END IF; END $$;",
    "ALTER ROLE beacon_founder NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOINHERIT;",
    "REVOKE beacon_founder FROM beacon_app;",
    "REVOKE beacon_app FROM beacon_founder;",
    "DO $$ BEGIN IF pg_has_role('beacon_app', 'beacon_founder', 'MEMBER') OR pg_has_role('beacon_founder', 'beacon_app', 'MEMBER') THEN RAISE EXCEPTION 'Application and founder roles must have no shared membership chain'; END IF; END $$;",
    "GRANT USAGE ON SCHEMA beacon TO beacon_founder;",
  ];
  for (const [name, model] of Object.entries(accessModels)) {
    const config = getTableConfig(model);
    const definitions = config.columns.map(
      (column) =>
        `${quote(column.name)} ${column.getSQLType()}${column.notNull ? " NOT NULL" : ""}`,
    );
    if (name === "versionApprovals")
      definitions.push(
        "_requester_user uuid GENERATED ALWAYS AS ((requested_by->>'userId')::uuid) STORED",
        "_requester_agent uuid GENERATED ALWAYS AS ((requested_by->>'agentId')::uuid) STORED",
        "_decision_user uuid GENERATED ALWAYS AS ((decision->>'userId')::uuid) STORED",
      );
    for (const key of config.primaryKeys)
      definitions.push(
        `PRIMARY KEY (${key.columns.map((column) => quote(column.name)).join(", ")})`,
      );
    const wire = z.toJSONSchema(
      toWireSchema(
        accessRecordSchemas[name as keyof typeof accessRecordSchemas],
      ),
    );
    const row = `jsonb_build_object(${Object.keys(accessStorageShapeFor(name))
      .map((key) => `${literal(key)}, ${quote(sqlName(key))}`)
      .join(", ")})`;
    definitions.push(
      `CONSTRAINT record_contract CHECK (${validation(wire, row)})`,
    );
    statements.push(
      `CREATE TABLE ${qualified(config.name)} (\n  ${definitions.join(",\n  ")}\n);`,
    );
  }
  for (const [name, model] of Object.entries(accessModels)) {
    const config = getTableConfig(model);
    for (const key of config.foreignKeys) {
      const ref = key.reference();
      statements.push(
        `ALTER TABLE ${qualified(config.name)} ADD CONSTRAINT ${quote(key.getName())} FOREIGN KEY (${ref.columns.map((c) => quote(c.name)).join(", ")}) REFERENCES ${qualified(getTableConfig(ref.foreignTable).name)} (${ref.foreignColumns.map((c) => quote(c.name)).join(", ")});`,
      );
    }
    for (const index of config.indexes) {
      const i = index.config;
      statements.push(
        `CREATE ${i.unique ? "UNIQUE " : ""}INDEX ${quote(i.name as string)} ON ${qualified(config.name)} (${i.columns
          .map((column) => {
            if (!("name" in column) || typeof column.name !== "string")
              throw new Error("Expected named index column");
            return quote(column.name);
          })
          .join(", ")})${i.where ? ` WHERE ${expression(i.where)}` : ""};`,
      );
    }
    statements.push(
      `ALTER TABLE ${qualified(config.name)} ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE ${qualified(config.name)} FORCE ROW LEVEL SECURITY;`,
    );
    for (const policy of config.policies)
      statements.push(
        `CREATE POLICY ${quote(policy.name)} ON ${qualified(config.name)} FOR ${policy.for?.toUpperCase() ?? "ALL"} TO ${policy.to === undefined ? "PUBLIC" : (policy.to as { name: string }).name}${policy.using ? ` USING (${expression(policy.using)})` : ""}${policy.withCheck ? ` WITH CHECK (${expression(policy.withCheck)})` : ""};`,
      );
    statements.push(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ${qualified(config.name)} TO beacon_founder;`,
    );
    if (name !== "versionApprovals")
      statements.push(
        `GRANT SELECT ON ${qualified(config.name)} TO beacon_app;`,
      );
  }
  // Safe existing-tenant defaults: no name-based self-customer or founder grants.
  for (const [column, table] of [
    ["_requester_user", "users"],
    ["_requester_agent", "agents"],
    ["_decision_user", "users"],
  ])
    statements.push(
      `ALTER TABLE beacon.version_approvals ADD FOREIGN KEY (tenant_id, ${quote(column)}) REFERENCES beacon.${quote(table)} (tenant_id, id);`,
      `CREATE INDEX ${quote(`version_approvals${column}_idx`)} ON beacon.version_approvals (tenant_id, ${quote(column)});`,
    );
  statements.push(
    "INSERT INTO beacon.organizations (id, name, created_at, phase, is_agency_customer) SELECT id, name, created_at, 'prospect', false FROM beacon.tenants;",
  );
  for (const model of Object.values(models)) {
    const config = getTableConfig(model);
    const tenantColumn = config.name === "tenants" ? "id" : "tenant_id";
    const predicate = `${quote(tenantColumn)} = NULLIF(current_setting('app.tenant_id', true), '')::uuid`;
    statements.push(
      `CREATE POLICY founder_tenant ON ${qualified(config.name)} TO beacon_founder USING (${predicate}) WITH CHECK (${predicate});`,
      `GRANT ${config.name === "audit_logs" ? "SELECT, INSERT" : "SELECT, INSERT, UPDATE, DELETE"} ON ${qualified(config.name)} TO beacon_founder;`,
    );
  }
  return `${statements.join("\n\n")}\n`;
}

function accessStorageShapeFor(name: string) {
  return Object.fromEntries(
    getTableConfig(accessModels[name as keyof typeof accessModels]).columns.map(
      (column) => [
        column.name.replace(/_([a-z])/g, (_, char: string) =>
          char.toUpperCase(),
        ),
        column,
      ],
    ),
  );
}
