# Vorschau der Agentur-Hülle

Die Vorschau ist kein öffentlicher Dienst. Sie ist ein Pull-Request-Job und ein lokaler Befehl.

## Was tatsächlich läuft

```sh
node scripts/agency-preview.mjs
```

1. `preview-guard` prüft die Deploy-Manifeste. Ein Apex-Deploy oder einer der verbotenen DNS-Namen beendet den Lauf.
2. Fehlt `apps/agency/package.json`, endet der Lauf mit `ready: false`. Es wird keine Ersatz-Hülle gestartet.
3. Liegt die Hülle vor, installiert der Pull-Request-Job die Abhängigkeiten, baut nur dieses Paket und startet `start` oder sonst `dev` auf `127.0.0.1`. Der Port kommt aus dem Skript der Hülle, sonst `3010`.
4. Ein Proxy auf einem weiteren Loopback-Port setzt `x-beacon-preview: agency-shell`, `x-beacon-production: false` und `x-beacon-data: local-only`. Der Job fordert diese Adresse an und beendet den Prozess danach.

Die Prozessumgebung ist `APP_ENV=development`, `SERVICE_MODE=mock`, `AUTH_ENABLED=false`, `BEACON_PREVIEW=agency-shell`, `BEACON_PRODUCTION=false`. Token, Cloudflare-Zugänge und entfernte Datenbankadressen werden nicht an den Prozess gegeben. Eine entfernte Datenbankadresse bricht vorher ab.

Der Katalogserver wird nicht gestartet. Die Vorschau liest und schreibt keine Produktionsdaten. Annahme: die parallele Hülle rendert Seed v1 über ihren lokalen Adapter, und der parallele Katalogserver veröffentlicht diesen Seed nicht. Beide liegen auf `main` noch nicht. Die Pipeline greift, sobald `apps/agency` im selben Checkout liegt.

## Woran man erkennt, dass es nicht Produktion ist

- Der Workflow `.github/workflows/agency-preview.yml` reagiert nur auf `pull_request`.
- Die Logzeile enthält `"production": false` und `ready`.
- Die Antwort des Proxys trägt `x-beacon-production: false`.
- Der Hör-Host ist `127.0.0.1`. Es gibt keine öffentliche URL.
- `APP_ENV=production`, `APP_ENV=staging` und `SERVICE_MODE=live` werden abgelehnt.

## Was nicht verdrahtet ist

- Apex `beaconandbold.com` und das Cloudflare-Pages-Projekt `beaconandbold`. Der statische Ordner der öffentlichen Website wird nicht hochgeladen.
- DNS, einschließlich `agency.beaconandbold.com` und `clients.beaconandbold.com`.
- Ein Kundendashboard und `clients.beaconandbold.com`.
- Produktion, Abrechnung und ein neues VPS-Deploy. Das bestehende Staging bleibt der eingeschränkte Receiver für die vorhandenen Images.

Details der Entscheidung: [ADR 0019](adr/0019-agency-shell-preview.md). ADR 0017 ist der Katalogserver. ADR 0018 ist die Katalogshell. Beide bleiben unverändert.
