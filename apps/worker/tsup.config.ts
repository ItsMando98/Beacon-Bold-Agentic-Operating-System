import { defineConfig } from "tsup";
export default defineConfig({
  entry: ["src/index.ts", "src/worker.ts", "src/workflows.ts"],
  format: ["esm"],
  target: "node22",
  outDir: "dist",
  noExternal: [
    "@roaswell/config",
    "@roaswell/schemas",
    "@roaswell/integrations",
  ],
});
