import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import {
  catalogSeedAdoptionSql,
  catalogSeedSnapshot,
  createMemoryCatalogStore,
  draftRevision,
} from "../../packages/db/src/catalog.js";
import { AuthenticationError } from "../../packages/integrations/src/auth.js";
import { agencyAuth0Options } from "../../packages/integrations/src/auth0.js";
import type {
  AuthIdentity,
  CatalogDraftBody,
} from "../../packages/schemas/src/index.js";

const origin = "https://agency.beaconandbold.com";
const agency: AuthIdentity = {
  kind: "human",
  tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  actorId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  subject: "auth0|invented-agency",
  clientId: "agency-app",
  surface: "agency",
  scopes: ["catalog:read", "catalog:write"],
  expiresAt: Math.floor(Date.now() / 1000) + 600,
};
function seedBody(): CatalogDraftBody {
  return {
    pricingNote: catalogSeedSnapshot.pricingNote,
    offers: structuredClone(catalogSeedSnapshot.offers),
    packages: structuredClone(catalogSeedSnapshot.packages),
  };
}
function apiFor(
  store = createMemoryCatalogStore({
    now: () => "2026-10-05T08:00:00.000Z",
  }),
) {
  return {
    store,
    api: createApp({
      catalog: store,
      authenticate: async (request) => {
        const token = request.headers.get("authorization");
        if (token === "Bearer agency") return agency;
        if (token === "Bearer customer")
          return { ...agency, surface: "customer", clientId: "customer-app" };
        if (token === "Bearer agent")
          return {
            ...agency,
            kind: "m2m",
            surface: undefined,
            subject: "agent@clients",
          };
        if (token === "Bearer customer-agent")
          return {
            ...agency,
            kind: "m2m",
            surface: "customer",
            subject: "agent@clients",
          };
        if (token === "Bearer noscope") return { ...agency, scopes: [] };
        throw new AuthenticationError(401);
      },
    }),
  };
}
function post(body: unknown, headers: Record<string, string> = {}) {
  return {
    method: "POST",
    headers: {
      authorization: "Bearer agency",
      origin,
      "content-type": "application/json",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}
async function publish(
  api: ReturnType<typeof apiFor>["api"],
  body: unknown,
  headers?: Record<string, string>,
) {
  const saved = await api.request("/catalog/draft", post(body, headers));
  const draft = await saved.json();
  const published = await api.request(
    "/catalog/publish",
    post({ revision: draft.revision }, headers),
  );
  return { saved, draft, published };
}

test("adopts the seed as version 1 and does not publish it again", async () => {
  const { store, api } = apiFor();
  const first = await (await api.request("/catalog")).json();
  expect(first).toEqual(catalogSeedSnapshot);
  expect(first.version).toBe(1);
  expect(first.publishedAt).toBe("2026-10-04T00:29:00+02:00");
  await store.adoptSeed();
  await store.adoptSeed();
  expect(await store.listSnapshots()).toEqual([catalogSeedSnapshot]);
  const missing = await api.request(
    "/catalog/publish",
    post({ revision: draftRevision(seedBody()) }),
  );
  expect(missing.status).toBe(404);
  expect(await store.listSnapshots()).toEqual([catalogSeedSnapshot]);
  const migration = readFileSync(
    "packages/db/migrations/0006_catalog.sql",
    "utf8",
  );
  expect(migration).toContain(catalogSeedAdoptionSql);
  expect(migration).toContain("WHERE NOT EXISTS");
  expect(migration).not.toMatch(/UPDATE\s+beacon\.catalog_snapshots/i);
  const embedded = migration.match(/\$catalog\$([\s\S]*?)\$catalog\$/);
  expect(JSON.parse(embedded?.[1] ?? "")).toEqual(catalogSeedSnapshot);
});

test("publish is idempotent and the next real publish is version 2", async () => {
  const stamps = ["2026-10-05T08:00:00.000Z", "2026-10-06T08:00:00.000Z"];
  let tick = 0;
  const { store, api } = apiFor(
    createMemoryCatalogStore({
      now: () => stamps[tick++] ?? stamps[1],
    }),
  );
  const changed = seedBody();
  changed.pricingNote = "Updated planning ranges.";
  changed.offers.reverse();
  changed.packages.reverse();
  const firstSave = await api.request("/catalog/draft", post(changed));
  expect(firstSave.status).toBe(200);
  const draft = await firstSave.json();
  const again = await api.request("/catalog/draft", post(changed));
  expect(await again.json()).toEqual(draft);
  const first = await api.request(
    "/catalog/publish",
    post({ revision: draft.revision }),
  );
  const second = await api.request(
    "/catalog/publish",
    post({ revision: draft.revision }),
  );
  expect(first.status).toBe(200);
  const snapshot = await first.json();
  expect(await second.json()).toEqual(snapshot);
  expect(snapshot.version).toBe(2);
  expect(snapshot.publishedAt).toBe(stamps[0]);
  expect(snapshot.offers.map((offer: { id: string }) => offer.id)).toEqual(
    changed.offers.map((offer) => offer.id),
  );
  expect(snapshot.packages.map((item: { id: string }) => item.id)).toEqual(
    changed.packages.map((item) => item.id),
  );
  expect(snapshot.packages[0].adSpend).toBeNull();
  expect(tick).toBe(1);
  const later = seedBody();
  later.pricingNote = "A second saved revision.";
  const next = await publish(api, later);
  expect(next.published.status).toBe(200);
  expect((await next.published.json()).version).toBe(3);
  const history = await store.listSnapshots();
  expect(history).toHaveLength(3);
  expect(history[0]).toEqual(catalogSeedSnapshot);
  await store.adoptSeed();
  expect(await store.listSnapshots()).toEqual(history);
  const current = await (await api.request("/catalog")).json();
  expect(current.version).toBe(3);
});

test("a failed publish leaves the previous snapshot in place", async () => {
  const { store, api } = apiFor();
  const broken = seedBody();
  broken.offers = [];
  const response = await publish(api, broken);
  expect(response.saved.status).toBe(200);
  expect(response.published.status).toBe(400);
  expect((await response.published.json()).error.message).toBe(
    "Publish rejected empty offers",
  );
  expect(await store.listSnapshots()).toEqual([catalogSeedSnapshot]);
  const good = await publish(api, {
    ...seedBody(),
    pricingNote: "Ready to publish.",
  });
  expect((await good.published.json()).version).toBe(2);
  const after = await store.listSnapshots();
  broken.offers = seedBody().offers;
  broken.packages = [];
  const failed = await api.request(
    "/catalog/publish",
    post({
      revision: (
        await (await api.request("/catalog/draft", post(broken))).json()
      ).revision,
    }),
  );
  expect(failed.status).toBe(400);
  expect(await store.listSnapshots()).toEqual(after);
});

test("publish rejects an unsound catalog and keeps version 1", async () => {
  const base = seedBody();
  const cases: Array<{
    name: string;
    body: CatalogDraftBody;
    message: string;
  }> = [
    {
      name: "empty offers",
      body: { ...base, offers: [] },
      message: "Publish rejected empty offers",
    },
    {
      name: "empty packages",
      body: { ...base, packages: [] },
      message: "Publish rejected empty packages",
    },
    {
      name: "missing offer title",
      body: {
        ...base,
        offers: [{ ...base.offers[0], title: "  " }, ...base.offers.slice(1)],
      },
      message: "Publish rejected missing title",
    },
    {
      name: "missing package title",
      body: {
        ...base,
        packages: [
          { ...base.packages[0], title: "" },
          ...base.packages.slice(1),
        ],
      },
      message: "Publish rejected missing title",
    },
    {
      name: "negative price",
      body: {
        ...base,
        packages: [
          { ...base.packages[0], priceMin: -1 },
          ...base.packages.slice(1),
        ],
      },
      message: "Publish rejected negative price",
    },
    {
      name: "priceMin greater than priceMax",
      body: {
        ...base,
        packages: [
          { ...base.packages[0], priceMin: 400000, priceMax: 100000 },
          ...base.packages.slice(1),
        ],
      },
      message: "Publish rejected priceMin greater than priceMax",
    },
    {
      name: "duplicate offer id",
      body: {
        ...base,
        offers: [base.offers[0], { ...base.offers[1], id: base.offers[0].id }],
      },
      message: "Publish rejected duplicate offer id",
    },
    {
      name: "duplicate package id",
      body: {
        ...base,
        packages: [
          base.packages[0],
          { ...base.packages[1], id: base.packages[0].id },
        ],
      },
      message: "Publish rejected duplicate package id",
    },
    {
      name: "id in both arrays",
      body: {
        ...base,
        packages: [{ ...base.packages[0], id: base.offers[0].id }],
      },
      message: "Publish rejected id present in offers and packages",
    },
    {
      name: "reserved package id",
      body: {
        ...base,
        offers: base.offers.map((offer) =>
          offer.id === "google-lead-gen"
            ? { ...offer, id: "search-ads" }
            : offer,
        ),
        packages: [{ ...base.packages[0], id: "google-lead-gen" }],
      },
      message: "Publish rejected package id google-lead-gen",
    },
  ];
  for (const item of cases) {
    const { store, api } = apiFor();
    const response = await publish(api, item.body);
    expect(response.published.status, item.name).toBe(400);
    expect((await response.published.json()).error.message, item.name).toBe(
      item.message,
    );
    expect(await store.listSnapshots(), item.name).toEqual([
      catalogSeedSnapshot,
    ]);
  }
});

test("rejects currency, interval, and adSpend values that are not exact", async () => {
  const base = seedBody();
  const packageBase = base.packages[0];
  const cases = [
    { ...packageBase, currency: "eur" },
    { ...packageBase, currency: "USD" },
    { ...packageBase, interval: "year" },
    { ...packageBase, interval: "Month" },
    { ...packageBase, priceMin: "180000" },
    { ...packageBase, priceMin: 180000.5 },
    { ...packageBase, adSpend: "facebook" },
    { ...packageBase, adSpend: undefined },
  ];
  for (const item of cases) {
    const { store, api } = apiFor();
    const body = { ...base, packages: [item, ...base.packages.slice(1)] };
    if (item.adSpend === undefined) delete body.packages[0].adSpend;
    const response = await api.request("/catalog/draft", post(body));
    expect(response.status).toBe(400);
    expect((await response.json()).error.code).toBe("VALIDATION_ERROR");
    expect(await store.listSnapshots()).toEqual([catalogSeedSnapshot]);
  }
  const { api } = apiFor();
  const kept = seedBody();
  expect(kept.packages[0].adSpend).toBeNull();
  const saved = await api.request("/catalog/draft", post(kept));
  expect(saved.status).toBe(200);
  expect((await saved.json()).packages[0].adSpend).toBeNull();
});

test("draft reads and writes require agency auth and the exact agency origin", async () => {
  const { api } = apiFor();
  const body = { ...seedBody(), pricingNote: "Agency edit." };
  expect((await api.request("/catalog")).status).toBe(200);
  expect((await api.request("/catalog/draft")).status).toBe(401);
  expect(
    (
      await api.request("/catalog/draft", {
        headers: { authorization: "Bearer customer" },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await api.request("/catalog/draft", {
        headers: { authorization: "Bearer customer-agent" },
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await api.request("/catalog/draft", {
        headers: { authorization: "Bearer noscope" },
      })
    ).status,
  ).toBe(403);
  const saved = await api.request("/catalog/draft", post(body));
  expect(saved.status).toBe(200);
  const savedDraft = await saved.json();
  const draft = await api.request("/catalog/draft", {
    headers: { authorization: "Bearer agency" },
  });
  expect(draft.status).toBe(200);
  expect((await draft.json()).pricingNote).toBe("Agency edit.");
  const agent = await api.request("/catalog/draft", {
    headers: { authorization: "Bearer agent" },
  });
  expect(agent.status).toBe(200);
  for (const foreign of [
    "https://clients.beaconandbold.com",
    "https://agency.beaconandbold.com/",
    "http://agency.beaconandbold.com",
    "https://agency.beaconandbold.com.evil",
  ]) {
    const response = await api.request(
      "/catalog/publish",
      post(
        { revision: savedDraft.revision },
        {
          origin: foreign,
          cookie: "appSession=invented",
        },
      ),
    );
    expect(response.status, foreign).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect((await response.json()).error.message).toBe("Origin is not allowed");
  }
  const missingOrigin = await api.request("/catalog/draft", {
    method: "POST",
    headers: {
      authorization: "Bearer agency",
      cookie: "appSession=invented",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  expect(missingOrigin.status).toBe(403);
  expect(missingOrigin.headers.get("set-cookie")).toBeNull();
  const cookieOnly = await api.request("/catalog/draft", {
    headers: { cookie: "appSession=invented", origin },
  });
  expect(cookieOnly.status).toBe(401);
});

test("agency session cookies stay host-only", () => {
  const options = agencyAuth0Options({
    AUTH0_DOMAIN: "synthetic.auth0.com",
    AUTH0_CLIENT_ID: "agency",
    AUTH0_CLIENT_SECRET: "synthetic",
    AUTH0_SECRET: "ab".repeat(32),
    APP_BASE_URL: "https://agency.beaconandbold.com",
    AUTH0_AUDIENCE: "https://api.example.invalid",
  });
  expect("domain" in options.session.cookie).toBe(false);
  expect("domain" in options.transactionCookie).toBe(false);
  expect(options.session.cookie.path).toBe("/");
  expect(options.authorizationParameters.scope).toContain("catalog:write");
});
