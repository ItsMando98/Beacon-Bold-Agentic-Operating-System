import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

declare const __SCALAR_REFERENCE__: string;
export function scalarScript() {
  if (typeof __SCALAR_REFERENCE__ !== "undefined") return __SCALAR_REFERENCE__;
  const entry = createRequire(import.meta.url).resolve("@scalar/api-reference");
  return readFileSync(join(dirname(entry), "browser", "standalone.js"), "utf8");
}
