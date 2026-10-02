# R1-05-01 – Gemeinsame Freigaberegeln

Stand: 2. Oktober 2026.

R1-04 wurde regulär als PR #20 auf 4182bd03cda0036e86f4f6c68a8a91167e020819 gemergt. [Main-CI und bestehendes VPS-Staging](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36970625465) bestanden. Der separate Portal-Rollout und der echte Auth0-Sandbox-Login bleiben offen.

## Ergebnis

- Zod-Verträge für vertrauenswürdige Ergebnisversionen, Qualitäts-/Rollenbelege und strikt begrenzte Kundenprojektionen.
- Gemeinsame reine Dienste für Kundensichtbarkeit, Suchprojektion, Textdownload und Ereignisprojektion; Sammelsuchen sind an einen einzigen verifizierten Kundenkontext gebunden.
- Exakte Bindung von Freigaben und Qualität an Organisation, Ergebnisart, ID und Version.
- Angebotsfreigabe durch Gründer; gesonderte externe Freigabe und gegebenenfalls Kundenadministrator-Zustimmung.
- Validierte Entscheidungs-/Widerrufsübergänge und Versionserhöhung bei Änderungen.
- [ADR 0017](adr/0017-version-bound-publication-policy.md) beschreibt Regeln und verbindliche Vertrauensgrenzen.

## Fachliche Abnahme

Die automatische Abnahme verwendet ausschließlich erfundene Ergebnisse und feste Zeiten. Sie prüft sämtliche Ausgabeformen auf private Felder, fremde Organisationen, interne Ergebnisse, fehlende Qualität, falsche Entscheiderrollen, Ablauf, Widerruf, neuere offene Anträge und Versionswechsel. Eine Creative-Version darf zur Kundenprüfung sichtbar sein, während externe Veröffentlichung ohne beide vereinbarten Freigaben gesperrt bleibt.

Die neuen Dienste führen keinerlei Anbieter-, Datenbank-, Datei- oder Netzwerkaktion aus. Ihre Abnahme ist ein Policy-Test und kein Ersatz für den späteren RLS-/Transaktionsnachweis.

## Offene Umsetzung

R1-05-02: dauerhaft unveränderliche Versionen, aktuelle Versionsauswahl, echte Rollenbelege, atomare Entscheidungen, Widerruf, Idempotenz und Audit mit echten PostgreSQL-Tests.

R1-05-03: autorisierte Ausgabewege an die gespeicherten Daten anbinden; REST/MCP-Verträge erst für implementierte Routen aktivieren. Mandantentrennung und private Feldfreiheit über die realen Antworten prüfen.

R1-05 als Gesamtaufgabe und seine fachlichen Folgeaufgaben bleiben bis zur Abnahme von R1-05-03 offen.

## Lokale Pflichtprüfungen

| Prüfung | Ergebnis |
|---|---|
| Lint | 163 Dateien, bestanden |
| Typecheck | 16 Workspace-Aufgaben inklusive neuer Abnahme, bestanden |
| Unit/Fachliche Abnahme | 88 Tests in 16 Dateien, davon 14 neue Policy-Fälle, bestanden |
| Build | 11 Pakete, bestanden; bekannte Auth0-DPOP-Abhängigkeitswarnung |
| Startschutz | 5 Dienste, bestanden |
| Diff | Keine Whitespace-Fehler; Apps, Infrastruktur, bestehende Migrationen und generierte API-Verträge unverändert |

Die zusätzliche GitHub-CI prüft den veröffentlichten Stand einschließlich der vorhandenen PostgreSQL-/Temporal-, Browser- und Containerabnahmen. Ein bestandener Policy-Test ist kein Nachweis der noch offenen Datenbank-/Ausgabeintegration.
