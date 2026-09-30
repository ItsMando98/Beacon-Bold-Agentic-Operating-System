import { describe, expect, it } from "vitest";
import { createApp } from "../../apps/api/src/app";
import { healthSchema } from "../../packages/schemas/src";

describe("API health", () => {
  it("exposes the shared health contract", async () => {
    const response = await createApp().request("/health");
    expect(response.status).toBe(200);
    expect(healthSchema.parse(await response.json())).toEqual({
      status: "ok",
      service: "api",
    });
  });
  it("returns a structured 404", async () => {
    const response = await createApp().request("/missing");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Route not found" },
    });
  });
});
