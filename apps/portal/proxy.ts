import { getPortalAuth0 } from "@roaswell/integrations/portal";
import {
  agencyHost,
  clientsHost,
  planHostSession,
} from "@roaswell/integrations/session";
import { type NextRequest, NextResponse } from "next/server";
export default async function proxy(request: NextRequest) {
  const host = request.nextUrl.hostname;
  if (host === agencyHost)
    return new NextResponse("Not found", { status: 404 });
  const path = request.nextUrl.pathname;
  if (path === "/operations" || path.startsWith("/operations/"))
    return new NextResponse("Nicht gefunden", { status: 404 });
  if (process.env.AUTH_ENABLED !== "true") {
    if (
      path.startsWith("/auth/") ||
      path === "/workspace" ||
      path.startsWith("/workspace/")
    )
      return new NextResponse("Anmeldung noch nicht eingerichtet", {
        status: 503,
      });
    return NextResponse.next();
  }
  const auth = getPortalAuth0();
  const response = await auth.middleware(request);
  const secret = process.env.PORTAL_AUTH0_SECRET;
  if (host === clientsHost && secret) {
    const session = await auth.getSession(request);
    const plan = planHostSession({
      app: "customer",
      requestHost: host,
      cookieHeader: request.headers.get("cookie"),
      secret,
      subject: session?.user.sub ?? null,
    });
    if (plan.action === "reject")
      return new NextResponse("Not found", { status: 404 });
    if (plan.setCookie) response.headers.append("Set-Cookie", plan.setCookie);
  }
  if (
    (path === "/workspace" || path.startsWith("/workspace/")) &&
    (await auth.getSession(request))
  ) {
    try {
      // Persist a refreshed token in middleware before the read-only Server Component.
      await auth.getAccessToken(request, response);
    } catch {
      return new NextResponse("Dein Bereich ist derzeit nicht verfügbar", {
        status: 503,
      });
    }
  }
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
