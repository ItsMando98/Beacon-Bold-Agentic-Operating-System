# R1-02 – Datenmodell und Mandantentrennung

Stand: 1. Oktober 2026. Abhängigkeit R1-01 ist als [PR #17](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/pull/17) regulär gemergt, Revision ad66eb9c8b638f25fa8e0fb5ac787cd2d3a81bd6. [Main-CI und VPS-Staging](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36911518359) bestanden.

## Implementiert

- Neue Vorwärtsmigration 0004_access.sql für Organisationen, Mitgliedschaften und Versionsfreigaben. Historische SQL-Dateien bleiben unverändert.
- Drizzle-Spalten und SQL-Strukturvalidierung aus den Zod-Verträgen abgeleitet. Automatischer Snapshot-Abgleich verhindert getrennte Vertragspflege.
- Zusammengesetzte Fremdschlüssel sichern Mitgliedschaften und JSONB-Akteurbeziehungen über die Organisationsgrenze hinweg.
- ENABLE/FORCE RLS, eingeschränkte Kundensichten und getrennte, ebenfalls mandantengebundene Gründerrolle ohne Login/RLS-Bypass.
- withAccess prüft reale Rolle und persistierte Kundenmitgliedschaft; Kontext gilt nur für die Transaktion.
- Explizite atomare Eigenkundeneinrichtung mit Audit und Eindeutigkeit, ohne öffentlichen Registrierungsweg oder automatische Rechtevergabe.
- Bestehende Tenants werden ohne Mitgliedschaften als Interessentenprofile übernommen. Unternehmensname ROASWELL löst keine Sonderrechte aus.
- [ADR 0014](adr/0014-access-persistence-and-founder-role.md) dokumentiert Betrieb und Aktivierungsgrenzen.

## Abnahme

Alle lokalen Pflichtprüfungen sind bestanden:

| Prüfung | Ergebnis |
|---|---|
| Lint | bestanden |
| Typecheck | 15 Tasks bestanden, neue Integrationstests eingeschlossen |
| Unit | 66 Tests in 13 Dateien bestanden |
| Build | zehn Workspace-Builds bestanden |
| Startup | vier Dienste verweigern fehlende Pflichtkonfiguration |
| Integration | 13 Tests in sieben Dateien bestanden |
| Browser | sechs Tests bestanden |
| Generierte Verträge / Migration | aktuell und deterministisch |
| Kompatibilität | historische SQL-Dateien, bestehende Vertragsartefakte, Apps und Infrastruktur unverändert |

Die zentrale PostgreSQL-Abnahme nutzt ausschließlich eine neue synthetische lokale Datenbank und prüft:

1. Upgrade aus 0001–0003 mit vorhandenem Tenant, ohne Name-basierte Eigenkundenerkennung.
2. Kunden können eigene Organisation/aktive Mitgliedschaft lesen, keine fremden Daten lesen oder Mitgliedschaften/Freigaben schreiben.
3. Gefälschte Session-Felder können die echte Datenbankrolle nicht ersetzen; SET ROLE zum Gründer wird abgewiesen.
4. Auch der Gründer braucht einen gewählten Mandanten; fremde Updates/Deletes und verschobene Zuordnungen scheitern.
5. Ungültige Rollen, Status-/Datumszweige, JSON-Zusatzfelder, Zielarten, negative/nichtnumerische Versionen und mandantenfremde Akteure werden in SQL abgewiesen.
6. withAccess verweigert fehlende, widerrufene oder falsch deklarierte Mitgliedschaft und privilegierte Eigentümerverbindungen; Erfolg und Rollback hinterlassen keinen Poolkontext.
7. Eigenkundeneinrichtung vergibt normale Kundenrechte, schützt interne Freigaben, protokolliert die Einrichtung und rollt konkurrierende Zweitanlagen vollständig zurück.
8. Die vorhandenen Migrationstests wenden alle Migrationen zweimal an und verweigern veränderte/fehlende Historie. Bestehende Geschäftsmodelle und deren Isolation bleiben geprüft.

## Grenzen

Kein neuer HTTP-/MCP-Endpunkt ist aktiviert; die Spezifikationen und Auth0-Anbindung bleiben kompatibel. R1-03 integriert persistierte Rechte in authentifizierte Menschen-/Agentenaufrufe. R1-05 implementiert Publikation, Ergebnisversionen und Sichtbarkeit bestehender Inhalte. Der spätere Kundenportalbetrieb ist damit noch nicht abgenommen.

Es wurden keine Zugangsdaten, produktiven Kunden oder bezahlten Ressourcen angelegt. Der neue Gründerkanal ist eine Grundlage für eine spätere kontrollierte Betreiberkonfiguration; NOLOGIN bleibt der Default. Ausstehende Auth0-/Anbieter-Sandbox-Abnahmen werden durch lokale Fixtures nicht ersetzt.
