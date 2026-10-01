import { randomUUID } from "node:crypto";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  AuthorizationError,
  type CustomerStore,
  IdempotencyConflict,
} from "@roaswell/integrations/api";
import {
  AuthenticationError,
  type Authenticator,
} from "@roaswell/integrations/auth";
import {
  type AuthIdentity,
  accessOperationContracts,
  apiErrorSchema,
  apiSupportRoutes,
  generateOpenApi,
  mutationHeadersSchema,
  operationContracts,
  tenantContextSchema,
  type z,
} from "@roaswell/schemas";
import { Scalar } from "@scalar/hono-api-reference";
import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { scalarScript } from "./documentation.js";

type Variables = {
  requestId: string;
  tenantId: string;
  identity: AuthIdentity | undefined;
};
type ApiContext = Context<{ Variables: Variables }>;
type ErrorCode = z.output<typeof apiErrorSchema>["error"]["code"];
function errorResponse(
  context: ApiContext,
  code: ErrorCode,
  message: string,
  status: 400 | 401 | 403 | 404 | 409 | 500,
) {
  return context.json(
    apiErrorSchema.parse({
      error: { code, message, requestId: context.get("requestId") },
    }),
    status,
  );
}
const errors = Object.fromEntries(
  [400, 401, 403, 409, 500].map((status) => [
    status,
    {
      description: "Structured API error",
      content: { "application/json": { schema: apiErrorSchema } },
    },
  ]),
);
const [health, customer] = operationContracts;
export const healthRoute = createRoute({
  method: health.method,
  path: health.path,
  operationId: health.operationId,
  responses: {
    200: {
      description: health.description,
      content: { "application/json": { schema: health.output } },
    },
    ...errors,
  },
});
export const customerRoute = createRoute({
  method: customer.method,
  path: customer.path,
  operationId: customer.operationId,
  request: {
    headers: mutationHeadersSchema,
    body: {
      required: true,
      content: { "application/json": { schema: customer.input } },
    },
  },
  responses: {
    201: {
      description: customer.description,
      content: { "application/json": { schema: customer.output } },
    },
    ...errors,
  },
});
export type ApiDependencies = {
  store?: Pick<
    CustomerStore,
    "create" | "close" | "createAuthorized" | "getOrganization"
  >;
  authenticate?: Authenticator;
  /** Internal trusted boundary, implemented by P1-4. Never read tenant IDs from public headers. */
  resolveTenant?: (request: Request) => Promise<string | undefined>;
};
export function createApp(dependencies: ApiDependencies = {}) {
  const app = new OpenAPIHono<{ Variables: Variables }>({
    defaultHook: (result, context) => {
      if (!result.success)
        return errorResponse(
          context,
          "VALIDATION_ERROR",
          "Invalid request",
          400,
        );
    },
  });
  app.use("*", async (context, next) => {
    context.set("requestId", randomUUID());
    context.header("X-Request-Id", context.get("requestId"));
    await next();
  });
  app.use(customer.path, async (context, next) => {
    if (context.req.method !== "POST") return next();
    const identity = await dependencies.authenticate?.(context.req.raw);
    context.set("identity", identity);
    const tenantId =
      identity?.tenantId ??
      (dependencies.authenticate
        ? undefined
        : await dependencies.resolveTenant?.(context.req.raw));
    if (!tenantId)
      return errorResponse(
        context,
        "UNAUTHORIZED",
        "Authentication required",
        401,
      );
    context.set("tenantId", tenantContextSchema.parse({ tenantId }).tenantId);
    await next();
  });
  app.openapi(healthRoute, (context) =>
    context.json(health.output.parse({ status: "ok", service: "api" }), 200),
  );
  app.openapi(customerRoute, async (context) => {
    if (!dependencies.store) throw new Error("Customer store unavailable");
    const command = {
      tenantId: context.get("tenantId"),
      key: context.req.valid("header")["idempotency-key"],
      input: context.req.valid("json"),
    };
    const identity = context.get("identity");
    const authorized = dependencies.store.createAuthorized;
    if (identity && !authorized) throw new AuthorizationError();
    const response = identity
      ? await authorized?.(command, identity, context.get("requestId"))
      : await dependencies.store.create(command);
    return context.json(customer.output.parse(response), 201);
  });
  const organization = accessOperationContracts[0];
  app.openapi(
    createRoute({
      method: organization.method,
      path: organization.path,
      operationId: organization.operationId,
      responses: {
        200: {
          description: organization.description,
          content: { "application/json": { schema: organization.output } },
        },
        ...errors,
      },
    }),
    async (context) => {
      const identity = await dependencies.authenticate?.(context.req.raw);
      if (!identity) throw new AuthenticationError(401);
      if (!dependencies.store?.getOrganization) throw new AuthorizationError();
      const result = await dependencies.store.getOrganization(
        identity,
        context.get("requestId"),
      );
      return context.json(organization.output.parse(result), 200);
    },
  );
  const [openapi, docs, script] = apiSupportRoutes;
  app.get(openapi.path, (context) => context.json(generateOpenApi()));
  app.get(
    docs.path,
    Scalar({
      url: openapi.path,
      cdn: script.path,
      telemetry: false,
      withDefaultFonts: false,
      pageTitle: "ROASWELL API",
      hideClientButton: true,
    }),
  );
  app.get(script.path, (context) =>
    context.body(scalarScript(), 200, {
      "Content-Type": script.contentType,
      "Cache-Control": "public, max-age=3600",
    }),
  );
  app.notFound((context) =>
    errorResponse(context, "NOT_FOUND", "Route not found", 404),
  );
  app.onError((error, context) => {
    if (error instanceof AuthorizationError)
      return errorResponse(context, "FORBIDDEN", "Access denied", 403);
    if (error instanceof AuthenticationError) {
      if (error.status === 401) context.header("WWW-Authenticate", "Bearer");
      return errorResponse(
        context,
        error.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        error.message,
        error.status,
      );
    }
    if (error instanceof IdempotencyConflict)
      return errorResponse(context, "CONFLICT", error.message, 409);
    if (error instanceof HTTPException && error.status === 400)
      return errorResponse(context, "VALIDATION_ERROR", "Invalid request", 400);
    return errorResponse(
      context,
      "INTERNAL_ERROR",
      "Request could not be completed",
      500,
    );
  });
  return app;
}
