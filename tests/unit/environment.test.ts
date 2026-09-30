import { describe, expect, it } from "vitest";
import { loadEnvironment, type Service } from "../../packages/config/src/env";

const services: Service[] = ["web", "app", "api", "worker"];
describe("runtime configuration", () => {
  it.each(services)("%s refuses absent required configuration", (service) =>
    expect(() => loadEnvironment(service, {})).toThrow(
      `Invalid ${service} configuration`,
    ),
  );
  it.each(services)("%s starts locally without provider keys", (service) =>
    expect(
      loadEnvironment(service, { APP_ENV: "development", SERVICE_MODE: "mock" })
        .SERVICE_MODE,
    ).toBe("mock"),
  );
  it.each(["staging", "production"])("rejects mock mode in %s", (APP_ENV) =>
    expect(() =>
      loadEnvironment("api", { APP_ENV, SERVICE_MODE: "mock" }),
    ).toThrow("mock mode is only allowed"),
  );
  it.each(services)("%s rejects incomplete live configuration", (service) =>
    expect(() =>
      loadEnvironment(service, { APP_ENV: "staging", SERVICE_MODE: "live" }),
    ).toThrow(`Invalid ${service} configuration`),
  );
  it("accepts valid live API config", () =>
    expect(
      loadEnvironment("api", {
        APP_ENV: "staging",
        SERVICE_MODE: "live",
        DATABASE_URL: "postgresql://example.invalid/beacon",
        REDIS_URL: "rediss://example.invalid:6379",
        PUBLIC_API_URL: "https://staging.example.invalid",
      }).APP_ENV,
    ).toBe("staging"));
  it("does not leak secret values in validation errors", () => {
    try {
      loadEnvironment("api", {
        APP_ENV: "staging",
        SERVICE_MODE: "live",
        DATABASE_URL: "secret-not-a-url",
      });
    } catch (error) {
      expect(String(error)).toContain("DATABASE_URL");
      expect(String(error)).not.toContain("secret-not-a-url");
    }
  });
  it("rejects non-PostgreSQL URLs", () =>
    expect(() =>
      loadEnvironment("api", {
        APP_ENV: "staging",
        SERVICE_MODE: "live",
        DATABASE_URL: "https://example.invalid",
        REDIS_URL: "redis://example.invalid",
        PUBLIC_API_URL: "https://example.invalid",
      }),
    ).toThrow("DATABASE_URL"));
  it("rejects HTTP public URLs outside development", () =>
    expect(() =>
      loadEnvironment("web", {
        APP_ENV: "staging",
        SERVICE_MODE: "live",
        PUBLIC_API_URL: "http://example.invalid",
      }),
    ).toThrow("PUBLIC_API_URL"));
  it("rejects invalid ports", () =>
    expect(() =>
      loadEnvironment("api", {
        APP_ENV: "development",
        SERVICE_MODE: "mock",
        PORT: "70000",
      }),
    ).toThrow("PORT"));
});
