export type CatalogOffer = {
  id: string;
  title: string;
  summary: string;
  points: string[];
};

export type CatalogPackage = {
  id: string;
  title: string;
  summary: string;
  points: string[];
  priceMin: number;
  priceMax: number;
  currency: string;
  interval: string;
  adSpend: "meta" | "google" | null;
};

/** The catalog document the editor holds. Field order matches seed v1. */
export type CatalogSnapshot = {
  version: number;
  publishedAt: string;
  pricingNote: string;
  offers: CatalogOffer[];
  packages: CatalogPackage[];
};

export function canonicalSnapshot(snapshot: CatalogSnapshot): CatalogSnapshot {
  return {
    version: snapshot.version,
    publishedAt: snapshot.publishedAt,
    pricingNote: snapshot.pricingNote,
    offers: snapshot.offers.map((offer) => ({
      id: offer.id,
      title: offer.title,
      summary: offer.summary,
      points: [...offer.points],
    })),
    packages: snapshot.packages.map((pkg) => ({
      id: pkg.id,
      title: pkg.title,
      summary: pkg.summary,
      points: [...pkg.points],
      priceMin: pkg.priceMin,
      priceMax: pkg.priceMax,
      currency: pkg.currency,
      interval: pkg.interval,
      adSpend: pkg.adSpend,
    })),
  };
}

export function sameSnapshot(
  left: CatalogSnapshot,
  right: CatalogSnapshot,
): boolean {
  return (
    JSON.stringify(canonicalSnapshot(left)) ===
    JSON.stringify(canonicalSnapshot(right))
  );
}

/** Array order is the catalog order. This does not sort. */
export function catalogOrder(snapshot: CatalogSnapshot): {
  offers: string[];
  packages: string[];
} {
  return {
    offers: snapshot.offers.map((offer) => offer.id),
    packages: snapshot.packages.map((pkg) => pkg.id),
  };
}
