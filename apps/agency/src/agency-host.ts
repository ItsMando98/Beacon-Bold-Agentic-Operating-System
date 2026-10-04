import {
  agencyHost,
  agencySessionOnRequest,
  clientsHost,
  planHostSession,
  type SessionSameSite,
  stampHostSession,
} from "../../../packages/integrations/src/host-session.js";

/**
 * Mark a session as the agency catalog shell.
 * This is the app that runs on the agency host, not the operations app.
 */
export function stampAgencyHostSession<T extends object>(session: T) {
  return stampHostSession(session, "agency");
}

/** The catalog shell accepts an agency session only on its own host. */
export function agencyShellAllowsSession(
  session: object | null | undefined,
  requestHost: string,
) {
  return agencySessionOnRequest(session, requestHost);
}

/**
 * Decide the catalog shell's host gate.
 * The clients host is refused. On the agency host, a known subject receives
 * a host-only session cookie. No catalog route is implemented here.
 */
export function bindAgencyHost(input: {
  requestHost: string;
  cookieHeader: string | null;
  secret: string | null;
  subject: string | null;
  now?: number;
  sameSite?: SessionSameSite;
}): { action: "reject" } | { action: "continue"; setCookie?: string } {
  if (input.requestHost === clientsHost) return { action: "reject" };
  if (input.requestHost !== agencyHost || !input.secret) {
    return { action: "continue" };
  }
  return planHostSession({
    app: "agency",
    requestHost: input.requestHost,
    cookieHeader: input.cookieHeader,
    secret: input.secret,
    subject: input.subject,
    now: input.now,
    sameSite: input.sameSite,
  });
}
