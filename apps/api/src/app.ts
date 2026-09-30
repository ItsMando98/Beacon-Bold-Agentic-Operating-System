import { Hono } from "hono";
export function createApp() {
  const app = new Hono();
  app.get("/health", (context) =>
    context.json({ status: "ok", service: "api" }),
  );
  app.notFound((context) =>
    context.json(
      { error: { code: "NOT_FOUND", message: "Route not found" } },
      404,
    ),
  );
  return app;
}
