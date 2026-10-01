import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts", "src/worker.ts", "src/workflows.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  noExternal: ["@beacon/config", "@beacon/schemas", "@beacon/integrations"],
});
