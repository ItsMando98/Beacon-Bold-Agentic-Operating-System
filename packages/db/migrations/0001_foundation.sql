-- Foundation only. Business entities belong to P1-1 after Gate 0.
CREATE EXTENSION IF NOT EXISTS vector;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'beacon_app') THEN
    CREATE ROLE beacon_app NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END $$;
ALTER ROLE beacon_app NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
CREATE SCHEMA IF NOT EXISTS beacon;
GRANT USAGE ON SCHEMA beacon, public TO beacon_app;
GRANT CONNECT ON DATABASE beacon TO beacon_app;
-- Future tables get explicit grants and FORCE RLS in their own migration.
