import { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import {
  accessOperationContracts,
  auth0PortalEnvironmentSchema,
  wireOrganizationSchema,
} from "@roaswell/schemas";
import {
  assertOmittedCookieDomain,
  hostOnlyAuthCookie,
  stampHostSession,
} from "./host-session.js";
export function portalAuth0Options(input: Record<string, string | undefined>) {
  const env = auth0PortalEnvironmentSchema.parse(input);
  const transactionCookie = {
    prefix: "roaswell_portal_tx_",
    sameSite: "lax" as const,
  };
  assertOmittedCookieDomain(transactionCookie);
  return {
    domain: env.AUTH0_DOMAIN,
    clientId: env.PORTAL_AUTH0_CLIENT_ID,
    clientSecret: env.PORTAL_AUTH0_CLIENT_SECRET,
    secret: env.PORTAL_AUTH0_SECRET,
    appBaseUrl: env.PORTAL_BASE_URL,
    authorizationParameters: {
      audience: env.AUTH0_AUDIENCE,
      scope: [
        "openid",
        "profile",
        "email",
        ...accessOperationContracts[0].scopes,
      ].join(" "),
    },
    session: {
      cookie: hostOnlyAuthCookie("roaswell_portal_session"),
    },
    transactionCookie,
    beforeSessionSaved: async (session: SessionData) =>
      stampHostSession(session, "customer"),
    signInReturnToPath: "/workspace",
    enableAccessTokenEndpoint: false,
  };
}
let client: Auth0Client | undefined;
export function getPortalAuth0() {
  if (process.env.AUTH_ENABLED !== "true")
    throw new Error("Authentication disabled");
  client ??= new Auth0Client(portalAuth0Options(process.env));
  return client;
}
/** Server-only adapter. Never pass tokens or unfiltered API bodies into page props. */
export async function readPortalOrganization(
  apiUrl: string,
  token: string,
  fetcher: typeof fetch = fetch,
) {
  const url = new URL(apiUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error("Invalid API origin");
  const response = await fetcher(
    new URL(accessOperationContracts[0].path, url),
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok) throw new Error("Customer access unavailable");
  return wireOrganizationSchema.parse(await response.json());
}
