import { z } from "zod";
import { createCustomerInputSchema } from "./contracts.js";
import { tenantContextSchema } from "./domain.js";
import { wireEntitySchemas } from "./wire.js";
export const idempotencyKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9._:-]{8,128}$/);
export const mutationHeadersSchema = z.object({
  "idempotency-key": idempotencyKeySchema,
});
export const customerCommandSchema = tenantContextSchema
  .extend({
    key: idempotencyKeySchema,
    input: createCustomerInputSchema,
  })
  .strict();
export const idempotencyRecordSchema = z.strictObject({
  tenantId: tenantContextSchema.shape.tenantId,
  operation: z.literal("createCustomer").meta({ storage: "text" }),
  key: idempotencyKeySchema.meta({ storage: "text" }),
  requestHash: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .meta({ storage: "text" }),
  response: wireEntitySchemas.customers.meta({ storage: "jsonb" }),
  createdAt: z.date().meta({ storage: "timestamptz" }),
});
export type CustomerCommand = z.output<typeof customerCommandSchema>;
export type CustomerResponse = z.output<typeof wireEntitySchemas.customers>;
export const apiSupportRoutes = [
  {
    method: "get",
    path: "/openapi.json",
    operationId: "getOpenApi",
    contentType: "application/json",
    output: z.record(z.string(), z.json()),
  },
  {
    method: "get",
    path: "/docs",
    operationId: "getDocumentation",
    contentType: "text/html",
    output: z.string(),
  },
  {
    method: "get",
    path: "/docs/scalar.js",
    operationId: "getDocumentationScript",
    contentType: "application/javascript",
    output: z.string(),
  },
] as const;
