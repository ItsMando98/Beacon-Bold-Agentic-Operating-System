import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { generateOpenApi, generateToolDefinitions } from "./generators.js";

const directory = new URL("../generated/", import.meta.url);
const artifacts = {
  "openapi.json": generateOpenApi(),
  "tools.json": generateToolDefinitions(),
};
for (const [name, artifact] of Object.entries(artifacts)) {
  const formatted = spawnSync(
    process.execPath,
    [
      createRequire(import.meta.url).resolve("@biomejs/biome/bin/biome"),
      "format",
      `--stdin-file-path=${name}`,
    ],
    { input: JSON.stringify(artifact), encoding: "utf8" },
  );
  if (formatted.status !== 0)
    throw new Error(`Contract formatting failed: ${name}`);
  const expected = formatted.stdout;
  const path = new URL(name, directory);
  if (process.argv.includes("--check")) {
    const actual = await readFile(path, "utf8").catch(() => "");
    if (actual.replaceAll("\r\n", "\n") !== expected)
      throw new Error(
        `Stale contract artifact: ${name}. Run pnpm --filter @beacon/schemas generate.`,
      );
  } else {
    await mkdir(directory, { recursive: true });
    await writeFile(path, expected);
  }
}
