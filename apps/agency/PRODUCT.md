# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Beacon & Bold operators editing the offer catalog on https://agency.beaconandbold.com. They change offers and packages, save a draft, then publish one saved revision. The public marketing site is not this app.

## Product Purpose

Give those operators one place to keep a private offer draft and publish exactly one saved revision. Success means the published snapshot is that revision, and text still being typed is not published.

## Positioning

This app edits the catalog. It does not render the public site, and it does not publish the buffer that is still open in the tab.

## Operating Context

The operator works in the browser at https://agency.beaconandbold.com. Save stores the draft. Publish sends the saved revision. On any other origin, or when the catalog routes are null, the page keeps the draft in memory and does not call the catalog API.

## Capabilities and Constraints

The following is the existing agency shell, recorded here so later UI work does not replace it:

- POST /catalog/draft sends only pricingNote, offers, and packages.
- The save response is revision, pricingNote, offers, and packages. revision is a 64-character hex SHA-256.
- POST /catalog/publish sends only { revision }. The response is the public snapshot, HTTP 200.
- GET /catalog is the public snapshot. GET /catalog/draft is the private draft.
- Calls go only to https://agency.beaconandbold.com. The shell does not set a cookie Domain of .beaconandbold.com.
- Preview shows package cards and the pricing note through render-catalog. Hero, process, about, contact, and the footnote stay on the public site.
- A publish with no saved revision is refused. A saved revision may match seed v1 and still be published. Opening or matching the seed file is not a publish, and the seed file is not rewritten.

## Brand Commitments

The existing identity is locked. Do not replace it.

- Ink #0E0E0D
- Bone #F1EEE7. The name is bone, even when a detector calls the same hex cream.
- Signal #FF5A1F
- Bricolage Grotesque and JetBrains Mono
- Radius 0
- The primary hover is signal on ink. Do not invert it to ink on ink.

## Evidence on Hand

- apps/agency/src/catalog-snapshot.v1.json is seed v1. Do not rewrite it.
- apps/agency/src/render-catalog.mjs is the only preview renderer.

No testimonials, customer counts, or licensing claims belong in this app.

## Product Principles

- Publish a saved revision, never the unsaved buffer.
- Keep the public site a different product.
- Call the catalog API only from the agency origin.
- Keep the locked colors, the two fonts, and square corners.
- Show offers and packages in their array order.
