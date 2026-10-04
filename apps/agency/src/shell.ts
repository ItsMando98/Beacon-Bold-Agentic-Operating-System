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
 * The agency origin calls Anvil. Passing `routes: null`, or any other origin,
 * keeps the temporary in-memory adapter and does not call the API.
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

function tabFromDraft(
  previous: CatalogSnapshot,
  draft: SavedDraftRevision,
): CatalogTab {
  const snapshot = canonicalSnapshot({
    version: previous.version,
    publishedAt: previous.publishedAt,
    pricingNote: draft.pricingNote,
    offers: draft.offers,
    packages: draft.packages,
  });
  return {
    buffer: structuredClone(snapshot),
    clean: structuredClone(snapshot),
    saved: {
      kind: "saved-draft",
      revision: draft.revision,
      pricingNote: snapshot.pricingNote,
      offers: structuredClone(snapshot.offers),
      packages: structuredClone(snapshot.packages),
    },
    dirty: false,
  };
}

export async function saveTab(
  tab: CatalogTab,
  client: CatalogClient,
): Promise<CatalogTab> {
  if (!tab.dirty && tab.saved) return tab;
  const draft = await client.saveDraft(structuredClone(tab.buffer));
  return tabFromDraft(tab.buffer, draft);
}

/**
 * Publish sends a saved draft revision, never the unsaved buffer.
 * A dirty tab is saved first. Publish then sends { revision } for the revision save returned.
 * A tab with no saved revision is refused. Matching seed v1 is not a reason to refuse.
 */
export async function publishTab(
  tab: CatalogTab,
  client: CatalogClient,
): Promise<PublishOutcome> {
  if (!tab.dirty && tab.saved === null) {
    throw new CatalogShellError("Refusing to publish without a saved revision");
  }
  const draft = tab.dirty
    ? await client.saveDraft(structuredClone(tab.buffer))
    : tab.saved;
  if (!draft)
    throw new CatalogShellError("Refusing to publish without a saved revision");
  const published = await client.publishRevision(draft);
  const snapshot = canonicalSnapshot(published.snapshot);
  return {
    tab: {
      buffer: structuredClone(snapshot),
      clean: structuredClone(snapshot),
      saved: {
        kind: "saved-draft",
        revision: published.revision,
        pricingNote: snapshot.pricingNote,
        offers: structuredClone(snapshot.offers),
        packages: structuredClone(snapshot.packages),
      },
      dirty: false,
    },
    published: {
      revision: published.revision,
      snapshot: structuredClone(snapshot),
    },
  };
}
