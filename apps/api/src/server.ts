import { loadEnvironment } from "@beacon/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app";

const env = loadEnvironment("api", process.env);
const server = serve({
  fetch: createApp().fetch,
  port: env.port,
  hostname: "0.0.0.0",
});
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
