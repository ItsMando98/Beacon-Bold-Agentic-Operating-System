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
  return getPortalAuth0().middleware(request);
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
