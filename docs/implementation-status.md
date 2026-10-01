# Umsetzungsstatus

Stand: 30. September 2026. Code, lokale Abnahme und externe Abnahme werden getrennt bewertet.

Aktuelle P0-7-Steuerung (1. Oktober 2026): Der Gründer möchte den vorhandenen VPS für zusätzliches Staging nutzen; bestehende Dienste müssen erhalten bleiben. Passwort-Anmeldung wurde abgewiesen, die Anmeldung als `root` mit dem nachträglich bereitgestellten Ed25519-Schlüssel ist bestätigt. Die lesende Prüfung zeigt acht CPU-Kerne, rund 16 GB RAM, 41 laufende Container und belegte Web-Ports 80/443. Es wurden keine Serveränderungen durchgeführt. Lokale VPS-Schlüsselordner sind aus Git und Docker-Builds ausgeschlossen. [VPS-Vorbereitung und offene Abnahmen](vps-staging.md) dokumentieren den Wechsel; die unten aufgeführten AWS-Nachweise bleiben Nachweise der vorbereiteten Alternative, nicht des VPS. Die tatsächliche VPS-Konfiguration und das Deployment sind noch offen. Keine AWS-Provisionierung und keine neue Serverbestellung.

Die vertiefte VPS-Eignungsprüfung bestätigt ausreichende aktuelle Kapazität für kleines synthetisches Staging: 7,53 GiB verfügbarer RAM, niedrige CPU-Last, keine aktuelle Memory-Pressure und keine OOM-Ereignisse in den letzten 24 Stunden. Coolify/Traefik mit Docker-Provider und Cloudflare-HTTPS ist vorhanden; neue Staging-Routen können darauf aufbauen. Alle drei Staging-DNS-Namen lösen noch nicht auf; lokale Clerk-Werte fehlen. VPS-Compose, Ressourcenlimits, Datenbank-Transport, begrenzter CI-Deploy und Backups bleiben umzusetzen. Kein Deploy, Neustart oder Eingriff in bestehende Dienste durchgeführt; Gate 0 bleibt offen.

| Aufgabe | Nachweis / offene Punkte |
|---|---|
| P0-1 | Vier Apps und sechs Pakete, eingefrorene Abhängigkeiten. PR #1 gemergt. |
| P0-2 | Zwölf Arbeitsregeln, Ordnerkarte und Befehle. PR #2 gemergt. |
| P0-3 | Sieben echte GitHub-Prüfungen erfolgreich. PR #3 gemergt. Absichtlich fehlschlagender PR #4 geschlossen, nicht gemergt. Erzwungener Branch-Schutz bleibt offen: GitHub antwortet für das private Repository im aktuellen Tarif mit 403 und verlangt Pro oder öffentliche Sichtbarkeit. |
| P0-4 | PostgreSQL/pgvector, eingeschränkte Datenbankrolle, Redis, persistenter Temporal-Entwicklungsserver und Mailpit. Vier echte Diensttests lokal und in CI bestanden. PR #5 gemergt. |
| P0-5 | Vorläufige Tokens, lokale Schriften, shadcn-Komponenten und Storybook. Drei Browsertests einschließlich Tastatur, Axe und Mobilansicht bestanden. PR #7 gemergt; alle sieben GitHub-Prüfungen erfolgreich. |
| P0-6 | Getrennte App-Konfigurationen, Mock nur lokal, Pflichtwerte für Live-Betrieb. 23 Unit-Tests und vier Startprüfungen erfolgreich. PR #6 gemergt. |
| P0-7 | Entwurfs-PR #8 auf feat/p0-7-staging fortgeführt. AWS-MCP-Proxy 1.7.0 mit beacon-bold einschließlich echtem STS-Aufruf bestätigt. Terraform für Bootstrap und Frankfurt-Staging validiert; zwei simulierte Sicherheitstests grün. Begrenzte OIDC-Rolle verwendet tatsächliche unveränderliche Repository-IDs und nur main. Vorwärtsmigration mit Checksummen/Sperre, echte lokale Historien- und RLS-Abnahme; insgesamt sechs Integrationstests und 27 Unit-Tests grün. Deployment-Pipeline vorbereitet, noch nicht aktiviert. Kostenantrag: 118,94 USD Monatsplanung, 150 USD beantragt. Gründerfreigabe, DNS, Clerk, Cloud-Provisionierung und echter Merge-Deploy bleiben offen. |
| Phase 1 | Noch nicht begonnen; Gate 0 ist Voraussetzung. Keine Kunden-, MCP-, Freigabe- oder Modellfunktionen implementiert. |

Gate 0 bleibt offen bis ein echter Merge nach Staging deployt und GitHub fehlerhafte Änderungen verbindlich blockiert. Ziel ist staging.beaconandbold.com in Frankfurt. Temporal Cloud, Clerk und Anbieterzugänge sowie freigegebene Betriebsbudgets sind noch bereitzustellen. Die vorhandene Komponenten-Vorschau ist eine lokale UI-Abnahme.

## AWS-Einrichtung

AWS CLI 2.37.6 wurde mit gültiger Amazon-Signatur benutzerspezifisch installiert. Profil beacon-bold, Standardregion eu-central-1. STS bestätigt Konto 212626318809 mit Root-Anmeldung. Zugangswerte liegen ausschließlich in AWS-eigener Benutzerkonfiguration. AWS-MCP ist in diesem Chat nicht als direkt aufrufbares Werkzeug geladen; der vorhandene konfigurierte Proxy wurde deshalb über das MCP-Protokoll gestartet. Initialisierung, Werkzeugliste und entfernter aws___run_script/STS GetCallerIdentity waren erfolgreich. Infrastruktur und OIDC-Rolle sind als Terraform vorbereitet, aber noch nicht provisioniert.

## P0-7 Teilabnahmen

- Bootstrap: S3-State, KMS, OIDC, leere Secret-Hülle, delegierte Staging-Zone als Code; Validierung und simulierte Abnahme bestanden, Apply offen.
- Frankfurt-Staging: VPC, private RDS/Redis, ECR, ECS, ALB/ACM/DNS, Budgetalarme als Code; Validierung und simulierte Abnahme bestanden. DNS-Schreibzugriff wird auf die delegierte Staging-Zone geprüft.
- Migrationen: Foundation ohne Phase-1-Fachmodell; reale lokale Vorwärts-/Checksummen- und Mandantentrennungstests bestanden. Cloud-Abnahme offen.
- CI/Deployment: Migration vor Dienststart, Commit-Images per Digest, ECS-/HTTPS-Abnahme und Wiederherstellung vorheriger Revisionen; vier simulierte Deployment-Fehler-/Erfolgstests bestanden. Echte GitHub-OIDC-Annahme und Merge-Deploy offen.
- Kosten: [konkreter requestApproval-Antrag](staging-approval.md), Entscheidung offen. DNS-Delegation, Alarmadresse, Clerk und GitHub-Tarifentscheidung bleiben menschliche Voraussetzungen.

Lint, Typprüfung, Build, fehlende Startkonfiguration und drei Browsertests lokal bestanden. Storybook verwendet manuelle Axe-Prüfung, damit die Playwright-Abnahme nicht mit einer zweiten Analyse kollidiert. Externe Abnahmen werden nicht durch diese lokalen Tests ersetzt. Branch-Schutz erneut mit HTTP 403 geprüft; Phase 1 bleibt geschlossen.

GitHub-CI auf 546dc77 bestätigt acht Code-/Containerprüfungen: Lint, Typecheck, Unit, Build, Secret-Scan, Integration, Browser und vier Runtime-Image-Builds mit sicherem Abbruch ohne Konfiguration. Der erste Terraform-Lauf deckte den fehlenden Linux-h1-Providerhash auf; beide Lockfiles wurden danach offiziell um den signaturgeprüften Linux-Hash ergänzt und Terraform-CI auf 9acc68d bestand. Ein weiterer Browserlauf zeigte die Axe-Kollision; der manuelle Storybook-Modus wurde entsprechend der aktuellen Dokumentation in initialGlobals korrigiert, die Playwright-Axe-Abnahme bleibt aktiv. Der lokale Docker-Daemon antwortete beim zusätzlichen Image-Build nicht; dieser wurde abgebrochen, die Containerabnahme stammt aus GitHub-CI. Aktuelle Prüfresultate stehen in [Entwurfs-PR #8](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/pull/8); Cloud-Abnahmen bleiben separat offen.
