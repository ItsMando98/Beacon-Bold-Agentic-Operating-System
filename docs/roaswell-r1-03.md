# R1-03 – Persistierte Autorisierung, Audit und Widerruf

Stand: 1. Oktober 2026. R1-02 ist als [PR #18](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/pull/18) regulär gemergt, Revision 3fccbb925b14e2153967e3bb5367c80d7aa16f5e. [Main-CI und VPS-Staging](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36915041492) bestanden.

## Ergebnis

- Zod-Verträge, abgeleitete Vorwärtsmigration, RLS und mandantengebundene Beziehungen für interne Gründer-Mitgliedschaften und befristete Agentenberechtigungen.
- POST /customers verlangt jetzt persistierte interne Rechte zusätzlich zum signierten, korrekt zugeordneten Auth0-Token.
- GET /v1/organization gibt nach Prüfung normaler Kundenrechte ausschließlich die eigene Organisationsprojektion zurück. Manipulierte Tenant-/Ansichtsangaben wählen keine fremde Organisation oder Gründerrolle.
- Gemeinsame transaktionale Prüfung für Lesen und Geschäftsaktionen. Idempotenz-Replays umgehen keine aktuellen Rechte.
- Atomarer interner Widerruf mit Audit, Sperrkoordination mit laufenden kurzen API-Aktionen und keine automatische Wiederfreigabe.
- Erlaubte, verweigerte und fehlgeschlagene Aktionen werden ohne Token oder vollständigen Kundeninhalt protokolliert.
- Aktive OpenAPI-/Tooldefinitionen enthalten ausschließlich tatsächlich implementierte REST-Verträge. Andere R1-Routen bleiben unregistriert.
- [ADR 0015](adr/0015-persisted-request-authorization.md) beschreibt Bootstrap, Rechte und verbleibende Gates.

## Fachliche Abnahme

Die neue Abnahme verwendet selbst signierte synthetische JWTs, eine temporäre lokale PostgreSQL-Datenbank und die echten API-/Store-Dienste. Sie prüft getrennte Kunden-/Gründerrechte, gebundenen Auth0-Client, OAuth-/M2M-Grants, Scopegrenzen, Ablauf, Widerruf, Pause, gesperrte Organisationen, RLS und SQL-Strukturvalidierung. Derselbe Schlüssel bleibt nach Widerruf gesperrt. Bei einer absichtlich verzögerten Aktion wartet der konkurrierende Widerruf bis zum Abschluss; jede Folgeaktion scheitert. Der interne Widerrufsdienst verweigert Kundenverbindungen und protokolliert Betreiberänderungen.

Die bestehenden Auth0-Signatur-/Issuer-/Audience-Tests und alle bisherigen Isolationstests bleiben erhalten. Die zwei neuen Grant-Tabellen erweitern lediglich die erwartete Tabellen-/Fremdschlüsselzahl. Laufende Dienste, Kundenkonten oder Anbieter werden nicht als Testziel verwendet.

Ein lokaler Next.js-Build scheiterte im Webpack-Cache-Hashing. Der betroffene Cache wurde innerhalb des ignorierten Arbeitsbereichs erhalten und ein frischer Build gestartet; keine Änderung an Webpack- oder Sicherheitskonfiguration war erforderlich. Der abschließende Gesamtbuild bestand. Ein bestehender Temporal-Worker-Test überschritt beim parallelen Prüflauf sein Startzeitlimit; der vollständige Wiederholungslauf ohne parallele Build-/Browserprüfung bestand unverändert.

## Lokale Pflichtprüfungen

| Prüfung | Ergebnis |
|---|---|
| Lint | 147 Dateien, bestanden |
| Typecheck | 15 Workspace-Aufgaben, bestanden |
| Unit-Tests | 69 Tests in 14 Dateien, bestanden |
| Integration | 14 Tests in 8 Dateien mit echten lokalen Diensten, bestanden |
| Build | 10 Pakete, bestanden; bekannte Auth0-DPOP-Abhängigkeitswarnung |
| Browser-Abnahme | 6 Tests, bestanden |
| Start ohne Konfiguration | API, Worker, App und Website verweigern Start wie vorgesehen |
| Generierte Verträge/Migration | Determinismus und Aktualität im Build beziehungsweise Unit-Test geprüft |
| Diff | Keine Whitespace-Fehler; frühere Migrationen und Infrastruktur unverändert |

GitHub-CI ist die zusätzliche Abnahme des veröffentlichten PR-Stands. Eine echte Auth0-Sandbox bleibt weiterhin offen.

## Grenzen

Kein Kundenportal, kein Remote-MCP, keine Angebots-/Budgetpublikation und keine echte Auth0-Sandbox-Abnahme in diesem PR. Echte Betreiberidentitäten und Grants werden nicht automatisch aus bestehenden bindings erstellt. Ohne explizite Einrichtung bleibt Zugriff gesperrt. Kundendaten-Sichtbarkeit für weitere Fachressourcen folgt in R1-05; getOrganization ist nur die erste geprüfte Ressourcenansicht.

R1-04 beginnt nach regulärem Merge und erstellt das separate Kundenportal mit eigenem Auth0-Client, Konfiguration und Containerbetrieb.
