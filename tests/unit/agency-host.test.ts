import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  agencyShellAllowsSession,
  bindAgencyHost,
  stampAgencyHostSession,
} from "../../apps/agency/src/agency-host.js";
import {
  agencyHost,
  clientsHost,
  sealHostSession,
  sessionCookieNames,
  stampHostSession,
} from "../../packages/integrations/src/host-session.js";

const secret = "ab".repeat(32);
const now = 1_700_000_000;

test("the catalog shell binds the agency host and refuses the clients host", () => {
  const agency = sealHostSession({
    surface: "agency",
    subject: "auth0|agency",
    secret,
    now,
  });
  for (const sameSite of ["lax", "strict", "none"] as const) {
    const decision = bindAgencyHost({
      requestHost: clientsHost,
      cookieHeader: agency.setCookie,
      secret,
      subject: "auth0|agency",
      now,
      sameSite,
    });
    expect(decision.action).toBe("reject");
  }

  const bound = bindAgencyHost({
    requestHost: agencyHost,
    cookieHeader: null,
    secret,
    subject: "auth0|agency",
    now,
  });
  expect(bound.action).toBe("continue");
  if (bound.action !== "continue") return;
  expect(bound.setCookie).toBeTruthy();
  expect(bound.setCookie?.toLowerCase()).not.toContain("domain=");
  expect(bound.setCookie).not.toContain(".beaconandbold.com");
  expect(bound.setCookie).toContain(sessionCookieNames.agency);
  expect(bound.setCookie).not.toContain(sessionCookieNames.customer);

  const copied = bindAgencyHost({
    requestHost: clientsHost,
    cookieHeader: `${sessionCookieNames.customer}=${agency.token}`,
    secret,
    subject: "auth0|agency",
    now,
    sameSite: "none",
  });
  expect(copied.action).toBe("reject");

  const stamped = stampAgencyHostSession({ user: { sub: "auth0|agency" } });
  expect(agencyShellAllowsSession(stamped, agencyHost)).toBe(true);
  expect(agencyShellAllowsSession(stamped, clientsHost)).toBe(false);
  expect(
    agencyShellAllowsSession(
      stampHostSession({ user: { sub: "auth0|customer" } }, "customer"),
      agencyHost,
    ),
  ).toBe(false);
});

test("the agency host binding lives on the catalog shell, not the operations app", () => {
  const proxy = readFileSync("apps/agency/proxy.ts", "utf8");
  const shell = readFileSync("apps/agency/src/agency-host.ts", "utf8");
  const operationsProxy = readFileSync("apps/app/proxy.ts", "utf8");
  const operationsPage = readFileSync(
    "apps/app/app/operations/page.tsx",
    "utf8",
  );
  expect(proxy).toContain("bindAgencyHost");
  expect(proxy).not.toContain("/catalog");
  expect(shell).not.toContain("/catalog");
  expect(operationsProxy).not.toContain("bindAgencyHost");
  expect(operationsProxy).not.toContain("planHostSession");
  expect(operationsPage).not.toContain("agencySessionOnRequest");
  expect(operationsPage).not.toContain("bindAgencyHost");
});
