# ADR 0013: Organisations- und Freigabeverträge vor ihrer Aktivierung

Status: R1-01 implementiert; Rechte- und Persistenzdurchsetzung folgt in R1-02 bis R1-05.

## Entscheidung

Die Organisations-ID ist die bestehende tenantId beziehungsweise id des Tenant-Datensatzes. Die neue Organisationsansicht ergänzt Phase (prospect, customer, suspended, archived) und isAgencyCustomer. Das Kennzeichen für ROASWELL als Eigenkunde gewährt keinerlei Gründerrechte. Bestehende Tenant-/Customer-Verträge und SQL-Identitäten werden in R1-01 nicht geändert.

Kundenmitgliedschaften haben customer_admin oder customer_member und die Zustände active/revoked. Eine aktive Mitgliedschaft besitzt kein revokedAt; eine widerrufene benötigt dieses Datum. founder ist ausschließlich eine interne Agenturrolle. Der serverseitige Zugriffskontext unterscheidet agency von customer; die Kundenansicht kann kein agencyRole-Feld tragen.

Ergebnisse werden über Art, Datensatz-ID und positive Version identifiziert. Interne Notizen und Kalkulationen können im Sichtbarkeitsvertrag nicht customer sein. Ob andere Ergebnisse tatsächlich freigegeben sind, entscheidet später der Dienst gemäß ADR 0012.

Publikationsfreigaben sind separate versionApproval-Datensätze; die bisherigen Geldfreigaben bleiben unverändert. Angebotspublikation betrifft nur offer; externe Publikation und Kundenprüfung betreffen external_content/campaign. Ein Agent darf eine Freigabe anfragen, eine Entscheidung enthält dagegen einen menschlichen userId.

Pending hat weder Abschlussdatum noch Entscheidung. Approved/rejected/revoked benötigen Abschlussdatum und menschliche Entscheidung; expired benötigt ein Abschlussdatum ohne menschliche Entscheidung. Zeitreihenfolge, Ablauf, aktueller Ergebnisstand, Mitgliedschaft und Entscheidungsrecht werden in R1-05 serverseitig geprüft. Strukturvalidierung allein gewährt keinen Zugriff und ist keine Freigabe.

## Schnittstellen und Ableitung

Sechs geplante Operationen lesen Organisation, Mitgliedschaften und Freigaben oder vergeben Kundenmitgliedschaft, fragen eine Freigabe an und entscheiden sie. Kundeninputs enthalten keine tenantId, Akteurzuordnung, Gründerrolle, Persistenzstatus oder Serverzeitstempel. Der userId einer Mitgliedschaftsanfrage bezeichnet den Empfänger, nicht den authentifizierten Akteur.

Zod liefert Typen, JSON-Schema, OpenAPI und MCP-Definitionen. Diskriminierte Zustände behalten ihre Bedingungen auch im generierten JSON-Schema. Intern verwenden Daten Zeitstempel als Date; JSON-Verträge verwenden abgeleitete ISO-Zeitstempel.

Die Operationen liegen ausschließlich in accessOperationContracts. Die Artefakte access-openapi.json/access-tools.json sind zukünftige Spezifikationen und nicht die aktive API-/MCP-Liste. Der Live-Server registriert keine neuen Routen. Erst R1-03/R1-05 dürfen diese mit tatsächlicher Durchsetzung aktivieren. Abnahmetests prüfen explizit 404 für jede geplante Route und unveränderte bestehende API-Verträge.

## Abnahme und Folgen

Tests vergleichen Zod und AJV für gültige/ungültige Rollen, Mandantenzuordnung, manipulierte Kommandos, Sichtbarkeit, Statusfelder und Versionen. OpenAPI-Referenzen werden validiert; Typassertionen sind Teil der Typecheck-Konfiguration. Die neue Spezifikation erzeugt noch keine Tabellen, Migrationen, Mitglieder oder Zugänge.

R1-02 muss die gespeicherten Felder und Datumsrepräsentation aus diesen Verträgen ableiten, RLS und Mitgliedschaftsbeziehungen testen und historische Migrationen unverändert lassen. Keine bestehende Runtime-Rechteprüfung wird durch einen rein strukturellen Vertrag ersetzt.
