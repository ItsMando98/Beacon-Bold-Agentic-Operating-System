import { CatalogShellError } from "./errors.js";
import {
  AGENCY_ORIGIN,
  assertNoParentBeaconCookie,
  readSetCookies,
  resolveAgencyUrl,
} from "./origin.js";
import { renderCatalog } from "./render-catalog.mjs";
import {
  assertPublishableRevision,
  type PublishedRevision,
  type SavedDraftRevision,
} from "./revision.js";
import { isSeedSnapshot, SEED_V1_REVISION_ID } from "./seed.js";
import { type CatalogSnapshot, canonicalSnapshot } from "./snapshot.js";

/**
 * Paths Anvil owns. They are not in this repo yet, so the shell leaves this null.
 * Setting it is the only switch that makes the shell call Anvil.
 * This module does not implement those routes.
 */
export type AnvilCatalogRoutes = {
  saveDraft: { method: "POST"; path: string };
  publishRevision: { method: "POST"; path: string };
};

export const anvilCatalogRoutes: AnvilCatalogRoutes | null = null;

export type CatalogClient = {
  readonly label: "temporary-local-seed-adapter" | "anvil";
  saveDraft(buffer: CatalogSnapshot): Promise<SavedDraftRevision>;
  publishRevision(revision: SavedDraftRevision): Promise<PublishedRevision>;
};

function parseSnapshot(value: unknown): CatalogSnapshot {
  renderCatalog(value);
  return canonicalSnapshot(value as CatalogSnapshot);
}

function parseSavedRevision(value: unknown): SavedDraftRevision {
  if (!value || typeof value !== "object") {
    throw new CatalogShellError("Anvil save returned no revision");
  }
  const record = value as { revisionId?: unknown; snapshot?: unknown };
  if (record.revisionId === SEED_V1_REVISION_ID) {
    throw new CatalogShellError("Refusing to publish over seed v1");
  }
  if (
    typeof record.revisionId !== "string" ||
    record.revisionId.trim() === ""
  ) {
    throw new CatalogShellError("Anvil save returned no revision");
  }
  const snapshot = parseSnapshot(record.snapshot);
  if (isSeedSnapshot(snapshot)) {
    throw new CatalogShellError("Refusing to publish over seed v1");
  }
  return { kind: "saved-draft", revisionId: record.revisionId, snapshot };
}

function publishPath(path: string, revisionId: string): string {
  if (!/^[A-Za-z0-9._:-]+$/.test(revisionId)) {
    throw new CatalogShellError("Invalid draft revision");
  }
  return path.replaceAll("{revisionId}", encodeURIComponent(revisionId));
}

async function postJson(
  origin: string,
  path: string,
  body: unknown,
  fetchImpl: typeof fetch,
): Promise<unknown> {
  const url = resolveAgencyUrl(origin, path);
  const response = await fetchImpl(url, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  for (const cookie of readSetCookies(response))
    assertNoParentBeaconCookie(cookie);
  if (!response.ok) {
    throw new CatalogShellError(
      `Anvil catalog route failed (${response.status})`,
    );
  }
  return response.json() as Promise<unknown>;
}

/** Typed client for Anvil's draft and publish routes. Not a server. */
export function createAnvilCatalogClient(options: {
  origin: string;
  routes: AnvilCatalogRoutes;
  fetchImpl: typeof fetch;
}): CatalogClient {
  if (options.origin !== AGENCY_ORIGIN) {
    throw new CatalogShellError(
      "Catalog API is only called from https://agency.beaconandbold.com",
    );
  }
  return {
    label: "anvil",
    async saveDraft(buffer) {
      const snapshot = canonicalSnapshot(structuredClone(buffer));
      renderCatalog(snapshot);
      const payload = await postJson(
        options.origin,
        options.routes.saveDraft.path,
        snapshot,
        options.fetchImpl,
      );
      return parseSavedRevision(payload);
    },
    async publishRevision(value) {
      const revision = assertPublishableRevision(value);
      // The body is the saved revision id only. The unsaved buffer is not sent.
      const payload = { revisionId: revision.revisionId };
      const body = await postJson(
        options.origin,
        publishPath(options.routes.publishRevision.path, revision.revisionId),
        payload,
        options.fetchImpl,
      );
      const saved = parseSavedRevision(body);
      if (saved.revisionId !== revision.revisionId) {
        throw new CatalogShellError("Anvil published a different revision");
      }
      return { revisionId: saved.revisionId, snapshot: saved.snapshot };
    },
  };
}
