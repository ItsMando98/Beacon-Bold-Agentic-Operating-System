import { z } from "zod";
import { defineContract } from "./contracts.js";

/** Browser origin allowed to save a draft or publish. Checked by the API, not by a cookie. */
export const agencyCatalogOrigin = "https://agency.beaconandbold.com";
export const catalogScopes = {
  read: "catalog:read",
  write: "catalog:write",
} as const;

const catalogIdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const catalogTextSchema = z.string().min(1).max(2000);
const catalogPointsSchema = z.array(z.string().min(1).max(300)).max(40);
// Title may be blank in a draft. Publish rejects a missing title.
const catalogTitleSchema = z.string().max(200);
// Cents stay integers. Negative values are stored on a draft and rejected by Publish.
const catalogCentsSchema = z
  .number()
  .int()
  .min(-1_000_000_000)
  .max(1_000_000_000);

export const catalogOfferSchema = z
  .object({
    id: catalogIdSchema,
    title: catalogTitleSchema,
    summary: catalogTextSchema,
    points: catalogPointsSchema,
  })
  .strict();

// adSpend is required. null means no single channel. A missing field is rejected.
export const catalogAdSpendSchema = z.union([
  z.null(),
  z.literal("meta"),
  z.literal("google"),
]);

export const catalogPackageSchema = z
  .object({
    id: catalogIdSchema,
    title: catalogTitleSchema,
    summary: catalogTextSchema,
    points: catalogPointsSchema,
    priceMin: catalogCentsSchema,
    priceMax: catalogCentsSchema,
    currency: z.literal("EUR"),
    interval: z.literal("month"),
    adSpend: catalogAdSpendSchema,
  })
  .strict();

const pricingNoteSchema = z.string().min(1).max(4000);
const offersSchema = z.array(catalogOfferSchema).max(100);
const packagesSchema = z.array(catalogPackageSchema).max(100);

export const catalogDraftBodySchema = z
  .object({
    pricingNote: pricingNoteSchema,
    offers: offersSchema,
    packages: packagesSchema,
  })
  .strict();

export const offerDraftSchema = z
  .object({
    revision: z.string().regex(/^[a-f0-9]{64}$/),
    pricingNote: pricingNoteSchema,
    offers: offersSchema,
    packages: packagesSchema,
  })
  .strict();

export const catalogSnapshotSchema = z
  .object({
    version: z.number().int().positive(),
    publishedAt: z.iso.datetime({ offset: true }),
    pricingNote: pricingNoteSchema,
    offers: offersSchema,
    packages: packagesSchema,
  })
  .strict();

export const publishCatalogInputSchema = z
  .object({
    revision: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();

const emptyInput = z.object({}).strict();

export const catalogOperationContracts = [
  defineContract({
    operationId: "getCatalog",
    toolName: "get_catalog",
    method: "get",
    path: "/catalog",
    title: "Read published catalog",
    description:
      "Read the current immutable catalog snapshot. Array order is display order.",
    successStatus: 200,
    scopes: [],
    readOnly: true,
    input: emptyInput,
    output: catalogSnapshotSchema,
  }),
  defineContract({
    operationId: "getOfferDraft",
    toolName: "get_offer_draft",
    method: "get",
    path: "/catalog/draft",
    title: "Read offer draft",
    description:
      "Read the mutable offer draft. Agency authentication is required.",
    successStatus: 200,
    scopes: [catalogScopes.read],
    readOnly: true,
    input: emptyInput,
    output: offerDraftSchema,
  }),
  defineContract({
    operationId: "saveOfferDraft",
    toolName: "save_offer_draft",
    method: "post",
    path: "/catalog/draft",
    title: "Save offer draft",
    description:
      "Save the mutable offer draft and return its revision. The same content keeps the same revision.",
    successStatus: 200,
    scopes: [catalogScopes.write],
    readOnly: false,
    requiresIdempotencyKey: false,
    input: catalogDraftBodySchema,
    output: offerDraftSchema,
  }),
  defineContract({
    operationId: "publishCatalog",
    toolName: "publish_catalog",
    method: "post",
    path: "/catalog/publish",
    title: "Publish catalog",
    description:
      "Publish one saved draft revision. The same revision returns the same immutable snapshot.",
    successStatus: 200,
    scopes: [catalogScopes.write],
    readOnly: false,
    requiresIdempotencyKey: false,
    input: publishCatalogInputSchema,
    output: catalogSnapshotSchema,
  }),
] as const;

export type CatalogOffer = z.output<typeof catalogOfferSchema>;
export type CatalogPackage = z.output<typeof catalogPackageSchema>;
export type CatalogDraftBody = z.output<typeof catalogDraftBodySchema>;
export type OfferDraft = z.output<typeof offerDraftSchema>;
export type CatalogSnapshot = z.output<typeof catalogSnapshotSchema>;
