import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("contains four applications and six shared packages", () => {
  for (const path of [
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
  ]) {
    const data = JSON.parse(readFileSync(`${path}/package.json`, "utf8"));
    expect(data.name).toMatch(/^@beacon\//);
    expect(data.scripts.build).toBeTruthy();
    expect(data.scripts.typecheck).toBeTruthy();
  }
});
