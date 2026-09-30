import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("documents all twelve rules and each root command", () => {
  const rules = readFileSync("AGENTS.md", "utf8");
  for (let index = 1; index <= 12; index++)
    expect(rules).toMatch(new RegExp(`^${index}\\. `, "m"));
  const manifest = JSON.parse(readFileSync("package.json", "utf8"));
  for (const command of ["dev", "lint", "typecheck", "test", "build"]) {
    expect(manifest.scripts[command]).toBeTruthy();
    expect(rules).toContain(`pnpm ${command}`);
  }
  for (const folder of [
    "schemas",
    "db",
    "agents",
    "integrations",
    "ui",
    "config",
  ])
    expect(rules).toContain(`packages/${folder}`);
});
