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
});
