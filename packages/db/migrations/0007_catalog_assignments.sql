-- Package assignments point at the current catalog snapshot. They are not a second catalog.
CREATE TABLE beacon.catalog_package_assignments (
  tenant_id uuid NOT NULL,
  package_id text NOT NULL,
  PRIMARY KEY (tenant_id, package_id),
  CONSTRAINT catalog_package_assignments_package_id CHECK (
    package_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(package_id) <= 80
  )
);

ALTER TABLE beacon.catalog_package_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon.catalog_package_assignments FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_assignment_tenant ON beacon.catalog_package_assignments
  FOR ALL TO beacon_app
  USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid);

GRANT SELECT, INSERT, DELETE ON beacon.catalog_package_assignments TO beacon_app;
