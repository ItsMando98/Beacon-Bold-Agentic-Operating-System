# ADR 0001 — Phase-0-Grundlage

Status: beschlossen durch den freigegebenen Umsetzungsplan.

Wir verwenden pnpm/Turborepo mit vier Apps und sechs Paketen. Next.js App Router für Web und Betriebsoberfläche, Hono für die API, Zod als Vertragsquelle. Die Paket- und App-Trennung ist von next-forge abgeleitet; wir übernehmen nicht dessen komplette Anbieterintegration, Bun-Konfiguration oder ORM. Unbenötigte Apps und Dienste entfallen. Für Next.js, React und Werkzeuge werden exakte Versionen im Lockfile festgehalten.

Die leeren Fachpakete sind bewusst leer. Temporal-Workflows, Drizzle-Modelle, MCP, Clerk und Modellaufrufe beginnen erst nach Gate 0. Externe Abnahmen dürfen nicht durch Mock-Ergebnisse ersetzt werden.

Staging: AWS eu-central-1, ECS Fargate, RDS PostgreSQL mit pgvector, ElastiCache Redis, ECR, Secrets Manager, Terraform; Temporal Cloud aws-eu-central-1. Domain: staging.beaconandbold.com. GitHub: ItsMando98/Beacon-Bold-Agentic-Operating-System. Das AWS-Konto ist beim Start noch nicht vorhanden.

Schema-Paket kommt in Phase 1 vor Datenmodell. Kostenerfassung folgt persistierten Agentenläufen. Schreibende MCP-Tools folgen Berechtigungen, Audit und Notbremse.

Geldwirkungen brauchen immer Gründerfreigabe, zusätzlich zu Tages-/Monatslimits. Live-Modelltests brauchen vorher genehmigte Budgets. Anbieter- und Datenschutzabnahme bleiben vor echten Kundendaten erforderlich.
