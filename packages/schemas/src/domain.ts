import { z } from "zod";

// Storage annotations travel with the contract; database columns and types are derived.
export type StorageType =
  | "uuid"
  | "text"
  | "integer"
  | "timestamptz"
  | "jsonb"
  | "boolean";
function field<T extends z.ZodType>(schema: T, storage: StorageType) {
  return schema.meta({ storage });
}
function nullable<T extends z.ZodType>(schema: T) {
  return schema.nullable().meta(schema.meta() ?? {});
}
const id = field(z.uuid(), "uuid");
const label = field(z.string().trim().min(1).max(200), "text");
const timestamp = field(z.date(), "timestamptz");
const money = field(z.number().int().min(0).max(2147483647), "integer");
const currency = field(z.string().regex(/^[A-Z]{3}$/), "text");
const payload = field(z.record(z.string(), z.json()), "jsonb");
const base = { id, tenantId: id, createdAt: timestamp };
export const tenantContextSchema = z.object({ tenantId: id }).strict();

export const entitySchemas = {
  tenants: z.object({ id, name: label, createdAt: timestamp }).strict(),
  users: z.object({ ...base, name: label, externalSubject: label }).strict(),
  agents: z
    .object({ ...base, name: label, paused: field(z.boolean(), "boolean") })
    .strict(),
  agentRuns: z
    .object({
      ...base,
      agentId: id,
      status: field(
        z.enum(["queued", "running", "succeeded", "failed", "cancelled"]),
        "text",
      ),
      input: payload,
      output: nullable(payload),
      costMinor: money,
      currency,
    })
    .strict(),
  auditLogs: z
    .object({
      ...base,
      agentId: nullable(id),
      userId: nullable(id),
      runId: nullable(id),
      action: label,
      reason: label,
      outcome: field(z.enum(["succeeded", "failed", "denied"]), "text"),
      details: payload,
    })
    .strict(),
  approvals: z
    .object({
      ...base,
      agentId: id,
      runId: nullable(id),
      requestedByUserId: nullable(id),
      decidedByUserId: nullable(id),
      reason: label,
      status: field(
        z.enum(["pending", "approved", "rejected", "expired"]),
        "text",
      ),
      amountMinor: money,
      currency,
      expiresAt: timestamp,
      decidedAt: nullable(timestamp),
    })
    .strict(),
  customers: z.object({ ...base, name: label }).strict(),
  contacts: z
    .object({
      ...base,
      customerId: id,
      name: label,
      email: nullable(field(z.email().max(254), "text")),
    })
    .strict(),
  deals: z
    .object({
      ...base,
      customerId: id,
      name: label,
      status: field(z.enum(["open", "won", "lost"]), "text"),
      amountMinor: money,
      currency,
    })
    .strict(),
  projects: z.object({ ...base, customerId: id, name: label }).strict(),
  tasks: z
    .object({
      ...base,
      projectId: id,
      assignedAgentId: nullable(id),
      assignedUserId: nullable(id),
      title: label,
      status: field(
        z.enum(["todo", "in_progress", "done", "cancelled"]),
        "text",
      ),
      dueAt: nullable(timestamp),
    })
    .strict(),
  assets: z
    .object({
      ...base,
      projectId: id,
      name: label,
      storageKey: label,
      provenance: payload,
    })
    .strict(),
  // Accounting records only: issuing, tax calculation and payments belong to P3-5/P3-6.
  invoices: z
    .object({
      ...base,
      customerId: id,
      projectId: nullable(id),
      amountMinor: money,
      currency,
      status: field(z.literal("draft"), "text"),
    })
    .strict(),
} as const;

export type EntityName = keyof typeof entitySchemas;
export type Entity<K extends EntityName> = z.infer<(typeof entitySchemas)[K]>;
