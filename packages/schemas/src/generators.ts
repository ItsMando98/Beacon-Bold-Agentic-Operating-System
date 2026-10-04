import { z } from "zod";
import {
  apiErrorSchema,
  contractMetadataSchema,
  type OperationContract,
} from "./contracts.js";
import { apiSupportRoutes, idempotencyKeySchema } from "./http.js";
import { liveOperationContracts } from "./live-contracts.js";
import { wireEntitySchemas } from "./wire.js";

export type JsonSchema = z.core.JSONSchema.JSONSchema;
export function generateJsonSchema(
  schema: z.ZodType,
  io: "input" | "output" = "output",
): JsonSchema {
  const result = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io,
    override: ({ jsonSchema }) => {
      delete jsonSchema.storage;
    },
  });
  delete result.$schema;
  return result;
}

function assertContracts(contracts: readonly OperationContract[]) {
  for (const { input, output, ...metadata } of contracts) {
    contractMetadataSchema.parse(metadata);
    if (
      generateJsonSchema(input, "input").type !== "object" ||
      generateJsonSchema(output).type !== "object"
    )
      throw new Error("Tool contracts require object input and output");
  }
  for (const key of ["operationId", "toolName"] as const) {
    if (
      new Set(contracts.map((contract) => contract[key])).size !==
      contracts.length
    )
      throw new Error(`Duplicate ${key}`);
  }
  if (
    new Set(contracts.map((contract) => `${contract.method} ${contract.path}`))
      .size !== contracts.length
  )
    throw new Error("Duplicate route");
}

/** Component-local JSON pointers must resolve from the root OpenAPI document. */
function componentSchema(schema: JsonSchema, name: string): JsonSchema {
  function relocate(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(relocate);
    if (typeof value !== "object" || value === null) return value;
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === "$ref" &&
        typeof item === "string" &&
        (item === "#" || item.startsWith("#/"))
          ? `#/components/schemas/${name}${item.slice(1)}`
          : relocate(item),
      ]),
    );
  }
  return relocate(schema) as JsonSchema;
}
export function generateToolDefinitions(
  contracts: readonly OperationContract[] = liveOperationContracts,
) {
  assertContracts(contracts);
  return contracts.map((contract) => {
    const inputSchema = generateJsonSchema(contract.input, "input");
    const outputSchema = generateJsonSchema(contract.output);
    if (inputSchema.type !== "object" || outputSchema.type !== "object")
      throw new Error("Tool contracts require object input and output");
    return {
      name: contract.toolName,
      title: contract.title,
      description: contract.description,
      inputSchema,
      outputSchema,
      annotations: { readOnlyHint: contract.readOnly },
      _meta: { "beacon/scopes": contract.scopes },
    };
  });
}

export function generateOpenApi(
  contracts: readonly OperationContract[] = liveOperationContracts,
  options: {
    includeSupportRoutes?: boolean;
    title?: string;
    description?: string;
  } = {},
) {
  assertContracts(contracts);
  const schemas: Record<string, JsonSchema> = {};
  const addSchema = (name: string, schema: JsonSchema) => {
    schemas[name] = componentSchema(schema, name);
    return { $ref: `#/components/schemas/${name}` };
  };
  addSchema("ApiError", generateJsonSchema(apiErrorSchema));
  for (const [name, schema] of Object.entries(wireEntitySchemas))
    addSchema(`entity_${name}`, generateJsonSchema(schema));
  const paths: Record<string, Record<string, unknown>> = {};
  for (const contract of contracts) {
    const input = addSchema(
      `${contract.operationId}Input`,
      generateJsonSchema(contract.input, "input"),
    );
    const output = addSchema(
      `${contract.operationId}Output`,
      generateJsonSchema(contract.output),
    );
    const responses: Record<string, unknown> = {
      [contract.successStatus]: {
        description: "Successful operation",
        content: { "application/json": { schema: output } },
      },
    };
    for (const [status, description] of [
      [400, "Invalid request"],
      [401, "Authentication required"],
      [403, "Insufficient scope"],
      [409, "Conflict"],
      [500, "Internal error"],
    ] as const)
      responses[status] = {
        description,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/ApiError" },
          },
        },
      };
    const query = schemas[`${contract.operationId}Input`];
    const required = new Set(query.required ?? []);
    const parameters = Object.entries(query.properties ?? {}).map(
      ([name, schema]) => ({
        name,
        in: "query",
        required: required.has(name),
        schema,
      }),
    );
    paths[contract.path] ??= {};
    paths[contract.path][contract.method] = {
      operationId: contract.operationId,
      summary: contract.title,
      description: contract.description,
      ...(contract.method === "post"
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: input } },
            },
            ...(contract.requiresIdempotencyKey === false
              ? {}
              : {
                  parameters: [
                    {
                      name: "Idempotency-Key",
                      in: "header",
                      required: true,
                      schema: generateJsonSchema(idempotencyKeySchema, "input"),
                    },
                  ],
                }),
          }
        : { parameters }),
      responses,
      "x-beacon-scopes": contract.scopes,
      security: contract.scopes.length ? [{ bearerAuth: [] }] : [],
    };
  }
  for (const route of options.includeSupportRoutes === false
    ? []
    : apiSupportRoutes) {
    const output = addSchema(
      `${route.operationId}Output`,
      generateJsonSchema(route.output),
    );
    paths[route.path] = {
      [route.method]: {
        operationId: route.operationId,
        responses: {
          200: {
            description: "API documentation",
            content: { [route.contentType]: { schema: output } },
          },
          500: {
            description: "Internal error",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ApiError" },
              },
            },
          },
        },
      },
    };
  }
  return {
    openapi: "3.1.1",
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    info: {
      title: options.title ?? "ROASWELL contracts",
      version: "0.0.0",
      description:
        options.description ??
        "Schema-derived REST contracts. Auth0 bearer authentication; MCP follows in P1-5.",
    },
    paths,
    components: {
      schemas,
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
  };
}
