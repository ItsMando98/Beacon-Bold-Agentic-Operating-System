-- Catalog seed v1 is adoption, not a publish. Version 1 stays fixed.
CREATE TABLE beacon.catalog_snapshots (
  version integer NOT NULL,
  published_at text NOT NULL,
  pricing_note text NOT NULL,
  offers jsonb NOT NULL,
  packages jsonb NOT NULL,
  source_revision text,
  source text NOT NULL,
  PRIMARY KEY (version),
  CONSTRAINT catalog_snapshots_arrays CHECK (jsonb_typeof(offers) = 'array' AND jsonb_typeof(packages) = 'array'),
  CONSTRAINT catalog_snapshots_source CHECK (
    (source = 'seed' AND version = 1 AND source_revision IS NULL AND published_at = '2026-10-04T00:29:00+02:00')
    OR (source = 'publish' AND version >= 2 AND source_revision ~ '^[a-f0-9]{64}$')
  )
);

CREATE UNIQUE INDEX catalog_snapshots_revision ON beacon.catalog_snapshots (source_revision) WHERE source_revision IS NOT NULL;

CREATE UNIQUE INDEX catalog_snapshots_one_seed ON beacon.catalog_snapshots (source) WHERE source = 'seed';

CREATE TABLE beacon.catalog_draft_revisions (
  revision text NOT NULL,
  pricing_note text NOT NULL,
  offers jsonb NOT NULL,
  packages jsonb NOT NULL,
  saved_at timestamptz NOT NULL,
  PRIMARY KEY (revision),
  CONSTRAINT catalog_draft_revisions_revision CHECK (revision ~ '^[a-f0-9]{64}$'),
  CONSTRAINT catalog_draft_revisions_arrays CHECK (jsonb_typeof(offers) = 'array' AND jsonb_typeof(packages) = 'array')
);

CREATE TABLE beacon.catalog_drafts (
  id text NOT NULL,
  revision text NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT catalog_drafts_singleton CHECK (id = 'current'),
  CONSTRAINT catalog_drafts_revision_fk FOREIGN KEY (revision) REFERENCES beacon.catalog_draft_revisions (revision)
);

CREATE FUNCTION beacon.reject_catalog_mutation() RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $$
BEGIN
  RAISE EXCEPTION 'catalog record is immutable';
END;
$$;

CREATE TRIGGER catalog_snapshots_immutable
BEFORE UPDATE OR DELETE ON beacon.catalog_snapshots
FOR EACH ROW EXECUTE FUNCTION beacon.reject_catalog_mutation();

CREATE TRIGGER catalog_draft_revisions_immutable
BEFORE UPDATE OR DELETE ON beacon.catalog_draft_revisions
FOR EACH ROW EXECUTE FUNCTION beacon.reject_catalog_mutation();

ALTER TABLE beacon.catalog_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon.catalog_snapshots FORCE ROW LEVEL SECURITY;
ALTER TABLE beacon.catalog_draft_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon.catalog_draft_revisions FORCE ROW LEVEL SECURITY;
ALTER TABLE beacon.catalog_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE beacon.catalog_drafts FORCE ROW LEVEL SECURITY;

CREATE POLICY catalog_snapshot_read ON beacon.catalog_snapshots FOR SELECT TO beacon_app USING (true);
CREATE POLICY catalog_snapshot_insert ON beacon.catalog_snapshots FOR INSERT TO beacon_app WITH CHECK (true);
CREATE POLICY catalog_revision_read ON beacon.catalog_draft_revisions FOR SELECT TO beacon_app USING (true);
CREATE POLICY catalog_revision_insert ON beacon.catalog_draft_revisions FOR INSERT TO beacon_app WITH CHECK (true);
CREATE POLICY catalog_draft_read ON beacon.catalog_drafts FOR SELECT TO beacon_app USING (true);
CREATE POLICY catalog_draft_insert ON beacon.catalog_drafts FOR INSERT TO beacon_app WITH CHECK (true);
CREATE POLICY catalog_draft_update ON beacon.catalog_drafts FOR UPDATE TO beacon_app USING (true) WITH CHECK (true);

GRANT SELECT, INSERT ON beacon.catalog_snapshots TO beacon_app;
GRANT SELECT, INSERT ON beacon.catalog_draft_revisions TO beacon_app;
GRANT SELECT, INSERT, UPDATE ON beacon.catalog_drafts TO beacon_app;

INSERT INTO beacon.catalog_snapshots (version, published_at, pricing_note, offers, packages, source_revision, source)
SELECT (payload->>'version')::integer, payload->>'publishedAt', payload->>'pricingNote', payload->'offers', payload->'packages', NULL, 'seed'
FROM (SELECT $catalog${"version":1,"publishedAt":"2026-10-04T00:29:00+02:00","pricingNote":"Placeholder ranges for planning. Final pricing depends on volume, markets, and complexity — we confirm before kickoff.","offers":[{"id":"seo-content","title":"SEO & content retainers","summary":"Editorial calendars, keyword-led briefs, and publish-ready articles or landing pages — built for search intent and brand voice. We handle research, writing, and revision cycles so your pipeline stays full without sacrificing quality.","points":["Keyword & topic strategy","Briefs, drafts, and edits","On-page recommendations","Monthly performance notes"]},{"id":"meta-ads","title":"Meta Ads setup & optimization","summary":"Account structure, creative testing, and ongoing optimization for Facebook and Instagram. We set up clean campaigns, measure what matters, and iterate until spend works harder — without chasing every new feature.","points":["Account audit & rebuild","Campaign & audience setup","Creative testing cadence","Weekly optimization & reporting"]},{"id":"google-lead-gen","title":"Google Lead-Gen setup & optimization","summary":"Account structure, search/performance campaigns, and landing-page alignment so paid search brings qualified inquiries — measured and iterated without chasing every new feature.","points":["Account audit & rebuild","Campaign & keyword setup","Landing-page & offer alignment","Weekly optimization & reporting"]}],"packages":[{"id":"content-retainer","title":"Content retainer","summary":"Ongoing SEO content production with strategy and editorial QC.","points":["4–8 pieces / month (typical)","Keyword & brief support","Two revision rounds","Monthly content report"],"priceMin":180000,"priceMax":350000,"currency":"EUR","interval":"month","adSpend":null},{"id":"meta-ads-management","title":"Meta Ads management","summary":"Setup or takeover, then continuous optimization and reporting.","points":["Account structure & tracking check","Ongoing campaign management","Creative test backlog","Weekly performance notes"],"priceMin":120000,"priceMax":280000,"currency":"EUR","interval":"month","adSpend":"meta"},{"id":"google-lead-gen-management","title":"Google Lead-Gen management","summary":"Setup or takeover for Google Ads lead campaigns, then continuous optimization and reporting.","points":["Search campaign structure","Conversion tracking check","Offer & LP alignment","Weekly performance notes"],"priceMin":120000,"priceMax":280000,"currency":"EUR","interval":"month","adSpend":"google"},{"id":"content-ads-lead-gen","title":"Content + Ads + Lead-Gen","summary":"Shared strategy across organic, Meta, and Google.","points":["Shared strategy across organic, Meta, and Google","Single point of contact","Unified monthly review"],"priceMin":350000,"priceMax":700000,"currency":"EUR","interval":"month","adSpend":null}]}$catalog$::jsonb AS payload) AS seed
WHERE NOT EXISTS (SELECT 1 FROM beacon.catalog_snapshots WHERE version = 1);
