# Beacon & Bold – Umsetzungsplan für Coding Agents

Sep 30, 2026 · @Mathis

Dieser Plan zerlegt den Bau des Agentic Operating Systems in kleine, einzeln prüfbare Aufgaben mit ID, Abhängigkeit und Abnahmekriterium, damit Coding Agents sie parallel und ohne Rückfragen abarbeiten können. Er folgt den vier Phasen und Gates aus dem Plan-Doc, Grundlage sind dessen Entscheidungen und der dort gewählte Tech-Stack.

## Arbeitsregeln für Coding Agents

Diese Regeln gehören als `AGENTS.md` in die Wurzel des Repos (Aufgabe P0-2) und gelten für jede Aufgabe.

1. **Eine Aufgabe, ein Branch, ein Pull Request.** Nur Dateien ändern, die die Aufgabe braucht.
2. **Schema zuerst.** Erst das Zod-Schema in `packages/schemas`, dann der Code. API, MCP-Tool und Typen werden daraus erzeugt und nie von Hand doppelt gepflegt.
3. **Abnahme als Test.** Das Abnahmekriterium der Aufgabe muss als automatischer Test vorhanden sein, bevor die Aufgabe als fertig gilt.
4. **Definition of Done.** Lint, Typecheck, Tests und Build sind grün, der Abnahmetest läuft, die Änderung ist kurz dokumentiert und enthält keine Secrets.
5. **Kleine Schritte.** Wird ein Pull Request größer als die Aufgabe, wird die Aufgabe aufgeteilt und die Teile werden als eigene Aufgaben eingetragen.
6. **Geld nur über den Freigabe-Baustein.** Jede Ausgabe und Zahlung geht durch `requestApproval` (P1-8). Kein Code darf Geld bewegen, ohne diesen Schritt.
7. **Externe Dienste nur über Adapter.** Alle Anbindungen (Meta, E-Mail, Stripe, Kalender, Modelle) liegen hinter Schnittstellen in `packages/integrations`. Tests laufen gegen Sandbox oder Mock, nie gegen echte Konten.
8. **Keine Secrets und keine echten Kundendaten.** Konfiguration nur über validierte Umgebungsvariablen, Testdaten sind erfunden.
9. **Migrationen nur vorwärts** und immer mit einem Test für die Mandantentrennung.
10. **Agentenverhalten ist Code.** Prompts, Regeln und Modellwahl sind versioniert und durch eine Evaluation abgesichert (`packages/agents`).
11. **Nicht raten.** Fehlt eine Entscheidung, stellt der Agent die Frage im Pull Request. Beschlossene Entscheidungen landen als kurze Notiz in `docs/adr`.
12. **Nichts an Produktion ändern.** Deployments in Produktion, Zahlungs- und Rechtstexte bleiben bei Menschen (siehe Abschnitt „Menschliche Eingriffspunkte“).

## Ziel-Repo

Ein pnpm-Monorepo mit Turborepo, abgeleitet von next-forge. Jeder Ordner hat eine klare Aufgabe, damit Agenten wissen, wo sie arbeiten.

```text
beacon-bold/
├─ AGENTS.md            Regeln und Befehle für Coding Agents
├─ apps/
│  ├─ web/              Marketing-Website (Next.js)
│  ├─ app/              Betriebsoberfläche und Agent-UI (Next.js)
│  ├─ api/              REST-API und MCP-Server (Hono)
│  └─ worker/           Temporal-Worker mit Workflows und Agenten
├─ packages/
│  ├─ schemas/          Zod-Schemas, Quelle für API, MCP und Typen
│  ├─ db/               Drizzle-Modelle, Migrationen, Mandantentrennung
│  ├─ agents/           Agenten-Definitionen, Prompts, Evaluationen
│  ├─ integrations/     Adapter für Meta, E-Mail, Stripe, Kalender, Modelle
│  ├─ ui/               Design System, Tokens, Komponenten
│  └─ config/           gemeinsame Konfiguration (TypeScript, Lint)
├─ infra/               Infrastruktur als Code
└─ docs/adr/            Architekturentscheidungen
```

## Aufgaben-Vorlage

Jede Aufgabe aus den Phasen unten wird in diesem Format an einen Coding Agent gegeben. Der Startbefehl lautet: „Lies `AGENTS.md` und diesen Plan, bearbeite Aufgabe `<ID>`.“

```markdown
Aufgabe: <ID> <Titel>
Ziel: <ein Satz>
Kontext lesen: AGENTS.md, <Pakete und Dateien>
Abhängig von: <IDs, müssen gemergt sein>
Auftrag: <konkrete Schritte>
Abnahme: <automatischer Test oder prüfbares Verhalten>
Nicht tun: <Grenzen, zum Beispiel keine Änderungen an packages/db>
Ergebnis: ein Pull Request mit Beschreibung und Testnachweis
```

In den Tabellen unten stehen ID, Aufgabe, Abhängigkeit und Abnahme. Die Spalte „Abhängig von“ ist verbindlich: Eine Aufgabe startet erst, wenn alle genannten IDs gemergt sind.

## Phase 0: Grundlage

Ziel: Ein leerer Endpunkt läuft automatisch vom Pull Request bis Staging. Alle Aufgaben außer P0-7 sind nach P0-1 parallel möglich.

| ID | Aufgabe | Abhängig von | Abnahme |
| --- | --- | --- | --- |
| P0-1 | Monorepo aufsetzen (pnpm, Turborepo, Struktur wie oben, abgeleitet von next-forge) mit leeren Apps und Paketen | — | `pnpm install`, `pnpm build` und `pnpm test` laufen lokal ohne Fehler |
| P0-2 | `AGENTS.md` mit den Arbeitsregeln, Befehlen für Build, Test und Lint sowie der Ordnerkarte | P0-1 | Datei liegt im Root und nennt alle Befehle, die tatsächlich funktionieren |
| P0-3 | CI mit GitHub Actions: Lint, Typecheck, Tests, Build, Secret-Scan als Pflichtprüfungen | P0-1 | Ein Pull Request mit absichtlich fehlerhaftem Test wird von der CI abgelehnt |
| P0-4 | Lokale Umgebung per Docker Compose: Postgres mit pgvector, Redis, Temporal-Entwicklungsserver, Mailpit | P0-1 | `pnpm dev:infra` startet alle Dienste, ihre Health-Checks sind grün |
| P0-5 | Design Tokens aus dem bestehenden Design System in `packages/ui` (Farben mit Signal-Orange, Bricolage Grotesque, JetBrains Mono, Abstände) | P0-1 | Storybook zeigt Button, Tag und Formularfeld mit den Tokens |
| P0-6 | Umgebungsvariablen: `.env.example`, Validierung mit Zod, getrennte Werte für dev, staging und prod | P0-1 | Jede App startet nicht ohne gültige Konfiguration, kein Secret liegt im Repo |
| P0-7 | Infrastruktur für Staging als Code (Postgres, Container-Hosting, Domain) und automatisches Deployment | P0-3, P0-6 | Ein Merge auf `main` deployt automatisch nach Staging, der Health-Endpunkt antwortet |

**Gate 0:** Ein Merge deployt automatisch nach Staging, und die CI blockiert fehlerhafte Änderungen.

## Phase 1: Fundament

Ziel: Ein externer Agent kann über MCP Aufgaben auslösen, und jede Geldwirkung stoppt an einer Freigabe. P1-1, P1-2, P1-7 und P1-9 starten parallel nach Phase 0.

| ID | Aufgabe | Abhängig von | Abnahme |
| --- | --- | --- | --- |
| P1-1 | Datenmodell mit Drizzle: Mandanten, Nutzer, Agenten, Agentenläufe, Audit-Log, Freigaben, Kunden, Kontakte, Deals, Projekte, Aufgaben, Assets, Rechnungen, mit Row-Level Security | P0-4 | Migrationen laufen, ein Test beweist, dass ein Mandant keine Daten eines anderen liest |
| P1-2 | Schema-Paket mit Zod als einzige Quelle für Typen, mit Generator für OpenAPI und Tool-Definitionen | P0-1 | Eine Schemaänderung ändert Typ, OpenAPI-Dokument und Tool-Definition, ein Test prüft das |
| P1-3 | API-Gerüst mit Hono und Zod-OpenAPI: Routen, einheitliches Fehlerformat, Idempotency-Key, Scalar-Dokumentation | P1-1, P1-2 | `/openapi.json` ist gültig, ein Contract-Test deckt alle Routen ab |
| P1-4 | Auth für Menschen (WorkOS oder Clerk) und Identitäten für Agenten mit OAuth 2.1, Scopes und Ablaufdatum | P1-3 | Ein Agent ohne Scope erhält 403, ein abgelaufenes Token erhält 401 |
| P1-5 | MCP-Server (Streamable HTTP) mit Tools, die aus den Schemas erzeugt werden | P1-3, P1-4 | MCP-Inspector listet die Tools, ein Tool legt einen Kunden an, ein fehlender Scope wird abgelehnt |
| P1-6 | Audit-Log für jede Änderung und Notbremse pro Agent | P1-1, P1-3 | Jede Änderung erzeugt einen Eintrag mit Agent, Grund und Ergebnis, ein pausierter Agent wird abgewiesen |
| P1-7 | Temporal-Worker mit einem Beispiel-Workflow inklusive Wiederholung und Zeitlimit | P0-4 | Der Workflow läuft nach einem Neustart des Workers weiter, ein Test beweist das |
| P1-8 | Freigabe-Baustein: Workflow-Schritt `requestApproval` mit Signal und Zeitlimit, Freigabetabelle, Budgetlimits pro Agent | P1-6, P1-7 | Eine Ausgabe über dem Limit wartet auf Freigabe, eine Ablehnung beendet den Workflow sauber |
| P1-9 | LLM-Router mit Adaptern für mehrere Anbieter (auch Grok), Kostenerfassung pro Lauf und Tracing | P0-6 | Derselbe Test-Prompt läuft über zwei Anbieter, die Kosten stehen im Agentenlauf |
| P1-10 | Orchestrator-Grundgerüst: nimmt ein Ziel entgegen, erzeugt Aufgaben und ruft einen Fach-Agenten als Platzhalter | P1-5, P1-8, P1-9 | Integrationstest: Ziel führt zu Aufgabe, Platzhalter-Agent und gespeichertem Ergebnis |
| P1-11 | Agent-UI in `apps/app` mit AI Elements: Chat mit Streaming, Anzeige von Tool-Aufrufen, Freigabe-Dialog | P0-5, P1-4, P1-8 | Ein Playwright-Test streamt eine Antwort und erteilt eine Freigabe |
| P1-12 | Beobachtbarkeit: OpenTelemetry, Sentry, Langfuse für Modellaufrufe | P1-3, P1-7 | Ein Trace zeigt einen Aufruf von der API bis in den Workflow |

**Gate 1:** Ein externer MCP-Client (zum Beispiel ein Grok- oder Claude-Agent) legt über MCP einen Kunden an und startet einen Workflow mit Freigabe, alles im Audit-Log sichtbar.

## Phase 2: Selbst zuerst

Ziel: Beacon & Bold betreibt Vertrieb, Marketing und Onboarding für sich selbst mit Agenten. Externe Konten laufen zunächst in Sandbox oder Testmodus, echte Ausgaben nur mit Freigabe der Gründer. Die Tabelle ist nach Abhängigkeit sortiert, nicht nach ID.

| ID | Aufgabe | Abhängig von | Abnahme |
| --- | --- | --- | --- |
| P2-1 | CRM-Kern: Leads, Kontakte, Deals, Aktivitäten, Pipeline-Ansicht und die zugehörigen MCP-Tools | P1-5, P1-11 | Ein Agent legt über MCP einen Lead an und verschiebt ihn in der Pipeline, die Änderung ist in der Oberfläche sichtbar |
| P2-2 | E-Mail-Adapter für Versand und Antworteingang (Resend oder Postmark) | P1-3, P0-6 | Ein Test sendet an Mailpit, eine eingehende Antwort wird dem passenden Kontakt zugeordnet |
| P2-3 | Kalender-Adapter für Terminbuchung | P1-3 | Ein Test bucht einen Termin in einem Testkalender und schreibt ihn in die Aktivitäten |
| P2-5 | Website von Beacon & Bold in `apps/web` nach Design System, mit SEO-Grundlagen (Metadaten, Sitemap, strukturierte Daten) | P0-5 | Alle Seiten der Positionierung sind gebaut, die CI-Prüfung für Performance und Barrierefreiheit läuft ohne Fehler |
| P2-6 | QA- und Compliance-Agent mit Regelwerk als Daten: Markenstimme, Faktencheck, Werberecht, Datenschutz | P1-10 | Ein Testset mit Regelverstößen wird vollständig blockiert, saubere Inhalte laufen durch |
| P2-4 | Sales-Agent: Zielkunden finden, personalisiert anschreiben, qualifizieren, Termin buchen | P2-1, P2-2, P2-3, P2-6, P1-10 | Ein Testlauf führt vom Lead bis zum gebuchten Termin, Versand nur nach bestandener QA |
| P2-7 | Content-Agent und SEO-Pipeline: Thema, Briefing, Text, QA, Veröffentlichung als MDX in `apps/web` | P2-5, P2-6, P1-10 | Ein Artikel läuft von der Themenidee bis zur Veröffentlichung auf Staging, ein Verstoß wird von der QA gestoppt |
| P2-8 | Onboarding-Agent: Briefing im Chat, Zugangsdaten sammeln, Vertrag mit E-Signatur, Projekt anlegen | P2-1, P2-2, P1-8 | Ein Testkunde durchläuft das Onboarding ohne manuellen Schritt |
| P2-9 | Meta-Ads-Adapter und Ads-Agent im Testmodus: Kampagne als Entwurf anlegen, Aktivierung nur nach Freigabe | P1-8, P1-10, P2-6 | Ein Entwurf entsteht im Sandbox-Konto, die Aktivierung erzeugt eine Freigabe für Budget |
| P2-10 | Reporting: tägliche Berichte aus Ads und Analytics als Ansicht und als Nachricht | P2-9 | Ein Bericht wird täglich erzeugt und enthält die Kennzahlen der Testkampagne |
| P2-11 | Social-Adapter und Redaktionsplan | P2-7 | Ein Beitrag wird geplant und auf einem Testkonto veröffentlicht |

**Gate 2:** Der Weg vom Lead über Termin und Onboarding bis zur ersten Veröffentlichung läuft ohne menschlichen Eingriff, außer bei Budgets und Zahlungen.

## Phase 3: Vollbetrieb

Ziel: Alle operativen Prozesse der Agentur laufen über Agenten, gemessen an der Autonomiequote. Ausgehende Zahlungen bleiben hinter der Freigabe der Gründer.

| ID | Aufgabe | Abhängig von | Abnahme |
| --- | --- | --- | --- |
| P3-1 | Projekt-Agent und Projektboard: Aufgaben aus Kampagnenplänen, Fristen, Zuweisung an Agenten oder Menschen, frühe Risikomeldung | P2-8, P1-10 | Aus einem Kampagnenplan entstehen Aufgaben mit Fristen, eine überfällige Aufgabe löst eine Meldung aus |
| P3-2 | Verwaltung von KI-Creatorn und Avataren: Look, Stimme, Tonalität, Nutzungsrechte, Freigabestatus | P1-1, P1-11 | Ein Creator ist mit Rechten angelegt, ohne Freigabestatus kann er nicht verwendet werden |
| P3-3 | Bild- und Video-Modelladapter, Asset-Bibliothek mit Herkunft (Modell, Prompt, Version) und KI-Kennzeichnung | P3-2, P1-9, P2-6 | Ein erzeugtes Asset trägt Herkunft und Kennzeichnung, die QA prüft es vor der Ablage |
| P3-4 | UGC-Agent: Skripte, Videos und Bilder erzeugen, gegen Markenregeln prüfen und ablegen | P3-3 | Ein Testauftrag liefert ein geprüftes Asset in der Bibliothek |
| P3-5 | Finanz-Agent: Angebote innerhalb von Preiskorridoren (Retainer, Paket, Performance, ergebnisbasiert), Rechnungen mit Stripe, Zahlungsabgleich, Mahnwesen | P1-8, P2-1 | Ein Testkunde erhält ein Angebot und eine Rechnung, eine Zahlung wird abgeglichen, ausgehende Zahlungen brauchen Freigabe |
| P3-6 | Buchhaltung: Belege erfassen, kategorisieren, Export für DATEV oder Lexoffice, Paket für den Monatsabschluss | P3-5 | Ein Testmonat erzeugt einen Export, den das Zielsystem in der Sandbox importiert |
| P3-7 | Analyse-Agent: Ergebnisse auswerten, Tests steuern, Lernschleife (ClickHouse, sobald nötig) | P2-10 | Der Agent schlägt aus Testdaten eine Budgetverschiebung vor, die als Freigabe erscheint |
| P3-8 | Account-Agent: Kundenkommunikation, Berichte, Eskalation an Menschen | P2-2, P2-10, P3-1 | Eine Kundenfrage wird beantwortet, ein Konflikt wird an einen Menschen eskaliert |
| P3-9 | Kundenportal: Sicht auf Berichte, Freigaben und Assets | P1-4, P2-10, P3-1 | Ein Testkunde sieht nur die eigenen Daten, ein Test prüft die Trennung |
| P3-10 | Autonomiestufen und Kennzahlen: Stufe pro Aufgabe einstellbar, Dashboard mit Autonomiequote, Fehlerquote und Kosten pro Aufgabe | P1-6, P3-7 | Das Dashboard zeigt die Kennzahlen aus echten Läufen, eine Stufenänderung wirkt im nächsten Lauf |

**Gate 3:** Freigabestufen und Audit laufen im Regelbetrieb, und die Autonomiequote wird gemessen.

## Phase 4: Skalierung

Ziel: Das System wird zum Produkt für Kunden, nimmt Aufträge auch von externen Agenten an und erschließt EU-Märkte nach der beschlossenen Reihenfolge (DACH, dann nach Werbevolumen).

| ID | Aufgabe | Abhängig von | Abnahme |
| --- | --- | --- | --- |
| P4-1 | Mandantenfähiges Kundenprodukt: Anmeldung, Onboarding und Abrechnung ohne manuelle Schritte | P3-9, P3-5 | Ein neuer Kunde meldet sich an und startet ohne Eingriff der Gründer |
| P4-2 | Öffentliche Agenten-Schnittstelle: Datei mit Leistungen, Preisen und Grenzen, Annahme von Aufträgen durch externe Agenten | P1-5, P3-5 | Ein externer Test-Agent findet die Datei, gibt einen Auftrag auf und erhält ein Angebot |
| P4-3 | Marktkonfiguration: Datensatz pro Land mit Sprache, Währung, Steuersätzen, Plattformen und Rechtsregeln | P1-1, P3-5 | Ein neues Land lässt sich allein durch einen Datensatz anlegen, ein Test prüft die Pflichtfelder |
| P4-4 | Markt-Agent: bewertet Länder anhand von Werbeausgaben-Daten und Marktkonfiguration und schlägt den Eintritt vor | P4-3, P3-7 | Der Agent liefert für alle Länder der Liste eine begründete Reihenfolge, die zur Vorgabe passt |
| P4-5 | Lokalisierung von Website, Anzeigen, Creatorn und Tonalität pro Sprache | P4-3, P2-7, P3-4 | Ein Beitrag und eine Anzeige entstehen für eine zweite Sprache und bestehen die QA |
| P4-6 | EU-Steuer- und Rechnungslogik: Umsatzsteuer, Reverse-Charge, Rechnungspflichten, mit Fachprüfung | P4-3, P3-6 | Testrechnungen für mehrere Länder entsprechen den Vorgaben der Fachprüfung |
| P4-7 | Weitere Kanäle: Adapter für Google Ads und TikTok | P2-9 | Eine Entwurfskampagne entsteht in jedem Sandbox-Konto, die Aktivierung erzeugt eine Freigabe |
| P4-8 | Mehrregionen-Betrieb: Datenhaltung in der EU, Skalierung, Lasttests | P4-1 | Ein Lasttest hält das definierte Ziel, die Daten von EU-Kunden bleiben in der EU |

**Gate 4 (Markt-Gate):** Ein Markt geht live, wenn der prognostizierte Umsatz je Aufwand stimmt und die rechtlichen Punkte geklärt sind.

## Parallelisierung

Aufgaben aus verschiedenen Lanes können gleichzeitig laufen, solange ihre Abhängigkeiten gemergt sind. Jeder Agent arbeitet in einem eigenen Branch oder Git-Worktree.

| Lane | Aufgaben | Hinweis |
| --- | --- | --- |
| Plattform | P0-1 bis P0-7, P1-12 | Startet zuerst, danach laufen die anderen Lanes frei |
| Daten und API | P1-1, P1-2, P1-3, P1-6 | Ändert `packages/db` und `packages/schemas`, nur ein Agent gleichzeitig |
| Identität und Schnittstelle | P1-4, P1-5 | Startet, sobald P1-3 gemergt ist |
| Agenten-Kern | P1-7, P1-8, P1-9, P1-10 | P1-7 und P1-9 können sofort nach Phase 0 starten |
| Oberfläche | P0-5, P1-11, P2-5, P3-2, P3-9 | Läuft weitgehend unabhängig von der API-Arbeit, gegen die Tool-Definitionen |
| Vertrieb | P2-1, P2-2, P2-3, P2-4, P2-8 | Erste Fachlane nach Gate 1 |
| Marketing | P2-6, P2-7, P2-9, P2-10, P2-11 | Startet mit P2-6, weil alle Veröffentlichungen die QA brauchen |
| Finanzen | P3-5, P3-6 | Zahlungslogik nur mit dem Freigabe-Baustein aus P1-8 |

Regeln für gleichzeitige Arbeit: höchstens vier Agenten parallel, `packages/schemas` und `packages/db` immer nur durch einen Agenten, Merge in der Reihenfolge der Abhängigkeiten, nach jedem Merge läuft die volle CI.

## Menschliche Eingriffspunkte und Risiken

Beim Bau bleiben diese Schritte bei Menschen, weil sie Geld, Rechte oder Verantwortung betreffen.

- Zugänge und Secrets anlegen (Cloud, Meta, Stripe, E-Mail, Modellanbieter).
- Budgets und Zahlungen freigeben, auch das erste echte Werbekonto.
- Deployments in Produktion auslösen.
- Rechtstexte prüfen und freigeben (AGB, Datenschutz, Verträge, KI-Kennzeichnung).
- Steuer- und Buchhaltungslogik durch einen Steuerberater prüfen lassen.
- Verträge mit Modellanbietern und Nutzungsrechte für KI-Creator abschließen.

| Risiko | Gegenmaßnahme |
| --- | --- |
| Agenten ändern zu viel auf einmal | Kleine Pull Requests, eine Aufgabe je Branch, Pflichtprüfungen in der CI |
| Schemas und Code laufen auseinander | Schema zuerst, Generator und Contract-Tests (P1-2, P1-3) |
| Modellkosten laufen aus dem Ruder | Budgetlimits pro Agent und Kostenerfassung pro Lauf (P1-8, P1-9) |
| Falsche oder rechtlich riskante Inhalte werden veröffentlicht | QA- und Compliance-Agent vor jeder Veröffentlichung (P2-6) |
| Werbekonten werden bei Regelverstößen gesperrt | Nur Testmodus im Bau, Aktivierung mit Freigabe, Adapter nach den Plattformregeln (P2-9) |
| Datenschutz bei Modellanbietern | Anbieterprüfung und EU-Datenhaltung laut Prüfpunkten im Plan-Doc |
