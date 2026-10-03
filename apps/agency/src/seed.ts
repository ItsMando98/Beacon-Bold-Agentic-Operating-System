import seedJson from "./catalog-snapshot.v1.json";
import {
  type CatalogSnapshot,
  canonicalSnapshot,
  sameSnapshot,
} from "./snapshot.js";

/** Identity of the adopted seed. Publish must never use this id. */
export const SEED_V1_REVISION_ID = "seed-v1";

const seedV1 = canonicalSnapshot(seedJson as CatalogSnapshot);

export function readCatalogSeed(): CatalogSnapshot {
  return structuredClone(seedV1);
}

export function isSeedSnapshot(snapshot: CatalogSnapshot): boolean {
  return sameSnapshot(snapshot, seedV1);
}
