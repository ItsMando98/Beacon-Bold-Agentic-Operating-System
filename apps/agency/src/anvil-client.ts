import { CatalogShellError } from "./errors.js";
import {
  AGENCY_ORIGIN,
  assertNoParentBeaconCookie,
  readSetCookies,
  resolveAgencyUrl,
} from "./origin.js";
import { renderCatalog } from "./render-catalog.mjs";
import { assertSavedDraft, type SavedDraftRevision } from "./revision.js";
import {
  type CatalogOffer,
  type CatalogPackage,
  type CatalogSnapshot,
  canonicalSnapshot,
} from "./snapshot.js";

/**
 * Anvil's catalog routes, from packages/schemas/src/catalog.ts on the
 * catalog-server branch. This module does not implement those routes.
 */
export type AnvilCatalogRoutes = {
  getCatalog: { method: "GET"; path: "/catalog" };
  getDraft: { method: "GET"; path: "/catalog/draft" };
  saveDraft: { method: "POST"; path: "/catalog/draft" };
  publish: { method: "POST"; path: "/catalog/publish" };
};

export const anvilCatalogRoutes: AnvilCatalogRoutes = {
  getCatalog: { method: "GET", path: "/catalog" },
  getDraft: { method: "GET", path: "/catalog/draft" },
  saveDraft: { method: "POST", path: "/catalog/draft" },
  publish: { method: "POST", path: "/catalog/publish" },
};

export type CatalogClient = {
  readonly label: "temporary-local-seed-adapter" | "anvil";
  getCatalog(): Promise<CatalogSnapshot>;
  getDraft(): Promise<SavedDraftRevision>;
  saveDraft(buffer: CatalogSnapshot): Promise<SavedDraftRevision>;
  publishRevision(revision: SavedDraftRevision): Promise<{
    revision: string;
    snapshot: CatalogSnapshot;
  }>;
};

const revisionPattern = /^[a-f0-9]{64}$/;

/** POST /catalog/draft accepts only these three fields. */
export function catalogDraftBody(snapshot: CatalogSnapshot): {
  pricingNote: string;
  offers: CatalogOffer[];
  packages: CatalogPackage[];
} {
  const canonical = canonicalSnapshot(snapshot);
  return {
    pricingNote: canonical.pricingNote,
    offers: canonical.offers,
    packages: canonical.packages,
  };
}

function requireRecord(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new CatalogShellError(message);
  }
  return value as Record<string, unknown>;
}

function parseRevision(value: unknown): string {
  if (typeof value !== "string" || !revisionPattern.test(value)) {
    throw new CatalogShellError("Anvil save returned no revision");
  }
  return value;
}

export function parseOfferDraft(value: unknown): SavedDraftRevision {
  const record = requireRecord(value, "Anvil save returned no revision");
  const revision = parseRevision(record.revision);
  if (typeof record.pricingNote !== "string" || !Array.isArray(record.offers)) {
    throw new CatalogShellError("Anvil save returned no revision");
  }
  if (!Array.isArray(record.packages)) {
    throw new CatalogShellError("Anvil save returned no revision");
  }
  const body = catalogDraftBody({
    version: 1,
    publishedAt: "1970-01-01T00:00:00Z",
    pricingNote: record.pricingNote,
    offers: record.offers as CatalogOffer[],
    packages: record.packages as CatalogPackage[],
  });
  return {
    kind: "saved-draft",
    revision,
    pricingNote: body.pricingNote,
    offers: body.offers,
    packages: body.packages,
  };
}

export function parseCatalogSnapshot(value: unknown): CatalogSnapshot {
  renderCatalog(value);
  return canonicalSnapshot(value as CatalogSnapshot);
}

async function readResponse(response: Response): Promise<unknown> {
  for (const cookie of readSetCookies(response))
    assertNoParentBeaconCookie(cookie);
  if (response.status !== 200) {
    throw new CatalogShellError(
      `Anvil catalog route failed (${response.status})`,
    );
  }
  return response.json() as Promise<unknown>;
}

async function request(
  origin: string,
  method: "GET" | "POST",
  path: string,
  fetchImpl: typeof fetch,
  body?: unknown,
): Promise<unknown> {
  const url = resolveAgencyUrl(origin, path);
  const response = await fetchImpl(url, {
    method,
    credentials: "same-origin",
    cache: "no-store",
    redirect: "error",
    headers: {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return readResponse(response);
}

/** Typed client for Anvil's catalog routes. Not a server. */
export function createAnvilCatalogClient(options: {
  origin: string;
  routes?: AnvilCatalogRoutes;
  fetchImpl: typeof fetch;
}): CatalogClient {
  if (options.origin !== AGENCY_ORIGIN) {
    throw new CatalogShellError(
      "Catalog API is only called from https://agency.beaconandbold.com",
    );
  }
  const routes = options.routes ?? anvilCatalogRoutes;
  return {
    label: "anvil",
    async getCatalog() {
      return parseCatalogSnapshot(
        await request(
          options.origin,
          "GET",
          routes.getCatalog.path,
          options.fetchImpl,
        ),
      );
    },
    async getDraft() {
      return parseOfferDraft(
        await request(
          options.origin,
          "GET",
          routes.getDraft.path,
          options.fetchImpl,
        ),
      );
    },
    async saveDraft(buffer) {
      const payload = await request(
        options.origin,
        "POST",
        routes.saveDraft.path,
        options.fetchImpl,
        catalogDraftBody(buffer),
      );
      return parseOfferDraft(payload);
    },
    async publishRevision(value) {
      const saved = assertSavedDraft(value);
      const revision = parseRevision(saved.revision);
      const payload = await request(
        options.origin,
        "POST",
        routes.publish.path,
        options.fetchImpl,
        { revision },
      );
      return { revision, snapshot: parseCatalogSnapshot(payload) };
    },
  };
}
