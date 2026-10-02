import assert from "node:assert/strict";
import { setTimeout } from "node:timers/promises";

const origin = process.env.PORTAL_CHECK_URL ?? "http://127.0.0.1:13003";
let ready = false;
for (let attempt = 0; attempt < 30; attempt++) {
  try {
    const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
    if (response.ok) {
      ready = true;
      break;
    }
  } catch {}
  await setTimeout(1000);
}
assert.ok(ready, "Portal failed to become ready");
for (const [path, status] of [
  ["/workspace", 503],
  ["/auth/login", 503],
  ["/operations", 404],
]) {
  const response = await fetch(new URL(path, origin), { redirect: "manual" });
  assert.equal(response.status, status);
  assert.equal(response.headers.get("location"), null);
}
console.log("Portal runtime stays closed without authentication");
