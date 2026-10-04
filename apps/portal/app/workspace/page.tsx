import {
  getPortalAuth0,
  readPortalOrganization,
} from "@roaswell/integrations/portal";
import {
  clientSessionOnRequest,
  requestHostname,
} from "@roaswell/integrations/session";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function Workspace() {
  if (process.env.AUTH_ENABLED !== "true")
    return <h1>Anmeldung noch nicht eingerichtet</h1>;
  const auth = getPortalAuth0();
  const session = await auth.getSession();
  const requestHost = requestHostname((await headers()).get("host"));
  if (!session || !clientSessionOnRequest(session, requestHost))
    redirect("/auth/login?returnTo=/workspace");
  let organization: Awaited<ReturnType<typeof readPortalOrganization>>;
  try {
    const { token } = await auth.getAccessToken();
    organization = await readPortalOrganization(
      process.env.PUBLIC_API_URL ?? "",
      token,
    );
  } catch {
    return (
      <>
        <h1 className="text-3xl font-semibold">
          Dein Bereich ist noch nicht verfügbar
        </h1>
        <p className="mt-5">
          Der Zugriff konnte nicht bestätigt werden. Bitte kontaktiere ROASWELL.
        </p>
        <a href="/auth/logout" className="mt-8 inline-block underline">
          Abmelden
        </a>
      </>
    );
  }
  return (
    <>
      <h1 className="text-4xl font-semibold tracking-tight">
        {organization.name}
      </h1>
      <p className="mt-5 text-lg text-muted-foreground">
        Willkommen in deinem persönlichen Kundenbereich.
      </p>
      <section className="mt-10 border-t py-6" aria-labelledby="collaboration">
        <h2 id="collaboration" className="text-xl font-semibold">
          Unsere Zusammenarbeit
        </h2>
        <p className="mt-3">
          Hier entsteht dein Überblick über die Zusammenarbeit. Projektstände,
          Analysen und Materialien werden nach ihrer Freischaltung ergänzt.
        </p>
      </section>
      <a href="/auth/logout" className="inline-block underline">
        Abmelden
      </a>
    </>
  );
}
