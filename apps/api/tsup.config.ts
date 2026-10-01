import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  clean: true,
  // Runtime images contain only this bundle; workspace TypeScript must not
  // remain as an import into node_modules where Node cannot strip types.
  noExternal: [/.*/],
  // Bundled CommonJS dependencies still load Node's built-in modules at runtime.
  banner: {
    js: 'import { createRequire as createNodeRequire } from "node:module"; const require = createNodeRequire(import.meta.url);',
  },
  define: {
    __SCALAR_REFERENCE__: JSON.stringify(
      readFileSync(
        join(
          dirname(
            createRequire(import.meta.url).resolve("@scalar/api-reference"),
          ),
          "browser",
          "standalone.js",
        ),
        "utf8",
      ),
    ),
  },
});
