# P1-7: Temporal-Worker und Beispiel-Workflow

P1-7 implementiert einen ausführbaren Worker mit zwei schema-abgeleiteten, nebenwirkungsfreien Activities und einem persistenten Timer. Die Abhängigkeit P0-4 / PR #5 und Gate 0 sind erfüllt. Eigener Branch: `codex/p1-7-temporal-worker`, Ausgangsrevision main `66c6e8799e44cb733b38ab96503b760f98f0617a`. P1-2 wird separat in PR #10 bearbeitet.

Verträge: `packages/schemas/src/workflow.ts`. Temporal- und Beispieladapter: `packages/integrations/src/temporal.ts` und `example.ts`. Worker und Workflow: `apps/worker/src`. Workflow-Zustand wird mit `exampleState` abgefragt. Activities verwenden maximal drei Versuche, zwei Sekunden je Versuch und zehn Sekunden insgesamt. Ungültige Eingaben und nicht passende Adapterergebnisse werden nicht wiederholt.

Lokal: `pnpm install --frozen-lockfile`, `pnpm dev:infra`, dann `pnpm dev` mit der bestehenden Entwicklungs-/Mock-Konfiguration. Die Worker-Queue ist standardmäßig beacon-example; `TEMPORAL_TASK_QUEUE` überschreibt sie. Der Build erzeugt `apps/worker/dist/index.js` und `workflows.js` samt gemeinsamem Schema-Bundle. `pnpm --filter @beacon/worker start` startet den gebauten Worker mit Laufzeit-Konfiguration. Es gibt noch keinen öffentlichen API- oder MCP-Starter.

Automatische Abnahme: `pnpm test:integration` baut zuerst den Worker und führt drei neue Tests gegen den echten lokalen Temporal-Server aus. Die Testprozesse laden den gebauten Worker und dessen gebauten Workflow. Sie erhalten feste lokale Verbindungswerte und zufällige Test-Queues. Ein harter Prozessabbruch und Neustart beweist die Fortsetzung desselben Laufs, ohne einen abgeschlossenen Schritt erneut auszuführen. Weitere Tests prüfen vorübergehende Fehler mit genau drei Versuchen und einen blockierten Schritt, der nach dem Zeitlimit endgültig scheitert. Bereinigung beendet ausschließlich eigene Testprozesse und eigene noch laufende Test-Workflows; vorhandene Dienste und Volumes bleiben erhalten.

Lokale Pflichtprüfung mit Node 22.21.1 und pnpm 10.29.1: Lint, Typecheck, Build, 35 Unit-Tests, zehn Integrationstests, vier Startprüfungen, Storybook-Build und drei Browserprüfungen. GitHub-CI ist das zusätzliche Merge-Gate; die Aufgabe wird als Entwurfs-PR vorgelegt.

Entscheidungen und Betriebsgrenzen: [ADR 0007](adr/0007-durable-example-worker.md). Staging-Bereitstellung des Workers ist offen. Die bestehenden VPS-Dienste laufen weiter. Keine Produktion, AWS-Provisionierung, Anbieter-Kundenkonten oder Geldwirkung. P1-8 ist offen; neue Ausgaben benötigen weiterhin konkrete manuelle Gründerfreigabe.
