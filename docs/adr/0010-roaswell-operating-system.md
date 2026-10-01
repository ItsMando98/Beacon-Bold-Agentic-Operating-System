# ADR 0010: ROASWELL als Agenturbetriebssystem

Status: Produktarchitektur durch den Gründer am 1. Oktober 2026 freigegeben; Umsetzung in abhängigen Einzelaufgaben.

## Entscheidung

ROASWELL verkauft Marketingdienstleistungen. Das System besteht aus öffentlicher Website, interner Agenturoberfläche und einem separat deploybaren Kundenportal. Der Gründer betreibt die Agentur mit internen Automatisierungen und externen KI-Agenten. ROASWELL selbst erhält einen normalen Kundendatensatz und eine Kundenansicht ohne Gründerrechte.

Die Wissensbasis beginnt mit öffentlich zugänglichen Website-Inhalten. Individuelle Fragen, Analyseabschnitte und Maßnahmen entstehen KI-gestützt innerhalb versionierter Zod-Verträge. Die KI wählt geprüfte UI-Bausteine; sie erzeugt weder ausführbaren Code noch beliebiges HTML. Quellen, Annahmen, bestätigte Angaben und Korrekturen bleiben unterscheidbar.

REST, MCP und Oberflächen verwenden dieselben fachlichen Dienste, Mandantenprüfungen und Freigaben. Kunden sehen ausschließlich explizit kundenöffentliche Inhalte. RLS ergänzt die serverseitige Autorisierung.

Der kostenlose Einstieg liefert zuerst eine interaktive Vorschau. Registrierung erhält diese Ergebnisse und ermöglicht eine vertiefte Analyse. Interne Leistungspakete und Angebote bleiben bis zur Gründerfreigabe verborgen. Interessenten können vor Beauftragung einen Termin buchen.

## Bestehende Grundlage

Der Ausgangspunkt ist main a92989e35e04bcc01fe133bca64af6557cf9eb8e. Datenmodell (PR #9), Vertragsgenerierung (PR #10), Temporal-Beispiel (PR #11), Hono-API (PR #12) und Auth0 (PR #13) sind gemergt. Das ist keine Abnahme der noch fehlenden ROASWELL-Funktionen.

Der Gesprächsplan nannte zunächst Clerk. Der Gründer hat am 1. Oktober 2026 nach dem Abgleich mit main ausdrücklich erneut Auth0 bestätigt. Auth0 gemäß ADR 0009 bleibt bestehen; Clerk wird nicht eingeführt. Echte Sandbox-Abnahme und Live-Aktivierung bleiben offen und werden nicht durch diese Bestätigung ersetzt.

## Namenswechsel und Kompatibilität

Aktive Workspace-Pakete und Imports werden von @beacon/ auf @roaswell/ umgestellt. Aktuelle Seitentitel und API-Dokumenttitel heißen ROASWELL.

Bestehende Datenbankschemas, Rollen, Migrationsprüfsummen, Compose-Projekte, Volumes, Images, Receiver-Allowlist, Task-Queues und DNS-Namen behalten ihre technischen Identitäten. Die REST-Pfade sowie beacon/scopes und x-beacon-scopes bleiben für bestehende Verträge kompatibel. Eine spätere API-Versionierung erfolgt als eigene Aufgabe mit Kompatibilitätstest.

Historische ADRs und Abnahmen werden nicht nachträglich umgeschrieben. Der neue Plan ersetzt die ursprünglichen Produktkonzepte als Grundlage für neue Aufgaben.

## Folgen

R0 umfasst Planung, Arbeitsregeln, Paketnamenswechsel und automatische Abnahme. Es implementiert kein Kundenportal, keine Analyse und keine Budgetfreigabe. Die Folgeaufgaben und Merge-Abhängigkeiten stehen in [roaswell-aufgaben.md](../roaswell-aufgaben.md).
