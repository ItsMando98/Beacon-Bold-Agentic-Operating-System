import { type EntityName, entitySchemas, z } from "@roaswell/schemas";
import { getTableColumns, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  type AnyPgTable,
  check,
  customType,
  foreignKey,
  type PgCustomColumnBuilder,
  pgPolicy,
  pgRole,
  pgSchema,
  primaryKey,
} from "drizzle-orm/pg-core";

const namespace = pgSchema("beacon");
const applicationRole = pgRole("beacon_app").existing();
export const sqlName = (name: string) =>
  name.replace(/[A-Z]/g, (value) => `_${value.toLowerCase()}`);
type Columns<S extends Record<string, z.ZodType>> = {
  [K in keyof S]: PgCustomColumnBuilder<{
    name: string;
    dataType: "custom";
    columnType: "PgCustomColumn";
    data: z.output<S[K]>;
    driverParam: unknown;
    enumValues: undefined;
    notNull: true;
  }>;
};

export function columns<S extends Record<string, z.ZodType>>(
  shape: S,
): Columns<S> {
  const result: Record<string, unknown> = {};
  for (const [name, contract] of Object.entries(shape)) {
    const storage = contract.meta()?.storage;
    if (typeof storage !== "string")
      throw new Error(`Missing storage annotation: ${name}`);
    const builder = customType<{ data: unknown }>({
      dataType: () => storage,
      toDriver: (value) => {
        const parsed = contract.parse(value);
        if (storage === "jsonb") return JSON.stringify(parsed);
        if (storage === "timestamptz") return (parsed as Date).toISOString();
        return parsed;
      },
      fromDriver: (value) =>
        contract.parse(
          storage === "timestamptz" ? new Date(value as string) : value,
        ),
    })(sqlName(name));
    result[name] = contract.safeParse(null).success
      ? builder
      : builder.notNull();
  }
  // The runtime nullability comes from Zod; nullable contracts already include null in data.
  return result as Columns<S>;
}

const registeredTables: Partial<Record<EntityName, AnyPgTable>> = {};
function table<K extends EntityName>(name: K) {
  const shape = entitySchemas[name].shape as (typeof entitySchemas)[K]["shape"];
  const model = namespace
    .table(sqlName(name), columns(shape), (t) => {
      const tenantColumn =
        name === "tenants"
          ? t.id
          : (t as unknown as Record<string, AnyPgColumn>).tenantId;
      const predicate = sql`${tenantColumn} = NULLIF(current_setting('app.tenant_id', true), '')::uuid`;
      return [
        name === "tenants"
          ? primaryKey({ columns: [t.id] })
          : primaryKey({ columns: [tenantColumn, t.id] }),
        ...(name === "tenants"
          ? []
          : [
              foreignKey({
                columns: [tenantColumn],
                foreignColumns: [
                  getTableColumns(registeredTables.tenants as AnyPgTable).id,
                ],
              }),
            ]),
        ...tenantReferences
          .filter(([source]) => source === name)
          .map(([, field, target]) =>
            foreignKey({
              columns: [
                tenantColumn,
                (t as unknown as Record<string, AnyPgColumn>)[field],
              ],
              foreignColumns: [
                getTableColumns(registeredTables[target] as AnyPgTable)
                  .tenantId,
                getTableColumns(registeredTables[target] as AnyPgTable).id,
              ],
            }),
          ),
        pgPolicy("tenant_isolation", {
          to: applicationRole,
          for: "all",
          using: predicate,
          withCheck: predicate,
        }),
        ...Object.entries(shape).flatMap(([fieldName, contract]) => {
          if (contract.meta()?.storage === "timestamptz") return [];
          const definition = z.toJSONSchema(contract);
          const rule =
            definition.anyOf?.find((item) => item.type !== "null") ??
            definition;
          const column = (t as unknown as Record<string, AnyPgColumn>)[
            fieldName
          ];
          const checks = [];
          if (rule.enum)
            checks.push(
              check(
                `${sqlName(fieldName)}_enum`,
                sql`${column} IN (${sql.join(
                  rule.enum.map((value) => sql`${value}`),
                  sql`, `,
                )})`,
              ),
            );
          if (rule.const !== undefined)
            checks.push(
              check(
                `${sqlName(fieldName)}_literal`,
                sql`${column} = ${rule.const}`,
              ),
            );
          if (rule.minimum !== undefined)
            checks.push(
              check(
                `${sqlName(fieldName)}_min`,
                sql`${column} >= ${rule.minimum}`,
              ),
            );
          if (rule.maximum !== undefined)
            checks.push(
              check(
                `${sqlName(fieldName)}_max`,
                sql`${column} <= ${rule.maximum}`,
              ),
            );
          if (rule.minLength !== undefined)
            checks.push(
              check(
                `${sqlName(fieldName)}_length_min`,
                sql`length(btrim(${column})) >= ${rule.minLength}`,
              ),
            );
          if (rule.maxLength !== undefined)
            checks.push(
              check(
                `${sqlName(fieldName)}_length_max`,
                sql`length(${column}) <= ${rule.maxLength}`,
              ),
            );
          if (fieldName === "currency" && rule.pattern)
            checks.push(
              check("currency_format", sql`${column} ~ ${rule.pattern}`),
            );
          if (rule.type === "object")
            checks.push(
              check(
                `${sqlName(fieldName)}_object`,
                sql`jsonb_typeof(${column}) = 'object'`,
              ),
            );
          return checks;
        }),
      ];
    })
    .enableRLS();
  registeredTables[name] = model;
  return model;
}

export const tenants = table("tenants");
export const users = table("users");
export const agents = table("agents");
export const agentRuns = table("agentRuns");
export const auditLogs = table("auditLogs");
export const approvals = table("approvals");
export const customers = table("customers");
export const contacts = table("contacts");
export const deals = table("deals");
export const projects = table("projects");
export const tasks = table("tasks");
export const assets = table("assets");
export const invoices = table("invoices");
export const models = {
  tenants,
  users,
  agents,
  agentRuns,
  auditLogs,
  approvals,
  customers,
  contacts,
  deals,
  projects,
  tasks,
  assets,
  invoices,
};

// Tenant ID is always part of a foreign key: RLS alone cannot protect references.
export const tenantReferences = [
  ["agentRuns", "agentId", "agents"],
  ["auditLogs", "agentId", "agents"],
  ["auditLogs", "userId", "users"],
  ["auditLogs", "runId", "agentRuns"],
  ["approvals", "agentId", "agents"],
  ["approvals", "runId", "agentRuns"],
  ["approvals", "requestedByUserId", "users"],
  ["approvals", "decidedByUserId", "users"],
  ["contacts", "customerId", "customers"],
  ["deals", "customerId", "customers"],
  ["projects", "customerId", "customers"],
  ["tasks", "projectId", "projects"],
  ["tasks", "assignedAgentId", "agents"],
  ["tasks", "assignedUserId", "users"],
  ["assets", "projectId", "projects"],
  ["invoices", "customerId", "customers"],
  ["invoices", "projectId", "projects"],
] as const satisfies readonly (readonly [EntityName, string, EntityName])[];
