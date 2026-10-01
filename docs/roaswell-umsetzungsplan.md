# ROASWELL – Umsetzungsplan und Tech-Stack

**Stand:** 1. Oktober 2026
**Status:** Freigegebener Plan gespeichert; R0 implementiert und lokal abgenommen ([Nachweis](roaswell-r0.md)). Regulärer Merge bleibt Voraussetzung für Folgeaufgaben. R1–R11 sind nicht als implementiert oder abgenommen zu verstehen.
**Aufgaben:** [Abhängige Einzelaufgaben](roaswell-aufgaben.md)
**Entscheidungen:** [Architektur](adr/0010-roaswell-operating-system.md), [Budgets](adr/0011-approved-budget-envelopes.md), [Sichtbarkeit](adr/0012-customer-visibility-and-publication.md).

## 1. Zielbild und verbindliche Produktentscheidungen

ROASWELL erhält ein internes Betriebssystem für den vollständigen Betrieb einer Marketingagentur durch einen Gründer, interne KI-Automatisierungen und externe KI-Agenten.

Verkauft werden Agenturleistungen. Kunden erhalten ein eigenes Frontend und ausschließlich Zugriff auf ihre freigegebenen Daten. ROASWELL selbst wird als regulärer Kunde mit separater Kundenansicht geführt.

### Kostenloser Einstieg

1. Ein Interessent gibt seine Unternehmenswebsite ein.
2. Eine Hintergrundverarbeitung untersucht öffentlich zugängliche Inhalte und erstellt ein erstes Unternehmensprofil.
3. Logo, Farben und Unternehmenswissen personalisieren eine kleine interaktive Marketingübersicht.
4. Diese zeigt bereits konkrete Beobachtungen und zwei bis drei begründete Chancen.
5. Die Registrierung speichert den bisherigen Stand und schaltet die vollständige Einstiegsanalyse frei.
6. Individuelle Rückfragen ergänzen fehlendes Wissen.
7. Intern entstehen ein Leistungspaket und ein Angebotsentwurf zur Gründerprüfung.
8. Der Interessent kann einen Gesprächstermin buchen. Angebot und Preise bleiben bis zur ausdrücklichen Veröffentlichung intern.
9. Nach Beauftragung wird derselbe Bereich um die laufende Zusammenarbeit erweitert.

### Adaptive Inhalte

Keine starren Branchenformulare. Die KI erzeugt unternehmensbezogene Fragen, Wissensfelder, Analyseabschnitte und Maßnahmen.

Ein festes technisches Grundgerüst definiert Identität, Rechte, Quellen, Versionen, Zustände und Freigaben. Individuelle Inhalte werden darin strukturiert gespeichert und validiert.

Die KI verwendet geprüfte UI-Bausteine. Sie erzeugt keine ausführbaren Oberflächen oder beliebigen HTML-Code.

### Automatisierung und Freigaben

| Aktion | Regel |
|---|---|
| Recherche, Entwürfe, interne Aufgaben | Automatisch innerhalb der Berechtigungen |
| Projektfortschritt | Sofort im Kundenportal, sofern kundenrelevant |
| Berichte und Analysen | Nach bestandener automatischer Qualitätsprüfung |
| Unzureichend belegte Ergebnisse | Interne Prüfung erforderlich |
| Angebotsveröffentlichung | Gründerfreigabe |
| Externe Inhalte und Kampagnen veröffentlichen | Gründerfreigabe; vereinbarte Kundenfreigaben zusätzlich |
| Geld ausgeben | Innerhalb ausdrücklich genehmigter Budgetrahmen |
| Neue Verpflichtung oder Budgetüberschreitung | Neue Gründerfreigabe |

Budgetrahmen enthalten Zweck, Kunde beziehungsweise ROASWELL-Betrieb, Anbieter, Zeitraum sowie Gesamt- und Aktionslimits. Ohne genehmigten Rahmen beträgt das verfügbare Budget null.

Diese Entscheidung ersetzt für die zukünftige Implementierung die bisherige Pflicht zur Einzelgenehmigung jeder Geldwirkung. requestApproval bleibt der zentrale Einstieg für Budgetgenehmigungen und Ausnahmen. Bis zur technischen Budgetabnahme werden reale Geldwirkungen weiter einzeln gesperrt. Produktionsdeployments und Rechtstexte bleiben menschliche Aufgaben.

## 2. Architektur und Tech-Stack

Die bestehende Monorepo-Grundlage wird weiterverwendet. Ausgangspunkt ist main a92989e35e04bcc01fe133bca64af6557cf9eb8e. Gate 0 ist dokumentiert bestanden. Datenmodell, Vertragsgenerierung, Hono-API, Temporal-Beispiel und Auth0 sind inzwischen gemergt; Kundenportal, adaptive Analyse, Budgetdurchsetzung und vollständiger Agenturbetrieb fehlen noch.

Die ursprünglichen lokalen P0-7-Änderungen und die offenen PRs #14 und #15 gehören zu anderen Aufgaben. R0 übernimmt oder überschreibt sie nicht.

**Korrektur gegenüber dem Gesprächsplan:** Der Gründer hat Auth0 ausdrücklich erneut bestätigt. Die bereits implementierte Auth0-Integration wird weiterverwendet; Clerk wird nicht eingeführt.

| Ebene | Festlegung |
|---|---|
| Sprache und Workspace | TypeScript, Node.js 22 gemäß bestehender Vorgabe, pnpm 10.29.1, Turborepo |
| Marketingwebsite | Bestehende Next.js-App |
| Agenturoberfläche | Bestehende Next.js-App |
| Kundenportal | Neue, separat deploybare Next.js-App |
| UI | React, Tailwind CSS, vorhandene shadcn-Komponenten und gemeinsame Design-Tokens |
| Backend | Hono; zentrale fachliche Dienste für UI, REST und MCP |
| Verträge | Zod als einzige Vertragsquelle; daraus Typen, OpenAPI und MCP-Eingaben ableiten |
| Datenbank | PostgreSQL mit pgvector; Drizzle für Datenzugriff und Vorwärtsmigrationen |
| Flexible Kundeninhalte | Versionierte JSONB-Dokumente mit validierten Inhaltsbausteinen |
| Hintergrundarbeit | Temporal mit TypeScript-Workern; selbst gehosteter Server |
| Redis | Rate-Limits, kurzlebige Caches und Ereignisverteilung |
| Echtzeit | Server-Sent Events; persistierte Ereignisse ermöglichen Wiederaufnahme |
| Anmeldung | Bestehendes Auth0 vervollständigen; fachliche Rechte bleiben in ROASWELL |
| KI | Provideradapter; erster Adapter für OpenAI, Modellkennungen und Prompts versioniert |
| Crawling | HTTP-Abruf und HTML-Auswertung; isolierter Playwright-Worker für notwendige JavaScript-Seiten |
| Medien | Privater Cloudflare-R2-Speicher über S3-kompatiblen Adapter |
| Bild-/Videoverarbeitung | Sharp und FFmpeg in getrennten, begrenzten Workern |
| Terminbuchung | Cal.com über Adapter und verifizierte Webhooks |
| E-Mail | SMTP-Adapter; Mailpit lokal, Betreiber-SMTP im Live-Betrieb |
| MCP | Offizielles TypeScript-SDK, Streamable HTTP, authentifizierter Remote-Zugriff |
| Tests | Vitest, echte PostgreSQL-Integrationstests, Playwright und Axe |
| Betrieb | Docker Compose, bestehender Traefik, GitHub Actions, versionierte Containerimages |
| Monitoring | OpenTelemetry-Instrumentierung, strukturierte Logs, Prometheus und Grafana |

Next.js wird hinter dem Reverse Proxy betrieben. Temporal erhält eine reguläre Serverinstallation; der lokale Entwicklungsserver wird nicht für den Live-Betrieb übernommen. Referenzen: [Next.js Self-Hosting](https://nextjs.org/docs/app/guides/self-hosting), [Temporal Self-Hosting](https://docs.temporal.io/self-hosted-guide).

Die gewählten externen Schnittstellen werden hinter Adaptern gekapselt. Referenzen: [R2](https://developers.cloudflare.com/r2/), [Cal.com API](https://cal.com/docs/api-reference/v2/introduction), [MCP Authorization](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization), [Auth0](https://auth0.com/docs/quickstart/webapp/nextjs).

### Fachliche Struktur

- **Organisationen und Mitgliedschaften:** Interessenten, Kunden, ROASWELL-Eigenkunde und interne Gründerrolle.
- **Wissen:** Quellen, Beobachtungen, Vermutungen, bestätigte Angaben, dynamische Fragen und Antworten.
- **Vertrieb:** Analysen, Termine, Leistungskatalog, Kalkulationsregeln und Angebotsversionen.
- **Lieferung:** Projekte, Aufgaben, Briefings, Nachrichten, Medienversionen und Freigaben.
- **Marketing:** Kampagnen, Creatives, Kennzahlen, Experimente und Optimierungsvorschläge.
- **Finanzen:** Rechnungen, Kosten, Budgetrahmen, Reservierungen und Ausgabenbelege.
- **Automatisierung:** Auslöser, Aufträge, Agentenläufe, externe Verbindungen und Audit-Ereignisse.

Alle kundenbezogenen Datensätze erhalten eine Organisationszuordnung. PostgreSQL-RLS und serverseitige Berechtigungen sichern die Trennung. Auch Suchergebnisse, Hintergrundjobs, Dateien und Echtzeitereignisse unterliegen dieser Prüfung.

ROASWELL-interne Kalkulationen, Agentennotizen und Angebotsentwürfe werden nicht in Kundenantworten aufgenommen. Die Gründerrolle erhält kontrollierten organisationsübergreifenden Zugriff; die ROASWELL-Kundenansicht verwendet normale Kundenrechte.

### Öffentliche Schnittstellen

- Versionierte REST-API unter /v1 mit generierter OpenAPI-Dokumentation. Bestehende unversionierte Endpunkte werden erst durch eine gesondert getestete Kompatibilitätsaufgabe abgelöst.
- MCP-Tools für Wissen, Aufgaben, Medien, Nachrichten, Analyse, Freigaben und Budgetaktionen.
- Eigene Ressourcenansichten für Kundenzugriff; keine Weitergabe interner Datenmodelle.
- Rechte für externe Agenten nach Organisation und Aktion, einschließlich Ablauf und Widerruf.
- Dokumentierte Fehler, Pagination, Idempotenz und synthetische Beispiele.
- Signierte Webhooks mit Wiederholungsschutz für Termine, Integrationen und Statusänderungen.
- Gemeinsame fachliche Dienste verhindern abweichende Regeln zwischen REST, MCP und Oberfläche.

## 3. Umsetzung in abhängigen Etappen

Jede Tabellenzeile ist ein Meilenstein. [Einzelaufgaben](roaswell-aufgaben.md) definieren Ergebnis, Abhängigkeiten und automatische Abnahme. Jede Aufgabe erhält einen eigenen Branch und PR. Eine Folgeaufgabe beginnt erst nach Merge ihrer Abhängigkeiten. Schema- und Datenmodelländerungen erfolgen nacheinander.

| Etappe | Ergebnis | Abnahme |
|---|---|---|
| **R0 – Planung und Namenswechsel** | Plan speichern; ADRs für Architektur, Budgets und Sichtbarkeit; ROASWELL-Namen und Paketreferenzen aktualisieren | Workspace baut; bestehende Abnahmen bleiben grün; Infrastrukturressourcen werden nicht versehentlich umbenannt |
| **R1 – Identität und Rechte** | Kundenportal, Anmeldung, Organisationen, Mitgliedschaften, RLS, Audit und ROASWELL-Eigenkunde | Kunde A kann weder Daten noch Dateien oder Ereignisse von Kunde B lesen; Kunden erreichen keine Gründerfunktionen |
| **R2 – Wissen und Dateien** | Quellen, flexible Wissensfelder, Fragen, Antworten, Uploads, Versionen und Themenpersonalisierung | Fakten und Vermutungen bleiben unterscheidbar; private Dateien sind nur berechtigt abrufbar |
| **R3 – Workflows und KI-Grundlage** | Temporal, Modelladapter, versionierte Prompts, strukturierte Ausgaben, Kostenmessung und Qualitätsprüfungen | Abbruch, Neustart und Wiederholung verlieren keine Ergebnisse und erzeugen keine doppelten Aktionen |
| **R4 – Kostenloser Einstieg** | Crawling, erste interaktive Übersicht, Registrierung und vertiefte Analyse | Vollständiger Ablauf mit mehreren unterschiedlichen Geschäftsmodellen; Recherchefehler führen zu ergänzenden Fragen |
| **R5 – Vertrieb** | Leistungskatalog, interne Kalkulation, Angebotsentwürfe, Gesprächsvorbereitung und Terminbuchung | Interessent sieht niemals interne Preise; Terminänderungen werden korrekt übernommen |
| **R6 – Agenturbetrieb** | Heute-Ansicht, Kundenakte, Projekte, Aufgaben, Nachrichten, wiederkehrende Leistungen und Kundenanfragen | Kundenanfrage wird bearbeitet, verfolgt und im Portal beantwortet; Eigentümer und Fristen sind nachvollziehbar |
| **R7 – Medienproduktion** | Briefing-to-Asset-Abläufe, Video-/Bildversionen, zeitbezogenes Feedback und Freigaben | Freigegebene Version bleibt eindeutig; spätere Änderungen benötigen neue Freigaben |
| **R8 – Externe Agenten** | REST-Dokumentation, MCP, Berechtigungen, Auftragsübergabe und Notbremse | Externer Testagent bearbeitet einen Auftrag; Widerruf verhindert weitere Aktionen |
| **R9 – Budgets und Kampagnen** | Budgetrahmen, Kostenreservierung, Meta-/Google-Ads-Adapter und Veröffentlichungsgates | Parallele Aktionen überschreiten kein Limit; Sandbox-Test erzeugt keine doppelte Kampagne |
| **R10 – Performance und Finanzen** | Search Console, GA4 und Ads-Daten; Berichte, Rechnungen und Kundenwirtschaftlichkeit | Quellen und Datenstand sichtbar; Agenturhonorar, Ad Spend und Betriebskosten getrennt |
| **R11 – Betriebsabnahme** | Monitoring, Backups, Restore, Lasttests, Betriebsdokumentation und Pilot mit ROASWELL | Durchgängiger Ablauf vom Interessenten bis zum Bericht und Rechnungsentwurf; VPS-Neustart und Wiederherstellung bestanden |

### Besondere Implementierungsregeln

**Crawling:** Öffentliche HTTP-/HTTPS-Seiten, robots.txt berücksichtigen, keine Login- oder Zugriffshürden umgehen. Private Netzadressen, Metadatenendpunkte und entsprechende Redirects blockieren. Fremde Seiteninhalte gelten als Daten und niemals als Agentenanweisungen.

Für den kostenlosen Einstieg gelten initial höchstens 20 Seiten; nach Registrierung höchstens 100 Seiten. Große Websites werden priorisiert untersucht. Die Oberfläche nennt den untersuchten Umfang.

**Analyse:** Aussagen benötigen Quellen oder eine Kennzeichnung als Annahme. Keine erfundenen Rankings, Umsätze, Conversion-Raten oder ROAS-Werte. Qualitätsfehler stoppen die automatische Veröffentlichung des betreffenden Ergebnisses.

**Personalisierung:** Logo und Akzentfarben übernehmen; Kontrast und Bedienbarkeit prüfen. Schrift und Grundlayout bleiben ROASWELL-weit einheitlich. Der Kunde kann erkannte Angaben korrigieren.

**Angebote:** Leistungen werden adaptiv zusammengestellt, Preise aus freigegebenem Leistungskatalog und Kalkulationsregeln abgeleitet. Fehlende Regeln erzeugen einen unbepreisten internen Entwurf mit offenen Punkten.

**Budgetaktionen:** Vor Ausführung atomar reservieren, anschließend tatsächliche Kosten abgleichen. Unbekannter Ausgang einer externen Aktion blockiert die Reservierung bis zur Klärung. Wiederholungen dürfen keine erneute Ausgabe erzeugen. Kundenbudgets und ROASWELL-Betriebskosten bleiben getrennt.

**Performance:** Plattformdaten getrennt speichern; Umsätze und Conversions verschiedener Plattformen nicht unbesehen addieren. Anzeigenberichte zeigen Quelle, Zeitraum und Aktualisierungsstand.

## 4. VPS-Deployment und Betrieb

### Deployment-Modell

- Bestehendes VPS-Staging weiterverwenden.
- Eigenständige Compose-Projekte und Datenvolumes für Staging und später Produktion.
- Neue ROASWELL-Hosts als Konfiguration; bestehende DNS-Namen bleiben bis zur kontrollierten Umstellung bestehen.
- Öffentliche Dienste: Website, Agenturoberfläche, Kundenportal sowie berechtigte API-/MCP-Endpunkte.
- PostgreSQL, Redis, Temporal und Betriebsoberflächen bleiben privat.
- Worker für normale Abläufe und ressourcenintensive Browser-/Medienarbeit werden getrennt betrieben.
- Externe APIs übernehmen Modellinferenz; keine lokalen KI-Modelle erforderlich.

**Initiale Planungsgröße für den vollständigen eigenen Stack:** 8 vCPU, 16 GB RAM, 160 GB SSD. Dies ist eine Kapazitätshypothese, keine Bestätigung der vorhandenen VPS-Kapazität und keine Bestellung.

Vor Erweiterung wird die freie Kapazität des bestehenden Hosts gemessen. Die bisherigen Staging-Grenzen von 2,5 GiB RAM reichen nicht als Planungsgrundlage für den vollständigen Stack. Fremde Dienste werden nicht verändert.

Browser-/Medienjobs starten zunächst mit Parallelität eins. Größere Verarbeitung wird über die Warteschlange abgearbeitet; Produktionsfreigabe erfordert einen Lasttest einschließlich gleichzeitig genutzter Kundenportale.

### Release-Ablauf

1. CI führt Lint, Typecheck, Tests, Build, Secret-Scan und Browserabnahme aus.
2. Fertige Images werden mit unveränderlicher Revision bereitgestellt.
3. Vor Migration erfolgt eine überprüfbare Sicherung.
4. Vorwärtsmigrationen laufen separat mit erweiterten Datenbankrechten.
5. Anwendungen starten mit eingeschränkten Laufzeitrollen.
6. Health-, HTTPS- und fachliche Smoke-Tests prüfen den Release.
7. Bei Fehlern werden vorherige Anwendungsimages wiederhergestellt; Migrationen werden nicht zurückgedreht.

Migrationen müssen mit vorherigem und neuem Anwendungsstand kompatibel sein. Automatisches Staging bleibt möglich. Produktion wird erst nach menschlicher Releasefreigabe deployt.

### Backups und Überwachung

- Verschlüsselte tägliche Datenbanksicherung außerhalb des VPS.
- Produktionsziel: RPO höchstens 24 Stunden, RTO höchstens vier Stunden.
- Aufbewahrung: 30 tägliche und zwölf monatliche Sicherungen.
- Dateien erhalten eine unabhängige Sicherung außerhalb des primären Buckets.
- Monatlicher Restore-Test umfasst Datenbank, Dateiablage und laufende Workflows.
- Die bisherigen kleinen GitHub-Backup-Artefaktgrenzen werden vor Kundennutzung ersetzt.
- Alarme für Speicherplatz, fehlgeschlagene Workflows, veraltete Integrationsdaten, Budgetabweichungen und ausgefallene Backups.
- Audit-Daten bleiben fachlich nachvollziehbar; Logs enthalten keine Secrets oder vollständigen Kundeninhalte.

Der Einzel-VPS bleibt ein Ausfallpunkt. Für den ersten Betrieb wird dies mit getesteter Wiederherstellung akzeptiert; Hochverfügbarkeit ist kein Bestandteil dieses ersten Plans.

## 5. Tests, Freigabegates und Betriebsannahmen

### Verbindliche Tests

- Mandantentrennung über REST, MCP, Datenbank, Suche, Dateien und Echtzeit.
- ROASWELL-Kundenansicht ohne Gründerrechte.
- Dynamisches Onboarding für Restaurant, Shop, B2B-Dienstleister und Unternehmen mit gemischten Angeboten.
- Quellenbindung, Rückfragen und Korrekturen an der Wissensbasis.
- Crawl-Timeouts, private Zieladressen, Redirects und manipulierte Website-Inhalte.
- Wiederholte Registrierung, Webhooks und Workflow-Neustarts ohne Duplikate.
- Verbergen interner Angebote und Kalkulationen auch in Downloads und Suchergebnissen.
- Parallele Ausgaben, abgelaufene Budgets, unklarer Zahlungsstatus und Notbremse.
- Medienversionen, Freigaben und verweigerte Veröffentlichung.
- Ausfall externer Anbieter sowie Wiederaufnahme nach VPS-Neustart.
- Backup-Restore und Rückkehr zum vorherigen Anwendungsrelease.

Jede Aufgabe gilt erst mit grünen Pflichtprüfungen und automatischer fachlicher Abnahme als abgeschlossen. Externe Funktionen erhalten zusätzlich echte Sandbox-Abnahmen; fehlende Zugänge bleiben ausdrücklich offen.

### Festgelegte Defaults

- Oberfläche zunächst Deutsch; Kundeninhalte können mehrsprachig sein.
- Gründerrolle plus Kundenadministrator und Kundenmitglied.
- Auth0 authentifiziert Personen und Agenten; ROASWELL verwaltet fachliche Organisationsrechte.
- API/MCP ermöglicht externe Agenten sowohl interaktiv als auch automatisiert.
- Automatisierungen starten durch Ereignisse und Zeitpläne; direkte Aufträge sind ebenfalls möglich.
- Kostenpflichtige öffentliche Analysen benötigen einen genehmigten ROASWELL-Budgetrahmen.
- Registrierung und Zahlung an ROASWELL bleiben getrennt; kein automatischer Checkout.
- Keine vollständige Buchhaltungssoftware: Rechnungen, Zahlungsstände und Exporte; steuerliche Abwicklung bleibt beim Buchhaltungssystem.
- Kein eigener Videoschnitt-Editor: Medienverwaltung, Feedback, Verarbeitung und externe Produktion.
- Keine feste Branchenliste und keine unbegründeten Gesamtscores.
- Keine neue bezahlte Ressource wird durch diesen Plan automatisch bestellt.

Vor Live-Nutzung müssen Betreiberkonfiguration, Anbieterzugänge, Euro-Limits, Kalkulationsregeln, Domains und erforderliche Datenschutzfreigaben vorliegen. Fehlende Werte deaktivieren die betreffende Funktion; sie werden nicht durch erfundene Angaben ersetzt.
