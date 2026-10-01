# Umsetzungsstatus

Stand: 1. Oktober 2026. Code, lokale Abnahme und externe Abnahme werden getrennt bewertet.

## Aktueller Produktplan: ROASWELL

R1-04 implementiert das separate Kundenportal mit eigener Auth0-Konfiguration und Container. R1-03 ist als PR #19 regulär gemergt; Main-CI und VPS-Staging bestanden. [Abnahme, Betrieb und offene Auth0-Sandbox](roaswell-r1-04.md), [ADR 0016](adr/0016-separate-customer-portal.md).

R1-02 ist als PR #18 auf 3fccbb925b14e2153967e3bb5367c80d7aa16f5e gemergt; [Main-CI und VPS-Staging](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36915041492) bestanden. R1-03 ergänzt die persistierte Autorisierung für POST /customers und GET /v1/organization, transaktionales Audit und den internen Widerrufsdienst; [Abnahme und Grenzen](roaswell-r1-03.md), [ADR 0015](adr/0015-persisted-request-authorization.md). Das Kundenportal bleibt R1-04, übrige R1-Ressourcen bleiben unregistriert. Die folgenden Absätze sind Nachweise der vorherigen Aufgabenstände.

R0-01 ist als PR #16 regulär gemergt auf 5383be20e4b12214775be329669776b146f0cc11; alle neun Main-Prüfungen und VPS-Staging-Deploy bestanden ([Nachweis](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36909267120)). R1-01 ist als PR #17 auf ad66eb9c8b638f25fa8e0fb5ac787cd2d3a81bd6 gemergt; [Main-CI und VPS-Staging](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36911518359) bestanden. R1-02 ergänzt darauf die Zod-abgeleitete Vorwärtsmigration, Mitgliedschaften, RLS, separaten Gründerkanal und explizite Eigenkundeneinrichtung; [Abnahme und Grenzen](roaswell-r1-02.md), [ADR 0014](adr/0014-access-persistence-and-founder-role.md). Live-Endpunkte und Auth0-Rechteintegration bleiben Folgeaufgaben.

Der neue [Umsetzungsplan](roaswell-umsetzungsplan.md) und die [Einzelaufgaben](roaswell-aufgaben.md) ersetzen die ursprüngliche Produktplanung. R0-01 basiert auf main a92989e: Namenswechsel, ADRs und Aufgaben sind implementiert und lokal abgenommen; [Nachweis und Grenzen](roaswell-r0.md). Der Gründer hat Auth0 erneut bestätigt. Die nicht ausdrücklich abgenommenen Aufgaben von R1–R11 bleiben offen; PR-Merge und externe Abnahmen werden gesondert dokumentiert. Die folgenden Abschnitte erhalten die historischen P0/P1-Nachweise.

Gate 0 ist technisch bestanden. PR #8 wurde regulär auf `main` mit Revision `3ee92f9102a0c23055ffb092812ec5f4e642dbde` gemergt. Alle neun Pflichtprüfungen und der begrenzte VPS-Deploy sind erfolgreich: [Deploy-Nachweis](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36832592546). Migration, Mandantentrennung, öffentliche HTTPS-Endpunkte und Wiederherstellung des externen verschlüsselten Backups sind dokumentiert; [Backup-Nachweis](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36834193004). Branch-Schutz ist aktiv und der fehlerhafte Merge von PR #4 wurde tatsächlich verweigert.

P1-1 / PR #9, P1-2 / PR #10 und P1-7 / PR #11 sind regulär gemergt. Aktueller Aufgaben-Ausgangspunkt ist main `67311b56f5231128a1d1333436f9bb81faa7f646`; alle neun main-Pflichtprüfungen und der begrenzte VPS-Staging-Deploy sind erfolgreich: [Merge-Lauf](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36847460584). P1-3 ist auf eigenem Branch mit API-Verträgen, Fehlerformat, Scalar und atomarer Idempotenz implementiert und wird als Entwurfs-PR vorgelegt. [Ergebnis P1-3](p1-3-hono-api.md), [ADR 0008](adr/0008-api-contracts-idempotency.md).

Die vorhandenen lokalen P0-7-Änderungen einschließlich aktualisierter Abnahmedokumentation bleiben im ursprünglichen Checkout erhalten. Dieser Aufgaben-Branch übernimmt daraus keine Konfiguration oder fremden Code. Es werden keine VPS-Dienste geändert, keine AWS-Ressourcen provisioniert und keine Geldwirkungen ausgelöst. P1-8 ist weiterhin offen; neue Ausgaben benötigen den dokumentierten manuellen Gründerfreigabeweg. Standort- und unabhängige Hostschlüsselbestätigung bleiben Betreiberentscheidungen. Die nachfolgenden AWS-Abschnitte sind historische Nachweise der nicht provisionierten Alternative.

| Aufgabe | Nachweis / offene Punkte |
|---|---|
| P0-1 | Vier Apps und sechs Pakete, eingefrorene Abhängigkeiten. PR #1 gemergt. |
| P0-2 | Zwölf Arbeitsregeln, Ordnerkarte und Befehle. PR #2 gemergt. |
| P0-3 | Sieben echte GitHub-Prüfungen erfolgreich. PR #3 gemergt. Absichtlich fehlschlagender PR #4 geschlossen, nicht gemergt. Nach Umstellung auf öffentliche Sichtbarkeit: neun Pflichtprüfungen und Administrator-Erzwingung aktiv; tatsächlicher Mergeversuch von PR #4 verweigert. |
| P0-4 | PostgreSQL/pgvector, eingeschränkte Datenbankrolle, Redis, persistenter Temporal-Entwicklungsserver und Mailpit. Vier echte Diensttests lokal und in CI bestanden. PR #5 gemergt. |
| P0-5 | Vorläufige Tokens, lokale Schriften, shadcn-Komponenten und Storybook. Drei Browsertests einschließlich Tastatur, Axe und Mobilansicht bestanden. PR #7 gemergt; alle sieben GitHub-Prüfungen erfolgreich. |
| P0-6 | Getrennte App-Konfigurationen, Mock nur lokal, Pflichtwerte für Live-Betrieb. 23 Unit-Tests und vier Startprüfungen erfolgreich. PR #6 gemergt. |
| P0-7 | PR #8 regulär gemergt; VPS-Deploy, neun Pflichtprüfungen, Migration/Mandantentrennung, öffentliches HTTPS sowie externes verschlüsseltes Backup/Restore bestanden. |
| Phase 1 | P1-1 gemergt und nach Staging deployt. P1-2 umgesetzt im eigenen Aufgaben-Branch; P1-3 wartet auf dessen Merge. Auth, MCP-Ausführung, Worker, Modell-Router und Freigabe-Workflow bleiben Folgeaufgaben. |

Staging läuft auf dem vorhandenen VPS. Weitere Anbieterzugänge und Betriebsentscheidungen gehören zu Folgeaufgaben und werden nicht durch Platzhalter als nachgewiesen ausgegeben.

## AWS-Einrichtung

AWS CLI 2.37.6 wurde mit gültiger Amazon-Signatur benutzerspezifisch installiert. Profil beacon-bold, Standardregion eu-central-1. STS bestätigt Konto 212626318809 mit Root-Anmeldung. Zugangswerte liegen ausschließlich in AWS-eigener Benutzerkonfiguration. AWS-MCP ist in diesem Chat nicht als direkt aufrufbares Werkzeug geladen; der vorhandene konfigurierte Proxy wurde deshalb über das MCP-Protokoll gestartet. Initialisierung, Werkzeugliste und entfernter aws___run_script/STS GetCallerIdentity waren erfolgreich. Infrastruktur und OIDC-Rolle sind als Terraform vorbereitet, aber noch nicht provisioniert.

## P0-7 Teilabnahmen

- Bootstrap: S3-State, KMS, OIDC, leere Secret-Hülle, delegierte Staging-Zone als Code; Validierung und simulierte Abnahme bestanden, Apply offen.
- Frankfurt-Staging: VPC, private RDS/Redis, ECR, ECS, ALB/ACM/DNS, Budgetalarme als Code; Validierung und simulierte Abnahme bestanden. DNS-Schreibzugriff wird auf die delegierte Staging-Zone geprüft.
- Migrationen: Foundation ohne Phase-1-Fachmodell; reale lokale Vorwärts-/Checksummen- und Mandantentrennungstests bestanden. Cloud-Abnahme offen.
- CI/Deployment: Migration vor Dienststart, Commit-Images per Digest, ECS-/HTTPS-Abnahme und Wiederherstellung vorheriger Revisionen; vier simulierte Deployment-Fehler-/Erfolgstests bestanden. Echte GitHub-OIDC-Annahme und Merge-Deploy offen.
- Kosten: [konkreter requestApproval-Antrag](staging-approval.md), Entscheidung offen. DNS-Delegation, Alarmadresse, Clerk und GitHub-Tarifentscheidung bleiben menschliche Voraussetzungen.

Lint, Typprüfung, Build, fehlende Startkonfiguration und drei Browsertests lokal bestanden. Storybook verwendet manuelle Axe-Prüfung, damit die Playwright-Abnahme nicht mit einer zweiten Analyse kollidiert. Externe Abnahmen werden nicht durch diese lokalen Tests ersetzt. Der frühere HTTP-403-Blocker beim Branch-Schutz ist inzwischen behoben; Gate 0 ist durch die oben genannten VPS-Nachweise bestanden; die AWS-Alternative bleibt unprovisioniert.

GitHub-CI auf 546dc77 bestätigt acht Code-/Containerprüfungen: Lint, Typecheck, Unit, Build, Secret-Scan, Integration, Browser und vier Runtime-Image-Builds mit sicherem Abbruch ohne Konfiguration. Der erste Terraform-Lauf deckte den fehlenden Linux-h1-Providerhash auf; beide Lockfiles wurden danach offiziell um den signaturgeprüften Linux-Hash ergänzt und Terraform-CI auf 9acc68d bestand. Ein weiterer Browserlauf zeigte die Axe-Kollision; der manuelle Storybook-Modus wurde entsprechend der aktuellen Dokumentation in initialGlobals korrigiert, die Playwright-Axe-Abnahme bleibt aktiv. Der lokale Docker-Daemon antwortete beim zusätzlichen Image-Build nicht; dieser wurde abgebrochen, die Containerabnahme stammt aus GitHub-CI. Aktuelle Prüfresultate stehen in [gemergtem PR #8](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/pull/8); Cloud-Abnahmen bleiben separat offen.

## Phase 1: P1-7

P1-1 ist inzwischen als PR #9 regulär auf main 66c6e8799e44cb733b38ab96503b760f98f0617a gemergt; neun Pflichtprüfungen und VPS-Staging-Deployment sind erfolgreich. P1-2 liegt separat als Entwurfs-PR #10 vor; alle neun Pflichtprüfungen sind bestanden. P1-7 verwendet ausschließlich die gemergte Abhängigkeit P0-4 und diesen main-Stand.

Der ausführbare Temporal-Beispiel-Worker, Retry-/Timeout-Grenzen und die echte Prozess-Neustart-Abnahme stehen im eigenen codex/p1-7-temporal-worker-Branch. [Ergebnis und Abnahme](p1-7-temporal-worker.md), [ADR 0007](adr/0007-durable-example-worker.md). Dieser Worker wird mit dem PR nicht auf dem VPS bereitgestellt; Betriebsparameter und Bereitstellung bleiben offen. P1-8 bleibt unimplementiert, der manuelle Gründerfreigabeweg gilt weiter.

## Phase 1: P1-3

P1-2 / PR #10 ist regulär gemergt auf 86f56e279ad70e4664e8e6d24738e1ed87703f91; alle neun main-Prüfungen und der VPS-Deploy sind erfolgreich ([Nachweis](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36846662323)). P1-7 / PR #11 ist nach erneuten Pflichtprüfungen regulär gemergt auf 67311b56f5231128a1d1333436f9bb81faa7f646; ebenfalls neun Prüfungen und VPS-Deploy bestanden ([Nachweis](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36847460584)). Der Worker wird dadurch noch nicht als neuer VPS-Dienst gestartet.

P1-3 ist im eigenen codex/p1-3-hono-api-Branch implementiert: Hono Zod-OpenAPI, alle Routen dokumentiert, lokales Scalar, gemeinsames Fehlerformat und atomare mandantengeschützte Idempotenz. [Ergebnis und Abnahme](p1-3-hono-api.md), [ADR 0008](adr/0008-api-contracts-idempotency.md). Neue Migration 0003; bestehende Migrationen bleiben unverändert. Schreibzugriffe im Live-Server bleiben bis P1-4 ohne Auth-Resolver gesperrt. P1-3 wird als Entwurfs-PR vorgelegt und ist vor seinem regulären Merge keine erfüllte Abhängigkeit für Folgeaufgaben. P1-8 bleibt offen; manuelle konkrete Gründerfreigabe gilt weiter.

## Phase 1: P1-4 / Auth0

P1-3 / PR #12 ist regulär gemergt auf e17976044e7aea6e503b91f130bcabef66c13081; alle neun main-Prüfungen und der vorhandene VPS-Staging-Deploy bestanden ([Nachweis](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36852140339)). P1-4 wurde im separaten Branch codex/p1-4-auth begonnen. Der Gründer hat Auth0 als Anbieter gewählt. [Ergebnis, Einrichtung und Abnahme](p1-4-auth0.md), [ADR 0009](adr/0009-auth0-identities.md).

Echte Auth0-Sandbox-Zugänge und VPS-Aktivierung stehen aus; Live-Schreibzugriffe bleiben bis dahin geschlossen. Kein neuer Dienst, keine Produktionsänderung oder AWS-Provisionierung. P1-8 und der manuelle Geldfreigabeweg bleiben unverändert.

Der Gründer hat am 1. Oktober 2026 ausdrücklich bestätigt: AWS wird nicht mehr verwendet. P1-4 entfernt den AWS-CI-Deploy, sperrt das historische CLI-Deploy-Skript und entfernt den RDS-Zertifikatsdownload. VPS ist der einzige aktive Hosting-/Deploy-Pfad. Historische Terraform-Vorlagen bleiben als Mock-validiertes Archiv erhalten; keine neue AWS-Auth0-Konfiguration.

Auth0-MCP-Onboarding für apps/app durchgeführt: Test-Anwendung und API angelegt, lokale/VPS-Test-Callbacks registriert, Zugangsdaten ausschließlich lokal Git-ignoriert gespeichert. Lokaler Start und Login-Weiterleitung mit echter Providerkonfiguration geprüft. Echter Benutzer-Login/Logout, lokale Fachfreigaben, Agenten-Abnahme und VPS-Aktivierung bleiben offen; Details in p1-4-auth0.md.
