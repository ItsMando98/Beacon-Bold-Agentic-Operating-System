# P1-4: Auth0 für Menschen und Agenten

Ausgangspunkt: main e17976044e7aea6e503b91f130bcabef66c13081. P1-3 / PR #12 regulär gemergt; neun main-Prüfungen und bestehender VPS-Staging-Deploy bestanden: https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36852140339. Gate 0 weiterhin erfüllt.

## Implementierung

Gemeinsame Auth-Schemas, explizite lokale Identitäts-/Mandantenzuordnungen, Auth0-Adapter, RS256-/Issuer-/Audience-/Ablaufprüfung, vertragsgebundene Scopes, Menschen-Anmeldung und Session-Verwaltung über das offizielle Next.js-SDK. Im Live-Server werden lokale Nutzer und Agenten unter RLS geprüft; fremde und pausierte Agenten erhalten keinen Zugriff. OpenAPI dokumentiert Bearer-Authentifizierung für geschützte Operationen. [ADR 0009](adr/0009-auth0-identities.md) beschreibt Grenzen und Entscheidungen.

Bestehende Migrationen unverändert. Keine neuen VPS-Dienste, Produktion, AWS-Provisionierung oder Geldwirkung. Der ursprüngliche Checkout auf feat/p0-7-staging und seine lokalen Abnahmedokumente bleiben erhalten.

## Laufzeitwerte

API: AUTH_ENABLED=true, AUTH0_ISSUER (https://<tenant-domain>/), AUTH0_AUDIENCE (registrierter API-Identifier), AUTH0_CLIENT_ID (Menschen-App), AUTH0_AUTH_BINDINGS (JSON-Allowlist).

Betriebsoberfläche: zusätzlich AUTH0_DOMAIN (Hostname ohne Schema), AUTH0_CLIENT_SECRET, AUTH0_SECRET (64 Hex-Zeichen), APP_BASE_URL (eigener App-Origin). AUTH0_DOMAIN und Issuer müssen übereinstimmen. Staging verlangt HTTPS für APP_BASE_URL. Dateien über AUTH0_CLIENT_SECRET_FILE, AUTH0_SECRET_FILE und AUTH0_AUTH_BINDINGS_FILE dürfen ausschließlich feste /run/secrets/-Pfade verwenden. Private Werte bleiben in privaten Laufzeitdateien.

Ein ausschließlich erfundenes Binding-Beispiel:

```json
[
  {"kind":"human","subject":"auth0|synthetic-user","tenantId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","userId":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","scopes":["customers:write"]},
  {"kind":"oauth","subject":"auth0|synthetic-user","clientId":"synthetic-oauth-client","tenantId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","agentId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","scopes":["customers:write"]},
  {"kind":"m2m","clientId":"synthetic-machine-client","tenantId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","agentId":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","scopes":["customers:write"]}
]
```

Bei Organizations zusätzlich organizationId setzen; er muss exakt zum signierten org_id passen. Nutzer/Agenten sind vorher im jeweiligen Mandanten anzulegen; Nutzer.externalSubject muss zum Auth0-Subject passen. Ein Betreiber pflegt diese Allowlist außerhalb Git. Bindings sind keine öffentliche Registrierungs-API.

## Externe Einrichtung und Abnahme: offen

1. Test-Tenant dev-ufrnq6f2lqr26ehf.eu.auth0.com ist per MCP erreichbar. Anbieter-/Datenschutzabnahme bleibt vor Live-Aktivierung offen; keine Tarifbestellung.
2. API registrieren: exakt festgelegte Audience, RS256, Auth0-Standardprofil, Berechtigung customers:write. RFC-9068 und Agent-as-Principal zunächst nicht aktivieren.
3. Regular Web Application: Callback https://app.staging.beaconandbold.com/auth/callback; Logout-/Origin https://app.staging.beaconandbold.com. Lokal entsprechend http://localhost:3000. Nur tatsächlich verwendete Callback-URLs registrieren.
4. Pro freigegebenem externen Agenten eigene OAuth-Anwendung, Authorization Code mit PKCE S256 und explizite Scope-Zuweisung; keine offenen Client-/Mandantenfreigaben. Eigene M2M-Anwendung je eigenständigem Agenten mit Client Credentials und begrenzten API-Grants.
5. Lokale Datensätze und Laufzeit-Bindings vorbereiten. Token-Laufzeit, Widerrufsverantwortung und Offline-/Refresh-Zugriff entscheiden; vorgeschlagen 15 Minuten und zunächst kein Offline-Zugriff.
6. Echten Menschen-Login/Logout und Callback-/State-Ablehnung testen; echte OAuth- und M2M-Tokens verwenden. Ohne Scope 403, abgelaufen 401, falscher Mandant und pausierter Agent abgewiesen; gültige Kundenanlage mit Idempotenz. Ausschließlich erfundene Testdaten.
7. Erst danach begrenzte VPS-Aktivierung vorbereiten. infra/vps/compose.auth0.yaml setzt Auth0 explizit auf true und mountet drei private Dateien. Root-eigene Receiver-/Compose-Konfiguration muss die Overlay-Datei dauerhaft berücksichtigen; der aktuelle Merge-Receiver verwendet nur die bisherige Basisdatei. Bestehende Dienste, begrenzte SSH-Befehle, main-Prüfung, Freigabe, Backup, Migration und HTTPS-Abnahme erhalten.

Ohne diese Einrichtung läuft die neue Authentifizierung nicht live. Der Standard-Stack bleibt beim nächsten Merge ohne Auth-Resolver geschlossen. Alte Clerk-Dateien und Receiver-Einstellungen auf dem VPS werden nicht entfernt; sie werden vom neuen Anwendungscode nicht verwendet.

## Automatische Abnahme

Tests verwenden lokal erzeugte RSA-Schlüssel und erfundene Auth0-Claims; keine echten Providerkonten. Die API-Abnahme prüft Scope 403, Ablauf 401, Signaturmanipulation, fremde Issuer/Audiences, zukünftige Tokens, Client-/Organisationsfreigaben, lokale Berechtigungsgrenzen, getrennte Menschen-/Agentenidentitäten und unvertrauenswürdige Tenant-Header. Ein echter PostgreSQL-Test beweist lokale Nutzer-/Agentenzugehörigkeit unter RLS sowie die Sperre pausierter Agenten. Browser-Abnahme prüft geschlossene Login-/Callback-/Betriebsrouten ohne konfigurierte Authentifizierung.

Lokal bestanden: Lint, Typecheck (15 Tasks), Build (10 Tasks), 54 Unit-Tests, 12 Integrationstests, vier Startprüfungen und vier Receiver-Tests. Storybook-Build und alle fünf Browser-Tests ebenfalls bestanden. Die neun GitHub-Prüfungen einschließlich Container, Terraform und Secret-Scan werden am PR geprüft. Externe Auth0- und VPS-Aktivierungsabnahme bleiben offen und werden nicht durch Mock-Tests als bestanden markiert.

## Build-Kompatibilität

Die Betriebsoberfläche verwendet Webpack mit expliziter .js→.ts/.tsx-Auflösung für die vorhandenen ESM-Importpfade der gemeinsamen Schemas. Der Marketing-Build bleibt bei Turbopack. Das Auth0-SDK erzeugt eine Build-Warnung für seinen optionalen dynamischen DPoP-Import; DPoP wird in dieser Integration nicht aktiviert. Build und Startprüfung müssen dennoch vollständig bestehen.

## Ausschließlich VPS

AWS wird nicht mehr verwendet. Der AWS-Deploy-Job ist entfernt und das historische AWS-Deploy-Skript kann nicht mehr direkt ausgeführt werden. Keine neuen Auth0-Anpassungen an den archivierten AWS-Terraform-Vorlagen. Die vorhandene terraform-Pflichtprüfung bleibt als lokale Mock-Prüfung erhalten, um den bestehenden Branch-Schutz nicht zu umgehen. Aktiver Deploy-Pfad ist ausschließlich der VPS mit unveränderter Gründerfreigabe.

## Auth0-MCP-Onboarding am 1. Oktober 2026

Die offiziellen Tools auth0_onboarding und unmittelbar danach auth0_get_quickstart_guide wurden für apps/app mit framework=nextjs ausgeführt. Anwendung: Beacon & Bold VPS Test, client_id nB4Qfv3CrSckc8zKTgoeVqQ6u5jPvB5r, Typ regular_web. Die vorhandene SDK-Integration hinter packages/integrations entspricht dem Quickstart; keine zweite Auth0-Instanz oder zusätzliche Middleware angelegt.

Issuer: https://dev-ufrnq6f2lqr26ehf.eu.auth0.com/. API-Audience: https://staging.beaconandbold.com. API Beacon & Bold VPS Test API ist mit RS256, Standardprofil access_token, customers:write, 900 Sekunden Token-Laufzeit und deaktiviertem Offline-Zugriff registriert. Die 15 Minuten gelten für diese Test-API; Betriebs-/Widerrufspolitik vor Live-Aktivierung bestätigen.

Callbacks: http://localhost:3000/auth/callback und https://app.staging.beaconandbold.com/auth/callback. Logout-URLs und Web-Origins sind auf diese beiden App-Origins begrenzt. Nur authorization_code ist für die Menschen-App freigegeben. Das Quickstart-Tool aktivierte skip_non_verifiable_callback_uri_confirmation_prompt für den lokalen Callback; der registrierte Callback bleibt fest auf localhost begrenzt.

Das Tool speicherte die Zugangsdaten direkt in apps/app/.env.local. Der Client-Schlüssel konnte erst nach zusätzlicher read:client_keys-Freigabe per auth0_save_credentials_to_file gespeichert werden. Keine Zugangsdaten wurden ausgegeben oder committed. Cookie-Schlüssel, Client-Schlüssel, MCP-Schreibprotokoll und MCP-Zustand sind Git-ignoriert. Lokale Fachfreigaben sind zunächst leer (AUTH0_AUTH_BINDINGS=[]); eine erfolgreiche Anmeldung erteilt daher noch keinen Betriebs- oder API-Zugriff.

Mit echter Providerkonfiguration lokal geprüft: Schema vollständig; App startet; Startseite 200; Login 307 zum richtigen Tenant mit korrekter Client-ID, Callback, API-Audience, customers:write, Authorization Code und PKCE S256; Transaktionscookie HttpOnly; unauthentifizierte Betriebsseite 307 zur Anmeldung; öffentlicher Zugriffstoken-Endpunkt 404. Ungültiger Callback ohne passende Transaktion wird vom SDK abgewiesen (aktuell HTTP 500). Kein erfolgreicher Benutzer-Login/Logout und kein OAuth-/M2M-Tokenaustausch als bestanden behauptet.

Noch offen: echter Benutzer-Login/Logout, ausdrückliche lokale Nutzer-/Mandantenfreigabe, separate externe OAuth-/M2M-Anwendungen samt Abnahme und die spätere dauerhafte VPS-Aktivierung. Der laufende lokale Test ersetzt keine Server-Aktivierung. AWS bleibt stillgelegt.
