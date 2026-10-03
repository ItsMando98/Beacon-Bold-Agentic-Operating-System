import {
  type AnvilCatalogRoutes,
  anvilCatalogRoutes,
  type CatalogClient,
  createAnvilCatalogClient,
} from "./anvil-client.js";
import { CatalogShellError } from "./errors.js";
import { AGENCY_ORIGIN } from "./origin.js";
import type { PublishedRevision, SavedDraftRevision } from "./revision.js";
import { readCatalogSeed } from "./seed.js";
import {
  type CatalogSnapshot,
  canonicalSnapshot,
  sameSnapshot,
} from "./snapshot.js";
import { createTemporarySeedAdapter } from "./temporary-seed-adapter.js";

/** In-tab editor state. `buffer` is what the inputs show. `clean` is the last save. */
export type CatalogTab = {
  buffer: CatalogSnapshot;
  clean: CatalogSnapshot;
  saved: SavedDraftRevision | null;
  dirty: boolean;
};

export type PublishOutcome = {
  tab: CatalogTab;
  published: PublishedRevision;
};

export function openSeedTab(
  seed: CatalogSnapshot = readCatalogSeed(),
): CatalogTab {
  const clean = canonicalSnapshot(seed);
  return {
    buffer: structuredClone(clean),
    clean: structuredClone(clean),
    saved: null,
    dirty: false,
  };
}

export function withBuffer(
  tab: CatalogTab,
  buffer: CatalogSnapshot,
): CatalogTab {
  const next = canonicalSnapshot(buffer);
  return {
    ...tab,
    buffer: next,
    dirty: !sameSnapshot(next, tab.clean),
  };
}

/**
 * Pick who stores drafts.
 * Anvil is used only on the agency origin, and only after its routes exist.
 * Every other origin stays on the temporary seed adapter and does not call the API.
 */
export function createShellCatalogClient(options: {
  origin: string;
  routes?: AnvilCatalogRoutes | null;
  fetchImpl?: typeof fetch;
}): CatalogClient {
  const routes =
    options.routes === undefined ? anvilCatalogRoutes : options.routes;
  if (options.origin === AGENCY_ORIGIN && routes && options.fetchImpl) {
    return createAnvilCatalogClient({
      origin: options.origin,
      routes,
      fetchImpl: options.fetchImpl,
    });
  }
  return createTemporarySeedAdapter();
}

export async function saveTab(
  tab: CatalogTab,
  client: CatalogClient,
): Promise<CatalogTab> {
  if (!tab.dirty && tab.saved === null) {
    throw new CatalogShellError(
      "Seed v1 is adopted. Edit the catalog before saving a draft.",
    );
  }
  if (!tab.dirty && tab.saved) return tab;
  const revision = await client.saveDraft(structuredClone(tab.buffer));
  const snapshot = canonicalSnapshot(revision.snapshot);
  return {
    buffer: structuredClone(snapshot),
    clean: structuredClone(snapshot),
    saved: {
      kind: "saved-draft",
      revisionId: revision.revisionId,
      snapshot: structuredClone(snapshot),
    },
    dirty: false,
  };
}

/**
 * Publish sends a saved draft revision, never the unsaved buffer.
 * A dirty tab is saved first. Publish then receives the revision that save returned.
 */
export async function publishTab(
  tab: CatalogTab,
  client: CatalogClient,
): Promise<PublishOutcome> {
  if (!tab.dirty && tab.saved === null) {
    throw new CatalogShellError("Refusing to publish over seed v1");
  }
  const revision = tab.dirty
    ? await client.saveDraft(structuredClone(tab.buffer))
    : tab.saved;
  if (!revision)
    throw new CatalogShellError("Refusing to publish over seed v1");
  const published = await client.publishRevision(revision);
  const snapshot = canonicalSnapshot(published.snapshot);
  return {
    tab: {
      buffer: structuredClone(snapshot),
      clean: structuredClone(snapshot),
      saved: {
        kind: "saved-draft",
        revisionId: published.revisionId,
        snapshot: structuredClone(snapshot),
      },
      dirty: false,
    },
    published: {
      revisionId: published.revisionId,
      snapshot: structuredClone(snapshot),
    },
  };
}
