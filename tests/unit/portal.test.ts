import { expect, it } from "vitest";
import { loadEnvironment } from "../../packages/config/src/env.js";
import {
  portalAuth0Options,
  readPortalOrganization,
} from "../../packages/integrations/src/portal.js";

const config = {
  APP_ENV: "production",
  SERVICE_MODE: "live",
  AUTH_ENABLED: "true",
  PUBLIC_API_URL: "https://api.example.invalid",
  AUTH0_DOMAIN: "synthetic.auth0.com",
  AUTH0_ISSUER: "https://synthetic.auth0.com/",
  AUTH0_AUDIENCE: "https://api.example.invalid",
  AUTH0_CLIENT_ID: "internal",
  PORTAL_AUTH0_CLIENT_ID: "customer",
  PORTAL_AUTH0_CLIENT_SECRET: "synthetic",
  PORTAL_AUTH0_SECRET: "a".repeat(64),
  PORTAL_BASE_URL: "https://portal.example.invalid",
};
it("requires independent portal credentials and HTTPS in production", () => {
  expect(loadEnvironment("portal", config).port).toBe(3003);
  for (const change of [
    { PORTAL_AUTH0_CLIENT_ID: "internal" },
    { PORTAL_AUTH0_SECRET: "" },
    { PORTAL_BASE_URL: "http://portal.example.invalid" },
    { AUTH_ENABLED: "false" },
  ])
    expect(() => loadEnvironment("portal", { ...config, ...change })).toThrow();
  const options = portalAuth0Options(config);
  expect(options.authorizationParameters.scope).toBe(
    "openid profile email organizations:read",
  );
  expect(options.enableAccessTokenEndpoint).toBe(false);
  expect(options.session.cookie.name).toBe("roaswell_portal_session");
  expect(options.transactionCookie.prefix).toBe("roaswell_portal_tx_");
});
it("reads only the customer resource, prevents caching and refuses redirects or invalid results", async () => {
  const organization = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Invented Studio",
    createdAt: new Date().toISOString(),
    phase: "customer",
    isAgencyCustomer: false,
  };
  let called = false;
  const fetcher: typeof fetch = async (url, options) => {
    called = true;
    expect(String(url)).toBe("https://api.example.invalid/v1/organization");
    expect(options?.cache).toBe("no-store");
    expect(options?.redirect).toBe("error");
    expect(options?.headers).toEqual({ Authorization: "Bearer synthetic" });
    return Response.json(organization);
  };
  expect(
    await readPortalOrganization(config.PUBLIC_API_URL, "synthetic", fetcher),
  ).toEqual(organization);
  expect(called).toBe(true);
  await expect(
    readPortalOrganization(
      config.PUBLIC_API_URL,
      "synthetic",
      async () => new Response(null, { status: 403 }),
    ),
  ).rejects.toThrow("Customer access unavailable");
  await expect(
    readPortalOrganization(config.PUBLIC_API_URL, "synthetic", async () =>
      Response.json({ ...organization, internalPrice: 42 }),
    ),
  ).rejects.toThrow();
  await expect(
    readPortalOrganization(
      "https://user:password@example.invalid",
      "synthetic",
      fetcher,
    ),
  ).rejects.toThrow("Invalid API origin");
});
