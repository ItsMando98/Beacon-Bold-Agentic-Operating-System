import { z } from "zod";
import { entitySchemas } from "./domain.js";
import { healthSchema } from "./health.js";
import { wireEntitySchemas } from "./wire.js";

export const apiErrorSchema = z
  .object({
    error: z
      .object({
        code: z.enum([
          "VALIDATION_ERROR",
          "NOT_FOUND",
          "UNAUTHORIZED",
          "FORBIDDEN",
          "CONFLICT",
          "INTERNAL_ERROR",
        ]),
        message: z.string().min(1),
        requestId: z.uuid(),
      })
      .strict(),
  })
  .strict();
export const createCustomerInputSchema = entitySchemas.customers.pick({
  name: true,
});
export const contractMetadataSchema = z
  .object({
    operationId: z.string().regex(/^[A-Za-z][A-Za-z0-9]*$/),
    toolName: z.string().regex(/^[a-z][a-z0-9_]*$/),
    method: z.enum(["get", "post"]),
    path: z.string().regex(/^\/[a-z][a-z0-9/-]*$/),
    title: z.string().min(1),
    description: z.string().min(1),
    successStatus: z.union([z.literal(200), z.literal(201)]),
    scopes: z.array(z.string().regex(/^[a-z][a-z0-9]*:[a-z][a-z0-9]*$/)),
    readOnly: z.boolean(),
  })
  .strict();

export type OperationContract<
  I extends z.ZodType = z.ZodType,
  O extends z.ZodType = z.ZodType,
> = z.infer<typeof contractMetadataSchema> & { input: I; output: O };
export function defineContract<I extends z.ZodType, O extends z.ZodType>(
  contract: OperationContract<I, O>,
): OperationContract<I, O> {
  const { input, output, ...metadata } = contract;
  return { ...contractMetadataSchema.parse(metadata), input, output };
}

// These describe contracts only. P1-3 implements REST; P1-4 enforces scopes; P1-5 exposes MCP.
export const operationContracts = [
  defineContract({
    operationId: "getHealth",
    toolName: "get_health",
    method: "get",
    path: "/health",
    title: "API health",
    description: "Read API service health.",
    successStatus: 200,
    scopes: [],
    readOnly: true,
    input: z.object({}).strict(),
    output: healthSchema,
  }),
  defineContract({
    operationId: "createCustomer",
    toolName: "create_customer",
    method: "post",
    path: "/customers",
    title: "Create customer",
    description:
      "Create a customer in the authenticated tenant. Tenant and record identifiers are assigned by the service.",
    successStatus: 201,
    scopes: ["customers:write"],
    readOnly: false,
    input: createCustomerInputSchema,
    output: wireEntitySchemas.customers,
  }),
] as const;

export type ContractInput<C extends OperationContract> = z.input<C["input"]>;
export type ContractOutput<C extends OperationContract> = z.output<C["output"]>;
