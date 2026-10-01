# ADR 0007: Persistenter Temporal-Beispiel-Workflow

Status: umgesetzt für P1-7; Betriebsbereitstellung und produktive Workflows sind Folgeentscheidungen.

P0-4 ist als PR #5 gemergt. Gate 0 ist durch PR #8, neun Pflichtprüfungen, VPS-Deployment und Backup-/Restore-Abnahme nachgewiesen. P1-7 darf gemäß Aufgabenplanung unabhängig von P1-2 beginnen. Der Aufgaben-Branch basiert auf main `66c6e8799e44cb733b38ab96503b760f98f0617a` nach dem regulären Merge von P1-1 / PR #9.

Zod in `packages/schemas/src/workflow.ts` definiert Eingabe, Activity-Eingabe, Ergebnisse, abfragbaren Zustand und Verbindungsparameter. Typen werden daraus abgeleitet. Der Workflow führt zwei lokale, nebenwirkungsfreie Activities mit einem persistenten Timer dazwischen aus. Das Beispiel übernimmt den Mandantenkontext, authentifiziert ihn aber noch nicht. P1-4 muss für künftige öffentliche Starter den Mandanten aus der Identität ableiten. Dieser PR stellt keinen öffentlichen Starter und keine API bereit.

Die externe Temporal-Verbindung liegt ausschließlich im Infrastrukturadapter `packages/integrations/src/temporal.ts`; der Beispieladapter liegt daneben. Workflow-Code hat keinen Netzwerk-, Datenbank- oder Umgebungszugriff. Der Worker validiert Activity-Eingaben und Ergebnisse einschließlich unverändertem Mandanten, Namen und Schritt. Ungültige Daten enden als nicht wiederholbare ApplicationFailure. Keine Kundenkonten, Modellaufrufe oder Geldwirkungen.

Temporal SDK 1.24.0 entspricht dem bereits gepinnten Client. Activities haben zwei Sekunden Start-to-Close, zehn Sekunden Schedule-to-Close und maximal drei Versuche mit exponentiellem Abstand (250 ms, maximal eine Sekunde). Diese kurzen Grenzen gelten nur für das Beispiel; fachliche Schritte brauchen eigene Grenzen und Idempotenz. Temporal kann eine Activity nach einem Absturz erneut ausführen. Eine spätere externe Geldwirkung braucht daher zusätzlich P1-8 und einen idempotenten Anbieteradapter.

`@swc/core` wird innerhalb des vom SDK erlaubten Versionsbereichs auf 1.15.3 gepinnt. Der automatische Resolver wählte zuvor 1.16.13; dessen native Cache-Materialisierung schlug auf diesem Windows-Arbeitsplatz an den geerbten Cache-Zugriffsrechten fehl. 1.15.3 lädt die reguläre native Plattformbibliothek und besteht die reale Abnahme. Nur der erforderliche Compiler-Build ist in pnpm erlaubt. Keine globalen ACLs oder Sicherheitsprüfungen werden geändert.

Entwicklung verwendet den vorhandenen lokalen Server auf 127.0.0.1:17233, Namespace default und Queue beacon-example. Außerhalb der Entwicklung sind explizite Adresse, Namespace und Laufzeit-Authentifizierung erforderlich; TLS wird eingeschaltet. Der Worker übernimmt die bestehenden Konfigurationsregeln aus P0-6. Verbindungswerte und Zugangsdaten werden nicht ausgegeben.

Der Worker-Prozess unterstützt die SDK-Signalbehandlung und schließt seine Verbindung nach dem Stoppen. Die automatische Abnahme beendet einen separaten Node-Prozess hart und startet einen neuen Prozess auf derselben isolierten Test-Queue. Sie prüft dieselbe runId, das abgeschlossene Vorbereitungsergebnis, genau zwei Activity-Abschlüsse in der Serverhistorie und nur den noch ausstehenden Schritt im neuen Prozess. Weitere echte Tests prüfen Retry-Anzahl und endgültigen Activity-Timeout.

Offen: Betreiberwahl für Staging-Namespace, TLS/Authentifizierung, Worker-Betrieb und Überwachung. Es wird kein weiterer Dienst auf dem VPS gestartet, kein Temporal-Cloud-Konto eingerichtet und keine AWS-Ressource provisioniert. Workflow-Versionierung, öffentliche Starter, Audit-Einträge, Freigaben und fachliche Adapter bleiben ihren geplanten Aufgaben vorbehalten. Bis P1-8 gilt der dokumentierte manuelle Gründerfreigabeweg.

Referenzen: [Worker-Lifecycle](https://typescript.temporal.io/api/classes/worker.Worker), [Activity-Zeitlimits](https://typescript.temporal.io/api/interfaces/common.ActivityOptions), [Worker-Optionen](https://typescript.temporal.io/api/interfaces/worker.WorkerOptions).

