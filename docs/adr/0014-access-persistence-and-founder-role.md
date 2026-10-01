# ADR 0014: Persistierte Kundenrechte und separater Gründerzugriff

Status: R1-02 implementiert; Anschluss an authentifizierte HTTP-/Agentenaufrufe folgt in R1-03.

## Entscheidung

Die neue Tabelle organizations ergänzt bestehende tenants über denselben Primärschlüssel. Die Tenant-Tabelle und historische Migrationen bleiben unverändert. Bestehende Tenants werden mit phase=prospect und isAgencyCustomer=false übernommen, ohne automatisch Personenrechte zu vergeben. Name und Erstellungsdatum sind anfängliche Profilwerte; spätere Profiländerungen müssen über einen gemeinsamen Dienst erfolgen.

Memberships referenzieren Organisation und Benutzer mit mandantengebundenen Fremdschlüsseln. Pro Organisation/Benutzer gibt es genau eine aktuelle Mitgliedschaft; Widerruf ist ein Zustand und kein zweiter paralleler Eintrag. Rollen, Zustände und Datumsrepräsentation stammen aus R1-01. Die zusätzliche Betreiber-Einrichtungsstruktur liegt ebenfalls in packages/schemas.

Versionsfreigaben sind eine eigene Tabelle. Anfragende Menschen/Agenten und entscheidende Menschen werden über aus JSONB abgeleitete Hilfsspalten und zusammengesetzte Fremdschlüssel gegen users/agents desselben Mandanten abgesichert. Die Hilfsspalten sind Datenbankintegrität, keine zusätzlichen API-Felder. Ein begrenzter, bei unbekannten Regeln abbrechender Generator erzeugt SQL-Constraints aus Zod-JSON-Schema einschließlich Statuszweigen, geschlossenen JSON-Objekten und Zielversionen. Native timestamptz-Spalten übernehmen die Datumsvalidierung. Zeitreihenfolge, aktuelle Ergebnisversion und Entscheidungsbefugnis folgen in R1-05; nicht vorhandene Ergebnistabellen erhalten hier keine erfundenen Fremdschlüssel.

## Datenbankrollen und RLS

- beacon_app bleibt die bestehende eingeschränkte Anwendungskonnektivität. Auf den neuen Organisationen und Mitgliedschaften besitzt sie ausschließlich SELECT. RLS liefert nur die aktive Mitgliedschaft des serverseitig ausgewählten Benutzers und die zugehörige Organisation. Keine Direktrechte auf Versionsfreigaben.
- beacon_founder ist eine neue NOLOGIN-Rolle ohne Superuser, BYPASSRLS, Datenbank- oder Rollenverwaltung. Keine gegenseitige Mitgliedschaft mit beacon_app; indirekte Mitgliedschaftsketten lassen die Migration abbrechen. Die Migration vergibt keinen Zugriff an einen Login.
- Gründer-RLS bleibt ebenfalls auf die ausdrücklich gewählte tenantId beschränkt. Organisationsübergreifende Arbeit bedeutet mehrere kontrollierte Organisationskontexte, keinen pauschalen RLS-Bypass.
- Die Gründerrolle erhält entsprechende Rechte auf bestehenden Fachtabellen; Audit bleibt SELECT/INSERT, ohne Änderungs-/Löschrecht. Historische Kundenpolicies werden nicht verändert. Neue Tabellen verwenden ENABLE und FORCE RLS.
- withAccess prüft die tatsächliche Datenbankrolle, setzt Akteur und Organisation transaktionslokal und prüft aktive Kundenmitgliedschaft samt Rolle. Im Agenturkontext muss der Akteur in der gewählten Organisation existieren. Die Gründerbefugnis kommt aus dem getrennten vertrauenswürdigen Datenbankkanal, niemals aus einem Kundenfeld.

Der SQL-Kontext ist vertrauenswürdige Serverkonfiguration. Er ist keine Authentifizierung; der HTTP-Handler darf tenantId, userId oder view nicht ungeprüft aus einem Request übernehmen. R1-03 verbindet Auth0-Identität und persistierte Rechte und richtet den internen Datenbankkanal ein. Die bisherigen Auth0-Allowlist und alten withTenant-Aufrufe bleiben bis dahin unverändert. R1-05 ergänzt fachliche Sichtbarkeit für bestehende Inhalte. Dieser PR behauptet keine fertig abgesicherte Portal-/REST-/MCP-Nutzung.

## ROASWELL als Eigenkunde

setupAgencyCustomer ist ein expliziter interner Betreiberaufruf ohne öffentliche Route. Er erfordert den eingeschränkten Gründerkanal, validiert zusammengehörige Organisation, Benutzer und aktive Kundenmitgliedschaft und legt diese atomar mit einem Audit-Ereignis an. Ein partieller Index erlaubt höchstens einen Eigenkunden. Weder Unternehmensname noch Kennzeichen geben Gründerrechte. Der Gründer nutzt im Eigenkundenportal beacon_app und normale Kundenmitgliedschaft.

Keine produktive Einrichtung und keine Zugangsdaten werden in diesem PR erzeugt. Für einen späteren Betreiber-Login müssen CONNECT/SET ROLE und die getrennte Poolkonfiguration gezielt eingerichtet werden; kein Grant an Kundenverbindungen. Ein bereits existierender Eigenkunde wird nicht stillschweigend überschrieben. Ein wiederholter oder konkurrierender Einrichtungsversuch scheitert atomar und hinterlässt keine Teilanlage.

## Abnahme und Folgeschritte

Echte lokale PostgreSQL-Tests prüfen Altbestand-Upgrade, neue Installation über den bestehenden Runner, Wiederholung der Migration, SQL-Manipulation, Mandantenfremdschlüssel, Rollenwechsel, Lesen/Schreiben, Schema-/TRUNCATE-Rechte, aktive/widerrufene Mitgliedschaften, Poolkontext nach Erfolg/Fehler und Eigenkundeneinrichtung samt Rollback/Audit. Generierte Migration und Storage-Abbildung werden automatisch abgeglichen.

Widerruf verweigert neue withAccess-Aufrufe; laufende Arbeit wird hier nicht als sofort abbrechbar ausgewiesen. Dauerhafte Agentenrechte, Autorisierungs-Audit, kontrollierte Reaktivierung sowie die fachliche Wirkung von suspended/archived gehören zu R1-03. Kundenpublikation und Freigabezustandsübergänge bleiben R1-05. Auth0-Sandbox-Abnahmen bleiben offen.

Grundlagen: [PostgreSQL RLS](https://www.postgresql.org/docs/18/ddl-rowsecurity.html) und [Rollenmitgliedschaft](https://www.postgresql.org/docs/18/role-membership.html).
