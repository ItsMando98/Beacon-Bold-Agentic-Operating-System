# P1-11a: Dashboard-Oberfläche und Navigation

Ausgangspunkt: main a92989e35e04bcc01fe133bca64af6557cf9eb8e nach dem
autorisierten Merge von Auth-PR #13. Der main-Lauf
[36864214181](https://github.com/ItsMando98/Beacon-Bold-Agentic-Operating-System/actions/runs/36864214181)
ist erfolgreich. Echte Auth0-Nutzer-/Agentenabnahme und dauerhafte VPS-Aktivierung
bleiben offen; der Merge wird nicht als externe Auth-Abnahme bewertet.

## Umfang und Referenz

Nach ausdrücklicher Designkorrektur des Gründers dient der im Konzept genannte
Kiranism-Dashboard-Starter als konkrete Vorlage. Revision und Entscheidungen:
[ADR 0010](adr/0010-dashboard-reference.md).

- 256px-Sidebar, auf 64px einklappbar; mobile Navigation als zugänglicher Dialog.
- 56px-Kopfzeile mit Breadcrumb, Seitensuche und Hell-/Dunkelmodus.
- Overview mit vier Kennzahlenkarten sowie 4:3-Aufteilung für Läufe und Aktivität.
- Gemeinsame Card-/Table-Komponenten aus dem Starter mit MIT-Lizenz.
- Navigation zu Zielen, Agenten, Läufen, Freigaben und Audit; unbekannte Seiten 404.
- Tastatur: Ctrl/Cmd+K für die Suche, Ctrl/Cmd+B für die Sidebar, Escape für Dialoge.

Die leeren Bereiche und nicht verfügbaren Kennzahlen sind als Vorschau
gekennzeichnet. Es gibt keine Modellaufrufe, schreibenden APIs oder Freigabeaktionen.
Die geschützte /operations-Seite behält ihre Session-/Binding-Prüfungen.
Die öffentliche Vorschau hat keinen Zugriff auf private Betriebsdaten.

## Folgeaufgaben

P1-11b: Ziel eingeben, Beispiel-Lauf verfolgen, Tool-Aufruf ansehen und
Beispiel-Freigabe prüfen, mit ausdrücklich erfundenen Daten und Zod-Verträgen.
P1-11c: echte Anmeldung/Betriebsdaten, Audit und Freigaben erst nach den
gemergten Backend-Abhängigkeiten. Streaming mit echten Agenten benötigt den
Agenten-Kern. Diese Aufgaben sind nicht Teil der P1-11a-Abnahme.

## Abnahme

tests/e2e/dashboard.spec.ts prüft Navigation, aktive Seite, Sidebar,
Tastatursuche, Escape/Fokusrückgabe, Hell-/Dunkelmodus, Axe,
Mobilnavigation bei 390px und Überlauffreiheit bei 320px sowie 404.
Bestehende Auth-Tests prüfen weiter die geschlossenen Routen ohne Auth-Konfiguration.
Bestanden: Lint, 15 Typecheck-Tasks, alle zehn Build-Tasks, 54 Unit-Tests,
Storybook-Build, vier Startprüfungen, vier Receiver-Tests und neun Browser-Tests.
Der bekannte optionale Auth0-DPoP-Import erzeugt weiterhin eine Build-Warnung.

Der erste Integrationstest-Lauf hatte einen Temporal-Starttimeout; der isolierte
Neustart-/Retry-/Timeout-Lauf bestand danach mit drei Tests. Ein weiterer
Standardlauf hatte elf erfolgreiche Tests und eine PostgreSQL-Katalogkollision
("tuple concurrently updated") bei gleichzeitigem Migrieren separater
Testdatenbanken. Die Integration wird deshalb zusätzlich ohne Dateiparallelität
geprüft; das Ergebnis wird vor der Übergabe eingetragen. Keine Migration oder
Backend-Funktion wird für diese Frontend-Aufgabe geändert.

## Visueller Vergleich

Die vom Gründer vorgegebene Referenz ist der Starter-Quellcode mit seinem
Repository-Bild public/shadcn-dashboard.png, kein neuer generierter Entwurf.
Die Live-Demo verlangt eine Anmeldung und wurde nicht als angemeldeter Nutzer
bedient. Aufbau und Komponenten sind anhand der festgehaltenen Quellrevision
implementiert und visuell geprüft.

Im eingebauten Browser wurden die Übersicht, eingeklappte Sidebar,
Suchfilter und Navigation zu Freigaben geprüft. Der korrigierte Suchdialog
fokussiert das Eingabefeld. Playwright übernimmt die automatische Abnahme und
exportiert die aktuellen Screenshots nach .cache/frontend-preview.
Referenz sowie aktuelle Desktop-/Mobil-Screenshots wurden mit view_image geprüft.
Desktop: 1440×1000; eingebauter Browser: 1265×712; Mobil: 390×844 und
Überlaufprüfung 320×740. Das 3200×1600-Repository-Bild ist eine Werbemontage,
kein einzelner Screen; ein pixelidentischer Vergleich in dessen Größe ist
deshalb nicht sinnvoll.

| Vergleichspunkt | Referenz / Umsetzung / Bewertung |
|---|---|
| Sidebar | 16rem und kompakte Icon-Leiste wie im Starter; 256/64px, gruppierte Navigation und aktive Seite geprüft |
| Header | 56px, Sidebar-Trigger, Breadcrumb, Suche und Theme-Toggle übernommen; kein Marketing-Hero |
| Raster | Vier Kennzahlenkarten und 4:3-Aufteilung aus overview/layout.tsx; mobil zwei Karten pro Zeile, schmale Geräte eine |
| Komponenten | Card/Table-Code übernommen; die fehlende gemeinsame Tailwind-Quellerfassung wurde korrigiert |
| Typografie und Farbe | Kompakte 14px-Bedienoberfläche, 26px-Seitentitel; Bricolage/Signal-Orange gemäß bestehender Markenentscheidung |
| Inhalte | Deutsche Fachnavigation und Vorschau-/Leertexte statt fiktiver Umsatz-/Kundenzahlen; bewusste fachliche Anpassung |
| Interaktion | Suche, Escape/Fokus, Sidebar, Theme und mobile Navigation geprüft; Theme/Sidebar bleiben beim Seitenwechsel erhalten |

Textvergleich der sichtbaren Übersicht: alle sechs Navigationseinträge, Titel,
Vorschauhinweise und vier Kennzahlenbeschriftungen geprüft; keine unbelegten
Leistungs- oder Umsatzangaben. Beabsichtigte Abweichungen sind Marke, deutsche
Fachtexte, Auth0/Radix und ehrliche Leerzustände statt der Beispiel-Charts des
Starters. Kein verbliebener bekannter Darstellungsfehler; die vollständige
Agenten- und Freigabefunktion bleibt eine Folgeaufgabe.
