import { CatalogShellError } from "./errors.js";
import type { CatalogOffer, CatalogPackage } from "./snapshot.js";

/**
 * A draft Anvil has already stored.
 * Wire shape: { revision, pricingNote, offers, packages }.
 * `revision` is the 64-character hex from the save response.
 */
export type SavedDraftRevision = {
  kind: "saved-draft";
  revision: string;
  pricingNote: string;
  offers: CatalogOffer[];
  packages: CatalogPackage[];
};

export type PublishedRevision = {
  revision: string;
  snapshot: {
    version: number;
    publishedAt: string;
    pricingNote: string;
    offers: CatalogOffer[];
    packages: CatalogPackage[];
  };
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
  if (typeof record.revision !== "string" || record.revision.trim() === "") {
    throw new CatalogShellError("Refusing to publish without a saved revision");
  }
  if (typeof record.pricingNote !== "string" || !Array.isArray(record.offers)) {
    throw new CatalogShellError(
      "Publish blocked: a dirty buffer is not a saved draft revision",
    );
  }
  if (!Array.isArray(record.packages)) {
    throw new CatalogShellError(
      "Publish blocked: a dirty buffer is not a saved draft revision",
    );
  }
  return {
    kind: "saved-draft",
    revision: record.revision,
    pricingNote: record.pricingNote,
    offers: record.offers,
    packages: record.packages,
  };
}
