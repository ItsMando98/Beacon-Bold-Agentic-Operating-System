# Beacon & Bold

TypeScript-Monorepo für das Agentic Operating System. Die beiden ursprünglichen Konzeptdokumente bleiben die fachliche Grundlage.

## Lokal starten
Node 22.21+ (22.x), pnpm 10.29.1 und Docker mit Compose benötigen.

```sh
pnpm install --frozen-lockfile
pnpm dev:infra
pnpm dev
```

`pnpm dev` lädt optional `.env` und nutzt lokal `APP_ENV=development`, `SERVICE_MODE=mock`. Die Startseiten und der Health-Endpunkt benötigen keine externen Schlüssel. Bei direktem App-Start müssen diese beiden Werte gesetzt sein. `.env.example` enthält ausschließlich lokale Beispieldaten.

- Betriebsoberfläche: http://localhost:3000
- Website: http://localhost:3001
- API: http://localhost:3002/health
- Storybook: `pnpm storybook`, http://localhost:6006
- Temporal UI: http://localhost:8233
- Mailpit: http://localhost:8025

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:integration
pnpm exec playwright install chromium
pnpm test:e2e
pnpm build:storybook
```

Tests verwenden synthetische Daten. `pnpm dev:infra:stop` stoppt Dienste ohne Datenlöschung. Die lokale Datenbank hat getrennte Owner- und Laufzeitrollen. Das ist Vorbereitung; Geschäftsmodelle und RLS-Policies folgen in P1-1.

## Umsetzung und externe Abnahme
Siehe [Status](docs/implementation-status.md), [Staging](infra/staging/README.md) und [Arbeitsregeln](AGENTS.md). Gate 0 erfordert ein tatsächlich erfolgreiches Staging-Deployment und erzwungene GitHub-Pflichtprüfungen. Solange das AWS-Konto fehlt, ist dieses Gate offen und Phase 1 beginnt nicht.

Die Oberfläche ist eine Phase-0-Startseite. Es werden keine verfügbaren Agenten, Freigaben oder angebundenen Cloud-Dienste vorgetäuscht.
