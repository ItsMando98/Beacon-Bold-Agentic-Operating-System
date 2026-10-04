import { getAuth0 } from "@roaswell/integrations/auth0";
import {
  agencyHost,
  clientsHost,
  planHostSession,
} from "@roaswell/integrations/session";
import { type NextRequest, NextResponse } from "next/server";
export default async function proxy(request: NextRequest) {
  const host = request.nextUrl.hostname;
  if (host === clientsHost)
    return new NextResponse("Not found", { status: 404 });
  if (process.env.AUTH_ENABLED !== "true") {
    if (
      request.nextUrl.pathname.startsWith("/auth/") ||
      request.nextUrl.pathname.startsWith("/operations")
    )
      return new NextResponse("Anmeldung noch nicht eingerichtet", {
        status: 503,
      });
    return NextResponse.next();
  }
  const response = await getAuth0().middleware(request);
  const secret = process.env.AUTH0_SECRET;
  if (host !== agencyHost || !secret) return response;
  const session = await getAuth0().getSession(request);
  const plan = planHostSession({
    app: "agency",
    requestHost: host,
    cookieHeader: request.headers.get("cookie"),
    secret,
    subject: session?.user.sub ?? null,
  });
  if (plan.action === "reject")
    return new NextResponse("Not found", { status: 404 });
  if (plan.setCookie) response.headers.append("Set-Cookie", plan.setCookie);
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
