import type { CatalogClient } from "./anvil-client.js";
import { CatalogShellError } from "./errors.js";
import { renderCatalog } from "./render-catalog.mjs";
import {
  assertPublishableRevision,
  type SavedDraftRevision,
} from "./revision.js";
import { isSeedSnapshot, SEED_V1_REVISION_ID } from "./seed.js";
import { canonicalSnapshot } from "./snapshot.js";

/**
 * TEMPORARY LOCAL SEED ADAPTER
 *
 * Anvil owns catalog draft and publish. Those routes are not in this tree yet,
 * so this adapter keeps drafts in memory for the current tab.
 *
 * This is not a server and not a second API.
 * It does not write catalog-snapshot.v1.json.
 * It does not publish over seed v1.
 * Remove it once `anvilCatalogRoutes` points at Anvil.
 */
export function createTemporarySeedAdapter(): CatalogClient {
  const drafts = new Map<string, SavedDraftRevision>();
  return {
    label: "temporary-local-seed-adapter",
    async saveDraft(buffer) {
      const snapshot = canonicalSnapshot(structuredClone(buffer));
      renderCatalog(snapshot);
      if (isSeedSnapshot(snapshot)) {
        throw new CatalogShellError(
          "Seed v1 is adopted. Edit the catalog before saving a draft.",
        );
      }
      const revisionId = `local-draft-${drafts.size + 1}`;
      if (revisionId === SEED_V1_REVISION_ID) {
        throw new CatalogShellError("Refusing to publish over seed v1");
      }
      const revision: SavedDraftRevision = {
        kind: "saved-draft",
        revisionId,
        snapshot,
      };
      drafts.set(revisionId, structuredClone(revision));
      return structuredClone(revision);
    },
    async publishRevision(value) {
      const revision = assertPublishableRevision(value);
      const stored = drafts.get(revision.revisionId);
      if (!stored) throw new CatalogShellError("Unknown draft revision");
      if (
        isSeedSnapshot(stored.snapshot) ||
        stored.revisionId === SEED_V1_REVISION_ID
      ) {
        throw new CatalogShellError("Refusing to publish over seed v1");
      }
      return {
        revisionId: stored.revisionId,
        snapshot: structuredClone(stored.snapshot),
      };
    },
  };
}
