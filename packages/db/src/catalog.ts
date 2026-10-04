import { createHash } from "node:crypto";
import {
  type AuthIdentity,
  agencyCatalogOrigin,
  type CatalogAssignment,
  type CatalogDraftBody,
  type CatalogSnapshot,
  catalogAssignmentSchema,
  catalogDraftBodySchema,
  catalogScopes,
  catalogSnapshotSchema,
  type OfferDraft,
  offerDraftSchema,
  tenantContextSchema,
} from "@roaswell/schemas";
import { Pool, type PoolClient } from "pg";
import rawSeed from "./catalog-snapshot.v1.json";

export class CatalogError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 403 | 404 | 500,
  ) {
    super(message);
  }
}

export const catalogSeedSnapshot = catalogSnapshotSchema.parse(rawSeed);
const seedPayload = JSON.stringify(catalogSeedSnapshot);
export const catalogSeedAdoptionSql = `INSERT INTO beacon.catalog_snapshots (version, published_at, pricing_note, offers, packages, source_revision, source)
SELECT (payload->>'version')::integer, payload->>'publishedAt', payload->>'pricingNote', payload->'offers', payload->'packages', NULL, 'seed'
FROM (SELECT $catalog$${seedPayload}$catalog$::jsonb AS payload) AS seed
WHERE NOT EXISTS (SELECT 1 FROM beacon.catalog_snapshots WHERE version = 1);`;

type StoredSnapshot = CatalogSnapshot & {
  source: "seed" | "publish";
  sourceRevision: string | null;
};

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

export function draftRevision(body: CatalogDraftBody) {
  return createHash("sha256").update(canonicalJson(body)).digest("hex");
}

export function assertAgencyCatalogActor(
  identity: AuthIdentity,
  scope: (typeof catalogScopes)[keyof typeof catalogScopes],
) {
  if (
    identity.surface === "customer" ||
    (identity.kind === "human" && identity.surface !== "agency")
  )
    throw new CatalogError("Access denied", 403);
  if (!identity.scopes.includes(scope))
    throw new CatalogError("Access denied", 403);
}

export function assertAgencyCatalogOrigin(origin: string | null) {
  if (origin !== agencyCatalogOrigin)
    throw new CatalogError("Origin is not allowed", 403);
}

export function assertCustomerCatalogReader(identity: AuthIdentity) {
  if (
    identity.kind !== "human" ||
    identity.surface !== "customer" ||
    !identity.scopes.includes("organizations:read")
  )
    throw new CatalogError("Access denied", 403);
}

function parseAssignmentTenant(tenantId: string) {
  const parsed = tenantContextSchema.safeParse({ tenantId });
  if (!parsed.success) throw new CatalogError("Invalid request", 400);
  return parsed.data.tenantId;
}

function parsePackageIds(packageIds: readonly string[]) {
  if (packageIds.length > 100) throw new CatalogError("Invalid request", 400);
  const seen = new Set<string>();
  for (const id of packageIds) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) ||
      id.length > 80 ||
      seen.has(id)
    )
      throw new CatalogError("Invalid request", 400);
    seen.add(id);
  }
  return [...seen];
}

function packagesFor(
  snapshot: CatalogSnapshot,
  packageIds: ReadonlySet<string>,
): CatalogAssignment {
  return catalogAssignmentSchema.parse({
    packages: snapshot.packages.filter((item) => packageIds.has(item.id)),
  });
}

function assertKnownPackages(
  snapshot: CatalogSnapshot,
  packageIds: readonly string[],
) {
  const known = new Set(snapshot.packages.map((item) => item.id));
  for (const id of packageIds) {
    if (!known.has(id)) throw new CatalogError("Unknown package", 400);
  }
}

export function assertCatalogPublishable(body: CatalogDraftBody) {
  if (body.offers.length === 0)
    throw new CatalogError("Publish rejected empty offers", 400);
  if (body.packages.length === 0)
    throw new CatalogError("Publish rejected empty packages", 400);
  const offerIds = new Set<string>();
  for (const offer of body.offers) {
    if (offer.title.trim() === "")
      throw new CatalogError("Publish rejected missing title", 400);
    if (offerIds.has(offer.id))
      throw new CatalogError("Publish rejected duplicate offer id", 400);
    offerIds.add(offer.id);
  }
  const packageIds = new Set<string>();
  for (const item of body.packages) {
    if (item.title.trim() === "")
      throw new CatalogError("Publish rejected missing title", 400);
    if (item.priceMin < 0 || item.priceMax < 0)
      throw new CatalogError("Publish rejected negative price", 400);
    if (item.priceMin > item.priceMax)
      throw new CatalogError(
        "Publish rejected priceMin greater than priceMax",
        400,
      );
    if (item.id === "google-lead-gen")
      throw new CatalogError(
        "Publish rejected package id google-lead-gen",
        400,
      );
    if (packageIds.has(item.id))
      throw new CatalogError("Publish rejected duplicate package id", 400);
    packageIds.add(item.id);
  }
  for (const id of offerIds) {
    if (packageIds.has(id))
      throw new CatalogError(
        "Publish rejected id present in offers and packages",
        400,
      );
  }
}

function parseDraft(input: unknown): CatalogDraftBody {
  const parsed = catalogDraftBodySchema.safeParse(input);
  if (!parsed.success) throw new CatalogError("Invalid request", 400);
  return parsed.data;
}

function toSnapshot(row: StoredSnapshot): CatalogSnapshot {
  return catalogSnapshotSchema.parse({
    version: row.version,
    publishedAt: row.publishedAt,
    pricingNote: row.pricingNote,
    offers: row.offers,
    packages: row.packages,
  });
}

function toDraft(revision: string, body: CatalogDraftBody): OfferDraft {
  return offerDraftSchema.parse({ revision, ...body });
}

export interface CatalogStore {
  readSnapshot(): Promise<CatalogSnapshot>;
  readDraft(identity: AuthIdentity, origin: string | null): Promise<OfferDraft>;
  readAssignment(identity: AuthIdentity): Promise<CatalogAssignment>;
  assignPackages(
    identity: AuthIdentity,
    origin: string | null,
    tenantId: string,
    packageIds: readonly string[],
  ): Promise<CatalogAssignment>;
  saveDraft(
    identity: AuthIdentity,
    origin: string | null,
    body: unknown,
  ): Promise<OfferDraft>;
  publish(
    identity: AuthIdentity,
    origin: string | null,
    revision: string,
  ): Promise<CatalogSnapshot>;
  listSnapshots(): Promise<CatalogSnapshot[]>;
  adoptSeed(): Promise<void>;
  close(): Promise<void>;
}

export function createMemoryCatalogStore(options?: {
  now?: () => string;
}): CatalogStore {
  const now = options?.now ?? (() => new Date().toISOString());
  const snapshots: StoredSnapshot[] = [];
  const revisions = new Map<string, CatalogDraftBody>();
  const assignments = new Map<string, Set<string>>();
  let currentRevision: string | null = null;
  let chain: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(operation: () => T) => {
    const run = chain.then(operation, operation);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
  const current = () => {
    const row = snapshots.reduce<StoredSnapshot | undefined>(
      (best, item) => (!best || item.version > best.version ? item : best),
      undefined,
    );
    if (!row) throw new CatalogError("Catalog snapshot missing", 500);
    return toSnapshot(row);
  };
  const adopt = () => {
    if (snapshots.some((item) => item.version === 1 || item.source === "seed"))
      return;
    snapshots.push({
      ...catalogSeedSnapshot,
      source: "seed",
      sourceRevision: null,
    });
  };
  adopt();
  return {
    readSnapshot: () => exclusive(() => current()),
    listSnapshots: () =>
      exclusive(() =>
        snapshots
          .slice()
          .sort((left, right) => left.version - right.version)
          .map(toSnapshot),
      ),
    adoptSeed: () => exclusive(() => adopt()),
    readDraft: (identity, origin) =>
      exclusive(() => {
        assertAgencyCatalogActor(identity, catalogScopes.read);
        assertAgencyCatalogOrigin(origin);
        if (!currentRevision)
          throw new CatalogError("Offer draft not found", 404);
        const body = revisions.get(currentRevision);
        if (!body) throw new CatalogError("Offer draft not found", 404);
        return toDraft(currentRevision, body);
      }),
    readAssignment: (identity) =>
      exclusive(() => {
        assertCustomerCatalogReader(identity);
        return packagesFor(
          current(),
          assignments.get(identity.tenantId) ?? new Set(),
        );
      }),
    assignPackages: (identity, origin, tenantId, packageIds) =>
      exclusive(() => {
        assertAgencyCatalogActor(identity, catalogScopes.write);
        assertAgencyCatalogOrigin(origin);
        const tenant = parseAssignmentTenant(tenantId);
        const ids = parsePackageIds(packageIds);
        const snapshot = current();
        assertKnownPackages(snapshot, ids);
        const allowed = new Set(ids);
        assignments.set(tenant, allowed);
        return packagesFor(snapshot, allowed);
      }),
    saveDraft: (identity, origin, body) =>
      exclusive(() => {
        assertAgencyCatalogActor(identity, catalogScopes.write);
        assertAgencyCatalogOrigin(origin);
        const parsed = parseDraft(body);
        const revision = draftRevision(parsed);
        revisions.set(revision, parsed);
        currentRevision = revision;
        return toDraft(revision, parsed);
      }),
    publish: (identity, origin, revision) =>
      exclusive(() => {
        assertAgencyCatalogActor(identity, catalogScopes.write);
        assertAgencyCatalogOrigin(origin);
        if (!/^[a-f0-9]{64}$/.test(revision))
          throw new CatalogError("Invalid request", 400);
        const existing = snapshots.find(
          (item) => item.sourceRevision === revision,
        );
        if (existing) return toSnapshot(existing);
        const body = revisions.get(revision);
        if (!body)
          throw new CatalogError("Saved draft revision not found", 404);
        assertCatalogPublishable(body);
        const version =
          Math.max(...snapshots.map((item) => item.version), 0) + 1;
        if (version < 2) throw new CatalogError("Catalog seed is missing", 500);
        const snapshot = catalogSnapshotSchema.parse({
          version,
          publishedAt: now(),
          ...body,
        });
        snapshots.push({
          ...snapshot,
          source: "publish",
          sourceRevision: revision,
        });
        return snapshot;
      }),
    close: async () => undefined,
  };
}

type SnapshotRow = {
  version: number;
  published_at: string;
  pricing_note: string;
  offers: unknown;
  packages: unknown;
};

function snapshotFromRow(row: SnapshotRow): CatalogSnapshot {
  return catalogSnapshotSchema.parse({
    version: row.version,
    publishedAt: row.published_at,
    pricingNote: row.pricing_note,
    offers: row.offers,
    packages: row.packages,
  });
}

async function withClient<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    try {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        ["beacon-catalog"],
      );
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  } finally {
    client.release();
  }
}

export function createPostgresCatalogStore(
  connectionString: string,
): CatalogStore {
  const pool = new Pool({ connectionString, max: 4 });
  return {
    close: () => pool.end(),
    adoptSeed: () =>
      withClient(pool, (client) =>
        client.query(catalogSeedAdoptionSql).then(() => undefined),
      ),
    readSnapshot: async () => {
      const result = await pool.query<SnapshotRow>(
        `SELECT version, published_at, pricing_note, offers, packages
         FROM beacon.catalog_snapshots
         ORDER BY version DESC
         LIMIT 1`,
      );
      const row = result.rows[0];
      if (!row) throw new CatalogError("Catalog snapshot missing", 500);
      return snapshotFromRow(row);
    },
    listSnapshots: async () => {
      const result = await pool.query<SnapshotRow>(
        `SELECT version, published_at, pricing_note, offers, packages
         FROM beacon.catalog_snapshots
         ORDER BY version`,
      );
      return result.rows.map(snapshotFromRow);
    },
    readDraft: async (identity, origin) => {
      assertAgencyCatalogActor(identity, catalogScopes.read);
      assertAgencyCatalogOrigin(origin);
      const result = await pool.query<{
        revision: string;
        pricing_note: string;
        offers: unknown;
        packages: unknown;
      }>(
        `SELECT revisions.revision, revisions.pricing_note, revisions.offers, revisions.packages
         FROM beacon.catalog_drafts AS drafts
         JOIN beacon.catalog_draft_revisions AS revisions ON revisions.revision = drafts.revision
         WHERE drafts.id = 'current'`,
      );
      const row = result.rows[0];
      if (!row) throw new CatalogError("Offer draft not found", 404);
      return toDraft(
        row.revision,
        parseDraft({
          pricingNote: row.pricing_note,
          offers: row.offers,
          packages: row.packages,
        }),
      );
    },
    readAssignment: async (identity) => {
      assertCustomerCatalogReader(identity);
      return withClient(pool, async (client) => {
        await client.query("SELECT set_config('app.tenant_id', $1, true)", [
          identity.tenantId,
        ]);
        const snapshot = await client.query<SnapshotRow>(
          `SELECT version, published_at, pricing_note, offers, packages
           FROM beacon.catalog_snapshots
           ORDER BY version DESC
           LIMIT 1`,
        );
        const row = snapshot.rows[0];
        if (!row) throw new CatalogError("Catalog snapshot missing", 500);
        const assigned = await client.query<{ package_id: string }>(
          "SELECT package_id FROM beacon.catalog_package_assignments",
        );
        return packagesFor(
          snapshotFromRow(row),
          new Set(assigned.rows.map((item) => item.package_id)),
        );
      });
    },
    assignPackages: async (identity, origin, tenantId, packageIds) => {
      assertAgencyCatalogActor(identity, catalogScopes.write);
      assertAgencyCatalogOrigin(origin);
      const tenant = parseAssignmentTenant(tenantId);
      const ids = parsePackageIds(packageIds);
      return withClient(pool, async (client) => {
        const snapshot = await client.query<SnapshotRow>(
          `SELECT version, published_at, pricing_note, offers, packages
           FROM beacon.catalog_snapshots
           ORDER BY version DESC
           LIMIT 1`,
        );
        const row = snapshot.rows[0];
        if (!row) throw new CatalogError("Catalog snapshot missing", 500);
        const current = snapshotFromRow(row);
        assertKnownPackages(current, ids);
        await client.query("SELECT set_config('app.tenant_id', $1, true)", [
          tenant,
        ]);
        await client.query("DELETE FROM beacon.catalog_package_assignments");
        for (const id of ids) {
          await client.query(
            `INSERT INTO beacon.catalog_package_assignments (tenant_id, package_id)
             VALUES ($1, $2)`,
            [tenant, id],
          );
        }
        return packagesFor(current, new Set(ids));
      });
    },
    saveDraft: async (identity, origin, body) => {
      assertAgencyCatalogActor(identity, catalogScopes.write);
      assertAgencyCatalogOrigin(origin);
      const parsed = parseDraft(body);
      const revision = draftRevision(parsed);
      return withClient(pool, async (client) => {
        await client.query(
          `INSERT INTO beacon.catalog_draft_revisions (revision, pricing_note, offers, packages, saved_at)
           VALUES ($1, $2, $3::jsonb, $4::jsonb, now())
           ON CONFLICT (revision) DO NOTHING`,
          [
            revision,
            parsed.pricingNote,
            JSON.stringify(parsed.offers),
            JSON.stringify(parsed.packages),
          ],
        );
        await client.query(
          `INSERT INTO beacon.catalog_drafts (id, revision, updated_at)
           VALUES ('current', $1, now())
           ON CONFLICT (id) DO UPDATE SET revision = EXCLUDED.revision, updated_at = EXCLUDED.updated_at`,
          [revision],
        );
        return toDraft(revision, parsed);
      });
    },
    publish: async (identity, origin, revision) => {
      assertAgencyCatalogActor(identity, catalogScopes.write);
      assertAgencyCatalogOrigin(origin);
      if (!/^[a-f0-9]{64}$/.test(revision))
        throw new CatalogError("Invalid request", 400);
      return withClient(pool, async (client) => {
        const existing = await client.query<SnapshotRow>(
          `SELECT version, published_at, pricing_note, offers, packages
           FROM beacon.catalog_snapshots
           WHERE source_revision = $1`,
          [revision],
        );
        const found = existing.rows[0];
        if (found) return snapshotFromRow(found);
        const saved = await client.query<{
          pricing_note: string;
          offers: unknown;
          packages: unknown;
        }>(
          `SELECT pricing_note, offers, packages
           FROM beacon.catalog_draft_revisions
           WHERE revision = $1`,
          [revision],
        );
        const row = saved.rows[0];
        if (!row) throw new CatalogError("Saved draft revision not found", 404);
        const body = parseDraft({
          pricingNote: row.pricing_note,
          offers: row.offers,
          packages: row.packages,
        });
        assertCatalogPublishable(body);
        const publishedAt = new Date().toISOString();
        const inserted = await client.query<SnapshotRow>(
          `INSERT INTO beacon.catalog_snapshots
             (version, published_at, pricing_note, offers, packages, source_revision, source)
           SELECT COALESCE(MAX(version), 0) + 1, $1, $2, $3::jsonb, $4::jsonb, $5, 'publish'
           FROM beacon.catalog_snapshots
           RETURNING version, published_at, pricing_note, offers, packages`,
          [
            publishedAt,
            body.pricingNote,
            JSON.stringify(body.offers),
            JSON.stringify(body.packages),
            revision,
          ],
        );
        const created = inserted.rows[0];
        if (!created) throw new CatalogError("Catalog snapshot missing", 500);
        return snapshotFromRow(created);
      });
    },
  };
}
