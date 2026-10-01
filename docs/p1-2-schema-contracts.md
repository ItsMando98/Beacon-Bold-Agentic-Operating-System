# P1-2: Gemeinsame Verträge und Generatoren

P1-1 wurde auf Nutzeranweisung regulär als PR #9 gemergt: main `66c6e8799e44cb733b38ab96503b760f98f0617a`. Alle neun main-Prüfungen und der begrenzte VPS-Staging-Deploy bestanden: [Merge-CI und Deploy](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36838893234). P1-2 beginnt von diesem Stand auf `codex/p1-2-schema-contracts`; seine verbindliche Abhängigkeit P0-1 ist gemergt.

Die gemeinsame Operationsliste erzeugt OpenAPI 3.1.1, MCP-kompatible Tool-Definitionen und Zod-abgeleitete Eingabe-/Ausgabetypen. Alle 13 P1-1-Entitäten werden als JSON-fähige Komponenten dargestellt. Die vorhandene API bleibt unverändert; Kundenanlage und Tool-Ausführung sind Vertragsdefinitionen für P1-3 bis P1-5. Datenbankmodelle und angewandte Migrationen werden nicht geändert.

Artefakte aktualisieren: `pnpm --filter @beacon/schemas generate`. Synchronität prüfen: `pnpm --filter @beacon/schemas check:generated`; dieser Vergleich gehört auch zum Schema-Build.

Automatische Abnahme: `tests/unit/schema-contracts.test.ts` beweist, dass eine einzelne Schemaerweiterung Typen, OpenAPI und Tool-Definitionen verändert. Zusätzlich werden OpenAPI-Referenzen, sämtliche Entitäts-/Tool-Schemas, serververwaltete IDs, ISO-Zeitstempel, nullable/optional und Containergrenzen, doppelte Registrierungen sowie nicht darstellbare Typen geprüft. Die neuen Typabnahmen sind Teil von `pnpm typecheck`.

Lokale Abnahme mit Node 22.21.1 und pnpm 10.29.1 bestanden: Lint (104 Dateien), Typprüfung einschließlich der neuen Typabnahmen, Build, 37 Unit-Tests, sieben echte Integrationstests, vier Startprüfungen, Storybook-Build, drei Browsertests und gebündeltes Migrations-/VPS-Abnahmepaket. Die neun GitHub-Pflichtprüfungen bleiben Merge-Gate. Keine neuen Anbieteraufrufe, Geldwirkungen, AWS-Provisionierung oder Produktionsänderung. Die lokalen P0-7-Änderungen bleiben im ursprünglichen Checkout erhalten. Entscheidungen und offene Folgefragen: [ADR 0006](adr/0006-generated-contracts.md).
