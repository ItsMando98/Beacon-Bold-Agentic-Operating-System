import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { auth0AppEnvironmentSchema, operationContracts } from "@beacon/schemas";

let client: Auth0Client | undefined;
export function getAuth0() {
  if (process.env.AUTH_ENABLED !== "true")
    throw new Error("Authentication disabled");
  if (!client) {
    const parsed = auth0AppEnvironmentSchema.safeParse(process.env);
    if (!parsed.success) throw new Error("Invalid Auth0 configuration");
    const env = parsed.data;
    client = new Auth0Client({
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
            ...operationContracts.flatMap((contract) => contract.scopes),
          ]),
        ].join(" "),
      },
      enableAccessTokenEndpoint: false,
    });
  }
  return client;
}
