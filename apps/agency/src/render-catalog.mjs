/**
 * One render of CatalogSnapshot for the public site bake and, later, the apps.
 * Cards only. Hero, process, about, and contact stay in the site repo.
 * Prices match the English live page (€1,800–3,500). Switch grouping only if the page language changes.
 */

const PACKAGE_LABELS = {
  "content-retainer": "Content",
  "meta-ads-management": "Ads",
  "google-lead-gen-management": "Lead-Gen",
  "content-ads-lead-gen": "Combined",
};

const FEATURED_PACKAGE_IDS = new Set(["meta-ads-management"]);

const AD_SPEND_NOTES = {
  meta: "Ad spend billed separately via Meta.",
  google: "Ad spend billed separately via Google.",
};

const OFFER_ICONS = {
  "seo-content":
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 19.5V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v14.5"/><path d="M8 7h8M8 11h8M8 15h5"/></svg>',
  "meta-ads":
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="0"/><path d="M3 9h18M9 21V9"/></svg>',
  "google-lead-gen":
    '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="6.5"/><path d="M16 16L20.5 20.5"/></svg>',
};

const FORBIDDEN_PACKAGE_ID = "google-lead-gen";

export function renderCatalog(snapshot) {
  const view = toView(snapshot);
  return {
    version: view.version,
    publishedAt: view.publishedAt,
    pricingNote: view.pricingNote,
    offers: view.offers,
    packages: view.packages,
    offersHtml: view.offers.map(offerHtml).join("\n"),
    packagesHtml: view.packages.map(packageHtml).join("\n"),
  };
}

function toView(snapshot) {
  if (!snapshot || typeof snapshot !== "object") fail("snapshot missing");
  const version = snapshot.version;
  if (!Number.isInteger(version) || version < 1)
    fail("version must be an integer >= 1");
  if (typeof snapshot.publishedAt !== "string" || snapshot.publishedAt === "") {
    fail("publishedAt missing");
  }
  if (typeof snapshot.pricingNote !== "string" || snapshot.pricingNote === "") {
    fail("pricingNote missing");
  }
  const offers = readCards(snapshot.offers, "offers");
  const packages = readCards(snapshot.packages, "packages");
  if (offers.length === 0) fail("offers is empty");
  if (packages.length === 0) fail("packages is empty");

  const offerIds = idsOf(offers, "offers");
  const packageIds = idsOf(packages, "packages");
  for (const id of packageIds) {
    if (id === FORBIDDEN_PACKAGE_ID) {
      fail("package id google-lead-gen is invalid; the offer keeps that id");
    }
    if (offerIds.has(id)) fail(`id ${id} is in offers and packages`);
    if (!Object.hasOwn(PACKAGE_LABELS, id)) {
      fail(`package id ${id} has no label`);
    }
  }

  return {
    version,
    publishedAt: snapshot.publishedAt,
    pricingNote: snapshot.pricingNote,
    offers: offers.map((offer) => ({
      id: offer.id,
      title: offer.title,
      summary: offer.summary,
      points: offer.points,
      icon: OFFER_ICONS[offer.id] ?? null,
    })),
    packages: packages.map((pkg) => {
      const currency = pkg.currency;
      const interval = pkg.interval;
      if (currency !== "EUR")
        fail(`package ${pkg.id} currency ${currency} is not EUR`);
      if (interval !== "month")
        fail(`package ${pkg.id} interval ${interval} is not month`);
      const priceMin = money(pkg.priceMin, pkg.id, "priceMin");
      const priceMax = money(pkg.priceMax, pkg.id, "priceMax");
      if (priceMin > priceMax)
        fail(`package ${pkg.id} priceMin is above priceMax`);
      const adSpend = pkg.adSpend;
      if (adSpend !== null && adSpend !== "meta" && adSpend !== "google") {
        fail(`package ${pkg.id} adSpend is invalid`);
      }
      return {
        id: pkg.id,
        label: PACKAGE_LABELS[pkg.id],
        featured: FEATURED_PACKAGE_IDS.has(pkg.id),
        title: pkg.title,
        summary: pkg.summary,
        points: pkg.points,
        price: formatPrice(priceMin, priceMax),
        period: "/ month",
        adSpendNote: adSpend === null ? null : AD_SPEND_NOTES[adSpend],
      };
    }),
  };
}

function readCards(value, name) {
  if (!Array.isArray(value)) fail(`${name} must be an array`);
  return value.map((card, index) => {
    if (!card || typeof card !== "object")
      fail(`${name}[${index}] is not an object`);
    const id = requiredText(card.id, `${name}[${index}].id`);
    const title = requiredText(card.title, `${name}[${index}].title`);
    const summary = requiredText(card.summary, `${name}[${index}].summary`);
    if (!Array.isArray(card.points))
      fail(`${name}[${index}].points must be an array`);
    const points = card.points.map((point, pointIndex) =>
      requiredText(point, `${name}[${index}].points[${pointIndex}]`),
    );
    return { ...card, id, title, summary, points };
  });
}

function idsOf(cards, name) {
  const ids = new Set();
  for (const card of cards) {
    if (ids.has(card.id)) fail(`duplicate id ${card.id} in ${name}`);
    ids.add(card.id);
  }
  return ids;
}

function requiredText(value, label) {
  if (typeof value !== "string" || value.trim() === "")
    fail(`${label} is empty`);
  return value;
}

function money(value, id, field) {
  if (!Number.isInteger(value) || value < 0)
    fail(`package ${id} ${field} must be cents >= 0`);
  return value;
}

function formatEuros(cents) {
  const whole = cents % 100 === 0;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(cents / 100);
  return `€${formatted}`;
}

function formatPrice(min, max) {
  if (min === max) return formatEuros(min);
  return `${formatEuros(min)}–${formatEuros(max).slice(1)}`;
}

function esc(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function listHtml(points) {
  return `<ul class="card-list">\n${points.map((point) => `              <li>${esc(point)}</li>`).join("\n")}\n            </ul>`;
}

function offerHtml(offer) {
  const icon = offer.icon
    ? `\n            <div class="card-icon" aria-hidden="true">\n              ${offer.icon}\n            </div>`
    : "";
  return `          <article class="card">${icon}
            <h3>${esc(offer.title)}</h3>
            <p>${esc(offer.summary)}</p>
            ${listHtml(offer.points)}
          </article>`;
}

function packageHtml(pkg) {
  const featured = pkg.featured ? " package-featured" : "";
  const note = pkg.adSpendNote
    ? `\n            <p class="ad-spend-note">${esc(pkg.adSpendNote)}</p>`
    : "";
  return `          <article class="card package${featured}">
            <p class="package-label">${esc(pkg.label)}</p>
            <h3>${esc(pkg.title)}</h3>
            <p class="price"><span class="price-range">${esc(pkg.price)}</span><span class="price-period">${esc(pkg.period)}</span></p>
            <p class="package-desc">${esc(pkg.summary)}</p>
            ${listHtml(pkg.points)}${note}
          </article>`;
}

function fail(message) {
  const error = new Error(message);
  error.name = "CatalogRenderError";
  throw error;
}

function collapse(value) {
  return value.replace(/\s+/g, " ").trim();
}

function articles(html, className) {
  const pattern = new RegExp(
    `<article class="${className}[^"]*">[\\s\\S]*?</article>`,
    "g",
  );
  return html.match(pattern) ?? [];
}

function decode(value) {
  return value
    .replaceAll("&quot;", '"')
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&");
}

function textOf(html, pattern) {
  const match = html.match(pattern);
  return match ? decode(collapse(match[1])) : null;
}

function lists(html) {
  return [...html.matchAll(/<li>([\s\S]*?)<\/li>/g)].map((match) =>
    collapse(match[1]),
  );
}

export function assertMatchesLive(rendered, liveHtml) {
  const liveOffers = articles(liveHtml, "card");
  const offerBlock = liveHtml.slice(
    liveHtml.indexOf('id="services"'),
    liveHtml.indexOf('id="how"'),
  );
  const packageBlock = liveHtml.slice(
    liveHtml.indexOf('id="packages"'),
    liveHtml.indexOf('id="about"'),
  );
  const liveOfferCards = articles(offerBlock, "card");
  const livePackageCards = articles(packageBlock, "card package");
  const gotOffers = articles(rendered.offersHtml, "card");
  const gotPackages = articles(rendered.packagesHtml, "card package");
  if (liveOfferCards.length !== gotOffers.length) {
    fail(`offer count ${gotOffers.length} != live ${liveOfferCards.length}`);
  }
  if (livePackageCards.length !== gotPackages.length) {
    fail(
      `package count ${gotPackages.length} != live ${livePackageCards.length}`,
    );
  }
  gotOffers.forEach((html, index) => {
    const live = liveOfferCards[index];
    if (
      textOf(html, /<h3>([\s\S]*?)<\/h3>/) !==
      textOf(live, /<h3>([\s\S]*?)<\/h3>/)
    ) {
      fail(`offer title ${index} drifted`);
    }
    if (
      textOf(html, /<p>([\s\S]*?)<\/p>/) !== textOf(live, /<p>([\s\S]*?)<\/p>/)
    ) {
      fail(`offer summary ${index} drifted`);
    }
    if (lists(html).map(decode).join("|") !== lists(live).map(decode).join("|"))
      fail(`offer points ${index} drifted`);
  });
  if (
    collapse(rendered.pricingNote) !==
    textOf(packageBlock, /<p class="section-intro">([\s\S]*?)<\/p>/)
  ) {
    fail("pricingNote drifted");
  }
  gotPackages.forEach((html, index) => {
    const live = livePackageCards[index];
    for (const [label, pattern] of [
      ["label", /<p class="package-label">([\s\S]*?)<\/p>/],
      ["title", /<h3>([\s\S]*?)<\/h3>/],
      ["price", /<span class="price-range">([\s\S]*?)<\/span>/],
      ["period", /<span class="price-period">([\s\S]*?)<\/span>/],
      ["summary", /<p class="package-desc">([\s\S]*?)<\/p>/],
    ]) {
      if (textOf(html, pattern) !== textOf(live, pattern))
        fail(`package ${label} ${index} drifted`);
    }
    if (lists(html).map(decode).join("|") !== lists(live).map(decode).join("|"))
      fail(`package points ${index} drifted`);
    if (
      textOf(html, /<p class="ad-spend-note">([\s\S]*?)<\/p>/) !==
      textOf(live, /<p class="ad-spend-note">([\s\S]*?)<\/p>/)
    ) {
      fail(`package ad spend ${index} drifted`);
    }
    const liveFeatured = live.includes("package-featured");
    const gotFeatured = html.includes("package-featured");
    if (liveFeatured !== gotFeatured) fail(`package featured ${index} drifted`);
  });
  void liveOffers;
}
