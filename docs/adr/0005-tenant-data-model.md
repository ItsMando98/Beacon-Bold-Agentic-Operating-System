# ADR 0005: Schema-abgeleitetes Datenmodell und Mandantengrenze

Status: technische Umsetzung für P1-1; fachliche Erweiterungen bleiben den Folgeaufgaben vorbehalten.

Gate 0 ist durch den regulären Merge von PR #8 auf `3ee92f9102a0c23055ffb092812ec5f4e642dbde`, neun Pflichtprüfungen, VPS-Deploy, öffentliche HTTPS-Abnahme, blockierten fehlerhaften Merge und externen Backup-/Restore-Nachweis belegt. P0-4 ist als PR #5 gemergt. P1-1 ist daher die erste ausführbare Aufgabe des Umsetzungsplans.

Die 13 Entitäten liegen im bestehenden PostgreSQL-Schema `beacon`. Zod-Verträge in `packages/schemas/src/domain.ts` liefern Feldtypen, Speicherannotationen, Nullbarkeit, Statuswerte und daraus ableitbare SQL-Prüfungen. Drizzle 0.45.3 bildet daraus die Tabellen und Row-Typen. Es gibt keine separat gepflegten fachlichen TypeScript-Interfaces. Die Vorwärtsmigration `0002_data_model.sql` ist ein deterministischer Snapshot des Modells; ein automatischer Vergleich verhindert unbeabsichtigte Abweichungen. Bereits angewandte Migrationen bleiben unverändert und unterliegen dem bestehenden Checksummen-Migrator.

Jede Tabelle erzwingt ENABLE und FORCE RLS. Ohne `app.tenant_id` bleibt der Zugriff geschlossen. Die Mandantentabelle verwendet ihre ID; andere Tabellen haben `(tenant_id, id)` als Primärschlüssel. Alle fachlichen Fremdschlüssel enthalten `tenant_id`; Referenzen in andere Mandanten werden auch dann verhindert, wenn PostgreSQL seine referenzielle Integritätsprüfung außerhalb von RLS ausführt. Referenzen löschen keine abhängigen Daten automatisch. Das Audit-Log ist für `beacon_app` nur lesbar und ergänzbar. Dies implementiert noch keine automatische Änderungsprotokollierung aus P1-6.

`withTenant` validiert den Kontext, akzeptiert ausschließlich die eingeschränkte Rolle `beacon_app` und setzt den Mandanten nur innerhalb einer Transaktion. Commit und Rollback entfernen diesen lokalen Kontext. Die Datenbankrolle bleibt ein vertrauenswürdiger interner Dienstzugang: Eine Verbindung, die selbst beliebige Mandantenkontexte setzt, ist keine Endnutzeridentität. P1-4 muss den Mandanten aus der authentifizierten Identität auflösen; ein ungeprüfter Request-Wert ist unzulässig.

Geldbeträge werden als nichtnegative ganzzahlige Minor Units plus dreistelligem Währungscode gespeichert. Rechnungen sind ausschließlich Entwurfsdatensätze. Freigaben und Laufkosten sind Datenstrukturen, keine Zahlungs- oder Genehmigungslogik. Jede neue reale Geldwirkung benötigt weiterhin den dokumentierten manuellen Gründerfreigabeweg aus `docs/vps-approval.md`, bis P1-8 implementiert ist. Diese Aufgabe ruft keine externen Anbieter auf und bestellt keine Ressourcen.

Offene fachliche Entscheidungen: verbindliche CRM-Pipeline und Statusübergänge (P2-1), Identitätszuordnung und Rollen (P1-4), Aufbewahrung/Löschung des Audit-Logs (P1-6), Freigabeberechtigungen, Budgetlimits und Geldwirkung (P1-8), feinere Modellkostenpräzision (P1-9), Rechnungsnummern, Steuern und Buchhaltung (P3-5/P3-6). Die minimalen Statuswerte sind technische Speicherzustände; sie bestimmen noch keine Geschäftsprozesse. Keine dieser offenen Entscheidungen aktiviert einen Live-Dienst oder eine Ausgabe.

Referenzen: [Drizzle RLS](https://orm.drizzle.team/docs/rls), [PostgreSQL Row Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
