import { z } from "zod";
export type Service = "web" | "app" | "api" | "worker";
export function loadEnvironment(
  service: Service,
  input: Record<string, string | undefined>,
) {
  const schema = z.object({
    APP_ENV: z.enum(["development", "staging", "production"]),
    SERVICE_MODE: z.enum(["mock", "live"]),
  });
  const result = schema.safeParse(input);
  if (!result.success)
    throw new Error(
      `Invalid ${service} configuration: ${result.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  if (
    result.data.APP_ENV !== "development" &&
    result.data.SERVICE_MODE === "mock"
  )
    throw new Error(`${service}: mock mode is only allowed in development`);
  return {
    ...result.data,
    port: z.coerce
      .number()
      .int()
      .min(1)
      .max(65535)
      .parse(
        input.PORT ??
          (service === "api" ? "3002" : service === "web" ? "3001" : "3000"),
      ),
  };
}
