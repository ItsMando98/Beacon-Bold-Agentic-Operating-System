import { readFile } from "node:fs/promises";

export async function hydrateSecrets(env, read = readFile) {
  for (const name of [
    "DATABASE_URL",
    "REDIS_URL",
    "AUTH0_CLIENT_SECRET",
    "AUTH0_SECRET",
    "PORTAL_AUTH0_CLIENT_SECRET",
    "PORTAL_AUTH0_SECRET",
    "AUTH0_AUTH_BINDINGS",
    "PGPASSWORD",
    "DB_APP_PASSWORD",
  ]) {
    const path = env[`${name}_FILE`];
    if (!path) continue;
    if (!/^\/run\/secrets\/[a-z_]+$/.test(path))
      throw new Error("Invalid secret mount");
    const value = (await read(path, "utf8")).trimEnd();
    if (!value) throw new Error("Required secret is empty");
    env[name] = value;
  }
}
