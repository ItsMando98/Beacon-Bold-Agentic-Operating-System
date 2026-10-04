import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { catalogActionLabels } from "../../apps/agency/app/catalog-shell.js";
import {
  anvilCatalogRoutes,
  type CatalogClient,
  createAnvilCatalogClient,
} from "../../apps/agency/src/anvil-client.js";
import { agencyShellHeaders } from "../../apps/agency/src/headers.js";
import {
  AGENCY_ORIGIN,
  assertNoParentBeaconCookie,
  resolveAgencyUrl,
} from "../../apps/agency/src/origin.js";
import { previewCatalog } from "../../apps/agency/src/preview.js";
import { renderCatalog } from "../../apps/agency/src/render-catalog.mjs";
import { renderAgencyShellMarkup } from "../../apps/agency/src/render-static.js";
import type { SavedDraftRevision } from "../../apps/agency/src/revision.js";
import { isSeedSnapshot, readCatalogSeed } from "../../apps/agency/src/seed.js";
import {
  createShellCatalogClient,
  openSeedTab,
  publishTab,
  saveTab,
  withBuffer,
} from "../../apps/agency/src/shell.js";
import {
  type CatalogSnapshot,
  catalogOrder,
} from "../../apps/agency/src/snapshot.js";
import { createTemporarySeedAdapter } from "../../apps/agency/src/temporary-seed-adapter.js";

const seedPath = new URL(
  "../../apps/agency/src/catalog-snapshot.v1.json",
  import.meta.url,
);

function editedSeed(note: string): CatalogSnapshot {
  return { ...readCatalogSeed(), pricingNote: note };
}

it("labels only the action that is in flight", () => {
  expect(catalogActionLabels({ save: false, publish: false })).toEqual({
    save: "Save draft",
    publish: "Publish",
  });
  expect(catalogActionLabels({ save: true, publish: false })).toEqual({
    save: "Saving...",
    publish: "Publish",
  });
  expect(catalogActionLabels({ save: false, publish: true })).toEqual({
    save: "Save draft",
    publish: "Publishing...",
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (name === "node_modules" || name === ".next") return [];
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

it("renders seed v1 offers and packages in array order", () => {
  const seed = readCatalogSeed();
  expect(seed.version).toBe(1);
  expect(catalogOrder(seed)).toEqual({
    offers: ["seo-content", "meta-ads", "google-lead-gen"],
    packages: [
      "content-retainer",
      "meta-ads-management",
      "google-lead-gen-management",
      "content-ads-lead-gen",
    ],
  });
  const reversed: CatalogSnapshot = {
    ...seed,
    offers: [...seed.offers].reverse(),
    packages: [...seed.packages].reverse(),
  };
  expect(catalogOrder(openSeedTab(reversed).buffer)).toEqual(
    catalogOrder(reversed),
  );

  const markup = renderAgencyShellMarkup();
  const visible = (value: string) => value.replaceAll("&", "&amp;");
  const offerTitles = seed.offers.map((offer) => visible(offer.title));
  const packageTitles = seed.packages.map((pkg) => visible(pkg.title));
  const offerAt = offerTitles.map((title) => markup.indexOf(title));
  const packageAt = packageTitles.map((title) => markup.indexOf(title));
  expect(offerAt.every((index) => index >= 0)).toBe(true);
  expect(packageAt.every((index) => index >= 0)).toBe(true);
  expect([...offerAt].sort((a, b) => a - b)).toEqual(offerAt);
  expect([...packageAt].sort((a, b) => a - b)).toEqual(packageAt);
  expect(markup).toContain("Temporary local seed adapter");
  expect(markup).toContain('data-adapter="temporary-local-seed-adapter"');
  expect(markup).not.toContain("Unsaved changes");
  expect(markup).not.toContain('id="how"');
  expect(markup).not.toContain('id="about"');
  expect(markup).not.toContain('id="contact"');
  expect(markup).not.toContain('id="services"');
  expect(markup).not.toContain("<footer");
  expect(markup).not.toContain("card-icon");
});

it("previews package cards and the pricing note with render-catalog", () => {
  const seed = readCatalogSeed();
  const rendered = renderCatalog(seed);
  const preview = previewCatalog(seed);
  expect(Object.keys(preview).sort()).toEqual(["packagesHtml", "pricingNote"]);
  expect(preview.pricingNote).toBe(rendered.pricingNote);
  expect(preview.packagesHtml).toBe(rendered.packagesHtml);
  expect(preview.packagesHtml).toContain("€1,800–3,500");
  expect(preview.packagesHtml).toContain("package-featured");
  expect(preview.packagesHtml).toContain(
    "Ad spend billed separately via Meta.",
  );
  expect(preview.packagesHtml).toContain(
    "Ad spend billed separately via Google.",
  );
  expect(preview.pricingNote).toContain("Placeholder ranges for planning");

  const markup = renderAgencyShellMarkup();
  const previewAt = markup.indexOf(
    'data-preview-kind="packages-and-pricing-note"',
  );
  expect(previewAt).toBeGreaterThan(-1);
  expect(markup.indexOf(preview.packagesHtml)).toBeGreaterThan(previewAt);
  expect(markup.slice(previewAt)).toContain(preview.pricingNote);

  const hostile = editedSeed(seed.pricingNote);
  hostile.packages = hostile.packages.map((pkg, index) =>
    index === 0 ? { ...pkg, title: `<script>alert("x")</script>` } : pkg,
  );
  const hostileHtml = previewCatalog(hostile).packagesHtml;
  expect(hostileHtml).toContain("&lt;script&gt;");
  expect(hostileHtml).not.toContain("<script>");

  const forbidden = editedSeed(seed.pricingNote);
  forbidden.packages = forbidden.packages.map((pkg, index) =>
    index === 2 ? { ...pkg, id: "google-lead-gen" } : pkg,
  );
  expect(() => previewCatalog(forbidden)).toThrow(/google-lead-gen/);
});

it("blocks publish of a dirty buffer and publishes the saved revision", async () => {
  const adapter = createTemporarySeedAdapter();
  await expect(publishTab(openSeedTab(), adapter)).rejects.toThrow(
    /without a saved revision/,
  );
  await expect(
    adapter.publishRevision({
      kind: "dirty-buffer",
      pricingNote: "unsaved",
    } as never),
  ).rejects.toThrow(/dirty buffer/);

  const before = readFileSync(seedPath, "utf8");
  const adopted = await saveTab(openSeedTab(), adapter);
  expect(adopted.saved?.revision).toBe("local-draft-1");
  const adoptedPublish = await publishTab(adopted, adapter);
  expect(adoptedPublish.published.snapshot.version).toBe(2);
  expect(isSeedSnapshot(adoptedPublish.published.snapshot)).toBe(false);
  expect(readFileSync(seedPath, "utf8")).toBe(before);

  const note = "Edited planning range for this draft only.";
  const dirty = withBuffer(openSeedTab(), editedSeed(note));
  expect(dirty.dirty).toBe(true);
  let publishedRevision: SavedDraftRevision | null = null;
  const seeing: CatalogClient = {
    label: adapter.label,
    getCatalog: () => adapter.getCatalog(),
    getDraft: () => adapter.getDraft(),
    saveDraft: (buffer) => adapter.saveDraft(buffer),
    async publishRevision(revision) {
      publishedRevision = revision;
      return adapter.publishRevision(revision);
    },
  };
  const outcome = await publishTab(dirty, seeing);
  expect(publishedRevision).not.toBeNull();
  expect(publishedRevision?.kind).toBe("saved-draft");
  expect(publishedRevision?.revision).toBe("local-draft-2");
  expect(publishedRevision?.pricingNote).toBe(note);
  expect(outcome.published.revision).toBe("local-draft-2");
  expect(outcome.published.snapshot.pricingNote).toBe(note);
  expect(outcome.tab.dirty).toBe(false);
  expect(readFileSync(seedPath, "utf8")).toBe(before);
  expect(isSeedSnapshot(readCatalogSeed())).toBe(true);

  const saved = await adapter.saveDraft(editedSeed("second draft"));
  saved.pricingNote = "mutated after save";
  const published = await adapter.publishRevision(saved);
  expect(published.snapshot.pricingNote).toBe("second draft");
});

it("saves a dirty tab before publish and sends only that revision to Anvil", async () => {
  const revision = "a".repeat(64);
  const calls: { url: string; method: string; body: unknown }[] = [];
  const note = "Saved on Anvil, not the open buffer.";
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    const body =
      typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    if (method === "POST" && url.endsWith("/catalog/draft")) {
      await gate;
      return Response.json({
        revision,
        pricingNote: body.pricingNote,
        offers: body.offers,
        packages: body.packages,
      });
    }
    if (method === "POST" && url.endsWith("/catalog/publish")) {
      return Response.json({
        ...readCatalogSeed(),
        pricingNote: note,
        version: 2,
        publishedAt: "2026-11-01T00:00:00+02:00",
      });
    }
    if (method === "GET" && url.endsWith("/catalog/draft")) {
      return Response.json({
        revision,
        pricingNote: note,
        offers: readCatalogSeed().offers,
        packages: readCatalogSeed().packages,
      });
    }
    return Response.json({
      ...readCatalogSeed(),
      version: 2,
      publishedAt: "2026-11-01T00:00:00+02:00",
    });
  };
  expect(anvilCatalogRoutes).toEqual({
    getCatalog: { method: "GET", path: "/catalog" },
    getDraft: { method: "GET", path: "/catalog/draft" },
    saveDraft: { method: "POST", path: "/catalog/draft" },
    publish: { method: "POST", path: "/catalog/publish" },
  });
  const client = createShellCatalogClient({
    origin: AGENCY_ORIGIN,
    fetchImpl,
  });
  expect(client.label).toBe("anvil");
  const dirty = withBuffer(openSeedTab(), editedSeed(note));
  const pending = publishTab(dirty, client);
  dirty.buffer.pricingNote = "edited after publish started";
  release();
  const outcome = await pending;
  expect(calls[0]?.method).toBe("POST");
  expect(calls[0]?.url).toBe(`${AGENCY_ORIGIN}/catalog/draft`);
  expect(Object.keys(calls[0]?.body ?? {}).sort()).toEqual([
    "offers",
    "packages",
    "pricingNote",
  ]);
  expect(calls[0]?.body).not.toHaveProperty("version");
  expect(calls[0]?.body).not.toHaveProperty("publishedAt");
  expect(calls[0]?.body.pricingNote).toBe(note);
  expect(calls[1]?.method).toBe("POST");
  expect(calls[1]?.url).toBe(`${AGENCY_ORIGIN}/catalog/publish`);
  expect(calls[1]?.body).toEqual({ revision });
  expect(JSON.stringify(calls[1]?.body)).not.toContain("revisionId");
  expect(outcome.published.revision).toBe(revision);
  expect(outcome.tab.buffer.version).toBe(2);
  expect(outcome.tab.buffer.publishedAt).toBe("2026-11-01T00:00:00+02:00");
  expect(outcome.tab.buffer.pricingNote).toBe(note);

  const seedNote = readCatalogSeed().pricingNote;
  const sameAsSeed = await client.saveDraft(readCatalogSeed());
  expect(calls.at(-1)?.body.pricingNote).toBe(seedNote);
  expect(calls.at(-1)?.body).not.toHaveProperty("version");
  const publishedSeed = await client.publishRevision(sameAsSeed);
  expect(calls.at(-1)?.body).toEqual({ revision });
  expect(publishedSeed.snapshot.version).toBe(2);

  expect(await client.getCatalog()).toMatchObject({ version: 2 });
  expect(calls.at(-1)?.method).toBe("GET");
  expect(calls.at(-1)?.url).toBe(`${AGENCY_ORIGIN}/catalog`);
  expect((await client.getDraft()).revision).toBe(revision);
  expect(calls.at(-1)?.url).toBe(`${AGENCY_ORIGIN}/catalog/draft`);

  const denied = createShellCatalogClient({
    origin: "http://localhost:3004",
    fetchImpl,
  });
  expect(denied.label).toBe("temporary-local-seed-adapter");
  expect(
    createShellCatalogClient({
      origin: AGENCY_ORIGIN,
      routes: null,
      fetchImpl,
    }).label,
  ).toBe("temporary-local-seed-adapter");
  expect(() =>
    createAnvilCatalogClient({
      origin: "https://app.beaconandbold.com",
      fetchImpl,
    }),
  ).toThrow(/agency.beaconandbold.com/);
  expect(() =>
    resolveAgencyUrl(AGENCY_ORIGIN, "https://api.beaconandbold.com/drafts"),
  ).toThrow(/another origin/);
  expect(readFileSync("apps/agency/src/anvil-client.ts", "utf8")).not.toContain(
    "revisionId",
  );

  const cookieClient = createAnvilCatalogClient({
    origin: AGENCY_ORIGIN,
    fetchImpl: async () =>
      new Response(null, {
        status: 200,
        headers: {
          "content-type": "application/json",
          "set-cookie": "sid=1; Domain=.beaconandbold.com",
        },
      }),
  });
  await expect(cookieClient.saveDraft(editedSeed(note))).rejects.toThrow(
    /cookie on \.beaconandbold\.com/,
  );
});

it("rejects a parent-domain cookie and does not set one from the shell", () => {
  expect(
    agencyShellHeaders().some(
      (header) => header.key.toLowerCase() === "set-cookie",
    ),
  ).toBe(false);
  expect(() =>
    assertNoParentBeaconCookie("id=1; Domain=.beaconandbold.com"),
  ).toThrow(/cookie on \.beaconandbold\.com/);
  expect(() =>
    assertNoParentBeaconCookie("id=1; Domain=beaconandbold.com"),
  ).toThrow(/cookie/);
  assertNoParentBeaconCookie("id=1");
  const css = readFileSync("apps/agency/app/globals.css", "utf8");
  const colors = new Set(
    (css.match(/#[0-9A-Fa-f]{3,8}/g) ?? []).map((color) => color.toUpperCase()),
  );
  expect(colors).toEqual(new Set(["#0E0E0D", "#F1EEE7", "#FF5A1F"]));
  expect(css).toContain("Bricolage Grotesque");
  expect(css).toContain("JetBrains Mono");
  expect(css).toContain("--radius: 0");
  expect(css).toContain("border-radius: 0");
  expect(css).toContain("min-height: 44px");
  expect(css).not.toContain("opacity:");
  expect(css.toLowerCase()).not.toContain("cream");
  expect(css).toContain("button.primary:hover");
  expect(css).toMatch(
    /button\.primary,\s*button\.primary:hover[\s\S]*?background:\s*var\(--signal\);\s*color:\s*var\(--ink\);/,
  );
  expect(css).toMatch(
    /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--ink\)/,
  );
  const layout = readFileSync("apps/agency/app/layout.tsx", "utf8");
  expect(layout).not.toContain("styles.css");
  for (const file of walk("apps/agency")) {
    if (!/\.(ts|tsx|mjs|css)$/.test(file)) continue;
    const text = readFileSync(file, "utf8");
    expect(text).not.toContain("document.cookie");
    expect(text.toLowerCase()).not.toMatch(
      /domain\s*=\s*\.?beaconandbold\.com/,
    );
    expect(text).not.toContain("apps/portal");
    expect(text).not.toContain("apps/web");
  }
});

it("keeps a clean saved draft on publish without sending the buffer again", async () => {
  const adapter = createTemporarySeedAdapter();
  const saved = await saveTab(
    withBuffer(openSeedTab(), editedSeed("kept")),
    adapter,
  );
  expect(saved.dirty).toBe(false);
  expect(saved.saved?.revision).toBe("local-draft-1");
  let sawBuffer = false;
  const client: CatalogClient = {
    label: "temporary-local-seed-adapter",
    getCatalog: () => adapter.getCatalog(),
    getDraft: () => adapter.getDraft(),
    async saveDraft() {
      sawBuffer = true;
      throw new Error("clean publish must not save again");
    },
    publishRevision: (revision) => adapter.publishRevision(revision),
  };
  const outcome = await publishTab(saved, client);
  expect(sawBuffer).toBe(false);
  expect(outcome.published.revision).toBe("local-draft-1");
  expect(outcome.published.snapshot.pricingNote).toBe("kept");
});
