# Umgebungsvariablen

`APP_ENV` und `SERVICE_MODE` sind beim direkten Start jeder App Pflicht. Mock-Modus ist ausschließlich in development erlaubt. `pnpm dev` lädt optional die lokale `.env` und setzt sonst dev/mock. Next.js prüft die Konfiguration beim Start, nicht beim Erzeugen eines umgebungsunabhängigen Build-Artefakts.

Live-Konfiguration wird nach tatsächlich benötigtem Dienst getrennt:
- web: PUBLIC_API_URL
- app: PUBLIC_API_URL, CLERK_SECRET_KEY, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- api: DATABASE_URL (PostgreSQL), REDIS_URL, PUBLIC_API_URL
- worker: TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE, TEMPORAL_API_KEY

Außerhalb development verlangt PUBLIC_API_URL HTTPS. Staging- und Produktionsvorlagen enthalten keine echten Zugangsdaten. Die zukünftigen Modell- und Observability-Schlüssel werden erst in den zugehörigen Phase-1-Aufgaben verpflichtend; sie werden nicht vorgetäuscht, um Phase 0 starten zu können.

Turbo reicht Secrets nur für Entwicklungsprozesse durch; sie werden nicht als Build-Artefakte geschrieben. Konfigurationsfehler nennen ausschließlich fehlende/ungültige Variablennamen, niemals eingegebene Werte.

## P1-4: Auth0 ersetzt Clerk

Die Betriebsoberfläche benötigt keine Clerk-Schlüssel mehr. API und App aktivieren Auth0 nur mit AUTH_ENABLED=true und vollständig validierten Laufzeitwerten; Details in [p1-4-auth0.md](p1-4-auth0.md). Bestehendes Staging bleibt bei false geschlossen und erreichbar; Produktionsstarts mit deaktivierter Authentifizierung werden abgewiesen. API-Schlüssel, Client-Secrets und Cookie-Schlüssel werden nicht beim Build benötigt. Historische Clerk-Angaben oben beschreiben den P0-6-Stand und werden durch diesen Abschnitt ersetzt.
