# R1-01 – Organisations-, Rollen- und Freigabeverträge

Stand: 1. Oktober 2026. Abhängigkeit R0-01 ist als [PR #16](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/pull/16) regulär gemergt, Revision 5383be20e4b12214775be329669776b146f0cc11. [Main-CI einschließlich VPS-Staging](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36909267120) bestanden.

## Implementiert

- Zod-Verträge für Organisationsphase, Eigenkundenkennzeichen, Kundenrollen, interne Gründerrolle, Mitgliedschaften und Zugriffskontext.
- Sichtbarkeitsvertrag verhindert kundensichtbare interne Notizen/Kalkulationen.
- Versionsgebundene Freigaben mit passender Ergebnisart, menschlicher Entscheidung und eindeutigen Statusfeldern.
- Strikte Kommandos erlauben keine vom Aufrufer gesetzte Organisation, Akteuridentität, Gründerrolle oder Persistenzstatus.
- Sechs daraus abgeleitete zukünftige REST-/MCP-Operationen in separaten Spezifikationsartefakten.
- Typen aus Zod und JSON-Zeitstempel aus den internen Date-Verträgen abgeleitet.
- [ADR 0013](adr/0013-organization-access-contracts.md) dokumentiert Bedeutung, Kompatibilität und Aktivierungsgates.

## Lokale Abnahme

| Prüfung | Ergebnis |
|---|---|
| Lint | bestanden |
| Typecheck | 15 Tasks bestanden, einschließlich neuer Typassertionen |
| Unit | 64 Tests in zwölf Dateien bestanden |
| Build | zehn Workspace-Builds bestanden |
| Startup | vier Dienste verweigern fehlende Pflichtkonfiguration |
| Integration | zwölf Tests in sechs Dateien bestanden |
| Browser | sechs Tests bestanden |
| Generierte Artefakte | deterministisch und aktuell |
| Kompatibilität | bestehende OpenAPI-/MCP-Artefakte, Runtime-Routen, Infrastruktur und Migrationen unverändert |

Die acht neuen Testfälle vergleichen Zod und AJV bei ungültigen Rollen, fehlender Mandantenzuordnung, Statuswidersprüchen, manipulierten Kommandos, interner Sichtbarkeit und Ergebnisversionen. Die separate OpenAPI-Spezifikation wird mit aufgelösten Referenzen validiert. Jede geplante Route liefert im bestehenden Server weiterhin 404.

Eine anfängliche parallele Typprüfung kollidierte lokal mit dem Next.js-Build, der seine generierten Typdateien erneuert. Die vollständige Typprüfung nach Abschluss des Builds bestand; keine Änderung an Runtime-Konfiguration oder Prüfanforderungen.

## Grenzen und nächster Schritt

Dies ist die Schemaaufgabe R1-01. Sie erzeugt keine Tabellen, Mitgliedschaften, Zugänge oder neuen Live-Endpunkte. Die vorhandene Auth0-Autorisierung bleibt unverändert. Ablaufzeit, aktueller Ergebnisstand und Berechtigung einer Entscheidung benötigen die späteren fachlichen Dienste; Strukturvalidierung ersetzt diese nicht.

R1-02 beginnt erst nach regulärem Merge dieses PRs und ergänzt Vorwärtsmigration, Mitgliedschaftsbeziehungen, RLS und den kontrollierten Gründerzugriff. Echte Sandbox-Abnahmen und Kundenportal bleiben Folgeaufgaben.
