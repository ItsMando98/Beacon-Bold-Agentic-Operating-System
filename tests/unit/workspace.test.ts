import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

const workspacePaths = [
  "apps/web",
  "apps/app",
  "apps/api",
  "apps/worker",
  "packages/schemas",
  "packages/db",
  "packages/agents",
  "packages/integrations",
  "packages/ui",
  "packages/config",
];

it("contains four applications and six shared packages", () => {
  for (const path of workspacePaths) {
    const data = JSON.parse(readFileSync(`${path}/package.json`, "utf8"));
    expect(data.name).toMatch(/^@roaswell\//);
    expect(data.scripts.build).toBeTruthy();
    expect(data.scripts.typecheck).toBeTruthy();
  }
});

it("resolves all workspace dependencies and package filters after the rename", () => {
  const root = JSON.parse(readFileSync("package.json", "utf8"));
  expect(root.name).toBe("roaswell");
  const manifests = workspacePaths.map((path) =>
    JSON.parse(readFileSync(`${path}/package.json`, "utf8")),
  );
  const names = new Set(manifests.map((manifest) => manifest.name));
  expect(names.size).toBe(manifests.length);
  for (const manifest of [root, ...manifests]) {
    for (const section of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
    ]) {
      for (const [name, version] of Object.entries(manifest[section] ?? {})) {
        if (typeof version === "string" && version.startsWith("workspace:"))
          expect(
            names.has(name),
            `Unresolved workspace dependency: ${name}`,
          ).toBe(true);
      }
    }
    for (const command of Object.values(manifest.scripts ?? {})) {
      for (const match of String(command).matchAll(
        /--filter\s+(@[\w-]+\/[\w-]+)/g,
      ))
        expect(
          names.has(match[1]),
          `Unresolved package filter: ${match[1]}`,
        ).toBe(true);
    }
  }
});

it("resolves internal source imports and Next.js transpilation targets", () => {
  const names = new Set(
    workspacePaths.map(
      (path) => JSON.parse(readFileSync(`${path}/package.json`, "utf8")).name,
    ),
  );
  function inspect(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (
        [
          "node_modules",
          ".next",
          ".turbo",
          "dist",
          "storybook-static",
        ].includes(entry.name)
      )
        continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) inspect(path);
      else if (/\.(ts|tsx|mjs|json)$/.test(entry.name)) {
        const source = readFileSync(path, "utf8");
        for (const match of source.matchAll(
          /["'](@(?:beacon|roaswell)\/[\w-]+)(?:\/[^"']*)?["']/g,
        )) {
          expect(
            names.has(match[1]),
            `Unresolved reference in ${path}: ${match[1]}`,
          ).toBe(true);
        }
      }
    }
  }
  for (const path of workspacePaths) inspect(path);
});
