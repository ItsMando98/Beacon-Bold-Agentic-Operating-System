-- P1-3: schema-derived append-only idempotency ledger. Forward migration only.

CREATE TABLE "beacon"."idempotency" (
  "tenant_id" uuid NOT NULL,
  "operation" text NOT NULL,
  "key" text NOT NULL,
  "request_hash" text NOT NULL,
  "response" jsonb NOT NULL,
  "created_at" timestamptz NOT NULL,
  PRIMARY KEY ("tenant_id", "operation", "key"),
  FOREIGN KEY ("tenant_id") REFERENCES "beacon"."tenants" ("id")
);

ALTER TABLE "beacon"."idempotency" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "beacon"."idempotency" FORCE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON "beacon"."idempotency" TO "beacon_app" USING ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid) WITH CHECK ("tenant_id" = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT ON "beacon"."idempotency" TO "beacon_app";
