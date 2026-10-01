import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { hydrateSecrets } from "./secret-files.mjs";

export { hydrateSecrets } from "./secret-files.mjs";

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
