import seedJson from "./catalog-snapshot.v1.json";
import {
  type CatalogSnapshot,
  canonicalSnapshot,
  sameSnapshot,
} from "./snapshot.js";

const seedV1 = canonicalSnapshot(seedJson as CatalogSnapshot);

export function readCatalogSeed(): CatalogSnapshot {
  return structuredClone(seedV1);
}

export function isSeedSnapshot(snapshot: CatalogSnapshot): boolean {
  return sameSnapshot(snapshot, seedV1);
}
