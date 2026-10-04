import { expect, test } from "vitest";
import { stampAgencyHostSession } from "../../apps/agency/src/agency-host.js";
import { agencyAuth0Options } from "../../packages/integrations/src/auth0.js";
import {
  agencyHost,
  agencySessionOnRequest,
  clientSessionOnRequest,
  clientsHost,
  planHostSession,
  readHostSession,
  rejectCookieDomain,
  sealHostSession,
  serializeHostSessionCookie,
  sessionCookieNames,
  stampHostSession,
} from "../../packages/integrations/src/host-session.js";
import { portalAuth0Options } from "../../packages/integrations/src/portal.js";

const secret = "ab".repeat(32);
const now = 1_700_000_000;
const portalConfig = {
  AUTH0_DOMAIN: "synthetic.auth0.com",
  AUTH0_ISSUER: "https://synthetic.auth0.com/",
  AUTH0_AUDIENCE: "https://api.example.invalid",
  AUTH0_CLIENT_ID: "internal",
  PORTAL_AUTH0_CLIENT_ID: "customer",
  PORTAL_AUTH0_CLIENT_SECRET: "synthetic",
  PORTAL_AUTH0_SECRET: "a".repeat(64),
  PORTAL_BASE_URL: "https://clients.beaconandbold.com",
};

test("session cookies never set a parent domain", () => {
  for (const sameSite of ["lax", "strict", "none"] as const) {
    const header = serializeHostSessionCookie("agency", "token", sameSite);
    expect(header.toLowerCase()).not.toContain("domain=");
    expect(header).not.toContain(".beaconandbold.com");
    expect(header).toContain(
      `SameSite=${sameSite === "none" ? "None" : sameSite === "strict" ? "Strict" : "Lax"}`,
    );
  }
  expect(() => rejectCookieDomain(".beaconandbold.com")).toThrow(
    "Domain attribute",
  );
  expect(() => rejectCookieDomain("beaconandbold.com")).toThrow(
    "Domain attribute",
  );
  const agency = agencyAuth0Options({
    AUTH0_DOMAIN: "synthetic.auth0.com",
    AUTH0_CLIENT_ID: "agency",
    AUTH0_CLIENT_SECRET: "synthetic",
    AUTH0_SECRET: secret,
    APP_BASE_URL: "https://agency.beaconandbold.com",
    AUTH0_AUDIENCE: "https://api.example.invalid",
  });
  const portal = portalAuth0Options(portalConfig);
  expect("domain" in agency.session.cookie).toBe(false);
  expect("domain" in agency.transactionCookie).toBe(false);
  expect("domain" in portal.session.cookie).toBe(false);
  expect("domain" in portal.transactionCookie).toBe(false);
  expect(portal.session.cookie.name).toBe("roaswell_portal_session");
  expect(portal.session.cookie.name).not.toBe(sessionCookieNames.agency);
  expect(sessionCookieNames.agency).not.toBe(sessionCookieNames.customer);
});

test("an agency session is valid only on the agency host", async () => {
  const agency = sealHostSession({
    surface: "agency",
    subject: "auth0|agency",
    secret,
    now,
  });
  const customer = sealHostSession({
    surface: "customer",
    subject: "auth0|customer",
    secret,
    now,
  });
  expect(agency.setCookie.toLowerCase()).not.toContain("domain=");
  expect(customer.setCookie.toLowerCase()).not.toContain("domain=");
  for (const sameSite of ["lax", "strict", "none"] as const) {
    const replayed = sealHostSession({
      surface: "agency",
      subject: "auth0|agency",
      secret,
      now,
      sameSite,
    });
    expect(
      readHostSession({
        cookieHeader: replayed.setCookie,
        requestHost: clientsHost,
        surface: "agency",
        secret,
        now,
      }),
    ).toBeNull();
    expect(
      readHostSession({
        cookieHeader: replayed.setCookie,
        requestHost: agencyHost,
        surface: "customer",
        secret,
        now,
      }),
    ).toBeNull();
    expect(
      readHostSession({
        cookieHeader: `${sessionCookieNames.customer}=${replayed.token}`,
        requestHost: clientsHost,
        surface: "customer",
        secret,
        now,
      }),
    ).toBeNull();
  }
  expect(
    readHostSession({
      cookieHeader: agency.setCookie,
      requestHost: agencyHost,
      surface: "agency",
      secret,
      now,
    })?.subject,
  ).toBe("auth0|agency");
  expect(
    readHostSession({
      cookieHeader: customer.setCookie,
      requestHost: clientsHost,
      surface: "customer",
      secret,
      now,
    })?.subject,
  ).toBe("auth0|customer");
  expect(
    readHostSession({
      cookieHeader: `${agency.setCookie}; ${customer.setCookie}`,
      requestHost: agencyHost,
      surface: "customer",
      secret,
      now,
    }),
  ).toBeNull();
  const stampedAgency = stampHostSession(
    { user: { sub: "auth0|agency" } },
    "agency",
  );
  const stampedCustomer = stampHostSession(
    { user: { sub: "auth0|customer" } },
    "customer",
  );
  expect(stampAgencyHostSession(stampedAgency)).toMatchObject({
    beaconHost: agencyHost,
    beaconSurface: "agency",
  });
  expect(
    await portalAuth0Options(portalConfig).beforeSessionSaved?.(
      stampedCustomer,
      null,
    ),
  ).toMatchObject({
    beaconHost: clientsHost,
    beaconSurface: "customer",
  });
  expect(agencySessionOnRequest(stampedAgency, agencyHost)).toBe(true);
  expect(agencySessionOnRequest(stampedAgency, clientsHost)).toBe(false);
  expect(agencySessionOnRequest(stampedCustomer, agencyHost)).toBe(false);
  expect(clientSessionOnRequest(stampedCustomer, clientsHost)).toBe(true);
  expect(clientSessionOnRequest(stampedCustomer, agencyHost)).toBe(false);
  expect(clientSessionOnRequest(stampedAgency, clientsHost)).toBe(false);
  expect(
    planHostSession({
      app: "agency",
      requestHost: clientsHost,
      cookieHeader: agency.setCookie,
      secret,
      subject: "auth0|agency",
      now,
      sameSite: "none",
    }).action,
  ).toBe("reject");
  expect(
    planHostSession({
      app: "customer",
      requestHost: agencyHost,
      cookieHeader: customer.setCookie,
      secret,
      subject: "auth0|customer",
      now,
      sameSite: "strict",
    }).action,
  ).toBe("reject");
});
