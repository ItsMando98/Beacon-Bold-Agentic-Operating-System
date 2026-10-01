import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { accessOperationContracts } from "./access-contracts.js";
import { generateOpenApi, generateToolDefinitions } from "./generators.js";

const directory = new URL("../generated/", import.meta.url);
const artifacts = {
  "openapi.json": generateOpenApi(),
  "tools.json": generateToolDefinitions(),
  "access-openapi.json": generateOpenApi(accessOperationContracts, {
    includeSupportRoutes: false,
    title: "ROASWELL access specification",
    description:
      "Planned R1 access contracts only. These routes are not implemented or registered in the live API.",
  }),
  "access-tools.json": generateToolDefinitions(accessOperationContracts),
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
        `Stale contract artifact: ${name}. Run pnpm --filter @roaswell/schemas generate.`,
      );
  } else {
    await mkdir(directory, { recursive: true });
    await writeFile(path, expected);
  }
}
