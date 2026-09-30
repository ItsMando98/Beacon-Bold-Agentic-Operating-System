# Beacon & Bold – Agentic Operating System

Sep 30, 2026 · @Mathis

Beacon & Bold läuft als agentengeführte Agentur: Ein Team spezialisierter KI-Agenten führt alle operativen Prozesse über eine gemeinsame Daten- und Tool-Schicht, Menschen setzen nur Strategie, Freigaben und Ausnahmen.

## Leitidee

Beacon & Bold baut kein Tool für Mitarbeiter, sondern ein System, das Agenten bedienen. Jede Funktion hat zuerst eine API und ein Tool-Schema, die Oberfläche für Menschen ist nur ein Sichtfenster darauf. Die Agentur ist ihr eigener Referenzkunde: Alles, was wir Kunden verkaufen, läuft zuerst bei uns.

1. **Agent-first, UI-second.** Jede Aktion ist per API/MCP aufrufbar, dokumentiert und maschinenlesbar. Menschen nutzen dieselben Endpunkte über ein Dashboard.
2. **Ein gemeinsames Gedächtnis.** Kunden, Kampagnen, Assets, Verträge und Ergebnisse liegen in einer Datenschicht, auf die alle Agenten zugreifen.
3. **Menschen setzen Ziele, Agenten führen aus.** Der Mensch definiert Strategie, Budgetrahmen und Marke; Agenten planen, produzieren, schalten und rechnen ab.
4. **Autonomie in Stufen.** Jede Aufgabe hat einen Autonomiegrad (Vorschlag, Freigabe, autonom), der mit nachgewiesener Qualität steigt.
5. **Alles nachvollziehbar.** Jede Agentenaktion wird mit Grund, Eingaben und Ergebnis protokolliert.
6. **Selbst zuerst.** Neue Funktionen gehen erst bei Beacon & Bold live, dann zu Kunden. So entstehen echte Fallstudien.

## Leistungen und Preismodelle

Vorschlag: Beacon & Bold startet als fokussierte Wachstumsagentur mit drei Kernleistungen, die ineinandergreifen, und erweitert erst, wenn die Agenten sie zuverlässig betreiben.

| Stufe | Leistung | Inhalt | Warum |
| --- | --- | --- | --- |
| Start | Meta Ads | Kampagnenaufbau, Creative-Tests, Budgetsteuerung, tägliches Reporting | Klar messbar, schnell im Ergebnis, passt zur Positionierung |
| Start | SEO-Content | Themenrecherche, Briefing, Texte, Veröffentlichung, laufende Aktualisierung | Baut Reichweite auf, gut durch Agenten automatisierbar |
| Start | KI-Creatives und UGC | KI-Creator und Avatare für Anzeigen und Social Posts | Liefert Material für Meta Ads und nutzt die Modellverwaltung |
| Start | Einstiegs-Audit | Analyse von Anzeigenkonto, Website und Inhalten mit Maßnahmenplan | Niedrige Hürde, führt in ein Retainer-Modell |
| Später | E-Mail- und Lifecycle-Marketing | Sequenzen, Nurturing, Tests | Ergänzt Ads und SEO, sobald Kundendaten vorliegen |
| Später | Google Ads und TikTok | Weitere bezahlte Kanäle | Erst nach stabilem Betrieb von Meta Ads |
| Später | Social-Media-Management, Landingpage-Optimierung, Reporting-Dashboard | Zusatzmodule | Ausbau nach Kundenbedarf |

Abgerechnet wird situationsabhängig. Der Finanz-Agent schlägt pro Kunde ein Modell vor, innerhalb von Preiskorridoren, die die Gründer festlegen.

| Modell | Funktionsweise | Passt, wenn |
| --- | --- | --- |
| Retainer | Fester Monatspreis für einen definierten Leistungsumfang | Kontinuierliche Arbeit wie Ads-Betrieb und SEO |
| Paket oder Projekt | Festpreis für ein abgegrenztes Ergebnis, zum Beispiel Audit oder Launch | Einstieg und klar begrenzte Aufgaben |
| Performance-Anteil | Anteil am Werbebudget oder Preis je Lead oder Kauf | Kunde will Risiko teilen und Daten sind sauber messbar |
| Ergebnisbasiert | Bonus oder Vergütung bei Erreichen eines vereinbarten Ziels, oft als Mischform mit Retainer | Ziel und Messung sind eindeutig vereinbart |

## Architektur

&#91;embedded content: Architektur · 5 Schichten\]

Der Orchestrator verteilt Aufgaben an Fachagenten. Alle greifen nur über die Schnittstelle mit Rechten, Budget und Audit auf die gemeinsame Daten- und Tool-Schicht zu, dieselbe Schnittstelle nutzen externe Agenten.

## Agenten-Team

Ein Orchestrator-Agent verteilt Aufgaben an spezialisierte Agenten, die jeweils eigene Tools, Rechte und ein Budget haben. Der Autonomiegrad startet konservativ und wird pro Aufgabe hochgestuft.

| Agent | Aufgabe | Wichtigste Tools | Start-Autonomie |
| --- | --- | --- | --- |
| Orchestrator | Ziele in Aufgaben zerlegen, priorisieren, Agenten koordinieren | Aufgaben-Queue, Kalender, alle Agenten | Autonom, mit Tageslimit |
| Strategie-Agent | Marktanalyse, Positionierung, Kanalmix, Kampagnenplan | Web-Recherche, Analytics, Wettbewerbsdaten | Vorschlag, Mensch gibt frei |
| Ads-Agent | Kampagnen in Meta, Google, TikTok aufsetzen, Gebote und Budgets steuern | Werbe-APIs, Reporting | Autonom im Budgetrahmen |
| Content-Agent | Blog, SEO, Newsletter, Social Posts erstellen und planen | CMS, SEO-Tools, Social-APIs | Freigabe für neue Marken, danach autonom |
| UGC-Agent | KI-Creator und Avatare verwalten, Videos und Bilder erzeugen | Bild-/Videomodelle, Asset-Bibliothek | Freigabe je Kunde |
| Sales-Agent | Leads finden, qualifizieren, Erstgespräche buchen | CRM, E-Mail, Kalender | Autonom bis Termin |
| Onboarding-Agent | Briefing, Zugänge, Verträge, Kick-off | Formulare, E-Signatur, Chat | Autonom |
| Account-Agent | Kundenkommunikation, Berichte, Rückfragen | E-Mail, Chat, Dashboards | Autonom, Eskalation bei Konflikt |
| Projekt-Agent | Aufgaben, Fristen, Ressourcen, Status | Projektboard, Kalender | Autonom |
| Finanz-Agent | Angebote, Rechnungen, Mahnwesen, Buchhaltung, Steuern | Buchhaltungs-API, Zahlungsanbieter | Vorschlag, Mensch gibt Zahlungen frei |
| QA- und Compliance-Agent | Markenprüfung, Rechtsprüfung, Faktencheck vor Veröffentlichung | Regelwerk, Prüf-Modelle | Blockiert bei Verstoß |
| Analyse-Agent | Ergebnisse auswerten, Tests steuern, Lernschleife | Data Warehouse, Experimente | Autonom |

## Module

Jedes Modul besteht aus Daten, Tools für Agenten und einem Ergebnisziel. Der Mensch sieht nur Freigaben, Ausnahmen und Kennzahlen.

### Marketing (für uns und für Kunden)

- **Ads:** Der Ads-Agent legt Kampagnen an, testet Creatives, verschiebt Budget nach Ergebnis und berichtet täglich.
- **Social Media:** Redaktionsplan, Posting, Community-Antworten und Auswertung laufen über einen Content-Agenten pro Marke.
- **E-Mail:** Newsletter, Sequenzen und Lead-Nurturing mit automatischen Tests von Betreff und Timing.
- **SEO-Content:** Themenrecherche, Briefing, Text, Veröffentlichung und Aktualisierung in einer Schleife.

### Sales und CRM

- Der Sales-Agent findet Zielkunden je Region, schreibt personalisiert an, qualifiziert und bucht Termine.
- Das CRM ist die einzige Wahrheit über Kunden. Jede Interaktion wird automatisch erfasst und zusammengefasst.

### Onboarding

- Kunde bucht oder unterschreibt, der Onboarding-Agent führt das Briefing per Chat, sammelt Zugänge, richtet Projekt, Konten und Berichte ein und plant den Kick-off.
- Ziel: vom Vertrag bis zur ersten Kampagne ohne manuellen Schritt.

### KI-Modelle und UGC

- Verwaltung von KI-Creatorn und Avataren pro Kunde: Look, Stimme, Tonalität, Nutzungsrechte und Freigabestatus.
- Der UGC-Agent erzeugt Videos, Bilder und Skripte, prüft sie gegen Markenregeln und legt sie in der Asset-Bibliothek ab.
- Alle KI-Inhalte werden gekennzeichnet und mit Herkunft gespeichert (Modell, Prompt, Version).

### Projektmanagement

- Der Projekt-Agent erstellt aus Kampagnenplänen Aufgaben, weist sie Agenten oder Menschen zu, überwacht Fristen und meldet Risiken früh.

### Abrechnung und Buchhaltung

- Angebote, Verträge, Rechnungen, Zahlungsabgleich und Mahnungen laufen automatisch. Abrechnung nach Retainer, Leistung oder Ergebnis wird konfigurierbar.
- Belege werden erfasst und kategorisiert, die Buchungen gehen an eine Buchhaltungs-API. Steuerberater oder Mensch geben Monatsabschluss und Zahlungen frei.

## Schnittstellen für Agenten

Damit Grok-Bots, Claude, GPT und eigene Agenten das System ohne Anpassung nutzen, folgt es offenen Standards statt eigener Formate.

- **MCP-Server:** Jedes Modul stellt seine Funktionen als Tools bereit (zum Beispiel `create_campaign`, `send_invoice`, `book_meeting`). Jeder MCP-fähige Agent kann sie direkt aufrufen.
- **REST- und Webhook-API mit OpenAPI-Schema:** Für Agenten und Systeme ohne MCP. Das Schema ist maschinenlesbar und bildet die Basis für Function Calling bei jedem Anbieter.
- **Agent-zu-Agent-Protokoll:** Aufgaben werden als strukturierte Aufträge mit Ziel, Budget, Frist und Erfolgskriterium übergeben. Externe Agenten können so Aufträge an Beacon & Bold vergeben.
- **Identität und Rechte:** Jeder Agent hat eine eigene Identität mit Scopes, Budget und Ablaufdatum. Es gibt keine geteilten Schlüssel.
- **Ereignisstrom:** Alle Zustandsänderungen (neuer Lead, Kampagne live, Rechnung bezahlt) erscheinen als Events, auf die Agenten reagieren.
- **Selbstbeschreibung:** Eine öffentliche Datei mit Fähigkeiten, Preisen und Grenzen des Dienstes, damit fremde Agenten Beacon & Bold selbst finden und beauftragen können.
- **Modellunabhängig:** Die Agenten-Schicht ist nicht an einen Modellanbieter gebunden. Ein Router wählt je Aufgabe das passende Modell nach Qualität und Kosten.

## Tech-Stack

Ein durchgängiger TypeScript-Stack mit dauerhafter Workflow-Engine im Zentrum: Bei einer agentengeführten Agentur entscheidet die Zuverlässigkeit langer Agenten-Abläufe mehr als die Wahl des Frameworks. Die Einschätzung beruht auf meinem Wissensstand bis Mitte 2026, Versionen und Preise sind vor der Festlegung zu prüfen.

| Schicht | Empfehlung | Begründung |
| --- | --- | --- |
| Frontend | Next.js (App Router), TypeScript, Tailwind, shadcn/ui | Größtes Ökosystem, Server Components, gut für SEO. Das bestehende Design System (Tokens, Bricolage Grotesque, JetBrains Mono) wird als Tailwind-Tokens übernommen. |
| Agenten-UI | Vercel AI SDK, TanStack Query | Streaming, Freigabe-Dialoge und Agenten-Chat ohne Eigenbau. |
| Backend-API | Hono oder Fastify, Zod-Schemas, daraus OpenAPI | Ein Schema erzeugt REST-API, Typen und Tool-Definitionen. Nicht tRPC als Hauptschnittstelle, weil externe Agenten OpenAPI und MCP brauchen. |
| Agenten-Schnittstelle | MCP-Server (offizielles TypeScript-SDK), OAuth 2.1 mit Scopes | Grok-Bots, Claude und andere docken ohne Anpassung an, jeder Agent hat eine eigene Identität. |
| Workflow-Engine | Temporal (leichter: Inngest oder Restate) | Agenten-Aufgaben laufen lange und brauchen Wiederholungen, Wartezeiten und menschliche Freigaben. |
| LLM-Schicht | Claude Agent SDK oder AI SDK hinter einem Modell-Router (LiteLLM oder AI Gateway) | Modellunabhängig, Grok und andere Modelle lassen sich pro Aufgabe wählen. |
| Datenbank | PostgreSQL mit pgvector, Drizzle ORM, Row-Level Security | Eine Datenbank für CRM, Projekte, Verträge und Agenten-Gedächtnis, Vektorsuche eingebaut, Mandantentrennung in der Datenbank. |
| Cache und Events | Redis, später Kafka oder NATS | Zuerst einfach: Events laufen über Postgres (Outbox-Muster). |
| Analytics | ClickHouse, sobald Kampagnendaten wachsen | Schnelle Auswertung über viele Kunden und Regionen. |
| Dateien | S3-kompatibler Speicher (S3 oder Cloudflare R2) | Assets, UGC-Videos, Verträge. |
| Auth für Menschen | WorkOS oder Clerk | SSO und Rollen ohne Eigenbau. |
| Zahlungen und Buchhaltung | Stripe Billing und Stripe Tax, DATEV- oder Lexoffice-Anbindung | Mehrere Währungen und Steuern pro Land. Die Buchhaltungsanbindung pro Land ist der größte Sonderfall. |
| Infrastruktur | Terraform oder Pulumi, zuerst managed (Vercel oder Cloudflare, AWS ECS oder Fly.io), Kubernetes erst bei Bedarf | Skaliert schrittweise und spart am Anfang Betriebsaufwand. EU-Datenhaltung zuerst, weitere Regionen später. |
| Beobachtbarkeit | OpenTelemetry, Grafana, Sentry, Langfuse | Nachvollziehbarkeit und LLM-Evals sind für autonome Agenten Pflicht. |
| Repo und CI | pnpm-Monorepo mit Turborepo, GitHub Actions | Frontend, API, Agenten und geteilte Schemas an einem Ort. |

### Architekturentscheidungen

1. **Schema zuerst.** Jede Funktion wird einmal mit Zod definiert. Daraus entstehen API, MCP-Tool, Dokumentation und Formulare, sodass Mensch und Agent nie auseinanderlaufen.
2. **Dauerhafte Workflows statt Skripte.** Jeder Agenten-Ablauf läuft in der Workflow-Engine mit Wiederholung, Zeitlimit und Freigabe-Schritt. Ein Absturz verliert keinen Zustand, und Freigaben durch Menschen sind ein normaler Schritt.
3. **Eigenes CRM-Kernmodell auf Postgres.** Für volle Agenten-Kontrolle lohnt ein schlanker Eigenbau. Meta, Google, Stripe und E-Mail bleiben Adapter dahinter und lassen sich pro Region austauschen.
4. **Modellunabhängigkeit.** Ein Router wählt das Modell je Aufgabe nach Qualität und Kosten. Kein Anbieter wird zur Abhängigkeit.
5. **Mandanten- und Rechte-Trennung in der Datenbank.** Row-Level Security und Agenten-Scopes verhindern, dass ein Fehler Kundendaten vermischt.
6. **Monolith zuerst, Dienste später.** Ein modularer Monolith mit klaren Modulgrenzen (Marketing, CRM, Finanzen) ist schneller zu bauen. Ein Modul wird erst zum eigenen Dienst, wenn Last oder Team es verlangen.
7. **Python nur bei Bedarf.** Kommen eigene ML-Pipelines hinzu, etwa für Creative-Scoring, läuft das als separater Dienst. Sonst bleibt alles TypeScript, das hält das Team klein.

### Vor der Festlegung prüfen

- [ ] Prototyp-Vergleich Temporal gegen Inngest für einen typischen Ablauf mit Freigabe (zum Beispiel Kampagne anlegen, freigeben, live schalten).
- [ ] Vergleich Hono gegen Fastify bei OpenAPI-Erzeugung und MCP-Anbindung.
- [ ] Datenschutzprüfung der LLM-Anbieter und Hosting-Orte für EU-Kunden.
- [ ] Buchhaltungsanbindung für den ersten Markt klären (Deutschland: DATEV oder Lexoffice).

## Templates und Startpunkte

Als Grundgerüst eignet sich next-forge, ergänzt um AI Elements für die Agent-UI und einen Hono-Starter als Muster für die API. Die Angaben stammen von den Projektseiten und wurden nicht ausprobiert.

| Bereich | Empfehlung | Was dafür spricht | Worauf achten |
| --- | --- | --- | --- |
| Monorepo-Gerüst | [next-forge](https://github.com/vercel/next-forge) | MIT-Lizenz, sechs Apps (Web, App, API, Docs, E-Mail, Storybook), fertige Pakete für Stripe, Resend, Sentry, Analytics, Feature Flags, Cron und Speicher | Standard-Auth ist Clerk. Die eingebaute ORM ist ungeprüft, Drizzle müsste ggf. selbst eingesetzt werden. Die API-App ist nur ein kleiner REST-Server. |
| App-Oberfläche | [next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter) | MIT, Next.js 16, React 19, Tailwind v4, Datentabellen, Kanban, Mandanten über Clerk Organizations, Command-Menü, AI-Chat-Demo | Überschneidet sich mit next-forge. Nur als Vorlage für Komponenten und Layouts nutzen. |
| Agent-UI | [AI Elements](https://elements.ai-sdk.dev/) | Komponenten für Konversation, Prompt-Eingabe, Tool-Aufrufe, Reasoning, Quellen, Artefakte und Workflow-Canvas, Installation per CLI direkt in den Code, baut auf shadcn/ui auf | Lizenz noch nicht geprüft. |
| Chat-Referenz | [vercel/chatbot](https://github.com/vercel/chatbot) | Apache-2.0, gutes Beispiel für Chat-Verlauf, Auth.js, Neon-Postgres und Modellzugriff über AI Gateway | Als Referenz nutzen, nicht als Basis, weil an Vercel-Dienste gebunden. |
| Backend-API | [hono-open-api-starter](https://github.com/w3cj/hono-open-api-starter) | MIT, Hono mit Zod-OpenAPI, Scalar-Doku, Drizzle, Pino-Logging, Vitest | Kleines Projekt, Pflege liegt bei uns. Verweist auf Drizzle ab 0.35 und Zod v4. |
| Freigabe-Workflows | [Temporal-Tutorial für MCP-Tools](https://learn.temporal.io/tutorials/ai/building-mcp-tools-with-temporal/adding-hitl-to-mcp-tools/), [samples-typescript](https://github.com/temporalio/samples-typescript) | Zeigt Freigaben über Signals, Warten auf Zustimmung mit Zeitlimit und Statusabfragen | Das Tutorial ist in Python, die Muster lassen sich im TypeScript-SDK nachbauen. |

Für den MCP-Server gibt es kein überzeugendes Template. Empfohlen wird das [offizielle TypeScript-SDK](https://ts.sdk.modelcontextprotocol.io/v2/), mit Tools aus denselben Zod-Schemas wie die REST-API.

## Guardrails

Vollständige Autonomie ist das Ziel, aber nicht der Startpunkt. Diese Regeln gelten von Tag eins.

- **Budget- und Rechtelimits:** Jeder Agent hat Tages- und Monatslimits für Ausgaben, Nachrichten und Veröffentlichungen. Überschreitungen stoppen automatisch.
- **Freigabestufen:** Anfangs behalten die Gründer die Freigabe für Budgets und Zahlungen, also alles, wofür Beacon & Bold Geld bezahlt. Alles andere führen die Agenten selbst aus, abgesichert durch QA, Limits und Audit-Log. Die Stufe sinkt, wenn Fehlerquote und Kundenzufriedenheit es belegen.
- **QA vor Veröffentlichung:** Der Compliance-Agent prüft Marke, Fakten, Urheberrecht und Werberecht, bevor etwas live geht.
- **Audit-Log:** Jede Aktion ist mit Agent, Grund, Eingabe und Ergebnis nachvollziehbar und lässt sich zurückrollen, wo möglich.
- **Datenschutz:** DSGVO-konforme Speicherung, Datenhaltung in der EU für EU-Kunden, getrennte Mandanten, keine Kundendaten im Modelltraining.
- **KI-Kennzeichnung:** KI-generierte Creator, Stimmen und Inhalte werden gekennzeichnet, wie es EU AI Act und Plattformregeln verlangen. Nutzungsrechte für Avatare und Stimmen werden vertraglich festgehalten.
- **Notbremse:** Ein zentraler Schalter pausiert einzelne Agenten oder das gesamte System.

## Global skalieren

Regionen werden nicht kopiert, sondern als Konfiguration ausgerollt. Ein neuer Markt ist ein Datensatz, den Agenten mit Leben füllen.

| Baustein | Umsetzung |
| --- | --- |
| Marktauswahl | Ein Markt-Agent bewertet Nachfrage, Wettbewerb, Zahlungsbereitschaft und Regulierung und schlägt Regionen vor, wo es sich wirtschaftlich lohnt |
| Sprache und Kultur | Lokalisierung von Angeboten, Anzeigen, Creators und Tonalität pro Markt statt reiner Übersetzung |
| Zeitzonen | Agenten arbeiten rund um die Uhr, Kundenkommunikation folgt der lokalen Zeit |
| Steuern und Recht | Regelwerk pro Land für Umsatzsteuer, Rechnungspflichten, Werberecht und Datenschutz, geprüft durch lokale Fachleute |
| Zahlungen | Mehrere Währungen und lokale Zahlungsarten über einen Zahlungsanbieter |
| Plattformen | Kanalmix pro Region, zum Beispiel Meta, Google, TikTok oder lokale Netzwerke |

Ein Markt geht live, wenn ein definierter Mindestumsatz je Aufwand prognostiziert ist und die rechtlichen Punkte geklärt sind.

### Reihenfolge der EU-Märkte

Der Start liegt in DACH, danach folgen die EU-Länder nach digitalen Werbeausgaben 2025 (Quelle: [IAB Europe AdEx Benchmark 2025](https://iabeurope.eu/wp-content/uploads/IAB_Europe_AdEx_Benchmark_2025_final-1.pdf), konstante Preise). Die Schweiz gehört zu DACH, ist aber nicht in der EU. Großbritannien, die Türkei und Norwegen sind ausgeklammert, ebenso kleinere EU-Länder, die im ausgewerteten Ausschnitt nicht vorkommen.

| Welle | Land | Digitale Werbeausgaben 2025 (Mio. EUR) | Wachstum zu 2024 |
| --- | --- | --- | --- |
| 1 (DACH) | Deutschland | 21.583 | 10,5 % |
| 1 (DACH) | Schweiz | 4.271 | 4,2 % |
| 1 (DACH) | Österreich | 3.198 | 8,1 % |
| 2 | Frankreich | 12.701 | 11,3 % |
| 2 | Spanien | 6.703 | 11,3 % |
| 2 | Italien | 6.031 | 9,8 % |
| 3 | Niederlande | 4.761 | 9,9 % |
| 3 | Schweden | 3.772 | 6,5 % |
| 4 | Tschechien | 2.674 | 11,4 % |
| 4 | Polen | 2.578 | 12,2 % |
| 4 | Dänemark | 1.833 | 6,9 % |
| 4 | Belgien | 1.404 | 10,5 % |

Die Wellen sind meine Gruppierung nach Volumen. Neben dem Budget entscheiden Sprache, Steuern und Recht sowie Wettbewerb über den Markteintritt, deshalb gilt weiterhin das Markt-Gate aus der Roadmap.

## Roadmap

&#91;embedded content: Roadmap · 4 Phasen, 3 Gates\]

Jede Phase endet an einem Gate: Erst wenn dessen Kriterium erfüllt ist, startet die nächste. Beacon & Bold ist in Phase 2 der erste Kunde des eigenen Systems und liefert damit die Fallstudien für Phase 4.

## Kennzahlen

Die wichtigste Größe ist der Anteil der Arbeit, den Agenten ohne menschlichen Eingriff erledigen.

| Kennzahl | Bedeutung | Zielrichtung |
| --- | --- | --- |
| Autonomiequote | Anteil der Aufgaben ohne menschlichen Eingriff | Steigt pro Quartal |
| Menschliche Stunden pro Kunde und Monat | Restaufwand je Kunde | Sinkt |
| Zeit bis zur ersten Kampagne | Vertrag bis Live-Schaltung | Sinkt |
| Fehler- und Rücknahmequote | Von QA oder Kunden gestoppte Ergebnisse | Sinkt |
| Kundenergebnis | ROAS, Leads, Umsatz je Kunde | Steigt |
| Marge pro Kunde | Umsatz minus Modell-, Tool- und Personalkosten | Steigt |
| Kosten pro Agentenaufgabe | Modell- und Toolkosten | Sinkt |
| Märkte im Betrieb | Aktive Regionen mit positivem Ergebnis | Steigt mit Gate |

## Entscheidungen

- **Leistungen:** Start mit Meta Ads, SEO-Content und KI-gestützten Creatives (Vorschlag im Abschnitt „Leistungen und Preismodelle“), weitere Kanäle später.
- **Freigaben:** Die Gründer behalten anfangs alle Freigaben für Budgets und Zahlungen, also alles, wofür Beacon & Bold Geld bezahlt.
- **Eigenbau:** Das System wird selbst gebaut, CRM, Projektmanagement und Abrechnung inklusive. Externe Dienste (Meta, Google, Stripe, E-Mail) bleiben Adapter.
- **Märkte:** Start in DACH, danach schrittweise die EU-Länder, beginnend mit den höchsten Werbeausgaben (Auswertung im Abschnitt „Global skalieren“).
- **Modelle und Anbieter:** Alle sind erlaubt, auch Grok. Der Modell-Router wählt je Aufgabe nach Qualität und Kosten.
- **Abrechnung:** Situationsabhängig mit mehreren Optionen (Retainer, Paket, Performance-Anteil, ergebnisbasiert).
