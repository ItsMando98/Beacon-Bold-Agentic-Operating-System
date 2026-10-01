# R1-04 – Separates Kundenportal

R1-03 wurde als PR #19 regulär auf 23d46998f874bf107b5b82107ba424406eda417b gemergt. [Main-CI und VPS-Staging](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36929297872) bestanden.

## Ergebnis

- Eigene Next.js-App apps/portal auf Port 3003 mit ROASWELL-Stilen, öffentlicher Einrichtungsseite und geschützter Kundenübersicht.
- Eigenständiger Auth0-Client, getrennte Sitzungscookies und minimale Kunden-Scopes.
- Serverseitiger Kunden-API-Adapter mit validierter Organisationsprojektion, Timeout, no-store und Redirect-Verbot.
- Portalidentitäten erhalten keine Gründeraktionen, auch bei irrtümlicher interner Mitgliedschaft. Organisations- und Mitgliedschaftsprüfungen bleiben in R1-03.
- Eigenes Docker-Ziel und optionale VPS-Compose-Konfiguration; Start-, Browser- und CI-Containerabnahme ergänzt.
- [ADR 0016](adr/0016-separate-customer-portal.md) hält Rechte, Konfiguration und offene Provider-Abnahme fest.

## Betreiberkonfiguration

Für Portal und API dieselben AUTH0_ISSUER/AUTH0_AUDIENCE setzen. Die API benötigt zusätzlich PORTAL_AUTH0_CLIENT_ID und vorhandene explizite menschliche bindings; der Portalprozess benötigt keine bindings oder Datenbankverbindung.

Portal: AUTH0_CLIENT_ID bezeichnet den internen Client zum Vergleich. PORTAL_AUTH0_CLIENT_ID bezeichnet den eigenen Web-Client. PORTAL_AUTH0_CLIENT_SECRET und PORTAL_AUTH0_SECRET ausschließlich zur Laufzeit setzen; PORTAL_BASE_URL ist die eigene HTTPS-Adresse. Der Auth0-Client benötigt die genau passenden Callback-/Logout-Adressen und organizations:read. Die normale Kundenmitgliedschaft muss separat bestehen.

Lokal startet pnpm dev das Portal zusammen mit dem Workspace. Für unabhängigen Betrieb das Docker-Ziel portal bauen und infra/vps/portal.compose.yaml erst mit vollständig validierter Konfiguration verwenden. PORTAL_HOST, PORTAL_SECRETS_DIR, BEACON_RELEASE und Anbieterwerte sind erforderlich. Die Secret-Dateien portal_client_secret und portal_session_secret werden privat in /run/secrets gemountet.

Der aktuelle Staging-Receiver verteilt weiterhin seine bisherigen vier Images. Ein Portal-Rollout ist separat vorzubereiten; dieser PR aktiviert weder DNS noch einen neuen Dienst auf dem VPS. Kapazität und Auth0-Sandbox bleiben vor einem echten Rollout zu prüfen.

## Abnahme und Grenzen

Automatische Prüfungen umfassen getrennte Clients/Cookies, minimale Scopes, fehlende Konfiguration, geschlossenen Produktivstart, API-Abrufregeln und Browserzugang. Die echte PostgreSQL-/JWT-Abnahme prüft Portal-Lesezugriff, verweigerte Gründeraktionen und weiterhin fremde Mandanten.

**Offen:** echter Auth0-Sandbox-Login einschließlich Callback, Logout und Token-Erneuerung; Portal-HTTPS-Rollout. Kein Mock gilt als bestandene Provider-Abnahme. Keine Projekt-/Analyse-/Medienfunktionen und keine personalisierten Themen in dieser Aufgabe.

## Lokale Pflichtprüfungen

| Prüfung | Ergebnis |
|---|---|
| Lint | 160 Dateien, bestanden |
| Typecheck | 16 Workspace-Aufgaben, bestanden |
| Unit | 74 Tests, bestanden |
| Integration | 14 Tests mit lokalen PostgreSQL-/Temporal-Diensten, bestanden |
| Build | 11 Pakete, bestanden; bekannte Auth0-DPOP-Abhängigkeitswarnung |
| Browser/Axe | 7 Tests, bestanden; Portal zusätzlich im eingebauten Browser und als mobile Aufnahme geprüft |
| Startschutz | 5 Dienste inklusive Portal verweigern fehlende Konfiguration |
| VPS-Compose | Optionales Portal mit synthetischer Konfiguration erfolgreich validiert |
| Diff | Keine Whitespace-Fehler; keine neue Migration |

Die erste Startprüfung entdeckte den fehlenden Instrumentierungs-Hook im Standalone-Portal. Nach Übernahme des bestehenden Startschutzes bestanden Build und vollständige Startprüfung. GitHub prüft zusätzlich die Container des veröffentlichten PR-Stands.

Token-Erneuerung erfolgt im Auth0-Middleware-Aufruf vor der geschützten Server-Komponente, damit aktualisierte Sitzungsdaten in Cookies gespeichert werden. Erneuerungsfehler geben keine Kundendaten frei. Der echte Provider-Test dieses Ablaufs bleibt Teil der offenen Sandbox-Abnahme.

Beim finalen lokalen Portal-Build trat der bereits bekannte Webpack-Cachefehler auf. Der Cache wurde im ignorierten Arbeitsbereich erhalten; der frische Gesamtbuild und erneute Typ-, Browser- und Startprüfungen bestanden. Die Sicherheitskonfiguration blieb unverändert.
