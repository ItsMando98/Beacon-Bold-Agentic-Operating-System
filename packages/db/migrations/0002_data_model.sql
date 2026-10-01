-- P1-1: generated from the Zod-derived Drizzle model. Forward migration only.

CREATE TABLE "beacon"."tenants" (
  "id" uuid NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("id"),
  CONSTRAINT "name_length_min" CHECK (length(btrim("beacon"."tenants"."name")) >= 1),
  CONSTRAINT "name_length_max" CHECK (length("beacon"."tenants"."name") <= 200)
);

CREATE TABLE "beacon"."users" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "name" text NOT NULL,
  "external_subject" text NOT NULL,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "name_length_min" CHECK (length(btrim("beacon"."users"."name")) >= 1),
  CONSTRAINT "name_length_max" CHECK (length("beacon"."users"."name") <= 200),
  CONSTRAINT "external_subject_length_min" CHECK (length(btrim("beacon"."users"."external_subject")) >= 1),
  CONSTRAINT "external_subject_length_max" CHECK (length("beacon"."users"."external_subject") <= 200)
);

CREATE TABLE "beacon"."agents" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "name" text NOT NULL,
  "paused" boolean NOT NULL,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "name_length_min" CHECK (length(btrim("beacon"."agents"."name")) >= 1),
  CONSTRAINT "name_length_max" CHECK (length("beacon"."agents"."name") <= 200)
);

CREATE TABLE "beacon"."agent_runs" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "agent_id" uuid NOT NULL,
  "status" text NOT NULL,
  "input" jsonb NOT NULL,
  "output" jsonb,
  "cost_minor" integer NOT NULL,
  "currency" text NOT NULL,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "status_enum" CHECK ("beacon"."agent_runs"."status" IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  CONSTRAINT "input_object" CHECK (jsonb_typeof("beacon"."agent_runs"."input") = 'object'),
  CONSTRAINT "output_object" CHECK (jsonb_typeof("beacon"."agent_runs"."output") = 'object'),
  CONSTRAINT "cost_minor_min" CHECK ("beacon"."agent_runs"."cost_minor" >= 0),
  CONSTRAINT "cost_minor_max" CHECK ("beacon"."agent_runs"."cost_minor" <= 2147483647),
  CONSTRAINT "currency_format" CHECK ("beacon"."agent_runs"."currency" ~ '^[A-Z]{3}$')
);

CREATE TABLE "beacon"."audit_logs" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "agent_id" uuid,
  "user_id" uuid,
  "run_id" uuid,
  "action" text NOT NULL,
  "reason" text NOT NULL,
  "outcome" text NOT NULL,
  "details" jsonb NOT NULL,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "action_length_min" CHECK (length(btrim("beacon"."audit_logs"."action")) >= 1),
  CONSTRAINT "action_length_max" CHECK (length("beacon"."audit_logs"."action") <= 200),
  CONSTRAINT "reason_length_min" CHECK (length(btrim("beacon"."audit_logs"."reason")) >= 1),
  CONSTRAINT "reason_length_max" CHECK (length("beacon"."audit_logs"."reason") <= 200),
  CONSTRAINT "outcome_enum" CHECK ("beacon"."audit_logs"."outcome" IN ('succeeded', 'failed', 'denied')),
  CONSTRAINT "details_object" CHECK (jsonb_typeof("beacon"."audit_logs"."details") = 'object')
);

CREATE TABLE "beacon"."approvals" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "agent_id" uuid NOT NULL,
  "run_id" uuid,
  "requested_by_user_id" uuid,
  "decided_by_user_id" uuid,
  "reason" text NOT NULL,
  "status" text NOT NULL,
  "amount_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "decided_at" timestamptz,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "reason_length_min" CHECK (length(btrim("beacon"."approvals"."reason")) >= 1),
  CONSTRAINT "reason_length_max" CHECK (length("beacon"."approvals"."reason") <= 200),
  CONSTRAINT "status_enum" CHECK ("beacon"."approvals"."status" IN ('pending', 'approved', 'rejected', 'expired')),
  CONSTRAINT "amount_minor_min" CHECK ("beacon"."approvals"."amount_minor" >= 0),
  CONSTRAINT "amount_minor_max" CHECK ("beacon"."approvals"."amount_minor" <= 2147483647),
  CONSTRAINT "currency_format" CHECK ("beacon"."approvals"."currency" ~ '^[A-Z]{3}$')
);

CREATE TABLE "beacon"."customers" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "name" text NOT NULL,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "name_length_min" CHECK (length(btrim("beacon"."customers"."name")) >= 1),
  CONSTRAINT "name_length_max" CHECK (length("beacon"."customers"."name") <= 200)
);

CREATE TABLE "beacon"."contacts" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "customer_id" uuid NOT NULL,
  "name" text NOT NULL,
  "email" text,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "name_length_min" CHECK (length(btrim("beacon"."contacts"."name")) >= 1),
  CONSTRAINT "name_length_max" CHECK (length("beacon"."contacts"."name") <= 200),
  CONSTRAINT "email_length_max" CHECK (length("beacon"."contacts"."email") <= 254)
);

CREATE TABLE "beacon"."deals" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "customer_id" uuid NOT NULL,
  "name" text NOT NULL,
  "status" text NOT NULL,
  "amount_minor" integer NOT NULL,
  "currency" text NOT NULL,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "name_length_min" CHECK (length(btrim("beacon"."deals"."name")) >= 1),
  CONSTRAINT "name_length_max" CHECK (length("beacon"."deals"."name") <= 200),
  CONSTRAINT "status_enum" CHECK ("beacon"."deals"."status" IN ('open', 'won', 'lost')),
  CONSTRAINT "amount_minor_min" CHECK ("beacon"."deals"."amount_minor" >= 0),
  CONSTRAINT "amount_minor_max" CHECK ("beacon"."deals"."amount_minor" <= 2147483647),
  CONSTRAINT "currency_format" CHECK ("beacon"."deals"."currency" ~ '^[A-Z]{3}$')
);

CREATE TABLE "beacon"."projects" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "customer_id" uuid NOT NULL,
  "name" text NOT NULL,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "name_length_min" CHECK (length(btrim("beacon"."projects"."name")) >= 1),
  CONSTRAINT "name_length_max" CHECK (length("beacon"."projects"."name") <= 200)
);

CREATE TABLE "beacon"."tasks" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "project_id" uuid NOT NULL,
  "assigned_agent_id" uuid,
  "assigned_user_id" uuid,
  "title" text NOT NULL,
  "status" text NOT NULL,
  "due_at" timestamptz,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "title_length_min" CHECK (length(btrim("beacon"."tasks"."title")) >= 1),
  CONSTRAINT "title_length_max" CHECK (length("beacon"."tasks"."title") <= 200),
  CONSTRAINT "status_enum" CHECK ("beacon"."tasks"."status" IN ('todo', 'in_progress', 'done', 'cancelled'))
);

CREATE TABLE "beacon"."assets" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "project_id" uuid NOT NULL,
  "name" text NOT NULL,
  "storage_key" text NOT NULL,
  "provenance" jsonb NOT NULL,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "name_length_min" CHECK (length(btrim("beacon"."assets"."name")) >= 1),
  CONSTRAINT "name_length_max" CHECK (length("beacon"."assets"."name") <= 200),
  CONSTRAINT "storage_key_length_min" CHECK (length(btrim("beacon"."assets"."storage_key")) >= 1),
  CONSTRAINT "storage_key_length_max" CHECK (length("beacon"."assets"."storage_key") <= 200),
  CONSTRAINT "provenance_object" CHECK (jsonb_typeof("beacon"."assets"."provenance") = 'object')
);

CREATE TABLE "beacon"."invoices" (
  "id" uuid NOT NULL,
  "tenant_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL,
  "customer_id" uuid NOT NULL,
  "project_id" uuid,
  "amount_minor" integer NOT NULL,
  "currency" text NOT NULL,
  "status" text NOT NULL,
  PRIMARY KEY ("tenant_id", "id"),
  CONSTRAINT "amount_minor_min" CHECK ("beacon"."invoices"."amount_minor" >= 0),
  CONSTRAINT "amount_minor_max" CHECK ("beacon"."invoices"."amount_minor" <= 2147483647),
  CONSTRAINT "currency_format" CHECK ("beacon"."invoices"."currency" ~ '^[A-Z]{3}$'),
  CONSTRAINT "status_literal" CHECK ("beacon"."invoices"."status" = 'draft')
);

ALTER TABLE "beacon"."tenants" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."tenants" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."tenants" TO beacon_app USING ("beacon"."tenants"."id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."tenants"."id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."tenants" TO beacon_app;

ALTER TABLE "beacon"."users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."users" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."users" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."users" TO beacon_app USING ("beacon"."users"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."users"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."users" TO beacon_app;

ALTER TABLE "beacon"."agents" ADD CONSTRAINT "agents_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."agents" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."agents" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."agents" TO beacon_app USING ("beacon"."agents"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."agents"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."agents" TO beacon_app;

ALTER TABLE "beacon"."agent_runs" ADD CONSTRAINT "agent_runs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."agent_runs" ADD CONSTRAINT "agent_runs_tenant_id_agent_id_agents_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "agent_id") REFERENCES "beacon"."agents" ("tenant_id", "id");

CREATE INDEX "agent_runs_agent_id_idx" ON "beacon"."agent_runs" ("tenant_id", "agent_id");

ALTER TABLE "beacon"."agent_runs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."agent_runs" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."agent_runs" TO beacon_app USING ("beacon"."agent_runs"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."agent_runs"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."agent_runs" TO beacon_app;

ALTER TABLE "beacon"."audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_agent_id_agents_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "agent_id") REFERENCES "beacon"."agents" ("tenant_id", "id");

CREATE INDEX "audit_logs_agent_id_idx" ON "beacon"."audit_logs" ("tenant_id", "agent_id");

ALTER TABLE "beacon"."audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_user_id_users_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "user_id") REFERENCES "beacon"."users" ("tenant_id", "id");

CREATE INDEX "audit_logs_user_id_idx" ON "beacon"."audit_logs" ("tenant_id", "user_id");

ALTER TABLE "beacon"."audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_run_id_agent_runs_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "run_id") REFERENCES "beacon"."agent_runs" ("tenant_id", "id");

CREATE INDEX "audit_logs_run_id_idx" ON "beacon"."audit_logs" ("tenant_id", "run_id");

ALTER TABLE "beacon"."audit_logs" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."audit_logs" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."audit_logs" TO beacon_app USING ("beacon"."audit_logs"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."audit_logs"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT ON "beacon"."audit_logs" TO beacon_app;

ALTER TABLE "beacon"."approvals" ADD CONSTRAINT "approvals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."approvals" ADD CONSTRAINT "approvals_tenant_id_agent_id_agents_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "agent_id") REFERENCES "beacon"."agents" ("tenant_id", "id");

CREATE INDEX "approvals_agent_id_idx" ON "beacon"."approvals" ("tenant_id", "agent_id");

ALTER TABLE "beacon"."approvals" ADD CONSTRAINT "approvals_tenant_id_run_id_agent_runs_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "run_id") REFERENCES "beacon"."agent_runs" ("tenant_id", "id");

CREATE INDEX "approvals_run_id_idx" ON "beacon"."approvals" ("tenant_id", "run_id");

ALTER TABLE "beacon"."approvals" ADD CONSTRAINT "approvals_tenant_id_requested_by_user_id_users_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "requested_by_user_id") REFERENCES "beacon"."users" ("tenant_id", "id");

CREATE INDEX "approvals_requested_by_user_id_idx" ON "beacon"."approvals" ("tenant_id", "requested_by_user_id");

ALTER TABLE "beacon"."approvals" ADD CONSTRAINT "approvals_tenant_id_decided_by_user_id_users_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "decided_by_user_id") REFERENCES "beacon"."users" ("tenant_id", "id");

CREATE INDEX "approvals_decided_by_user_id_idx" ON "beacon"."approvals" ("tenant_id", "decided_by_user_id");

ALTER TABLE "beacon"."approvals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."approvals" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."approvals" TO beacon_app USING ("beacon"."approvals"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."approvals"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."approvals" TO beacon_app;

ALTER TABLE "beacon"."customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."customers" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."customers" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."customers" TO beacon_app USING ("beacon"."customers"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."customers"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."customers" TO beacon_app;

ALTER TABLE "beacon"."contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."contacts" ADD CONSTRAINT "contacts_tenant_id_customer_id_customers_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "beacon"."customers" ("tenant_id", "id");

CREATE INDEX "contacts_customer_id_idx" ON "beacon"."contacts" ("tenant_id", "customer_id");

ALTER TABLE "beacon"."contacts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."contacts" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."contacts" TO beacon_app USING ("beacon"."contacts"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."contacts"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."contacts" TO beacon_app;

ALTER TABLE "beacon"."deals" ADD CONSTRAINT "deals_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."deals" ADD CONSTRAINT "deals_tenant_id_customer_id_customers_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "beacon"."customers" ("tenant_id", "id");

CREATE INDEX "deals_customer_id_idx" ON "beacon"."deals" ("tenant_id", "customer_id");

ALTER TABLE "beacon"."deals" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."deals" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."deals" TO beacon_app USING ("beacon"."deals"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."deals"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."deals" TO beacon_app;

ALTER TABLE "beacon"."projects" ADD CONSTRAINT "projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."projects" ADD CONSTRAINT "projects_tenant_id_customer_id_customers_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "beacon"."customers" ("tenant_id", "id");

CREATE INDEX "projects_customer_id_idx" ON "beacon"."projects" ("tenant_id", "customer_id");

ALTER TABLE "beacon"."projects" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."projects" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."projects" TO beacon_app USING ("beacon"."projects"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."projects"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."projects" TO beacon_app;

ALTER TABLE "beacon"."tasks" ADD CONSTRAINT "tasks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."tasks" ADD CONSTRAINT "tasks_tenant_id_project_id_projects_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "beacon"."projects" ("tenant_id", "id");

CREATE INDEX "tasks_project_id_idx" ON "beacon"."tasks" ("tenant_id", "project_id");

ALTER TABLE "beacon"."tasks" ADD CONSTRAINT "tasks_tenant_id_assigned_agent_id_agents_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "assigned_agent_id") REFERENCES "beacon"."agents" ("tenant_id", "id");

CREATE INDEX "tasks_assigned_agent_id_idx" ON "beacon"."tasks" ("tenant_id", "assigned_agent_id");

ALTER TABLE "beacon"."tasks" ADD CONSTRAINT "tasks_tenant_id_assigned_user_id_users_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "assigned_user_id") REFERENCES "beacon"."users" ("tenant_id", "id");

CREATE INDEX "tasks_assigned_user_id_idx" ON "beacon"."tasks" ("tenant_id", "assigned_user_id");

ALTER TABLE "beacon"."tasks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."tasks" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."tasks" TO beacon_app USING ("beacon"."tasks"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."tasks"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."tasks" TO beacon_app;

ALTER TABLE "beacon"."assets" ADD CONSTRAINT "assets_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."assets" ADD CONSTRAINT "assets_tenant_id_project_id_projects_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "beacon"."projects" ("tenant_id", "id");

CREATE INDEX "assets_project_id_idx" ON "beacon"."assets" ("tenant_id", "project_id");

ALTER TABLE "beacon"."assets" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."assets" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."assets" TO beacon_app USING ("beacon"."assets"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."assets"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."assets" TO beacon_app;

ALTER TABLE "beacon"."invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id");

ALTER TABLE "beacon"."invoices" ADD CONSTRAINT "invoices_tenant_id_customer_id_customers_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "customer_id") REFERENCES "beacon"."customers" ("tenant_id", "id");

CREATE INDEX "invoices_customer_id_idx" ON "beacon"."invoices" ("tenant_id", "customer_id");

ALTER TABLE "beacon"."invoices" ADD CONSTRAINT "invoices_tenant_id_project_id_projects_tenant_id_id_fk" FOREIGN KEY ("tenant_id", "project_id") REFERENCES "beacon"."projects" ("tenant_id", "id");

CREATE INDEX "invoices_project_id_idx" ON "beacon"."invoices" ("tenant_id", "project_id");

ALTER TABLE "beacon"."invoices" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."invoices" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."invoices" TO beacon_app USING ("beacon"."invoices"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("beacon"."invoices"."tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON "beacon"."invoices" TO beacon_app;
