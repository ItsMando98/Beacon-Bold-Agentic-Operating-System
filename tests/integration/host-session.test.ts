import { expect, test } from "vitest";
import {
  agencyHost,
  clientsHost,
  planHostSession,
  readHostSession,
  sealHostSession,
  sessionCookieNames,
} from "../../packages/integrations/src/host-session.js";

const secret = "shared-test-secret";
const now = 1_700_000_000;

test("same-site cookies stay on the host that signed them", () => {
  for (const sameSite of ["lax", "strict", "none"] as const) {
    const agency = sealHostSession({
      surface: "agency",
      subject: "auth0|agency",
      secret,
      now,
      sameSite,
    });
    const customer = sealHostSession({
      surface: "customer",
      subject: "auth0|customer",
      secret,
      now,
      sameSite,
    });
    expect(agency.setCookie.toLowerCase()).not.toContain("domain=");
    expect(customer.setCookie.toLowerCase()).not.toContain("domain=");
    expect(agency.setCookie).not.toContain(".beaconandbold.com");
    expect(
      readHostSession({
        cookieHeader: agency.setCookie,
        requestHost: clientsHost,
        surface: "agency",
        secret,
        now,
      }),
    ).toBeNull();
    expect(
      readHostSession({
        cookieHeader: customer.setCookie,
        requestHost: agencyHost,
        surface: "customer",
        secret,
        now,
      }),
    ).toBeNull();
    expect(
      readHostSession({
        cookieHeader: `${sessionCookieNames.customer}=${agency.token}`,
        requestHost: clientsHost,
        surface: "customer",
        secret,
        now,
      }),
    ).toBeNull();
    expect(
      planHostSession({
        app: "customer",
        requestHost: clientsHost,
        cookieHeader: agency.setCookie,
        secret,
        subject: "auth0|customer",
        now,
        sameSite,
      }).setCookie,
    ).toContain(sessionCookieNames.customer);
  }
  const agency = sealHostSession({
    surface: "agency",
    subject: "auth0|agency",
    secret,
    now,
  });
  expect(
    readHostSession({
      cookieHeader: agency.setCookie,
      requestHost: agencyHost,
      surface: "agency",
      secret,
      now,
    })?.host,
  ).toBe(agencyHost);
  expect(
    planHostSession({
      app: "agency",
      requestHost: clientsHost,
      cookieHeader: agency.setCookie,
      secret,
      subject: "auth0|agency",
      now,
    }).action,
  ).toBe("reject");
});
