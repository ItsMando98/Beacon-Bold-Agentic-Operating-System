import { renderCatalog } from "./render-catalog.mjs";

/**
 * Preview is only what render-catalog draws for package cards and the pricing note.
 * Hero, process, about, contact, and the footnote are not part of this object.
 */
export type CatalogPreview = {
  pricingNote: string;
  packagesHtml: string;
};

type RenderedCatalog = {
  pricingNote: string;
  packagesHtml: string;
};

export function previewCatalog(snapshot: unknown): CatalogPreview {
  const rendered = renderCatalog(snapshot) as RenderedCatalog;
  if (
    !rendered ||
    typeof rendered.pricingNote !== "string" ||
    typeof rendered.packagesHtml !== "string"
  ) {
    throw new Error("render-catalog returned an incomplete preview");
  }
  return {
    pricingNote: rendered.pricingNote,
    packagesHtml: rendered.packagesHtml,
  };
}
