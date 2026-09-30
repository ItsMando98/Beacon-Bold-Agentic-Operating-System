# Lokale Infrastruktur

```sh
pnpm dev:infra
pnpm dev:infra:status
pnpm test:integration
pnpm dev:infra:stop
```

Compose verwendet das eigene Projekt `beacon-bold-foundation` und bindet Ports nur an localhost. Bestehende Datenbanken auf Port 5432 bleiben unberührt. Standardports: PostgreSQL 15432, Redis 16379, Temporal 17233, Temporal UI 18233, SMTP 11025, Mailpit UI 18025. Die BEACON_*_PORT-Werte in Compose können als Umgebungsvariablen überschrieben werden; Test-URLs dann entsprechend setzen.

Start und Stopp behalten die benannten Datenvolumes. Das SQL-Bootstrap läuft nur bei einem neuen PostgreSQL-Volume. `beacon_owner` ist die lokale Migrationsrolle; `beacon_app` hat weder Superuser- noch BYPASSRLS-Rechte. Geschäftsmodelle, RLS und Mandantentests folgen erst in P1-1.

Docker-Images werden nach der ersten Abnahme mit unveränderlichen Digests festgehalten. Der Temporal-Entwicklungsserver ist ausschließlich lokal; Staging verwendet Temporal Cloud. Mailpit hält ausschließlich lokale Testnachrichten.
