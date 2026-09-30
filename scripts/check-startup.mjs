import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

for (const [service, entry] of [
  ["api", "apps/api/dist/server.js"],
  ["worker", "apps/worker/dist/index.js"],
  ["app", "apps/app/.next/standalone/apps/app/server.js"],
  ["web", "apps/web/.next/standalone/apps/web/server.js"],
]) {
  const result = spawnSync(process.execPath, [entry], {
    encoding: "utf8",
    timeout: 15000,
    env: {
      ...process.env,
      APP_ENV: undefined,
      SERVICE_MODE: undefined,
      PORT: "39100",
      HOSTNAME: "127.0.0.1",
    },
  });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  assert.equal(
    result.status,
    1,
    `${service} must fail immediately with absent configuration: ${output}`,
  );
  assert.match(output, new RegExp(`Invalid ${service} configuration`));
  console.log(`${service}: missing configuration correctly rejected`);
}
