# R0-01 – ROASWELL-Grundlage und Namenswechsel

Stand: 1. Oktober 2026. Ausgangspunkt: main a92989e35e04bcc01fe133bca64af6557cf9eb8e.

## Implementiert

- Freigegebener [Umsetzungsplan](roaswell-umsetzungsplan.md) gespeichert und auf den tatsächlich gemergten Projektstand abgestimmt.
- [Abhängige Einzelaufgaben](roaswell-aufgaben.md) mit Ergebnis und automatischer Abnahme eingetragen.
- ADR 0010–0012 dokumentieren Architektur, genehmigte Budgetrahmen und Kundensichtbarkeit.
- Gründerbestätigung übernommen: Auth0 bleibt bestehen; kein Wechsel zu Clerk.
- Workspace-Pakete, Imports, Filter, shadcn-Aliase und Lockfile auf @roaswell/ umgestellt.
- Marketingseite, App-Metadaten, Storybook und generierter OpenAPI-Titel auf ROASWELL umgestellt.
- README und Arbeitsregeln verwenden den neuen Plan; bis zur Budgetdurchsetzung bleibt der manuelle Ausgabenweg geschlossen.

## Lokale Abnahme

| Prüfung | Ergebnis |
|---|---|
| Installation mit eingefrorenem Lockfile | bestanden; keine Anbieter-Version geändert |
| Lint | bestanden |
| Typecheck | 15 Tasks bestanden |
| Unit | 56 Tests in elf Dateien bestanden |
| Build | zehn Workspace-Builds bestanden |
| Start ohne Pflichtkonfiguration | alle vier Dienste verweigern den Start wie vorgesehen |
| Integration | zwölf Tests in sechs Dateien bestanden |
| Storybook | gebaut |
| Browser | sechs Tests bestanden, einschließlich Website-/App-/OpenAPI-Namen |
| Receiver | vier Python-Tests bestanden |
| Generierte Verträge | aktuell |
| Git-Diff-Abnahme | keine Änderungen an Infrastruktur, Images, Receiver oder Migrationen; keine Whitespacefehler |

Der erste Integrationstestlauf deckte einen Konflikt beim gleichzeitigen ALTER ROLE in mehreren getrennten Testdatenbanken auf. Integrationstestdateien laufen nun seriell, weil die verwendete PostgreSQL-Rolle clusterweit gemeinsam ist. Parallelität innerhalb einzelner Tests wird dadurch nicht abgeschaltet. Der vollständige korrigierte Lauf bestand.

Die Build-Warnung zum dynamischen Auth0-DPoP-Import bleibt vorhanden; Auth0-Konfiguration und Auth-Verhalten sind nicht verändert.

## Grenzen und nächste Aufgabe

R0 stellt keine neuen VPS-Dienste bereit und ändert weder Produktion noch DNS, Datenbankrollen, Migrationsdateien, technische Ressourcennamen oder bestehende API-Pfade. R1–R11 sind offen. Keine Kundenanalyse, Budgetdurchsetzung oder Live-Agentenfunktion wird als fertig ausgegeben.

GitHub-CI und regulärer Merge sind gesonderte Nachweise. Erst nach Merge von R0-01 kann R1-01 beginnen. R1-01 ergänzt die Organisations-, Mitgliedschafts-, Sichtbarkeits- und Freigabeverträge in packages/schemas, bevor Datenmodell und Portal erweitert werden.
