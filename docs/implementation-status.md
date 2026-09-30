# Umsetzungsstatus

Stand: 30. September 2026. Code, lokale Abnahme und externe Abnahme werden getrennt bewertet.

| Aufgabe | Nachweis / offene Punkte |
|---|---|
| P0-1 | Vier Apps und sechs Pakete, eingefrorene Abhängigkeiten. PR #1 gemergt. |
| P0-2 | Zwölf Arbeitsregeln, Ordnerkarte und Befehle. PR #2 gemergt. |
| P0-3 | Sieben echte GitHub-Prüfungen erfolgreich. PR #3 gemergt. Absichtlich fehlschlagender PR #4 geschlossen, nicht gemergt. Erzwungener Branch-Schutz bleibt offen: GitHub antwortet für das private Repository im aktuellen Tarif mit 403 und verlangt Pro oder öffentliche Sichtbarkeit. |
| P0-4 | PostgreSQL/pgvector, eingeschränkte Datenbankrolle, Redis, persistenter Temporal-Entwicklungsserver und Mailpit. Vier echte Diensttests lokal und in CI bestanden. PR #5 gemergt. |
| P0-5 | Vorläufige Tokens, lokale Schriften, shadcn-Komponenten und Storybook. Drei Browsertests einschließlich Tastatur, Axe und Mobilansicht bestanden. PR #7 gemergt; alle sieben GitHub-Prüfungen erfolgreich. |
| P0-6 | Getrennte App-Konfigurationen, Mock nur lokal, Pflichtwerte für Live-Betrieb. 23 Unit-Tests und vier Startprüfungen erfolgreich. PR #6 gemergt. |
| P0-7 | In Arbeit auf eigenem Branch. AWS-Konto laut Gründer erstellt; CLI installiert, Browser-Anmeldung, Zugriff und Agent-Toolkit-Katalog erfolgreich geprüft. Drei Containerimages lokal gebaut und auf erfolgreichen Start sowie Abbruch bei fehlenden Pflichtwerten geprüft. Terraform und Cloud-Deployment noch offen. |
| Phase 1 | Noch nicht begonnen; Gate 0 ist Voraussetzung. Keine Kunden-, MCP-, Freigabe- oder Modellfunktionen implementiert. |

Gate 0 bleibt offen bis ein echter Merge nach Staging deployt und GitHub fehlerhafte Änderungen verbindlich blockiert. Ziel ist staging.beaconandbold.com in Frankfurt. Temporal Cloud, Clerk und Anbieterzugänge sowie freigegebene Betriebsbudgets sind noch bereitzustellen. Die vorhandene Komponenten-Vorschau ist eine lokale UI-Abnahme.

## AWS-Einrichtung

AWS CLI 2.37.6 wurde mit gültiger Amazon-Signatur benutzerspezifisch installiert. Gewähltes Profil: beacon-bold. Standardregion: eu-central-1. Klassisches AWS-Konto. Anmeldedaten liegen ausschließlich in der AWS-eigenen Benutzerkonfiguration, nicht im Repository. STS bestätigt die erfolgreiche Anmeldung. 24 AWS-Skills wurden installiert; der entfernte Katalog wurde erfolgreich abgefragt. AWS-MCP wurde für Codex, Claude Code, Cursor und Gemini eingerichtet und explizit auf beacon-bold eingestellt. Die Projektregeln wurden ergänzt und erhalten. Ein neuer Codex-Chat ist erforderlich, um die neue MCP-Verbindung und Skills zu laden. Infrastruktur wurde noch nicht provisioniert.
