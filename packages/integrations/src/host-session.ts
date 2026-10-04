import { createHmac, timingSafeEqual } from "node:crypto";

/** These two hosts are the same site. SameSite does not separate them. */
export const agencyHost = "agency.beaconandbold.com";
export const clientsHost = "clients.beaconandbold.com";

export const sessionHosts = {
  agency: agencyHost,
  customer: clientsHost,
} as const;

export const sessionCookieNames = {
  agency: "beacon_agency_session",
  customer: "beacon_clients_session",
} as const;

export type SessionSurface = keyof typeof sessionHosts;
export type SessionSameSite = "lax" | "strict" | "none";

export type HostSession = {
  host: (typeof sessionHosts)[SessionSurface];
  surface: SessionSurface;
  subject: string;
  expiresAt: number;
};

const parentDomain = ".beaconandbold.com";

export function requestHostname(hostHeader: string | null | undefined) {
  if (!hostHeader) return "";
  if (hostHeader.startsWith("[")) return hostHeader;
  return hostHeader.split(":")[0] ?? "";
}

/** Auth0 login cookies stay host-only: the Domain attribute is omitted. */
export function hostOnlyAuthCookie(name: string) {
  const cookie = {
    name,
    path: "/",
    httpOnly: true,
    sameSite: "lax" as const,
  };
  assertOmittedCookieDomain(cookie);
  return cookie;
}

export function assertOmittedCookieDomain(cookie: object) {
  if ("domain" in cookie) {
    throw new Error("Session cookie must not set a Domain attribute");
  }
}

export function rejectCookieDomain(domain: string | undefined) {
  if (domain !== undefined) {
    throw new Error("Session cookie must not set a Domain attribute");
  }
}

function sameSiteAttribute(sameSite: SessionSameSite) {
  if (sameSite === "none") return "None";
  if (sameSite === "strict") return "Strict";
  return "Lax";
}

export function serializeHostSessionCookie(
  surface: SessionSurface,
  token: string,
  sameSite: SessionSameSite = "lax",
) {
  const header = [
    `${sessionCookieNames[surface]}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    `SameSite=${sameSiteAttribute(sameSite)}`,
  ].join("; ");
  if (/domain\s*=/i.test(header) || header.includes(parentDomain)) {
    throw new Error("Session cookie must not set a Domain attribute");
  }
  return header;
}

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function sealHostSession(input: {
  surface: SessionSurface;
  subject: string;
  secret: string;
  ttlSeconds?: number;
  now?: number;
  sameSite?: SessionSameSite;
}) {
  if (!input.secret || !input.subject)
    throw new Error("Session secret required");
  const now = input.now ?? Math.floor(Date.now() / 1000);
  const session: HostSession = {
    host: sessionHosts[input.surface],
    surface: input.surface,
    subject: input.subject,
    expiresAt: now + (input.ttlSeconds ?? 60 * 60 * 8),
  };
  const body = Buffer.from(JSON.stringify(session)).toString("base64url");
  const token = `${body}.${sign(body, input.secret)}`;
  return {
    session,
    token,
    setCookie: serializeHostSessionCookie(
      input.surface,
      token,
      input.sameSite ?? "lax",
    ),
  };
}

function openToken(
  token: string,
  secret: string,
  now: number,
): HostSession | null {
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  if (!body || !mac || !safeEqual(mac, sign(body, secret))) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as Partial<HostSession>;
    if (parsed.surface !== "agency" && parsed.surface !== "customer")
      return null;
    if (parsed.host !== sessionHosts[parsed.surface]) return null;
    if (typeof parsed.subject !== "string" || parsed.subject.length === 0)
      return null;
    if (typeof parsed.expiresAt !== "number" || parsed.expiresAt <= now)
      return null;
    return {
      host: parsed.host,
      surface: parsed.surface,
      subject: parsed.subject,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function readNamedCookie(header: string | null, name: string) {
  if (!header) return null;
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name)
      return part.slice(separator + 1).trim();
  }
  return null;
}

/**
 * A session is valid only when its signed host matches the request host.
 * SameSite is not an input: both hosts belong to beaconandbold.com.
 */
export function readHostSession(input: {
  cookieHeader: string | null;
  requestHost: string;
  surface: SessionSurface;
  secret: string;
  now?: number;
}): HostSession | null {
  const token = readNamedCookie(
    input.cookieHeader,
    sessionCookieNames[input.surface],
  );
  if (!token) return null;
  const session = openToken(
    token,
    input.secret,
    input.now ?? Math.floor(Date.now() / 1000),
  );
  if (!session) return null;
  if (session.surface !== input.surface) return null;
  if (session.host !== input.requestHost) return null;
  return session;
}

export function stampHostSession<T extends object>(
  session: T,
  surface: SessionSurface,
): T & { beaconHost: string; beaconSurface: SessionSurface } {
  return {
    ...session,
    beaconHost: sessionHosts[surface],
    beaconSurface: surface,
  };
}

function stampedFields(session: object | null | undefined) {
  if (!session) return null;
  return session as { beaconHost?: unknown; beaconSurface?: unknown };
}

export function agencySessionOnRequest(
  session: object | null | undefined,
  requestHost: string,
) {
  const stamped = stampedFields(session);
  if (!stamped) return false;
  if (requestHost === clientsHost) return false;
  if (
    stamped.beaconSurface === "customer" ||
    stamped.beaconHost === clientsHost
  )
    return false;
  if (requestHost !== agencyHost) return false;
  return (
    stamped.beaconSurface === "agency" && stamped.beaconHost === agencyHost
  );
}

export function clientSessionOnRequest(
  session: object | null | undefined,
  requestHost: string,
) {
  const stamped = stampedFields(session);
  if (!stamped) return false;
  if (requestHost === agencyHost) return false;
  if (stamped.beaconSurface === "agency" || stamped.beaconHost === agencyHost)
    return false;
  if (requestHost === clientsHost) {
    return (
      stamped.beaconSurface === "customer" && stamped.beaconHost === clientsHost
    );
  }
  return (
    stamped.beaconSurface === "customer" || stamped.beaconSurface === undefined
  );
}

export function planHostSession(input: {
  app: SessionSurface;
  requestHost: string;
  cookieHeader: string | null;
  secret: string;
  subject: string | null;
  now?: number;
  sameSite?: SessionSameSite;
}): { action: "reject" } | { action: "continue"; setCookie?: string } {
  const other = input.app === "agency" ? clientsHost : agencyHost;
  if (input.requestHost === other) return { action: "reject" };
  if (input.requestHost !== sessionHosts[input.app])
    return { action: "continue" };
  if (!input.subject) return { action: "continue" };
  const current = readHostSession({
    cookieHeader: input.cookieHeader,
    requestHost: input.requestHost,
    surface: input.app,
    secret: input.secret,
    now: input.now,
  });
  if (current?.subject === input.subject) return { action: "continue" };
  return {
    action: "continue",
    setCookie: sealHostSession({
      surface: input.app,
      subject: input.subject,
      secret: input.secret,
      now: input.now,
      sameSite: input.sameSite,
    }).setCookie,
  };
}
