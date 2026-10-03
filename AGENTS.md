# ROASWELL — Regeln für Coding Agents

## Arbeitsregeln
1. Eine Aufgabe, ein Branch, ein Pull Request. Nur Dateien ändern, die die Aufgabe braucht.
2. Schema zuerst: Zod in `packages/schemas`; daraus API-, MCP-Verträge und Typen ableiten. Keine doppelte Pflege.
3. Abnahme als automatischer Test, bevor eine Aufgabe als fertig gilt.
4. Definition of Done: Lint, Typecheck, Tests, Build und Abnahme grün; kurz dokumentiert; keine Secrets.
5. Kleine Schritte: Größere Aufgaben aufteilen und als separate Aufgaben eintragen.
6. Geldwirkungen benötigen einen durch `requestApproval` genehmigten Budgetrahmen (ADR 0011). Innerhalb von Zweck, Anbieter, Zeitraum und Limits dürfen berechtigte Agenten selbstständig handeln. Bis zur technischen Budgetabnahme bleibt jede reale Geldwirkung einzeln freigabepflichtig.
7. Externe Dienste ausschließlich hinter Adaptern in `packages/integrations`. Tests verwenden Mock oder Sandbox, keine echten Kundenkonten.
8. Keine Secrets oder echten Kundendaten. Konfiguration über validierte Umgebungsvariablen, ausschließlich erfundene Testdaten.
9. Migrationen nur vorwärts und mit automatischem Test für Mandantentrennung.
10. Prompts, Regeln und Modellwahl in `packages/agents` versionieren und evaluieren.
11. Fehlende Entscheidungen nicht erraten. In der PR-Beschreibung benennen; Entscheidungen in `docs/adr` dokumentieren.
12. Keine Produktion ändern. Produktionsdeployments, Zahlungen und Rechtstexte bleiben bei Menschen.

## Aktuelle Produktgrundlage
[ROASWELL-Umsetzungsplan](docs/roaswell-umsetzungsplan.md) und [Einzelaufgaben](docs/roaswell-aufgaben.md) ersetzen die ursprünglichen Produktkonzepte für neue Aufgaben. Historische Abnahmen bleiben erhalten. Auth0 bleibt der bestätigte Anbieter; VPS ist der einzige aktive Deployment-Pfad.

## Ordnerkarte
- `apps/web`: Marketing-Website; `apps/app`: Betriebsoberfläche.
- `apps/api`: Hono REST und später MCP; `apps/worker`: später Temporal-Workflows.
- `packages/schemas`: gemeinsame Zod-Verträge; `packages/db`: Datenmodelle und Migrationen.
- `packages/agents`: Agenten und Evaluationen; `packages/integrations`: externe Adapter.
- `packages/ui`: Tokens und Komponenten; `packages/config`: TypeScript und Umgebungsvalidierung.
- `infra/local`: Docker Compose; `infra/staging`: Terraform; `docs/adr`: Entscheidungen.

## Befehle (Node 22.21+, pnpm 10.29.1)
- `pnpm install --frozen-lockfile`: Abhängigkeiten installieren.
- `pnpm dev`: lokale Apps mit `.env` starten; dev/mock ohne externe Schlüssel.
- `pnpm dev:infra`: lokale Dienste inklusive Health-Checks starten.
- `pnpm dev:infra:stop`: Dienste stoppen, Datenvolumes behalten.
- `pnpm dev:infra:status`: Zustand anzeigen.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`: lokale Pflichtprüfungen.
- `pnpm test:integration`: laufende Docker-Dienste erforderlich.
- `pnpm browser:install`, `pnpm test:e2e`: Browser-Abnahme nach Build.
- `pnpm storybook`, `pnpm build:storybook`: Komponenten lokal / statisch.
- `node scripts/agency-preview.mjs`: Loopback-Vorschau der Agentur-Hülle, sobald `apps/agency` existiert. Kein Apex-Deploy, kein DNS, keine Produktion.

## Reihenfolge und Gates
Eine Aufgabe startet erst nach Merge ihrer Abhängigkeiten. Phase 1 beginnt erst nach nachgewiesenem Gate 0. Fehlende Zugänge werden als offene Abnahme dokumentiert, nicht durch einen Mock als bestanden markiert.
Schemas und Datenmodell haben jeweils nur einen Bearbeiter; Änderungen folgen der Abhängigkeitsreihenfolge. Kein automatischer Produktionsdeploy.

<!-- BEGIN AWS Agent Toolkit rules -->
# AWS Guidance

- Where these AWS rules conflict with the project's own instructions, the
  project's instructions take precedence.
- Prefer the AWS MCP Server for AWS interactions — it provides sandboxed
  execution, observability, and audit logging. If unavailable, use the
  AWS CLI directly.
- Before starting a task, check whether a relevant AWS skill is available.
  Load the skill with `retrieve_skill` and prefer its guidance over
  general knowledge.
- When uncertain about specific AWS details (API parameters, permissions,
  limits, error codes), verify against documentation rather than guessing.
  State uncertainty explicitly if you cannot confirm.
- When creating infrastructure, prefer infrastructure-as-code (AWS CDK or
  CloudFormation) over direct CLI commands.
- When working with infrastructure, follow AWS Well-Architected Framework
  principles.
- Do not use em dashes in AWS resource names or descriptions. Use
  hyphens instead.

## Secret Safety

- MUST load the `aws-secrets-manager` skill first for any secret,
  credential, API key, token, or password task. MUST NOT call
  `secretsmanager get-secret-value` or `batch-get-secret-value`, and MUST
  NOT hit the Secrets Manager Agent daemon directly. MUST use
  `{{resolve:secretsmanager:secret-id:SecretString:json-key}}` with
  `asm-exec` so the secret resolves at runtime without entering context.
<!-- END AWS Agent Toolkit rules -->

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
