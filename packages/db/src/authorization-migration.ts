import { authorizationRecords, toWireSchema, z } from "@roaswell/schemas";
import { getTableConfig } from "drizzle-orm/pg-core";
import { expression, validation } from "./access-migration.js";
import { authorizationModels } from "./authorization-models.js";
import { sqlName } from "./models.js";

const quote = (value: string) => `"${value.replaceAll('"', '""')}"`;
export function renderAuthorizationMigration() {
  const statements = [
    "-- R1-03: persisted authorization; no grants are seeded.",
  ];
  for (const [name, model] of Object.entries(authorizationModels)) {
    const config = getTableConfig(model);
    const contract =
      authorizationRecords[name as keyof typeof authorizationRecords];
    const row = `jsonb_build_object(${config.columns.map((column) => `'${column.name.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())}', ${quote(column.name)}`).join(", ")})`;
    const definitions = config.columns.map(
      (c) =>
        `${quote(c.name)} ${c.getSQLType()}${c.notNull ? " NOT NULL" : ""}`,
    );
    for (const key of config.primaryKeys)
      definitions.push(
        `PRIMARY KEY (${key.columns.map((c) => quote(c.name)).join(", ")})`,
      );
    definitions.push(
      `CONSTRAINT record_contract CHECK (${validation(z.toJSONSchema(toWireSchema(contract)), row)})`,
    );
    statements.push(
      `CREATE TABLE beacon.${quote(config.name)} (\n  ${definitions.join(",\n  ")}\n);`,
    );
    for (const key of config.foreignKeys) {
      const ref = key.reference();
      statements.push(
        `ALTER TABLE beacon.${quote(config.name)} ADD CONSTRAINT ${quote(key.getName())} FOREIGN KEY (${ref.columns.map((c) => quote(c.name)).join(", ")}) REFERENCES beacon.${quote(getTableConfig(ref.foreignTable).name)} (${ref.foreignColumns.map((c) => quote(c.name)).join(", ")});`,
      );
    }
    for (const { config: index } of config.indexes)
      statements.push(
        `CREATE UNIQUE INDEX ${quote(index.name as string)} ON beacon.${quote(config.name)} (${index.columns
          .map((c) => {
            if (!("name" in c) || typeof c.name !== "string")
              throw new Error("Named index required");
            return quote(c.name);
          })
          .join(", ")});`,
      );
    statements.push(
      `ALTER TABLE beacon.${quote(config.name)} ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE beacon.${quote(config.name)} FORCE ROW LEVEL SECURITY;`,
    );
    for (const policy of config.policies) {
      if (!policy.using) throw new Error("Policy predicate required");
      statements.push(
        `CREATE POLICY ${quote(policy.name)} ON beacon.${quote(config.name)} FOR ${policy.for?.toUpperCase()} TO ${(policy.to as { name: string }).name} USING (${expression(policy.using)})${policy.withCheck ? ` WITH CHECK (${expression(policy.withCheck)})` : ""};`,
      );
    }
    statements.push(
      `GRANT SELECT ON beacon.${quote(config.name)} TO beacon_app;`,
      `GRANT SELECT, INSERT, UPDATE, DELETE ON beacon.${quote(config.name)} TO beacon_founder;`,
    );
  }
  // A transaction takes this organization lock before checking permission and acting.
  statements.push(
    "CREATE POLICY principal_organization ON beacon.organizations FOR SELECT TO beacon_app USING (id=NULLIF(current_setting('app.tenant_id',true),'')::uuid AND (EXISTS (SELECT 1 FROM beacon.agency_memberships m WHERE m.tenant_id=beacon.organizations.id AND m.user_id=NULLIF(current_setting('app.actor_id',true),'')::uuid AND m.status='active') OR EXISTS (SELECT 1 FROM beacon.agent_grants g WHERE g.tenant_id=beacon.organizations.id AND g.agent_id=NULLIF(current_setting('app.actor_id',true),'')::uuid AND g.status='active' AND g.expires_at>now())));",
  );
  // Triggers also serialize operator revocation, pause and profile-status changes.
  statements.push(`CREATE FUNCTION beacon.serialize_access_change() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
DECLARE organization uuid; previous_organization uuid; following_organization uuid;
BEGIN
  IF TG_TABLE_NAME IN ('organizations','tenants') THEN
    IF TG_OP <> 'INSERT' THEN previous_organization := OLD.id; END IF;
    IF TG_OP <> 'DELETE' THEN following_organization := NEW.id; END IF;
  ELSE
    IF TG_OP <> 'INSERT' THEN previous_organization := OLD.tenant_id; END IF;
    IF TG_OP <> 'DELETE' THEN following_organization := NEW.tenant_id; END IF;
  END IF;
  FOR organization IN SELECT DISTINCT candidate FROM unnest(ARRAY[previous_organization,following_organization]) AS candidates(candidate) WHERE candidate IS NOT NULL ORDER BY candidate LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('roaswell-access/' || organization::text, 0));
  END LOOP;
  IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;`);
  for (const name of [
    "organizations",
    "memberships",
    "agencyMemberships",
    "agentGrants",
    "agents",
    "users",
  ])
    statements.push(
      `CREATE TRIGGER serialize_access_change BEFORE INSERT OR UPDATE OR DELETE ON beacon.${quote(sqlName(name))} FOR EACH ROW EXECUTE FUNCTION beacon.serialize_access_change();`,
    );
  return `${statements.join("\n\n")}\n`;
}
