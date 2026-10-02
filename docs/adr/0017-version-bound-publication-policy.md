# ADR 0017: Gemeinsame Regeln für kundensichtbare Versionen

Stand: 2. Oktober 2026. Status: R1-05-01 implementiert; Speicherung und Live-Anbindung folgen separat.

## Umfang und Vertrauensgrenze

R1-05 wird gemäß den Regeln für kleine PRs in drei abhängige Aufgaben zerlegt. Dieser PR implementiert ausschließlich die gemeinsame, deterministische Regellogik und ihre Zod-Verträge. Er fügt keine aktive REST-/MCP-Route, Ergebnistabelle, Dateiablage, Suche oder Ereignisübertragung hinzu.

Die Regeln erhalten bereits verifizierten Kundenzugriff, die aktuelle unveränderliche Ergebnisversion, serverseitige Zeit, Qualitätsnachweise, Freigaben und vom Repository bestätigte Entscheiderrollen. Keines dieser Argumente darf aus einem öffentlichen Request als Berechtigungsbeweis übernommen werden. R1-03 bleibt für Anmeldung, Mitgliedschaft, Agentenrechte und Widerruf zuständig.

R1-05-02 muss aktuelle Version und Nachweise transaktional lesen, Entscheiderrollen vertrauenswürdig belegen, Änderungen atomar versionieren und Entscheidungen einschließlich Policy-Version auditieren. R1-05-03 verbindet erst anschließend die Ausgabewege mit dieser Datenquelle. Vorhandene Portal-/Auth0-Sandbox- und Rollout-Gates bleiben offen.

## Gemeinsame Regeln

Alle Kundenausgaben verwenden projectCustomerResult. Die Ausgabe enthält ausschließlich Zielreferenz, Titel und Zusammenfassung. Private Felder, Rollenbelege, Organisation, Kalkulation und Freigabegründe werden nicht in Kundenobjekte kopiert. Interne Notizen und Kalkulationen bleiben unabhängig von Sichtbarkeitsmarkierung oder Rolle ausgeschlossen.

Projektfortschritt darf nach Kundenzuordnung und Sichtbarkeitsprüfung erscheinen. Analyse und Bericht brauchen einen passenden bestandenen Qualitätsnachweis für dieselbe Organisation, Ergebnisart, ID und Version. Fehlende, zukünftige, ältere oder widersprüchliche Qualitätsnachweise schließen den Zugriff bis zur Klärung.

Ein Angebot braucht eine genehmigte offer_publication durch einen bestätigten Gründer. Die Freigabe muss zur exakten Version gehören, darf nicht abgelaufen sein und braucht plausible Zeitreihenfolge. Ein kundensichtbar markierter Angebotsentwurf bleibt deshalb vor der Entscheidung verborgen.

Freigaben sind nicht austauschbar. Für einen Ziel-/Freigabetyp gilt der jüngste Antrag; ein neuer offener Antrag reaktiviert keine alte Genehmigung. Gleichzeitige widersprüchliche Anträge und doppelte Freigabe-IDs schließen den Zugriff. R1-05-02 muss aktive Anträge zusätzlich eindeutig und wiederholbar speichern.

reviseResult erhöht die Version auch bei Sichtbarkeits- oder privaten Änderungen. Die Identität bleibt bestehen; Nachweise alter Versionen gelten für das neue Ergebnis nicht. Das Repository darf alte Snapshots nicht als aktuellen Stand ausgeben und Inhalte nicht ohne Versionswechsel ändern.

## Menschliche Entscheidungen und externe Veröffentlichung

Angebots- und externe Veröffentlichungsfreigaben benötigen die Gründeransicht. customer_review benötigt einen Kundenadministrator der passenden Organisation; ein Gründer ersetzt diese Kundenentscheidung nicht. Kundenmitglieder können Ergebnisse sehen, aber keine verbindliche Kundenfreigabe geben. Diese Rollenentscheidung ist ein erster Default und wird für die späteren Medienabläufe erneut geprüft.

Eine sichtbare Creative-Version darf vor der Kundenentscheidung im Portal zur Prüfung stehen. canPublishExternally benötigt zusätzlich eine gültige external_publication und, wenn vereinbart, customer_review. Die Zustimmung zum Anzeigen eines Creatives ist keine Genehmigung seiner externen Veröffentlichung.

Entscheiden und Widerrufen erzeugen nur validierte Zustandsübergänge. Sie schreiben keine Datenbank, geben einem Agenten keine Rolle und veröffentlichen keine Inhalte. Die späteren Dienste müssen den Übergang unter Sperre ausführen und Audit speichern. Auch ein positives externes Gate ersetzt weder Aktionsrechte noch Budgetrahmen.

## Ausgabewege

Die gemeinsame Projektion wird für Portalobjekt, Suchtreffer, Textdownload und Ereignisobjekt verwendet. Suche untersucht nur sichtbaren Titel und Zusammenfassung. Dateinamen enthalten ausschließlich UUID und Version; Downloads sind Klartext. Ereignisobjekte enthalten nur dieselbe Kundenprojektion. Dies ist eine getestete Vertragsgrundlage, noch kein Nachweis laufender HTTP-Downloads oder SSE.

Die anfängliche Textprojektion ersetzt keine adaptiven Analysebausteine aus R2. Inhaltsbausteine werden dort ergänzt, ohne die Vertrauens- und Sichtbarkeitsregeln aufzuheben.
