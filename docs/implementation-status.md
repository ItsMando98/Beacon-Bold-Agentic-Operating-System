# Umsetzungsstatus

Stand: 1. Oktober 2026. Code, lokale Abnahme und externe Abnahme werden getrennt bewertet.

Gate 0 ist technisch bestanden. PR #8 wurde regulär auf `main` mit Revision `3ee92f9102a0c23055ffb092812ec5f4e642dbde` gemergt. Alle neun Pflichtprüfungen und der begrenzte VPS-Deploy sind erfolgreich: [Deploy-Nachweis](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36832592546). Migration, Mandantentrennung, öffentliche HTTPS-Endpunkte und Wiederherstellung des externen verschlüsselten Backups sind dokumentiert; [Backup-Nachweis](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36834193004). Branch-Schutz ist aktiv und der fehlerhafte Merge von PR #4 wurde tatsächlich verweigert.

P1-1 ist regulär als PR #9 gemergt auf main `66c6e8799e44cb733b38ab96503b760f98f0617a`. Alle neun Pflichtprüfungen und der VPS-Staging-Deploy bestanden: [Merge-Lauf](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36838893234). P1-2 wird auf eigenem Branch von diesem main umgesetzt: gemeinsame Operationsverträge, OpenAPI-/Tool-Generatoren und automatische Schemaänderungsabnahme. [Ergebnis P1-2](p1-2-schema-contracts.md), [ADR 0006](adr/0006-generated-contracts.md).

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
