import { z } from "zod";
export const authScopeSchema = z
  .string()
  .regex(/^[a-z][a-z0-9]*:[a-z][a-z0-9]*$/);
const binding = {
  organizationId: z.string().min(1).optional(),
  tenantId: z.uuid(),
  scopes: z.array(authScopeSchema),
};
export const authBindingSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...binding,
    kind: z.literal("human"),
    subject: z.string().min(1),
    userId: z.uuid(),
  }),
  z.strictObject({
    ...binding,
    kind: z.literal("oauth"),
    subject: z.string().min(1),
    clientId: z.string().min(1),
    agentId: z.uuid(),
  }),
  z.strictObject({
    ...binding,
    kind: z.literal("m2m"),
    clientId: z.string().min(1),
    agentId: z.uuid(),
  }),
]);
export const authBindingsSchema = z
  .array(authBindingSchema)
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    for (const item of items) {
      const key = JSON.stringify([
        item.kind,
        item.organizationId,
        "subject" in item ? item.subject : null,
        "clientId" in item ? item.clientId : null,
      ]);
      if (seen.has(key))
        ctx.addIssue({ code: "custom", message: "Duplicate identity binding" });
      seen.add(key);
    }
  });
export const authIdentitySchema = z.strictObject({
  kind: z.enum(["human", "oauth", "m2m"]),
  tenantId: z.uuid(),
  actorId: z.uuid(),
  subject: z.string().min(1),
  organizationId: z.string().min(1).optional(),
  clientId: z.string().optional(),
  scopes: z.array(authScopeSchema),
  expiresAt: z.number().int().positive(),
});
export const auth0AccessClaimsSchema = z.object({
  sub: z.string().min(1),
  azp: z.string().min(1),
  org_id: z.string().min(1).optional(),
  scope: z.string(),
  exp: z.number().int().positive(),
  iat: z.number().int().nonnegative(),
  gty: z.string().optional(),
});
export const auth0IssuerSchema = z.url().refine((value) => {
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    url.pathname === "/" &&
    !url.search &&
    !url.hash
  );
});
export const auth0ApiEnvironmentSchema = z.object({
  AUTH0_ISSUER: auth0IssuerSchema,
  AUTH0_CLIENT_ID: z.string().min(1),
  AUTH0_AUDIENCE: z.url(),
  AUTH0_AUTH_BINDINGS: z.string().transform((value, ctx) => {
    try {
      return authBindingsSchema.parse(JSON.parse(value));
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid identity bindings" });
      return z.NEVER;
    }
  }),
});
export const auth0AppEnvironmentSchema = auth0ApiEnvironmentSchema
  .extend({
    AUTH0_DOMAIN: z.string().regex(/^[a-zA-Z0-9.-]+$/),
    AUTH0_CLIENT_SECRET: z.string().min(1),
    AUTH0_SECRET: z.string().regex(/^[a-fA-F0-9]{64}$/),
    APP_BASE_URL: z.url(),
  })
  .superRefine((value, ctx) => {
    if (new URL(value.AUTH0_ISSUER).hostname !== value.AUTH0_DOMAIN)
      ctx.addIssue({
        code: "custom",
        path: ["AUTH0_DOMAIN"],
        message: "Domain must match issuer",
      });
  });
export type AuthIdentity = z.output<typeof authIdentitySchema>;
export type AuthBinding = z.output<typeof authBindingSchema>;
