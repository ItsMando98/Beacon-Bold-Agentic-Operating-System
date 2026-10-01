# P1-1: Datenmodell

Umfang: Mandanten, Nutzer, Agenten, Agentenläufe, Audit-Log, Freigaben, Kunden, Kontakte, Deals, Projekte, Aufgaben, Assets und Rechnungsentwürfe. Das Modell ist unabhängig von API-, MCP-, Auth-, Worker- und Zahlungsfunktionen der Folgeaufgaben.

Schemaquelle: `packages/schemas/src/domain.ts`. Drizzle-Tabellen und mandantengebundene Beziehungen: `packages/db/src/models.ts`. Transaktionskontext: `packages/db/src/tenant.ts`. Vorwärtsmigration: `packages/db/migrations/0002_data_model.sql`. P1-1 wurde anschließend auf Nutzeranweisung regulär als PR #9 gemergt. Der [main-Lauf mit neun Pflichtprüfungen und VPS-Staging-Deploy](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36838893234) auf 66c6e87 bestand; bestehende VPS-Dienste bleiben erhalten.

Für spätere Modelländerungen wird eine neue Vorwärtsmigration ergänzt und die Snapshot-Abnahme entsprechend versioniert. Die bereits angewandte `0002_data_model.sql` darf dabei nicht neu erzeugt oder verändert werden.

Die automatische Abnahme `tests/integration/data-model.test.ts` erzeugt ausschließlich eine neue lokale Testdatenbank mit erfundenen Datensätzen. Sie migriert zweimal und prüft alle 13 echten Tabellen auf ENABLE/FORCE RLS, leeren Zugriff ohne Kontext, fremde Lese-/Schreib-/Änderungs-/Löschversuche, sämtliche fachlichen Fremdschlüssel, Audit-Unveränderlichkeit, SQL-Geld-/Währungs-/Rechnungsstatusprüfungen, fehlende DDL-/TRUNCATE-Rechte und Kontexttrennung auf derselben Pool-Verbindung nach Commit und Rollback. Danach wird nur diese erzeugte Datenbank gelöscht. Kein Umgebungswert kann diesen Test auf Staging oder Kundendaten umleiten.

`tests/unit/data-model.test.ts` prüft Vertrags-/Spaltenparität, abgeleitete Typen, Nullbarkeit, Tenant-Fremdschlüssel und den deterministischen SQL-Snapshot. Bestehende Historienabnahme und VPS-Migrationsledger werden um die zusätzliche Migration erweitert; keine Anzahl wird weiter auf eine einzige Migration festgeschrieben.

Lokale Abnahme mit Node 22.21.1 und pnpm 10.29.1 bestanden: Lint (95 Dateien), Typprüfung einschließlich neuer Abnahmetests und Typgleichheitsprüfungen, Build (zehn Pakete), 32 Unit-Tests, sieben echte Integrationstests, vier Startprüfungen, Storybook-Build, drei Playwright-Browsertests sowie das gebündelte Migrations-/VPS-Abnahmepaket. Die neun GitHub-Pflichtprüfungen bleiben das Merge-Gate. P1-1 ist damit eine gemergte Abhängigkeit für P1-3; zusätzlich muss P1-2 gemergt sein.

Entscheidungen und offene Fachfragen: [ADR 0005](adr/0005-tenant-data-model.md). Keine externen Anbieteraufrufe, keine AWS-Provisionierung, keine Produktionsänderung und keine neue Geldwirkung. Für spätere externe Anbindungen gilt `packages/integrations`.
