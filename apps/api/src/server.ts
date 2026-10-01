import { loadEnvironment } from "@beacon/config";
import {
  createMemoryCustomerStore,
  createPostgresCustomerStore,
} from "@beacon/integrations/api";
import { createAuth0Authenticator } from "@beacon/integrations/auth";
import { auth0ApiEnvironmentSchema } from "@beacon/schemas";
import { serve } from "@hono/node-server";
import { createApp } from "./app";

const env = loadEnvironment("api", process.env);
const mock = env.APP_ENV === "development" && env.SERVICE_MODE === "mock";
const store = mock
  ? createMemoryCustomerStore()
  : createPostgresCustomerStore(process.env.DATABASE_URL ?? "");
const config =
  env.AUTH_ENABLED === "true"
    ? auth0ApiEnvironmentSchema.parse(process.env)
    : undefined;
const authenticate = config
  ? createAuth0Authenticator({
      issuer: config.AUTH0_ISSUER,
      humanClientId: config.AUTH0_CLIENT_ID,
      audience: config.AUTH0_AUDIENCE,
      bindings: config.AUTH0_AUTH_BINDINGS,
      verifyIdentity: store.verifyIdentity,
    })
  : undefined;
const server = serve({
  fetch: createApp({
    store,
    authenticate,
    ...(mock
      ? { resolveTenant: async () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }
      : {}),
  }).fetch,
  port: env.port,
  hostname: "0.0.0.0",
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () =>
    server.close(() => {
      void store.close().then(
        () => process.exit(0),
        () => process.exit(1),
      );
    }),
  );
