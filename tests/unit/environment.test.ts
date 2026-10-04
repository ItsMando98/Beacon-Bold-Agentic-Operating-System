import { describe, expect, it } from "vitest";
import { loadEnvironment, type Service } from "../../packages/config/src/env";

const services: Service[] = ["web", "app", "portal", "api", "worker", "agency"];
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
  it("starts the agency shell on port 3004 without an Auth0 subject", () => {
    const env = loadEnvironment("agency", {
      APP_ENV: "staging",
      SERVICE_MODE: "live",
      PUBLIC_API_URL: "https://staging.example.invalid",
    });
    expect(env.port).toBe(3004);
    expect(env.AUTH_ENABLED).toBe("false");
  });
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
it("Auth0 activation rejects missing configuration, malformed bindings and mock mode", () => {
  const live = {
    APP_ENV: "staging",
    SERVICE_MODE: "live",
    DATABASE_URL: "postgresql://example.invalid/beacon",
    REDIS_URL: "rediss://example.invalid",
    PUBLIC_API_URL: "https://example.invalid",
    AUTH_ENABLED: "true",
  };
  expect(() => loadEnvironment("api", live)).toThrow("AUTH0_ISSUER");
  expect(() =>
    loadEnvironment("api", {
      APP_ENV: "development",
      SERVICE_MODE: "mock",
      AUTH_ENABLED: "true",
    }),
  ).toThrow("authentication requires live mode");
  expect(() =>
    loadEnvironment("api", {
      ...live,
      AUTH0_ISSUER: "https://synthetic.auth0.com/",
      AUTH0_AUDIENCE: "https://api.example.invalid",
      AUTH0_CLIENT_ID: "synthetic",
      AUTH0_AUTH_BINDINGS: "not-json-secret",
    }),
  ).toThrow("AUTH0_AUTH_BINDINGS");
  try {
    loadEnvironment("api", { ...live, AUTH0_AUTH_BINDINGS: "not-json-secret" });
  } catch (error) {
    expect(String(error)).not.toContain("not-json-secret");
  }
});
it("production cannot start with authentication disabled", () => {
  expect(() =>
    loadEnvironment("app", {
      APP_ENV: "production",
      SERVICE_MODE: "live",
      PUBLIC_API_URL: "https://example.invalid",
      AUTH_ENABLED: "false",
    }),
  ).toThrow("authentication required in production");
});
