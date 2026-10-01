import { loadEnvironment } from "@beacon/config";
import {
  createMemoryCustomerStore,
  createPostgresCustomerStore,
} from "@beacon/integrations/api";
import { serve } from "@hono/node-server";
import { createApp } from "./app";

const env = loadEnvironment("api", process.env);
const mock = env.APP_ENV === "development" && env.SERVICE_MODE === "mock";
const store = mock
  ? createMemoryCustomerStore()
  : createPostgresCustomerStore(process.env.DATABASE_URL ?? "");
const server = serve({
  fetch: createApp({
    store,
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
