import { getAuth0 } from "@beacon/integrations/auth0";
import { type NextRequest, NextResponse } from "next/server";
export default async function proxy(request: NextRequest) {
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
  return getAuth0().middleware(request);
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
