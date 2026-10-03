import { CatalogShellError } from "./errors.js";
import { isSeedSnapshot, SEED_V1_REVISION_ID } from "./seed.js";
import { type CatalogSnapshot, canonicalSnapshot } from "./snapshot.js";

/** A draft Anvil (or the temporary adapter) has already stored. */
export type SavedDraftRevision = {
  kind: "saved-draft";
  revisionId: string;
  snapshot: CatalogSnapshot;
};

export type PublishedRevision = {
  revisionId: string;
  snapshot: CatalogSnapshot;
};

export function assertSavedDraft(value: unknown): SavedDraftRevision {
  if (!value || typeof value !== "object") {
    throw new CatalogShellError(
      "Publish blocked: a dirty buffer is not a saved draft revision",
    );
  }
  const record = value as Partial<SavedDraftRevision>;
  if (record.kind !== "saved-draft") {
    throw new CatalogShellError(
      "Publish blocked: a dirty buffer is not a saved draft revision",
    );
  }
  if (record.revisionId === SEED_V1_REVISION_ID) {
    throw new CatalogShellError("Refusing to publish over seed v1");
  }
  if (
    typeof record.revisionId !== "string" ||
    record.revisionId.trim() === ""
  ) {
    throw new CatalogShellError(
      "Publish blocked: a dirty buffer is not a saved draft revision",
    );
  }
  if (!record.snapshot || typeof record.snapshot !== "object") {
    throw new CatalogShellError(
      "Publish blocked: a dirty buffer is not a saved draft revision",
    );
  }
  return {
    kind: "saved-draft",
    revisionId: record.revisionId,
    snapshot: canonicalSnapshot(record.snapshot),
  };
}

export function assertPublishableRevision(value: unknown): SavedDraftRevision {
  const revision = assertSavedDraft(value);
  if (isSeedSnapshot(revision.snapshot)) {
    throw new CatalogShellError("Refusing to publish over seed v1");
  }
  return revision;
}
