import { readFileSync } from "node:fs";
import { validate } from "@scalar/openapi-parser";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { expect, expectTypeOf, it } from "vitest";
import {
  apiErrorSchema,
  type ContractInput,
  type ContractOutput,
  createCustomerInputSchema,
  defineContract,
  entitySchemas,
  generateJsonSchema,
  generateOpenApi,
  generateToolDefinitions,
  operationContracts,
  serializeEntity,
  toWireSchema,
  wireEntitySchemas,
  z,
} from "../../packages/schemas/src/index.js";

function validator() {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);
  return ajv;
}
it("generates valid OpenAPI 3.1 with all entity components and resolvable references", async () => {
  const document = generateOpenApi();
  const result = await validate(JSON.stringify(document));
  expect(result.errors).toEqual([]);
  expect(result.valid).toBe(true);
  expect(Object.keys(document.paths)).toEqual([
    "/health",
    "/customers",
    "/openapi.json",
    "/docs",
    "/docs/scalar.js",
  ]);
  for (const name of Object.keys(entitySchemas))
    expect(document.components.schemas[`entity_${name}`]).toBeDefined();
  expect(JSON.stringify(document)).not.toContain('"storage"');
  expect(JSON.stringify(document)).not.toMatch(/"\$ref":"https?:/);
});

it("propagates one schema change to TypeScript, OpenAPI and MCP definitions", async () => {
  // A single new field in the source contract changes every downstream representation.
  const changedCustomer = entitySchemas.customers.extend({
    segment: z.enum(["agency", "brand"]),
  });
  const changed = defineContract({
    ...operationContracts[1],
    input: changedCustomer.pick({ name: true, segment: true }),
    output: toWireSchema(changedCustomer),
  });
  expectTypeOf<ContractInput<typeof changed>>().toEqualTypeOf<{
    name: string;
    segment: "agency" | "brand";
  }>();
  expectTypeOf<ContractOutput<typeof changed>>().toEqualTypeOf<{
    name: string;
    segment: "agency" | "brand";
    id: string;
    tenantId: string;
    createdAt: string;
  }>();
  const document = generateOpenApi([changed]);
  const [tool] = generateToolDefinitions([changed]);
  expect(tool.inputSchema).toEqual(
    document.components.schemas.createCustomerInput,
  );
  expect(tool.outputSchema).toEqual(
    document.components.schemas.createCustomerOutput,
  );
  expect(tool.inputSchema.properties?.segment).toEqual({
    type: "string",
    enum: ["agency", "brand"],
  });
  expect(tool.inputSchema.required).toContain("segment");
  expect(generateToolDefinitions()[1].inputSchema.required).not.toContain(
    "segment",
  );
  const accepts = validator().compile(tool.inputSchema);
  for (const input of [
    { name: "Fictional customer", segment: "agency" },
    { name: "Fictional customer" },
    { name: "Fictional customer", segment: "invalid" },
  ]) {
    expect(accepts(input)).toBe(changed.input.safeParse(input).success);
  }
  expect((await validate(JSON.stringify(document))).valid).toBe(true);
});

it("validates MCP input/output schemas and forbids caller-assigned tenant identifiers", () => {
  const tools = generateToolDefinitions();
  for (const schema of Object.values(wireEntitySchemas)) {
    expect(validator().compile(generateJsonSchema(schema))).toBeTypeOf(
      "function",
    );
  }
  expect(tools.map((tool) => tool.name)).toEqual([
    "get_health",
    "create_customer",
  ]);
  for (const tool of tools) {
    expect(tool.inputSchema.type).toBe("object");
    expect(tool.outputSchema.type).toBe("object");
    expect(validator().compile(tool.inputSchema)).toBeTypeOf("function");
    expect(validator().compile(tool.outputSchema)).toBeTypeOf("function");
  }
  const accepts = validator().compile(tools[1].inputSchema);
  for (const value of [
    { name: "Fictional customer" },
    { name: "" },
    {
      name: "Fictional customer",
      tenantId: "00000000-0000-4000-8000-000000000001",
    },
    { name: "Fictional customer", id: "00000000-0000-4000-8000-000000000001" },
  ]) {
    expect(accepts(value)).toBe(
      createCustomerInputSchema.safeParse(value).success,
    );
  }
  expect(tools[1]._meta["beacon/scopes"]).toEqual(["customers:write"]);
});

it("derives JSON timestamps without changing database contracts or losing container constraints", () => {
  const row = {
    id: "00000000-0000-4000-8000-000000000001",
    tenantId: "00000000-0000-4000-8000-000000000002",
    createdAt: new Date("2026-10-01T10:00:00.000Z"),
    name: "Fictional customer",
  };
  const response = serializeEntity("customers", row);
  expectTypeOf(response.createdAt).toEqualTypeOf<string>();
  expect(response.createdAt).toBe("2026-10-01T10:00:00.000Z");
  expect(entitySchemas.customers.parse(row).createdAt).toBeInstanceOf(Date);
  expect(
    wireEntitySchemas.customers.safeParse({ ...response, createdAt: "invalid" })
      .success,
  ).toBe(false);
  expect(
    validator().compile(generateToolDefinitions()[1].outputSchema)(response),
  ).toBe(true);
  const nested = toWireSchema(
    z
      .object({
        optional: z.date().optional(),
        nullable: z.date().nullable(),
        dates: z.array(z.date()).max(1),
      })
      .strict(),
  );
  expect(
    nested.safeParse({ nullable: null, dates: [response.createdAt] }).success,
  ).toBe(true);
  expect(
    nested.safeParse({
      nullable: null,
      dates: [response.createdAt, response.createdAt],
    }).success,
  ).toBe(false);
  expect(generateJsonSchema(nested).properties?.dates).toMatchObject({
    maxItems: 1,
  });
  expect(() => toWireSchema(z.date().min(new Date()))).toThrow(
    "explicit wire contract",
  );
});

it("keeps committed artifacts deterministic and fails closed on ambiguous contracts", () => {
  expect(
    JSON.parse(readFileSync("packages/schemas/generated/openapi.json", "utf8")),
  ).toEqual(generateOpenApi());
  expect(
    JSON.parse(readFileSync("packages/schemas/generated/tools.json", "utf8")),
  ).toEqual(generateToolDefinitions());
  for (const generate of [generateOpenApi, generateToolDefinitions]) {
    expect(() =>
      generate([operationContracts[0], operationContracts[0]]),
    ).toThrow("Duplicate operationId");
    expect(() =>
      generate([
        { ...operationContracts[0], operationId: "another" },
        operationContracts[0],
      ]),
    ).toThrow("Duplicate toolName");
    expect(() =>
      generate([
        {
          ...operationContracts[0],
          operationId: "another",
          toolName: "another",
        },
        operationContracts[0],
      ]),
    ).toThrow("Duplicate route");
  }
  expect(() =>
    generateToolDefinitions([{ ...operationContracts[0], input: z.string() }]),
  ).toThrow("object input and output");
  expect(() => generateJsonSchema(z.bigint())).toThrow();
  expect(() =>
    generateJsonSchema(z.string().transform((value) => value.length)),
  ).toThrow();
  const error = {
    error: {
      code: "NOT_FOUND",
      message: "Missing route",
      requestId: "00000000-0000-4000-8000-000000000001",
    },
  };
  expect(apiErrorSchema.safeParse(error).success).toBe(true);
});
