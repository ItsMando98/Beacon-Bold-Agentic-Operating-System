import {
  auth0ApiEnvironmentSchema,
  auth0AppEnvironmentSchema,
} from "@roaswell/schemas/auth";
import { z } from "zod";
export type Service = "web" | "app" | "api" | "worker";
export const baseEnvironment = z.object({
  APP_ENV: z.enum(["development", "staging", "production"]),
  SERVICE_MODE: z.enum(["mock", "live"]),
  AUTH_ENABLED: z.enum(["true", "false"]).default("false"),
  PORT: z.coerce.number().int().min(1).max(65535).optional(),
});
const postgresUrl = z
  .url()
  .refine((value) => /^postgres(ql)?:/.test(value), "PostgreSQL URL required");
const redisUrl = z
  .url()
  .refine((value) => /^rediss?:/.test(value), "Redis URL required");
const httpsUrl = z
  .url()
  .refine(
    (value) => value.startsWith("https://"),
    "HTTPS URL required outside development",
  );
const serviceEnvironment = {
  web: z.object({ PUBLIC_API_URL: z.url() }),
  app: z.object({
    PUBLIC_API_URL: z.url(),
  }),
  api: z.object({
    DATABASE_URL: postgresUrl,
    REDIS_URL: redisUrl,
    PUBLIC_API_URL: z.url(),
  }),
  worker: z.object({
    TEMPORAL_ADDRESS: z.string().min(1),
    TEMPORAL_NAMESPACE: z.string().min(1),
    TEMPORAL_API_KEY: z.string().min(1),
  }),
};
function parseConfig<T extends z.ZodType>(
  service: Service,
  schema: T,
  input: Record<string, string | undefined>,
): z.output<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    throw new Error(
      `Invalid ${service} configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  return parsed.data;
}
export function loadEnvironment(
  service: Service,
  input: Record<string, string | undefined>,
) {
  const base = parseConfig(service, baseEnvironment, input);
  if (base.APP_ENV !== "development" && base.SERVICE_MODE !== "live")
    throw new Error(`${service}: mock mode is only allowed in development`);
  if (base.SERVICE_MODE === "live") {
    parseConfig(service, serviceEnvironment[service], input);
    if (base.APP_ENV !== "development" && service !== "worker")
      parseConfig(service, z.object({ PUBLIC_API_URL: httpsUrl }), input);
  }
  if (
    base.AUTH_ENABLED === "true" &&
    (service === "app" || service === "api")
  ) {
    if (base.SERVICE_MODE !== "live")
      throw new Error(`${service}: authentication requires live mode`);
    parseConfig(
      service,
      service === "api" ? auth0ApiEnvironmentSchema : auth0AppEnvironmentSchema,
      input,
    );
    if (base.APP_ENV !== "development" && service === "app")
      parseConfig(service, z.object({ APP_BASE_URL: httpsUrl }), input);
  }
  if (
    base.APP_ENV === "production" &&
    ["app", "api"].includes(service) &&
    base.AUTH_ENABLED !== "true"
  )
    throw new Error(`${service}: authentication required in production`);
  return {
    ...base,
    port:
      base.PORT ?? (service === "api" ? 3002 : service === "web" ? 3001 : 3000),
  };
}
