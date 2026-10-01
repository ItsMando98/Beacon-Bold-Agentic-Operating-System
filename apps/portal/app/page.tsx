export const dynamic = "force-dynamic";
export default function Home() {
  const enabled = process.env.AUTH_ENABLED === "true";
  return (
    <>
      <h1 className="text-4xl font-semibold tracking-tight">
        Dein Kundenbereich
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted-foreground">
        Ein persönlicher Ort für die Zusammenarbeit mit ROASWELL.
      </p>
      {enabled ? (
        <a
          href="/auth/login?returnTo=/workspace"
          className="mt-8 inline-block rounded-md bg-primary px-5 py-3 font-medium"
        >
          Anmelden
        </a>
      ) : (
        <p className="mt-8 border-t pt-6">
          Anmeldung noch nicht eingerichtet. Dein Bereich bleibt bis zur
          Freischaltung geschlossen.
        </p>
      )}
    </>
  );
}
