import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["scripts/migrate.mjs"],
  format: ["cjs"],
  target: "node22",
  outDir: "migration-dist",
  noExternal: [/.*/],
  clean: true,
});
