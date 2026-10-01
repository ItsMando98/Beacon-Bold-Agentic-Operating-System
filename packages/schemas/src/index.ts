import { z } from "zod";

export * from "./access.js";
export * from "./access-contracts.js";
export * from "./contracts.js";
export * from "./domain.js";
export * from "./generators.js";
export * from "./health.js";
export * from "./http.js";
export * from "./wire.js";
export { z };
export const migrationEnvironmentSchema = z
  .object({
    APP_ENV: z.enum(["development", "staging", "production"]),
    DB_TRANSPORT: z.enum(["tls", "unix"]).default("tls"),
    PGHOST: z.string().min(1),
    PGSSLROOTCERT: z.string().optional(),
  })
  .superRefine((value, context) => {
    if (value.DB_TRANSPORT === "unix" && value.PGHOST !== "/var/run/postgresql")
      context.addIssue({
        code: "custom",
        path: ["PGHOST"],
        message: "Fixed local socket required",
      });
    if (
      value.DB_TRANSPORT === "tls" &&
      value.APP_ENV !== "development" &&
      !value.PGSSLROOTCERT
    )
      context.addIssue({
        code: "custom",
        path: ["PGSSLROOTCERT"],
        message: "Verified TLS CA required",
      });
  });
export * from "./auth.js";
export * from "./workflow.js";
