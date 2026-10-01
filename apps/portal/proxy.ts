import { getPortalAuth0 } from "@roaswell/integrations/portal";
import { type NextRequest, NextResponse } from "next/server";
export default async function proxy(request: NextRequest) {
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
