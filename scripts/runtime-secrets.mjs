import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

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

async function main() {
  try {
    await hydrateSecrets(process.env);
    await import(pathToFileURL(resolve(process.argv[2])).href);
  } catch {
    console.error(
      "Runtime initialization failed; inspect configuration privately",
    );
    process.exitCode = 1;
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  main();
