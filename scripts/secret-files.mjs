import { readFile } from "node:fs/promises";

export async function hydrateSecrets(env, read = readFile) {
  for (const name of [
    "DATABASE_URL",
    "REDIS_URL",
    "CLERK_SECRET_KEY",
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
