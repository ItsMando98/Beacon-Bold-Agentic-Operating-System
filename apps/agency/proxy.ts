import { type NextRequest, NextResponse } from "next/server";
import { requestHostname } from "../../packages/integrations/src/host-session.js";
import { bindAgencyHost } from "./src/agency-host";

/**
 * Host gate for the catalog shell.
 * A real Auth0 login on the public agency host is not accepted, so the
 * default request has no login subject. Every other host is still refused.
 * When a subject is present, the response carries the host-only agency cookie.
 */
export function agencyCatalogProxy(
  request: {
    nextUrl: { hostname: string };
    headers: { get(name: string): string | null };
  },
  input: {
    secret?: string | null;
    subject?: string | null;
    now?: number;
  } = {},
) {
  const decision = bindAgencyHost({
    requestHost: request.nextUrl.hostname,
    cookieHeader: request.headers.get("cookie"),
    secret:
      input.secret === undefined
        ? (process.env.AUTH0_SECRET ?? null)
        : input.secret,
    subject: input.subject ?? null,
    now: input.now,
  });
  if (decision.action === "reject") {
    return new NextResponse("Not found", { status: 404 });
  }
  const response = NextResponse.next();
  if (decision.setCookie) {
    response.headers.append("Set-Cookie", decision.setCookie);
  }
  return response;
}

export default function proxy(request: NextRequest) {
  // Next sets nextUrl.hostname from HOSTNAME, which is the bind address.
  // The agency host is the request Host header, never 0.0.0.0 or 127.0.0.1.
  return agencyCatalogProxy({
    nextUrl: { hostname: requestHostname(request.headers.get("host")) },
    headers: request.headers,
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
