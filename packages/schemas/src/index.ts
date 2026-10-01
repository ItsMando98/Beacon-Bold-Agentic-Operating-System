import { z } from "zod";
export const healthSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("api"),
});
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
