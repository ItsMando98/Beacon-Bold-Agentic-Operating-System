import { randomUUID } from "node:crypto";
import { Client } from "pg";
import { expect, test } from "vitest";
import { migrate } from "../../packages/db/migrate.mjs";
import {
  catalogSeedSnapshot,
  createPostgresCatalogStore,
} from "../../packages/db/src/catalog.js";
import type { AuthIdentity } from "../../packages/schemas/src/index.js";

const agency: AuthIdentity = {
  kind: "human",
  tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  actorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  subject: "auth0|invented-agency",
  clientId: "agency-app",
  surface: "agency",
  scopes: ["catalog:read", "catalog:write"],
  expiresAt: Math.floor(Date.now() / 1000) + 600,
};
const origin = "https://agency.beaconandbold.com";

test("seed adoption on PostgreSQL stays version 1 until a real publish", async () => {
  const databaseName = `beacon_catalog_${randomUUID().replaceAll("-", "")}`;
  const ownerUrl =
    "postgresql://beacon_owner:local-owner-only@127.0.0.1:15432/";
  const admin = new Client({ connectionString: `${ownerUrl}beacon` });
  const owner = new Client({ connectionString: ownerUrl + databaseName });
  const appUrl = `postgresql://beacon_app:local-development-only@127.0.0.1:15432/${databaseName}`;
  const store = createPostgresCatalogStore(appUrl);
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE "${databaseName}"`);
    await owner.connect();
    await migrate(owner, "packages/db/migrations");
    await migrate(owner, "packages/db/migrations");
    const seeded = await owner.query(
      "SELECT version, published_at, source, source_revision FROM beacon.catalog_snapshots ORDER BY version",
    );
    expect(seeded.rows).toEqual([
      {
        version: 1,
        published_at: "2026-10-04T00:29:00+02:00",
        source: "seed",
        source_revision: null,
      },
    ]);
    expect(await store.readSnapshot()).toEqual(catalogSeedSnapshot);
    await store.adoptSeed();
    expect(await store.listSnapshots()).toEqual([catalogSeedSnapshot]);
    const changed = {
      pricingNote: "Postgres publish.",
      offers: structuredClone(catalogSeedSnapshot.offers).reverse(),
      packages: structuredClone(catalogSeedSnapshot.packages),
    };
    const draft = await store.saveDraft(agency, origin, changed);
    const first = await store.publish(agency, origin, draft.revision);
    const second = await store.publish(agency, origin, draft.revision);
    expect(second).toEqual(first);
    expect(first.version).toBe(2);
    expect(first.offers.map((offer) => offer.id)).toEqual(
      changed.offers.map((offer) => offer.id),
    );
    expect((await store.listSnapshots())[0]).toEqual(catalogSeedSnapshot);
    await expect(store.publish(agency, origin, "a".repeat(64))).rejects.toThrow(
      "Saved draft revision not found",
    );
    const broken = await store.saveDraft(agency, origin, {
      ...changed,
      offers: [],
    });
    await expect(
      store.publish(agency, origin, broken.revision),
    ).rejects.toThrow("Publish rejected empty offers");
    expect(await store.readSnapshot()).toEqual(first);
    await store.adoptSeed();
    const rows = await owner.query(
      "SELECT version, published_at, source FROM beacon.catalog_snapshots ORDER BY version",
    );
    expect(rows.rows).toEqual([
      {
        version: 1,
        published_at: "2026-10-04T00:29:00+02:00",
        source: "seed",
      },
      {
        version: 2,
        published_at: first.publishedAt,
        source: "publish",
      },
    ]);
    await expect(
      owner.query(
        "UPDATE beacon.catalog_snapshots SET pricing_note = 'changed' WHERE version = 1",
      ),
    ).rejects.toThrow("immutable");
    const app = new Client({ connectionString: appUrl });
    await app.connect();
    await expect(
      app.query("DELETE FROM beacon.catalog_snapshots WHERE version = 1"),
    ).rejects.toThrow();
    await app.end();
  } finally {
    await store.close();
    await owner.end();
    await admin.query(`DROP DATABASE IF EXISTS "${databaseName}"`);
    await admin.end();
  }
});
