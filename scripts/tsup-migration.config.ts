import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["scripts/migrate.mjs", "scripts/vps-acceptance.mjs"],
  format: ["cjs"],
  target: "node22",
  outDir: "migration-dist",
  noExternal: [/.*/],
  clean: true,
});
