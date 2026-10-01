import {
  type AuthBinding,
  type AuthIdentity,
  auth0AccessClaimsSchema,
  auth0IssuerSchema,
  authBindingsSchema,
  authIdentitySchema,
  type z,
} from "@roaswell/schemas";
import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from "jose";
export class AuthenticationError extends Error {
  constructor(public readonly status: 401 | 403) {
    super(status === 401 ? "Authentication required" : "Access denied");
  }
}
export type Authenticator = (request: Request) => Promise<AuthIdentity>;
export function humanBinding(
  bindings: readonly AuthBinding[],
  subject: string,
  organizationId: string | undefined,
) {
  return bindings.find(
    (binding) =>
      binding.kind === "human" &&
      binding.subject === subject &&
      binding.organizationId === organizationId,
  );
}
export function createAuth0Authenticator(
  options: {
    issuer: string;
    audience: string;
    humanClientId: string;
    bindings: AuthBinding[];
    verifyIdentity?: (identity: AuthIdentity) => Promise<boolean>;
  },
  key?: JWTVerifyGetKey,
): Authenticator {
  const issuer = `${auth0IssuerSchema.parse(options.issuer).replace(/\/$/, "")}/`;
  const bindings = authBindingsSchema.parse(options.bindings);
  const keys =
    key ??
    createRemoteJWKSet(new URL(`${issuer}.well-known/jwks.json`), {
      timeoutDuration: 5000,
    });
  return async (request) => {
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer ([^\s]+)$/i)?.[1];
    if (!token || token.length > 16384) throw new AuthenticationError(401);
    let claims: z.output<typeof auth0AccessClaimsSchema>;
    try {
      const { payload, protectedHeader } = await jwtVerify(token, keys, {
        issuer,
        audience: options.audience,
        algorithms: ["RS256"],
        requiredClaims: ["exp", "iat", "sub", "aud", "iss"],
      });
      if (protectedHeader.typ !== "JWT")
        throw new Error("Unsupported token profile");
      claims = auth0AccessClaimsSchema.parse(payload);
      if (claims.iat > Math.floor(Date.now() / 1000))
        throw new Error("Future token");
    } catch {
      throw new AuthenticationError(401);
    }
    const machine = claims.gty === "client-credentials";
    if (machine && claims.sub !== `${claims.azp}@clients`)
      throw new AuthenticationError(401);
    const kind = machine
      ? "m2m"
      : claims.azp === options.humanClientId
        ? "human"
        : "oauth";
    const binding = bindings.find(
      (item) =>
        item.kind === kind &&
        item.organizationId === claims.org_id &&
        (item.kind === "human"
          ? item.subject === claims.sub
          : item.clientId === claims.azp &&
            (item.kind === "m2m" || item.subject === claims.sub)),
    );
    if (!binding) throw new AuthenticationError(403);
    const granted = new Set(claims.scope.split(/\s+/).filter(Boolean));
    const identity = authIdentitySchema.parse({
      kind,
      tenantId: binding.tenantId,
      actorId: binding.kind === "human" ? binding.userId : binding.agentId,
      subject: claims.sub,
      organizationId: claims.org_id,
      clientId: claims.azp,
      scopes: binding.scopes.filter((scope) => granted.has(scope)),
      expiresAt: claims.exp,
    });
    if (options.verifyIdentity && !(await options.verifyIdentity(identity)))
      throw new AuthenticationError(403);
    return identity;
  };
}
