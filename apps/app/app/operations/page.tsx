import { humanBinding } from "@roaswell/integrations/auth";
import { getAuth0 } from "@roaswell/integrations/auth0";
import {
  agencySessionOnRequest,
  requestHostname,
} from "@roaswell/integrations/session";
import { auth0AppEnvironmentSchema } from "@roaswell/schemas";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Operations() {
  if (process.env.AUTH_ENABLED !== "true")
    return (
      <main>
        <h1>Anmeldung noch nicht eingerichtet</h1>
      </main>
    );
  const config = auth0AppEnvironmentSchema.parse(process.env);
  const session = await getAuth0().getSession();
  const requestHost = requestHostname((await headers()).get("host"));
  if (!session || !agencySessionOnRequest(session, requestHost))
    redirect("/auth/login?returnTo=/operations");
  const binding = humanBinding(
    config.AUTH0_AUTH_BINDINGS,
    session.user.sub,
    typeof session.user.org_id === "string" ? session.user.org_id : undefined,
  );
  if (!binding)
    return (
      <main>
        <h1>Kein Zugriff</h1>
        <p>Für diese Identität liegt keine Freigabe vor.</p>
        <a href="/auth/logout">Abmelden</a>
      </main>
    );
  return (
    <main>
      <h1>Betriebsoberfläche</h1>
      <p>
        Du bist angemeldet. Freigaben, Agentenläufe und Audit werden in Phase 1
        angebunden.
      </p>
      <a href="/auth/logout">Abmelden</a>
    </main>
  );
}
