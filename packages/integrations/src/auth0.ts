import { Auth0Client } from "@auth0/nextjs-auth0/server";
import {
  auth0AppEnvironmentSchema,
  liveOperationContracts,
} from "@roaswell/schemas";

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
      cookie: {
        path: "/",
        sameSite: "lax" as const,
      },
    },
    transactionCookie: {
      path: "/",
      sameSite: "lax" as const,
    },
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
