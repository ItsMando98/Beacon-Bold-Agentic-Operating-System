import type { CatalogClient } from "./anvil-client.js";
import { CatalogShellError } from "./errors.js";
import { assertSavedDraft, type SavedDraftRevision } from "./revision.js";
import { readCatalogSeed } from "./seed.js";
import { type CatalogSnapshot, canonicalSnapshot } from "./snapshot.js";

/**
 * TEMPORARY LOCAL SEED ADAPTER
 *
 * Fallback only while catalog routes are null, or while the page is not on
 * https://agency.beaconandbold.com. The agency origin uses Anvil's routes.
 *
 * This is not a server. It does not write catalog-snapshot.v1.json.
 * Saving seed v1 content is allowed. Publishing that saved revision is allowed.
 * Adopting the seed file is not a publish.
 */
export function createTemporarySeedAdapter(): CatalogClient {
  const drafts = new Map<
    string,
    { draft: SavedDraftRevision; snapshot: CatalogSnapshot }
  >();
  let latest: string | null = null;
  return {
    label: "temporary-local-seed-adapter",
    async getCatalog() {
      return readCatalogSeed();
    },
    async getDraft() {
      if (!latest)
        throw new CatalogShellError(
          "Refusing to publish without a saved revision",
        );
      const stored = drafts.get(latest);
      if (!stored)
        throw new CatalogShellError(
          "Refusing to publish without a saved revision",
        );
      return structuredClone(stored.draft);
    },
    async saveDraft(buffer) {
      const snapshot = canonicalSnapshot(structuredClone(buffer));
      const revision = `local-draft-${drafts.size + 1}`;
      const draft: SavedDraftRevision = {
        kind: "saved-draft",
        revision,
        pricingNote: snapshot.pricingNote,
        offers: snapshot.offers,
        packages: snapshot.packages,
      };
      drafts.set(revision, { draft, snapshot });
      latest = revision;
      return structuredClone(draft);
    },
    async publishRevision(value) {
      const saved = assertSavedDraft(value);
      const stored = drafts.get(saved.revision);
      if (!stored) throw new CatalogShellError("Unknown draft revision");
      return {
        revision: stored.draft.revision,
        snapshot: canonicalSnapshot({
          ...stored.snapshot,
          version: stored.snapshot.version + 1,
        }),
      };
    },
  };
}
