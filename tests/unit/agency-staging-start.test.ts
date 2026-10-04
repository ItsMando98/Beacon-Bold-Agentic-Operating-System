import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

const dockerfile = readFileSync("Dockerfile", "utf8");
const compose = readFileSync("infra/vps/compose.yaml", "utf8");
const receiver = readFileSync("infra/vps/receiver.py", "utf8");
const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

it("builds and starts the agency shell on the existing staging path", () => {
  expect(dockerfile).toContain("AS agency");
  expect(dockerfile).toContain("PORT=3004");
  expect(dockerfile).toContain("apps/agency/server.js");
  expect(compose).toContain(
    `image: beacon-bold-agency:${"$"}{BEACON_RELEASE:?}`,
  );
  expect(compose).toContain("3004");
  expect(compose).not.toContain("agency.staging.beaconandbold.com");
  expect(compose).not.toContain("workers.dev");
  expect(compose).not.toContain("pages.dev");
  expect(compose.toLowerCase()).not.toContain("domain=");
  expect(receiver).toContain("'agency'");
  expect(receiver).toContain("RUNTIME = ('api', 'app', 'web', 'agency')");
  expect(receiver).not.toContain("agency.staging.beaconandbold.com");
  expect(workflow).toContain(
    "for service in api app web migrate portal agency; do",
  );
  expect(workflow).toContain(
    "up -d --wait --wait-timeout 180 api app web agency",
  );
  expect(workflow).toContain("beacon-bold-agency:$GITHUB_SHA");
});

it("leaves the commit-bound approval check and the three HTTPS hosts unchanged", () => {
  const approval = workflow.slice(
    workflow.indexOf("Require commit-bound approval"),
    workflow.indexOf("actions/download-artifact"),
  );
  expect(approval).toContain("vars.STAGING_APPROVAL_REFERENCE");
  expect(approval).toContain(
    "A non-empty approval string is not authorization for this SHA.",
  );
  expect(approval).toContain(
    "founder-request-2026-10-01-existing-vps-no-new-paid-services",
  );
  expect(receiver).toContain("https://staging.beaconandbold.com/health");
  expect(receiver).toContain("https://app.staging.beaconandbold.com/");
  expect(receiver).toContain("https://web.staging.beaconandbold.com/");
  expect(receiver.match(/https:\/\//g)).toHaveLength(4);
});
