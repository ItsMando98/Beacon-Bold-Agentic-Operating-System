# ADR 0019: Vorschau nur für die Agentur-Hülle

Status: Pipeline entschieden. Keine öffentliche URL, kein DNS und kein Produktionsdeploy.

Die Nummer 0017 gehört dem Katalogserver (`docs/adr/0017-catalog-server.md`). Die Nummer 0018 gehört der Katalogshell. Diese Vorschauentscheidung ersetzt keines der beiden ADRs.

## Entscheidung

Die Vorschau der Agentur-Hülle ist ein GitHub-Job, der nur bei Pull Requests läuft. Sobald `apps/agency/package.json` im Checkout liegt, baut der Job genau dieses Paket und startet dessen `start`- oder `dev`-Skript auf `127.0.0.1`. Davor antwortet ein kleiner lokaler Proxy und setzt drei Header: `x-beacon-preview: agency-shell`, `x-beacon-production: false`, `x-beacon-data: local-only`.

Die Vorschau ist daran erkennbar, dass sie kein Produktionssystem ist:

- Der Workflow hat kein `push` und kein `workflow_dispatch`.
- `APP_ENV=production`, `APP_ENV=staging` und `SERVICE_MODE=live` werden abgelehnt.
- `BEACON_PREVIEW=agency-shell` und `BEACON_PRODUCTION=false` stehen in der Prozessumgebung.
- Eine entfernte `DATABASE_URL`, `REDIS_URL` oder `PUBLIC_API_URL` bricht den Start ab. Erlaubt ist nur Loopback, und auch das nur, wenn der Aufrufer sie bereits gesetzt hat. Der Job selbst übergibt keine Datenbank.
- Weiterleitungen auf einen Host außerhalb von Loopback werden abgelehnt. Dazu gehören die Apex-Domain und `agency.beaconandbold.com`.
- Es gibt keinen Cloudflare-Upload, keinen VPS-Receiver-Aufruf und keinen Terraform-Apply.

Solange `apps/agency` fehlt, bleibt der Job scharf und startet keinen Ersatz. Diese App und der Katalogserver, der Seed v1 übernimmt ohne ihn per Publish zu überschreiben, entstehen in parallelen Änderungen. Diese Pipeline ändert ihren Anwendungscode nicht.

Der Katalogserver wird von der Vorschau nicht gestartet. Sie liest und schreibt deshalb keine Produktionsdaten. Die Hülle soll ihren lokalen Seed-Adapter benutzen, solange sie nicht auf dem Produktions-Origin läuft. Diese Pipeline setzt diesen Origin nicht.

## Bewusst nicht angeschlossen

- Die öffentliche Website `beaconandbold.com` und ihr Cloudflare-Pages-Projekt `beaconandbold`. `https://beaconandbold.pages.dev` leitet auf die Apex-Domain um. Es wird kein statischer Ordner hochgeladen.
- DNS-Einträge, insbesondere `agency.beaconandbold.com` und `clients.beaconandbold.com`.
- Ein Kundendashboard und alles für `clients.beaconandbold.com`. `apps/portal` bleibt unverändert.
- Ein Produktionsdeploy, Abrechnung und das vorhandene VPS-Staging. Das Staging deployt weiterhin nur die bestehenden Images und nur mit der vorhandenen Freigabe.

## Fail-closed

`preview-guard` liest Deploy-Manifeste: Workflows, Terraform, Compose, Wrangler, Dockerfiles, `scripts/deploy-staging.mjs` und die `scripts`-Felder der `package.json`. Anwendungscode wird nicht gelesen, damit ein Origin-Vergleich im Katalog oder in der Hülle keine DNS-Anlage ist.

Der Check bricht ab, wenn ein Manifest die Apex-Domain als Deploy-Ziel nennt, das Pages-Projekt `beaconandbold` nennt, Pages oder Workers deployt, einen statischen Site-Ordner übergibt, `environment: production` oder `APP_ENV=production` setzt, oder einen der beiden verbotenen DNS-Namen enthält. Bestehende Staging-Hosts unter `staging.beaconandbold.com` bleiben erlaubt.

Der Check ist in `.github/branch-protection.json` eingetragen. Ihn bei GitHub als Pflichtprüfung zu speichern bleibt ein manueller Administrator-Schritt. Dieser Schritt wird hier nicht ausgeführt.
