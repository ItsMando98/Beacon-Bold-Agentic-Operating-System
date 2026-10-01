import { expect, it } from "vitest";
import { migrationEnvironmentSchema } from "../../packages/schemas/src/index";
import { hydrateSecrets } from "../../scripts/runtime-secrets.mjs";

it("allows local sockets but never plaintext remote PostgreSQL in staging", () => {
  expect(
    migrationEnvironmentSchema.safeParse({
      APP_ENV: "staging",
      DB_TRANSPORT: "unix",
      PGHOST: "/var/run/postgresql",
    }).success,
  ).toBe(true);
  expect(
    migrationEnvironmentSchema.safeParse({
      APP_ENV: "staging",
      DB_TRANSPORT: "unix",
      PGHOST: "postgres",
    }).success,
  ).toBe(false);
  expect(
    migrationEnvironmentSchema.safeParse({
      APP_ENV: "staging",
      PGHOST: "postgres",
    }).success,
  ).toBe(false);
  expect(
    migrationEnvironmentSchema.safeParse({
      APP_ENV: "staging",
      PGHOST: "postgres",
      PGSSLROOTCERT: "/run/secrets/ca",
    }).success,
  ).toBe(true);
});
it("loads only explicit mounted secrets and refuses arbitrary paths", async () => {
  const env = {
    DATABASE_URL_FILE: "/run/secrets/database_url",
    DATABASE_URL: "",
  };
  await hydrateSecrets(env, async () => "fictional-value\n");
  expect(env.DATABASE_URL).toBe("fictional-value");
  await expect(
    hydrateSecrets({ DATABASE_URL_FILE: "/etc/passwd" }),
  ).rejects.toThrow("Invalid secret mount");
  await expect(
    hydrateSecrets(
      { DATABASE_URL_FILE: "/run/secrets/database_url" },
      async () => "",
    ),
  ).rejects.toThrow("Required secret is empty");
});
