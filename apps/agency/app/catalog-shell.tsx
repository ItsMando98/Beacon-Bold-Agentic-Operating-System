"use client";

import { useEffect, useRef, useState } from "react";
import { previewCatalog } from "../src/preview";
import {
  type CatalogTab,
  createShellCatalogClient,
  openSeedTab,
  publishTab,
  saveTab,
  withBuffer,
} from "../src/shell";
import type {
  CatalogOffer,
  CatalogPackage,
  CatalogSnapshot,
} from "../src/snapshot";

function replaceOffer(
  tab: CatalogTab,
  index: number,
  offer: CatalogOffer,
): CatalogTab {
  const offers = tab.buffer.offers.map((item, itemIndex) =>
    itemIndex === index ? offer : item,
  );
  return withBuffer(tab, { ...tab.buffer, offers });
}

function replacePackage(
  tab: CatalogTab,
  index: number,
  pkg: CatalogPackage,
): CatalogTab {
  const packages = tab.buffer.packages.map((item, itemIndex) =>
    itemIndex === index ? pkg : item,
  );
  return withBuffer(tab, { ...tab.buffer, packages });
}

function cents(value: string): number | null {
  if (value.trim() === "") return 0;
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
}

/** Each action has its own in-flight flag. A save must not relabel Publish. */
export function catalogActionLabels(pending: {
  save: boolean;
  publish: boolean;
}): { save: string; publish: string } {
  return {
    save: pending.save ? "Saving..." : "Save draft",
    publish: pending.publish ? "Publishing..." : "Publish",
  };
}

/**
 * Frontend for the agency catalog.
 * The inputs are the dirty buffer. Save and Publish talk to the catalog client.
 * Package cards are not drawn in JSX. Their HTML comes from render-catalog.
 */
export function AgencyCatalogShell() {
  const [client, setClient] = useState(() =>
    createShellCatalogClient({ origin: "server-render" }),
  );
  const clientRef = useRef(client);
  clientRef.current = client;
  useEffect(() => {
    setClient(
      createShellCatalogClient({
        origin: window.location.origin,
        fetchImpl: window.fetch.bind(window),
      }),
    );
  }, []);
  const [tab, setTab] = useState<CatalogTab>(() => openSeedTab());
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const [notice, setNotice] = useState<string | null>(null);
  const [savePending, setSavePending] = useState(false);
  const [publishPending, setPublishPending] = useState(false);
  const labels = catalogActionLabels({
    save: savePending,
    publish: publishPending,
  });
  const busy = savePending || publishPending;

  let preview: ReturnType<typeof previewCatalog> | null = null;
  let previewError: string | null = null;
  try {
    preview = previewCatalog(tab.buffer);
  } catch (error) {
    previewError = error instanceof Error ? error.message : "Preview failed";
  }

  function patchSnapshot(patch: Partial<CatalogSnapshot>) {
    setTab((current) => withBuffer(current, { ...current.buffer, ...patch }));
  }

  function patchOffer(index: number, patch: Partial<CatalogOffer>) {
    setTab((current) => {
      const offer = current.buffer.offers[index];
      if (!offer) return current;
      return replaceOffer(current, index, { ...offer, ...patch });
    });
  }

  function patchPackage(index: number, patch: Partial<CatalogPackage>) {
    setTab((current) => {
      const pkg = current.buffer.packages[index];
      if (!pkg) return current;
      return replacePackage(current, index, { ...pkg, ...patch });
    });
  }

  async function onSave() {
    if (savePending || publishPending) return;
    setSavePending(true);
    try {
      const next = await saveTab(tabRef.current, clientRef.current);
      setTab(next);
      setNotice(
        next.saved ? `Draft ${next.saved.revision} saved.` : "Draft saved.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Save failed");
    } finally {
      setSavePending(false);
    }
  }

  async function onPublish() {
    if (savePending || publishPending) return;
    setPublishPending(true);
    try {
      const result = await publishTab(tabRef.current, clientRef.current);
      setTab(result.tab);
      setNotice(`Published revision ${result.published.revision}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Publish failed");
    } finally {
      setPublishPending(false);
    }
  }

  return (
    <main className="shell" aria-busy={busy}>
      <header className="topbar">
        <div>
          <p className="meta">Agency catalog</p>
          <h1 className="brand">Beacon & Bold</h1>
          <p className="origin">https://agency.beaconandbold.com</p>
        </div>
        <div className="actions">
          <button type="button" onClick={onSave} disabled={busy}>
            {labels.save}
          </button>
          <button
            type="button"
            className="primary"
            onClick={onPublish}
            disabled={busy}
          >
            {labels.publish}
          </button>
        </div>
      </header>

      <p className="notice" data-adapter={client.label}>
        {client.label === "temporary-local-seed-adapter"
          ? "Temporary local seed adapter. On https://agency.beaconandbold.com the shell calls Anvil: POST /catalog/draft and POST /catalog/publish. This tab keeps drafts in memory until then."
          : "Draft and publish use Anvil on https://agency.beaconandbold.com."}
      </p>
      {tab.dirty ? (
        <p className="dirty" role="status">
          Unsaved changes
        </p>
      ) : null}
      {notice ? (
        <p className="revision" role="status">
          {notice}
        </p>
      ) : null}

      <div className="shell-grid">
        <section aria-label="Editor">
          <h2>Offers and packages</h2>
          <p className="meta">
            Shown in seed order. Version {tab.buffer.version}.
          </p>
          <label className="field">
            Pricing note
            <textarea
              value={tab.buffer.pricingNote}
              rows={3}
              onChange={(event) =>
                patchSnapshot({ pricingNote: event.target.value })
              }
            />
          </label>
          <label className="field">
            Published at
            <input
              value={tab.buffer.publishedAt}
              onChange={(event) =>
                patchSnapshot({ publishedAt: event.target.value })
              }
            />
          </label>

          {tab.buffer.offers.map((offer, index) => (
            // The row is its place in the catalog array. The id is an editable field.
            // biome-ignore lint/suspicious/noArrayIndexKey: array order is the catalog order
            <article className="editor-card" key={`offer-${index}`}>
              <p className="meta">Offer {index + 1}</p>
              <h3>{offer.title}</h3>
              <label className="field">
                Id
                <input
                  value={offer.id}
                  onChange={(event) =>
                    patchOffer(index, { id: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Title
                <input
                  value={offer.title}
                  onChange={(event) =>
                    patchOffer(index, { title: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Summary
                <textarea
                  rows={4}
                  value={offer.summary}
                  onChange={(event) =>
                    patchOffer(index, { summary: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Points, one per line
                <textarea
                  rows={4}
                  value={offer.points.join("\n")}
                  onChange={(event) =>
                    patchOffer(index, {
                      points: event.target.value.split("\n"),
                    })
                  }
                />
              </label>
            </article>
          ))}

          {tab.buffer.packages.map((pkg, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: array order is the catalog order
            <article className="editor-card" key={`package-${index}`}>
              <p className="meta">Package {index + 1}</p>
              <h3>{pkg.title}</h3>
              <label className="field">
                Id
                <input
                  value={pkg.id}
                  onChange={(event) =>
                    patchPackage(index, { id: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Title
                <input
                  value={pkg.title}
                  onChange={(event) =>
                    patchPackage(index, { title: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Summary
                <textarea
                  rows={3}
                  value={pkg.summary}
                  onChange={(event) =>
                    patchPackage(index, { summary: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Points, one per line
                <textarea
                  rows={4}
                  value={pkg.points.join("\n")}
                  onChange={(event) =>
                    patchPackage(index, {
                      points: event.target.value.split("\n"),
                    })
                  }
                />
              </label>
              <div className="pair">
                <label className="field">
                  Minimum price in cents
                  <input
                    inputMode="numeric"
                    value={String(pkg.priceMin)}
                    onChange={(event) => {
                      const next = cents(event.target.value);
                      if (next === null) return;
                      patchPackage(index, { priceMin: next });
                    }}
                  />
                </label>
                <label className="field">
                  Maximum price in cents
                  <input
                    inputMode="numeric"
                    value={String(pkg.priceMax)}
                    onChange={(event) => {
                      const next = cents(event.target.value);
                      if (next === null) return;
                      patchPackage(index, { priceMax: next });
                    }}
                  />
                </label>
              </div>
              <div className="pair">
                <label className="field">
                  Currency
                  <input
                    value={pkg.currency}
                    onChange={(event) =>
                      patchPackage(index, { currency: event.target.value })
                    }
                  />
                </label>
                <label className="field">
                  Interval
                  <input
                    value={pkg.interval}
                    onChange={(event) =>
                      patchPackage(index, { interval: event.target.value })
                    }
                  />
                </label>
              </div>
              <label className="field">
                Ad spend
                <select
                  value={pkg.adSpend ?? ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    const adSpend =
                      value === "meta" || value === "google" ? value : null;
                    patchPackage(index, { adSpend });
                  }}
                >
                  <option value="">None</option>
                  <option value="meta">meta</option>
                  <option value="google">google</option>
                </select>
              </label>
            </article>
          ))}
        </section>

        <section aria-label="Preview">
          <h2>Preview</h2>
          <p className="meta">
            Package cards and the pricing note from render-catalog. Hero,
            process, about, contact, and the footnote stay on the public site.
          </p>
          <div
            className="preview"
            data-preview-kind="packages-and-pricing-note"
          >
            {preview ? (
              <>
                <p className="pricing-note">{preview.pricingNote}</p>
                <div
                  className="preview-cards"
                  // biome-ignore lint/security/noDangerouslySetInnerHtml: render-catalog escapes this HTML
                  dangerouslySetInnerHTML={{ __html: preview.packagesHtml }}
                />
              </>
            ) : (
              <p className="preview-error">{previewError}</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
