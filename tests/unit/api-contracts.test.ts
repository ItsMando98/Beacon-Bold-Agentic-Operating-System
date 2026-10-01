import { readFileSync } from "node:fs";
import { validate } from "@scalar/openapi-parser";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { expect, test } from "vitest";
import { createApp } from "../../apps/api/src/app.js";
import { renderIdempotencyMigration } from "../../packages/db/src/idempotency.js";
import { createMemoryCustomerStore } from "../../packages/integrations/src/api.js";
import {
  apiErrorSchema,
  apiSupportRoutes,
  generateJsonSchema,
  generateOpenApi,
  operationContracts,
  wireEntitySchemas,
} from "../../packages/schemas/src/index.js";

const tenantId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
function app() {
  return createApp({
    store: createMemoryCustomerStore(),
    resolveTenant: async () => tenantId,
  });
}
function post(key: string, body: unknown) {
  return {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": key },
    body: JSON.stringify(body),
  };
}
test("valid OpenAPI and contract responses cover every registered route", async () => {
  const api = app();
  const document = await (await api.request("/openapi.json")).json();
  expect(document).toEqual(generateOpenApi());
  expect(document.info.title).toBe("ROASWELL contracts");
  expect((await validate(JSON.stringify(document))).valid).toBe(true);
  const registered = [
    ...new Set(
      api.routes
        .filter((route) => ["GET", "POST"].includes(route.method))
        .map((route) => `${route.method.toLowerCase()} ${route.path}`),
    ),
  ].sort();
  const documented = Object.entries(generateOpenApi().paths)
    .flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method} ${path}`),
    )
    .sort();
  expect(registered).toEqual(documented);
  const ajv = new Ajv2020({ strict: true });
  addFormats(ajv);
  for (const contract of [...operationContracts, ...apiSupportRoutes]) {
    const response = await api.request(
      contract.path,
      contract.method === "post"
        ? post("contract-key-001", { name: "Invented Customer" })
        : undefined,
    );
    expect(response.status).toBe(
      "successStatus" in contract ? contract.successStatus : 200,
    );
    const contentType =
      "contentType" in contract ? contract.contentType : "application/json";
    expect(response.headers.get("content-type")).toContain(contentType);
    const output =
      contentType === "application/json"
        ? await response.json()
        : await response.text();
    const valid = ajv.compile(generateJsonSchema(contract.output));
    expect(valid(output), JSON.stringify(valid.errors)).toBe(true);
  }
  const html = await (await api.request("/docs")).text();
  expect(html).toContain("/docs/scalar.js");
  expect(html).toContain("/openapi.json");
  expect(html).not.toContain("cdn.jsdelivr.net");
});
test("mutation validation, replay and conflicts follow the shared contracts", async () => {
  const api = app();
  const first = await api.request(
    "/customers",
    post("same-key-0001", { name: "Invented Customer" }),
  );
  const customer = wireEntitySchemas.customers.parse(await first.json());
  expect(first.status).toBe(201);
  const replay = await api.request(
    "/customers",
    post("same-key-0001", { name: "Invented Customer" }),
  );
  expect(await replay.json()).toEqual(customer);
  const conflict = await api.request(
    "/customers",
    post("same-key-0001", { name: "Different Customer" }),
  );
  expect(conflict.status).toBe(409);
  expect(apiErrorSchema.parse(await conflict.json()).error.code).toBe(
    "CONFLICT",
  );
  for (const request of [
    post("short", { name: "Example" }),
    post("valid-key-0002", { name: "" }),
    post("valid-key-0002", { name: "Example", tenantId }),
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "valid-key-0002",
      },
      body: "{",
    },
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Example" }),
    },
  ]) {
    const response = await api.request("/customers", request);
    expect(response.status).toBe(400);
    const error = apiErrorSchema.parse(await response.json()).error;
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(response.headers.get("x-request-id")).toBe(error.requestId);
  }
});
test("the public default denies writes and never trusts a supplied tenant", async () => {
  const response = await createApp({
    store: createMemoryCustomerStore(),
  }).request("/customers", {
    ...post("public-key-0001", { name: "Example" }),
    headers: {
      ...post("public-key-0001", {}).headers,
      "x-tenant-id": tenantId,
    },
  });
  expect(response.status).toBe(401);
  expect(apiErrorSchema.parse(await response.json()).error.code).toBe(
    "UNAUTHORIZED",
  );
});
test("unexpected errors are masked and requests still return a contract request id", async () => {
  const api = createApp({
    resolveTenant: async () => tenantId,
    store: {
      async create() {
        throw new Error("synthetic-internal-detail");
      },
      async close() {},
    },
  });
  for (const [path, init, status, code] of [
    [
      "/customers",
      post("error-key-0001", { name: "Example" }),
      500,
      "INTERNAL_ERROR",
    ],
    ["/missing", undefined, 404, "NOT_FOUND"],
  ] as const) {
    const response = await api.request(path, init);
    expect(response.status).toBe(status);
    const body = await response.json();
    expect(JSON.stringify(body)).not.toContain("synthetic-internal-detail");
    const error = apiErrorSchema.parse(body).error;
    expect(error.code).toBe(code);
    expect(response.headers.get("x-request-id")).toBe(error.requestId);
  }
});
test("the new migration is a schema-derived snapshot and existing migrations remain intact", () => {
  expect(
    readFileSync(
      "packages/db/migrations/0003_idempotency.sql",
      "utf8",
    ).replaceAll("\r\n", "\n"),
  ).toBe(renderIdempotencyMigration());
});
