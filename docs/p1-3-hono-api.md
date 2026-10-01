# P1-3: Hono-API, Fehlerformat und Idempotenz

P1-3 folgt den gemergten Abhängigkeiten P1-1 / PR #9 und P1-2 / PR #10. Eigener Branch `codex/p1-3-hono-api` von main `67311b56f5231128a1d1333436f9bb81faa7f646` nach dem Merge von P1-7 / PR #11. Die ursprünglichen lokalen P0-7-Änderungen bleiben im anderen Checkout erhalten.

GET /health und POST /customers verwenden die gemeinsamen Operationsverträge und Hono Zod-OpenAPI. GET /openapi.json liefert den bestehenden schema-abgeleiteten Generator samt HTTP-Header- und Dokumentationsrouten. GET /docs zeigt Scalar mit lokal gebündeltem GET /docs/scalar.js. Es werden keine Drittanbieter-Schriften oder Telemetrie geladen.

Alle Fehler folgen ApiError mit X-Request-Id. Kundenanlage erfordert Idempotency-Key; dieselbe validierte Eingabe erhält dieselbe gespeicherte Antwort, ein anderer Inhalt erhält 409. Mandant und Identität stammen ausschließlich aus dem internen Resolver. Der Live-Server bleibt bis zur Auth-Integration aus P1-4 für Schreibzugriffe bei 401. Entwicklung/mock nutzt einen festen erfundenen Mandanten und den flüchtigen Adapter; dieser wird nicht als persistente Abnahme ausgegeben.

PostgreSQL-Verbindungen liegen in `packages/integrations/src/api.ts`. Die Datenlogik in `packages/db/src/idempotency.ts` verwendet die eingeschränkte Rolle, RLS und eine gemeinsame Transaktion für Kundenanlage und Antwort. Migration `0003_idempotency.sql` ist ein neuer Vorwärtssnapshot aus dem Zod-abgeleiteten Tabellenmodell. Keine vorhandene Migration wird verändert.

Abnahme:
- Contract-Test validiert /openapi.json, sämtliche registrierten Routen und Antworten, Pflichtheader, ungültiges JSON, unbekannte Felder, Fehlerformat, maskierte Fehler und gesperrte öffentliche Schreibzugriffe.
- Eine separat erzeugte lokale PostgreSQL-Testdatenbank migriert zweimal. Acht parallele HTTP-Anfragen erzeugen genau einen Kunden. Ein neuer Store liefert dieselbe gespeicherte Antwort; ein Konflikt wird abgewiesen, derselbe Schlüssel in einem anderen Mandanten bleibt getrennt.
- Echte RLS-Prüfungen decken fehlenden Kontext, fremde Schreibversuche und fehlende DELETE-Rechte ab. Ein gezielter Triggerfehler beweist den atomaren Rollback von Kunde und Antwort; ein anschließender Retry gelingt.
- Playwright prüft die gebaute API und sichtbare Scalar-Dokumentation unter Blockierung aller Drittanbieterabrufe. Vier Startprüfungen verwenden die tatsächlichen gebauten Anwendungen.

Lokal bestanden mit Node 22.21.1 / pnpm 10.29.1: eingefrorene Installation, Lint, Typecheck inklusive neuer Abnahmetests, Build, 45 Unit-Tests, elf echte Integrationstests, vier Startprüfungen, Storybook-Build und vier Browsertests. GitHub-CI bleibt das zusätzliche Merge-Gate.

Entscheidungen und offene Punkte: [ADR 0008](adr/0008-api-contracts-idempotency.md). Keine externen Kundenkonten, Ausgaben, Produktionsänderungen, AWS-Provisionierung oder zusätzliche VPS-Dienste. P1-4 und P1-6 sind Folgeaufgaben; P1-8 ist offen und der manuelle Freigabeweg gilt weiter.
