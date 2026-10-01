# Beacon & Bold – Umsetzungsplan für Coding Agents

Sep 30, 2026 · @Mathis

Dieser Plan zerlegt den Bau einer vollständigen Marketing-Agentur-Webapp mit agentenfähigem Kern in kleine, einzeln prüfbare Aufgaben mit ID, Abhängigkeit und Abnahmekriterium. Die Produktklarstellung vom 1. Oktober 2026 ist verbindlich: klassische, direkt bedienbare Fachoberfläche; KI-Agenten können dieselben Geschäftsaktionen im Hintergrund übernehmen. Fehlende Produktentscheidungen werden vor der betroffenen Umsetzung geklärt.

## Verbindlicher Produktumfang

Die App deckt den Vollbetrieb einer Marketing-Agentur ab: Accounts und Arbeitsbereiche, CRM, Projekte und Aufgaben, Kampagnen, Content, Assets und KI-Creator, Kommunikation, Termine, Angebote, Rechnungen, Buchhaltung und Reporting. Agentenverwaltung, Läufe, Freigaben und Audit ergänzen diese Fachmodule. Die Modulübersicht im Konzept beschreibt die Zieloberfläche.

Jedes Fachmodul wird in kleinen Aufgaben für Schema und Geschäftsaktionen, klassische Oberfläche sowie Agentenanbindung umgesetzt. Tabellen, Detailseiten, Formulare, Boards, Suche und Filter sind normale Bedienwege; kein Fachablauf darf einen Chat voraussetzen. Die Kiranism-Dashboard-Vorlage dient für Layouts und Komponenten. Auth0 bleibt der beschlossene Auth-Anbieter; aktives Hosting bleibt ausschließlich VPS. Die im Template verwendeten Anbieter werden nicht automatisch übernommen.

### Abnahme pro Fachmodul

- Ein berechtigter Mensch kann den Fachablauf in der Oberfläche vollständig durchführen.
- Ein berechtigter Agent kann denselben Ablauf über die gemeinsamen REST-/MCP-Verträge ausführen; beide Wege ändern dieselben Datensätze.
- Serverseitige Fachregeln, Mandantentrennung, Berechtigungen, Idempotenz für relevante Änderungen, Audit und erforderliche Freigaben gelten für beide Wege.
- Automatische Tests prüfen den normalen Ablauf, Fehler und unberechtigten Zugriff. Browser-Abnahme umfasst Lade-, Leer- und Fehlerzustände, Tastatur und Mobilansicht.
- Automatisierung ergänzt die klassische Bedienung; ein ausgefallener Agent blockiert keine unabhängig ausführbare manuelle Fachaktion. Laufende Workflows behalten ihre Sperren und Freigaben.

Nicht alle Module entstehen in Phase 1. Phase 1 liefert Kontozugang, App-Rahmen und gemeinsame Infrastruktur; Phase 2 und 3 liefern die bedienbaren Fachmodule bis zum Vollbetrieb. Phase 4 erweitert die bestehende Webapp um selbstständiges Kunden-Onboarding und Skalierung.

Die größeren Fachmodul-IDs sind Meilensteine, keine Anweisung für einen einzigen großen PR. Vor Beginn werden konkrete Teilaufgaben mit eigener ID, Abhängigkeiten und Abnahme eingetragen: gemeinsame Verträge/Geschäftsaktionen, klassische Fachseiten und Agentenanbindung. Die Abnahme des Meilensteins erfolgt erst nach Abschluss aller Teilaufgaben. Ein UI-Entwurf mit erfundenen Daten zählt nicht als angebundener Fachbereich.

### Nächster Meilenstein: Accounts und Anmeldung

P1-4a wird vor der nächsten Beispielstrecke bearbeitet. Reihenfolge:

1. Zugangsmodell festlegen: Einladung/Freigabe oder eigener Arbeitsbereich nach Signup. Festlegen, welche Kontofunktionen Auth0 übernimmt und wie unbekannte Identitäten angezeigt werden. Bestehende Zugriffsgrenzen bleiben bis zur Entscheidung bestehen.
2. Login-/Signup-Einstiege, Logout und Passwort-Wiederherstellung über die vorhandene Auth0-Anbindung bauen; keine eigene Passwortspeicherung.
3. Kontoprofil und verständlichen Status für fehlende Arbeitsbereichsfreigabe ergänzen. Anmeldung allein erteilt keine fachlichen Rechte.
4. Automatische Browser-/Rechteprüfungen und echte Auth0-Test-Tenant-Abnahme durchführen. Fehlende Providerzugänge oder VPS-Aktivierung bleiben offen dokumentiert.

Arbeitsbereiche, Mitglieder und Rechteverwaltung werden anschließend in P1-4b umgesetzt. Vor dem schreibenden Verwaltungszugriff müssen Audit und Rollenmatrix vorhanden sein. Eine neue öffentliche Registrierung oder automatische Arbeitsbereichserstellung wird durch diese Planänderung nicht aktiviert.

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
│  ├─ app/              klassische Agentur-Webapp mit Agenten-Assistenz (Next.js)
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

Ziel: Menschen können sich anmelden und die klassische App nutzen. Ein externer Agent kann über MCP Aufgaben auslösen; beide Bedienwege verwenden dieselben Geschäftsaktionen, und jede Geldwirkung stoppt an einer Freigabe. P1-1, P1-2, P1-7 und P1-9 starten parallel nach Phase 0.

| ID | Aufgabe | Abhängig von | Abnahme |
| --- | --- | --- | --- |
| P1-1 | Datenmodell mit Drizzle: Mandanten, Nutzer, Agenten, Agentenläufe, Audit-Log, Freigaben, Kunden, Kontakte, Deals, Projekte, Aufgaben, Assets, Rechnungen, mit Row-Level Security | P0-4 | Migrationen laufen, ein Test beweist, dass ein Mandant keine Daten eines anderen liest |
| P1-2 | Schema-Paket mit Zod als einzige Quelle für Typen, mit Generator für OpenAPI und Tool-Definitionen | P0-1 | Eine Schemaänderung ändert Typ, OpenAPI-Dokument und Tool-Definition, ein Test prüft das |
| P1-3 | API-Gerüst mit Hono und Zod-OpenAPI: Routen, einheitliches Fehlerformat, Idempotency-Key, Scalar-Dokumentation | P1-1, P1-2 | `/openapi.json` ist gültig, ein Contract-Test deckt alle Routen ab |
| P1-4 | Auth0 für Menschen und getrennte OAuth-Identitäten für Agenten, Scopes und Ablaufdatum (bestehender Code; externe Abnahme offen) | P1-3 | Ein Agent ohne Scope erhält 403, ein abgelaufenes Token erhält 401; reale Provider-Abnahme gesondert nachweisen |
| P1-4a | Kontozugang: Login, Signup, Logout, Passwort-Wiederherstellung, Profil und verständlicher Zugriffsstatus über Auth0 | P0-5, P1-4 | Browser prüft Kontoseiten und geschlossene Zugriffe; echter Test-Tenant prüft Registrierung, Login, Logout und Wiederherstellung. Keine fremden Daten nach Signup |
| P1-4b | Arbeitsbereiche, Mitgliedschaften, Einladungen und Rechte verwalten; zuerst Zugangsmodell und Rollenmatrix als ADR beschließen, dann Schema/API/UI implementieren | P1-4a, P1-1, P1-2, P1-6 | Rechteänderung und Widerruf wirken serverseitig, Audit erfasst sie; Nutzer sieht nur erlaubte Arbeitsbereiche. Automatisches Provisioning nur nach ausdrücklicher Entscheidung |
| P1-5 | MCP-Server (Streamable HTTP) mit Tools, die aus den Schemas erzeugt werden | P1-3, P1-4 | MCP-Inspector listet die Tools, ein Tool legt einen Kunden an, ein fehlender Scope wird abgelehnt |
| P1-6 | Audit-Log für jede Änderung und Notbremse pro Agent | P1-1, P1-3 | Jede Änderung erzeugt einen Eintrag mit Agent, Grund und Ergebnis, ein pausierter Agent wird abgewiesen |
| P1-7 | Temporal-Worker mit einem Beispiel-Workflow inklusive Wiederholung und Zeitlimit | P0-4 | Der Workflow läuft nach einem Neustart des Workers weiter, ein Test beweist das |
| P1-8 | Gemeinsamer Freigabe-Baustein: Workflow-Schritt `requestApproval` mit Signal und Zeitlimit, Freigabetabelle, Budgetlimits pro Agent | P1-6, P1-7 | Jede Geldwirkung wartet anfangs auch unter dem Limit auf Gründerfreigabe; Ablehnung beendet den Workflow sauber. Menschliche Bedienung umgeht die Prüfung nicht |
| P1-9 | LLM-Router mit Adaptern für mehrere Anbieter (auch Grok), Kostenerfassung pro Lauf und Tracing | P0-6 | Derselbe Test-Prompt läuft über zwei Anbieter, die Kosten stehen im Agentenlauf |
| P1-10 | Orchestrator-Grundgerüst: nimmt ein Ziel entgegen, erzeugt Aufgaben und ruft einen Fach-Agenten als Platzhalter | P1-5, P1-8, P1-9 | Integrationstest: Ziel führt zu Aufgabe, Platzhalter-Agent und gespeichertem Ergebnis |
| P1-11 | Klassischer App-Rahmen in `apps/app` nach Kiranism-Vorlage, Kontozugang und ergänzende Agenten-Assistenz mit Streaming, Tool-Aufrufen und Freigaben | P0-5, P1-4a, P1-8, P1-10 | Browser prüft direkte Bedienung einer Aufgabe und Freigabe sowie ergänzendes Streaming; Fachmodule folgen mit eigenen Aufgaben in Phase 2/3 |
| P1-12 | Beobachtbarkeit: OpenTelemetry, Sentry, Langfuse für Modellaufrufe | P1-3, P1-7 | Ein Trace zeigt einen Aufruf von der API bis in den Workflow |

### P1-11: kleine App-Aufgaben

| ID | Aufgabe | Abhängig von | Abnahme |
| --- | --- | --- | --- |
| P1-11a | App-Rahmen: Sidebar, Kopfzeile, Suche, Hell-/Dunkelmodus und ehrliche Vorschauzustände; bestehender PR #14 wird anhand des neuen Produktziels geprüft | P0-5, P1-4 | Browser prüft Desktop/Mobilnavigation, Tastatur und Barrierefreiheit; Vorschau gibt keine privaten Daten aus |
| P1-11b | Klassische Beispielstrecke mit Zod und erfundenen Daten: Auftragsformular, Aufgabenliste, Detailseite, Status und Beispiel-Freigabe | P1-11a, P1-2, P1-4a | Browser bearbeitet die klar gekennzeichnete Beispielstrecke ohne Chat; keine echte Ausgabe oder Modellnutzung |
| P1-11c | Persistierte Auftrags-/Aufgabenstrecke und Freigabe-Inbox über dieselben Geschäftsaktionen wie Agenten | P1-11b, P1-4a, P1-6, P1-8, P1-10 | Browser führt einen Testauftrag mit persistiertem Status und Freigabe durch; unberechtigter Zugriff wird abgelehnt |
| P1-11d | Ergänzende Agenten-Assistenz: Streaming, Chat, Tool-Aufrufe und Laufdetails in der klassischen App | P1-11c, P1-9 | Streaming und Tool-Ergebnisse erscheinen am zugehörigen Vorgang; der normale Fachablauf bleibt ohne Chat bedienbar |

**Gate 1:** Ein freigegebener Nutzer meldet sich an und bearbeitet einen Testauftrag in der klassischen Oberfläche. Ein externer MCP-Client legt einen Kunden an und startet einen Workflow mit Freigabe. Beide Wege sind im Audit sichtbar; Kontozugang und fachliche Rechte sind geprüft.

## Phase 2: Selbst zuerst

Ziel: Beacon & Bold betreibt Vertrieb, Marketing und Onboarding in der eigenen klassischen Webapp; Agenten übernehmen diese Abläufe schrittweise. Externe Konten laufen zunächst in Sandbox oder Testmodus, echte Ausgaben nur mit Freigabe der Gründer. Tabellenreihenfolge ersetzt nicht die verbindlichen Abhängigkeiten.

| ID | Aufgabe | Abhängig von | Abnahme |
| --- | --- | --- | --- |
| P2-1 | CRM: Kunden, Leads, Kontakte, Deals und Aktivitäten mit Listen, Suche, Detailseiten, Formularen, Pipeline und MCP-Tools | P1-5, P1-6, P1-11c | Mensch legt einen Lead an und bearbeitet ihn ohne Chat; Agent verschiebt ihn per MCP in derselben Pipeline. Tests prüfen beide Wege und Rechte |
| P2-2 | E-Mail-Adapter für Versand/Antworteingang und klassische Kommunikationsansicht am Kunden mit Verlauf und Nachrichteneditor | P1-3, P0-6, P1-6, P2-1 | Nutzer sendet aus der Kundenansicht an Mailpit; eingehende Antwort wird demselben Kontakt zugeordnet; Agent verwendet dieselbe Aktion |
| P2-3 | Kalender-Adapter und Terminansicht mit Buchungsformular und Kundenbezug | P1-3, P1-6, P2-1 | Nutzer und Agent buchen über dieselbe Aktion im Testkalender; Termin und Aktivitäten sind sichtbar |
| P2-5 | Website von Beacon & Bold in `apps/web` nach Design System, mit SEO-Grundlagen (Metadaten, Sitemap, strukturierte Daten) | P0-5 | Alle Seiten der Positionierung sind gebaut, die CI-Prüfung für Performance und Barrierefreiheit läuft ohne Fehler |
| P2-6 | QA- und Compliance-Agent mit Regelwerk als Daten: Markenstimme, Faktencheck, Werberecht, Datenschutz | P1-10 | Ein Testset mit Regelverstößen wird vollständig blockiert, saubere Inhalte laufen durch |
| P2-4 | Sales-Agent: Zielkunden finden, personalisiert anschreiben, qualifizieren, Termin buchen | P2-1, P2-2, P2-3, P2-6, P1-10 | Ein Testlauf führt vom Lead bis zum gebuchten Termin, Versand nur nach bestandener QA |
| P2-7 | Content-Arbeitsbereich mit Briefings, Editor, Versionen, Status und Redaktionskalender; Content-Agent und SEO-Pipeline bis MDX-Veröffentlichung | P2-5, P2-6, P1-10, P1-11c | Mensch bearbeitet Artikel und Planung ohne Chat; Agent nutzt dieselben Vorgänge. QA stoppt Verstöße vor Staging-Veröffentlichung |
| P2-8 | Klassische Onboarding-Ansicht mit Briefingformular, Checkliste und Status; Agent begleitet denselben Ablauf, bereitet Vertrag und Projekt vor | P2-1, P2-2, P1-8 | Testkunde durchläuft Formulare und Status ohne Chat-Zwang; Agent kann Schritte übernehmen. Signatur und Rechtstexte bleiben menschlich freigegeben |
| P2-9 | Kampagnen- und Ads-Arbeitsbereich mit Liste, Detailseite, Entwurfsformular, Creatives, Budgets und Status; Meta-Adapter und Ads-Agent | P1-8, P1-10, P2-6, P1-11c | Mensch und Agent erstellen denselben Sandbox-Entwurf; jede kostenwirksame Aktivierung wartet auf Freigabe |
| P2-10 | Klassisches Reporting mit Kunde/Kampagne/Zeitraum-Filtern, Kennzahlen und täglichen Berichten aus Ads/Analytics | P2-9 | Nutzer filtert einen Bericht ohne Chat; Agent erzeugt denselben Bericht mit nachweisbaren Testkennzahlen |
| P2-11 | Social-Adapter und klassischer Redaktionsplan mit Beitragseditor, Kalender, Kanalzuordnung und Veröffentlichungsstatus | P2-7 | Nutzer plant einen Beitrag ohne Chat; Agent nutzt dieselbe Planung. Veröffentlichung auf Testkonto erfolgt erst nach QA |

**Gate 2:** Lead, Termin, Onboarding und erste Veröffentlichung sind in klassischen Fachseiten durchgehend bedienbar und können zusätzlich durch Agenten ausgeführt werden. Automatische Läufe benötigen nur die vorgeschriebenen menschlichen Freigaben.

## Phase 3: Vollbetrieb

Ziel: Die Webapp deckt den vollständigen Marketing-Agenturbetrieb ab; alle Fachprozesse sind klassisch bedienbar und können von Agenten übernommen werden. Autonomie steigt kontrolliert. Geldwirkungen bleiben anfangs hinter der Freigabe der Gründer.

| ID | Aufgabe | Abhängig von | Abnahme |
| --- | --- | --- | --- |
| P3-1 | Projekt-/Aufgabenverwaltung mit Listen, Boards, Detailseiten und Formularen für Fristen und Zuweisungen; Projekt-Agent | P2-8, P1-10, P1-11c | Mensch erstellt und bearbeitet ein Projekt samt Aufgaben ohne Chat; Agent erstellt Aufgaben im selben Modell und meldet überfällige Arbeit |
| P3-2 | Klassische Creator-Verwaltung: Liste, Profil und Bearbeitungsformular für Look, Stimme, Tonalität, Nutzungsrechte und Freigabestatus | P1-1, P1-11c | Nutzer verwaltet einen Creator ohne Chat; Mensch und Agent können ihn ohne Freigabestatus nicht verwenden |
| P3-3 | Klassische Asset-Bibliothek mit Upload, Suche, Vorschau, Detailseite, Herkunft und KI-Kennzeichnung; Bild-/Video-Modelladapter | P3-2, P1-9, P2-6 | Nutzer findet und verwaltet Testassets; erzeugte Assets tragen Herkunft und Kennzeichnung und werden vor Ablage geprüft |
| P3-4 | UGC-Agent: Skripte, Videos und Bilder erzeugen, gegen Markenregeln prüfen und ablegen | P3-3 | Ein Testauftrag liefert ein geprüftes Asset in der Bibliothek |
| P3-5 | Klassischer Finanzbereich mit Angebots-/Rechnungslisten, Detailseiten, Entwurfsformularen und Zahlungsstatus; Finanz-Agent, Stripe-Abgleich und Mahnwesen | P1-8, P2-1, P1-11c | Mensch erstellt Testangebot und Rechnung ohne Chat; Agent nutzt dieselben Aktionen, Zahlung wird im Test abgeglichen, Geldwirkungen brauchen Freigabe |
| P3-6 | Klassische Beleg-/Buchhaltungsansicht mit Upload, Kategorien, Prüfung und DATEV-/Lexoffice-Export; Agenten unterstützen Erfassung und Zuordnung | P3-5 | Nutzer prüft Testbelege ohne Chat; Testmonat erzeugt einen Sandbox-importierbaren Export. Fachprüfung bleibt erforderlich |
| P3-7 | Analyse-Agent: Ergebnisse auswerten, Tests steuern, Lernschleife (ClickHouse, sobald nötig) | P2-10 | Der Agent schlägt aus Testdaten eine Budgetverschiebung vor, die als Freigabe erscheint |
| P3-8 | Account-Agent: Kundenkommunikation, Berichte, Eskalation an Menschen | P2-2, P2-10, P3-1 | Eine Kundenfrage wird beantwortet, ein Konflikt wird an einen Menschen eskaliert |
| P3-9 | Kundenportal: Sicht auf Berichte, Freigaben und Assets | P1-4, P2-10, P3-1 | Ein Testkunde sieht nur die eigenen Daten, ein Test prüft die Trennung |
| P3-10 | Autonomiestufen und Kennzahlen: Stufe pro Aufgabe einstellbar, Dashboard mit Autonomiequote, Fehlerquote und Kosten pro Aufgabe | P1-6, P3-7 | Das Dashboard zeigt die Kennzahlen aus echten Läufen, eine Stufenänderung wirkt im nächsten Lauf |

**Gate 3 (Vollbetrieb):** CRM, Projekte, Kampagnen, Content, Assets, Kommunikation, Termine, Finanzen und Berichte sind für berechtigte Menschen vollständig klassisch bedienbar und für Agenten über gemeinsame Geschäftsaktionen steuerbar. Automatische Abnahmen prüfen beide Wege und Mandantentrennung. Freigaben und Audit laufen im Regelbetrieb; Agentenausfälle erzwingen keinen Chat und heben keine Sperren auf. Fachliche Abdeckung, Autonomiequote und Kosten werden gemessen.

## Phase 4: Skalierung

Ziel: Das System wird zum Produkt für Kunden, nimmt Aufträge auch von externen Agenten an und erschließt EU-Märkte nach der beschlossenen Reihenfolge (DACH, dann nach Werbevolumen).

| ID | Aufgabe | Abhängig von | Abnahme |
| --- | --- | --- | --- |
| P4-1 | Ausbau zum selbstständig nutzbaren Kundenprodukt: automatisches Kunden-Onboarding und Abrechnung auf Basis der bereits vorhandenen Accounts/Arbeitsbereiche | P1-4b, P3-9, P3-5 | Ein neuer Testkunde startet ohne Eingriff der Gründer; bestehende Grundfunktionen für Login/Signup werden nicht erst hier gebaut |
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
| Identität und Schnittstelle | P1-4, P1-4a, P1-4b, P1-5 | Kontozugang zuerst; Zugangsmodell und Rollen vor Mitgliedschaftsverwaltung beschließen |
| Agenten-Kern | P1-7, P1-8, P1-9, P1-10 | P1-7 und P1-9 können sofort nach Phase 0 starten |
| Oberfläche | P0-5, P1-4a, P1-11a bis P1-11d, alle Fachmodule, P2-5, P3-9 | Klassische Fachseiten entstehen mit ihren Geschäftsaktionen; Agenten-Chat ist ergänzend |
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
