import { Auth0Client } from "@auth0/nextjs-auth0/server";
import type { SessionData } from "@auth0/nextjs-auth0/types";
import {
  auth0AppEnvironmentSchema,
  liveOperationContracts,
} from "@roaswell/schemas";
import {
  assertOmittedCookieDomain,
  hostOnlyAuthCookie,
  stampHostSession,
} from "./host-session.js";

type AgencyAuthEnv = {
  AUTH0_DOMAIN: string;
  AUTH0_CLIENT_ID: string;
  AUTH0_CLIENT_SECRET: string;
  AUTH0_SECRET: string;
  APP_BASE_URL: string;
  AUTH0_AUDIENCE: string;
};

/** Host-only cookies: Domain is omitted. SameSite is not the boundary between agency and client hosts. */
export function agencyAuth0Options(env: AgencyAuthEnv) {
  const transactionCookie = {
    prefix: "beacon_agency_tx_",
    path: "/",
    sameSite: "lax" as const,
  };
  assertOmittedCookieDomain(transactionCookie);
  return {
    domain: env.AUTH0_DOMAIN,
    clientId: env.AUTH0_CLIENT_ID,
    clientSecret: env.AUTH0_CLIENT_SECRET,
    secret: env.AUTH0_SECRET,
    appBaseUrl: env.APP_BASE_URL,
    authorizationParameters: {
      audience: env.AUTH0_AUDIENCE,
      scope: [
        ...new Set([
          "openid",
          "profile",
          "email",
          ...liveOperationContracts.flatMap((contract) => contract.scopes),
        ]),
      ].join(" "),
    },
    session: {
      cookie: hostOnlyAuthCookie("beacon_agency_auth"),
    },
    transactionCookie,
    beforeSessionSaved: async (session: SessionData) =>
      stampHostSession(session, "agency"),
    enableAccessTokenEndpoint: false,
  };
}

let client: Auth0Client | undefined;
export function getAuth0() {
  if (process.env.AUTH_ENABLED !== "true")
    throw new Error("Authentication disabled");
  if (!client) {
    const parsed = auth0AppEnvironmentSchema.safeParse(process.env);
    if (!parsed.success) throw new Error("Invalid Auth0 configuration");
    client = new Auth0Client(agencyAuth0Options(parsed.data));
  }
  return client;
}
