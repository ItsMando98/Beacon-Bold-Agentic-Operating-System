# ADR 0016: Separates Kundenportal mit Auth0

Status: R1-04 implementiert; echte Auth0-Sandbox-Abnahme noch offen.

## Entscheidung

apps/portal ist eine eigene Next.js-Anwendung auf lokalem Port 3003 und ein eigener Container. Sie verwendet die vorhandenen ROASWELL-Tokens und Schriftarten. Dieser Schritt richtet die kleine Zugangsschnittstelle ein; Analyse, Personalisierung, Projekte und Medien folgen ihren Fachaufgaben.

Das Portal benötigt einen eigenen Auth0-Client, ein eigenes Client-Secret und einen eigenen Sitzungsschlüssel. Der Client muss vom internen AUTH0_CLIENT_ID verschieden sein. Sitzung und Login-Transaktionen haben getrennte Cookie-Namen; Cookies erhalten keine gemeinsame Domain. Der Browser erhält keinen Access-Token-Endpunkt. Anfragen nach Kundendaten erfolgen serverseitig mit dem SDK-Token, ohne Cache und ohne Redirect-Verfolgung.

Die API erkennt den ausdrücklich konfigurierten PORTAL_AUTH0_CLIENT_ID als menschlichen Kundenkanal. Die vertrauenswürdige surface-Eigenschaft entsteht aus dem verifizierten Client, nicht aus Token-Zusatzfeldern oder Request-Headern. Ein solcher Mensch kann keine Gründeraktion ausführen, selbst wenn eine interne Mitgliedschaft irrtümlich auf diesen Client verweist. Externe Agenten bleiben an ihre eigenen OAuth-/M2M-Grants gebunden.

Die Login-Scopes werden aus getOrganization abgeleitet. Die API bleibt die Autoritätsquelle für aktuelle Mitgliedschaft, Sperre, Widerruf und Mandantentrennung. Eine SDK-Sitzung oder statische Identitätszuordnung ist kein Zugriffsnachweis. Das Portal hat keinen Datenbankzugang und keine Gründerroute.

## Betrieb

Ohne Anmeldungskonfiguration zeigt die Startseite nur den Einrichtungsstand. /workspace und /auth/* antworten geschlossen; /operations existiert nicht. Produktion verlangt aktivierte vollständige Authentifizierung und HTTPS.

Das Docker-Ziel portal und infra/vps/portal.compose.yaml ermöglichen einen separaten Betrieb hinter dem vorhandenen Reverse Proxy. Die Compose-Datei bestellt keine Ressource und wird nicht automatisch deployt. Bestehende Receiver, Image-Archive und Staging-Hosts werden erhalten. Die zusätzliche Containerabnahme läuft in CI mit synthetischer Konfiguration, zunächst ohne aktivierten Provider.

## Offene externe Abnahme

Eine reale Auth0-Sandbox mit separat registriertem Web-Client, erlaubten Callback-/Logout-Adressen und organizations:read muss Login, Callback, Logout, fremde Sitzung und Token-Erneuerung prüfen. Synthetisch signierte JWTs beweisen die API-Trennung, ersetzen diesen Provider-Test aber nicht. Solange Zugänge fehlen, gilt die externe Login-Abnahme ausdrücklich als offen. Es werden keine echten Identitäten oder Zugangsdaten erfunden.

Token-Erneuerung erfolgt im Auth0-Middleware-Aufruf vor der geschützten Server-Komponente, damit aktualisierte Sitzungsdaten in Cookies gespeichert werden. Erneuerungsfehler geben keine Kundendaten frei. Der echte Provider-Test dieses Ablaufs bleibt Teil der offenen Sandbox-Abnahme.
