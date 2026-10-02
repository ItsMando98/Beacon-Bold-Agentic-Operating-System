# ROASWELL – abhängige Einzelaufgaben

Stand: 2. Oktober 2026. Grundlage: [Umsetzungsplan](roaswell-umsetzungsplan.md).

## Arbeitsweise und Status

Eine Aufgabe = ein Branch = ein PR. Alle genannten Abhängigkeiten müssen regulär gemergt sein, bevor die Aufgabe beginnt. Zod-Verträge kommen vor Datenmodell, Adapter und Oberfläche. Schema- und Datenmodellarbeit hat jeweils genau einen Bearbeiter.

**R0-01 bis R1-04 sind regulär gemergt (PR #16–#20); Main-CI und bestehendes VPS-Staging bestanden. R1-05-01 ist implementiert; R1-05 insgesamt bleibt offen.** [Abnahme R1-05-01](roaswell-r1-05-01.md). Echter Portal-Login und separater Portal-Rollout bleiben offene externe Abnahmen.

Für jeden PR gelten Lint, Typecheck, Unit, Build, fachliche Abnahme und bei betroffenen Abläufen Integration/Browser. Tests nutzen erfundene Daten und Sandbox. Fehlende externe Zugänge bleiben offene Abnahmen. Deploy auf Produktion ist keine automatische Folge eines PRs.

## Fundament und Kundentrennung

| ID | Abhängigkeiten | Konkretes Ergebnis | Automatische Abnahme |
|---|---|---|---|
| R0-01 | Gemergtes main a92989e | Plan, Aufgaben, ADRs, ROASWELL-Paketnamen und sichtbare Titel; bestehende Infrastrukturidentitäten erhalten | Import-/Manifestauflösung, Vertragsartefakte, Browser-Titel und sämtliche vorhandenen Pflichtprüfungen |
| R1-01 | R0-01 | Zod-Verträge für Organisationsphase, Mitgliedschaft, Rollen, Sichtbarkeit und versionierte Freigaben | Unbekannte Rollen und mandantenlose Daten abweisen; abgeleitete API/MCP-Verträge aktuell |
| R1-02 | R1-01 | Vorwärtsmigration, Mitgliedschaften, RLS und kontrollierter Gründerzugriff; ROASWELL-Eigenkunde über explizite Einrichtung | Lesen/Schreiben über Kunden hinweg verweigert; Eigenkundenansicht hat nur Kundenrechte |
| R1-03 | R1-02 | Persistierte Rechteprüfung, Audit und Widerruf für Menschen/Agenten statt ausschließlich statischer Auth0-Allowlist | Fehlende/entzogene Mitgliedschaft verweigert Zugriff; Audit enthält Akteur, Organisation und Aktion |
| R1-04 | R1-03 | Separates apps/portal mit Auth0, Konfiguration, Container und lokalen/CI-Starts | Portalstart, Login-Sandbox, Isolation von Gründeransicht; ohne Live-Konfiguration geschlossen |
| R1-05 | R1-04 | Gemeinsame Sichtbarkeits- und versionsgebundene Freigabedienste | Interne Felder fehlen in Portal, Suche, Download und Event; Änderung entwertet Freigabe |
| R1-05-01 | R1-04 | Zod-Verträge und reine gemeinsame Projektions-/Freigaberegeln | Private Felder fehlen in allen Projektionsformaten; fremde, alte, abgelaufene oder widerrufene Nachweise verweigert |
| R1-05-02 | R1-05-01 | Unveränderliche aktuelle Versionen, vertrauenswürdige Rollenbelege und transaktionale Entscheidungen/Widerruf mit Audit | PostgreSQL: parallele Änderung/Entscheidung, Idempotenz, Mandantentrennung und neue Version entwertet alte Freigabe |
| R1-05-03 | R1-05-02 | Autorisierte Dienste und Ausgabewege mit gespeicherten Versionen verbinden | Echte Antworten enthalten keine privaten Felder; keine veraltete Version in Suche, Download oder Eventprojektion |

R1-05 ist eine Sammelaufgabe und gilt erst nach Merge und Abnahme von R1-05-03 als erledigt. Abhängigkeiten auf R1-05 dürfen nicht durch den ersten Policy-PR als erfüllt gelten.

## Wissen, Dateien und sichere Kostenbasis

| ID | Abhängigkeiten | Konkretes Ergebnis | Automatische Abnahme |
|---|---|---|---|
| R2-01 | R1-05 | Zod-Verträge für Quellen, Wissensversionen, Fakten/Annahmen, Fragen, Antworten und geprüfte Analysebausteine | Ungültige Bausteine und ausführbare Inhalte abweisen; Herkunft und Version erforderlich |
| R2-02 | R2-01 | JSONB-/pgvector-Speicherung, Wissenskorrekturen und mandantengeschützte Suche | Korrekturhistorie bleibt erhalten; Suche liefert keine fremden Quellen |
| R2-03 | R2-02 | Datei-/Versionsverträge, Metadatenmigration und privater R2-Adapter mit signierten URLs | Fremde Datei verweigert; URL-Ablauf, Upload-Grenzen und unvollständiger Multipart-Upload |
| R2-04 | R2-03 | Upload-Quarantäne, MIME-Prüfung, ClamAV-Prüfung und genehmigte Dateiabrufe | Infizierte/abweichende Testdatei bleibt unzugänglich; Scanner-Ausfall gibt keine Datei frei |
| R2-05 | R2-04 | Portalprofil und erlaubte Logo-/Akzentfarben-Konfiguration mit Korrektur | Kontrast, Tastaturbedienung, unsicheres Logoformat und Profilkorrektur |
| R9-01 | R1-05 | Budget-/Reservierungs-/Belegverträge zuerst, dann vorwärtsmigrierte Budgettabellen | Währung, Zeitraum, Zweck, Anbieter und Ganzzahlbeträge validiert; Mandantentrennung |
| R9-02 | R9-01 | requestApproval, atomare Reservierung, Abgleich und Notbremse als gemeinsamer Dienst | Parallele Reservierungen, Replay, Timeout, Widerruf, Limitgrenze und unklarer Anbieterstatus |

R9-01/R9-02 dürfen nach ihren Fundament-Abhängigkeiten vorgezogen werden. Das verhindert, dass kostenpflichtige R3-/R4-Abläufe vor der Budgetdurchsetzung live gehen. Die Reihenfolge der Meilensteinnummern ist keine Erlaubnis, Budgetgates zu überspringen.

## Automatisierung und Interessenteneinstieg

| ID | Abhängigkeiten | Konkretes Ergebnis | Automatische Abnahme |
|---|---|---|---|
| R3-01 | R2-02 | Gemeinsame Auftrags-/Laufverträge und Temporal-Workflows auf bestehendem Beispiel aufbauen | Worker-Neustart, Retry, Timeout, Abbruch und doppelte Zustellung |
| R3-02 | R3-01, R9-02 | OpenAI-Adapter, strukturierte Ergebnisse, Kostenmessung, Prompt-/Modellversionen und Budgetprüfung | Mock-/Sandbox-Lauf; ohne Rahmen kein Provideraufruf; Kostenreconciliation |
| R3-03 | R3-02 | Quellen-/Qualitätsprüfung und synthetische Evaluation für adaptive Fragen und Chancen | Unbelegte Kennzahl blockiert Publikation; mehrere Geschäftsmodelle ohne Branchenenum |
| R3-04 | R3-03 | Persistierte Ereignisse, SSE und Benachrichtigungen hinter SMTP-Adapter | Verbindungsabbruch/Wiederaufnahme, kein fremdes Event, doppelte Benachrichtigung verhindert |
| R4-01 | R3-03 | Crawl-Verträge, DNS-/Redirect-SSRF-Schutz, robots.txt, Limits und Quellenextraktion | IPv4/IPv6, private Ziele, DNS-Wechsel, Redirects, große Antworten und Timeout |
| R4-02 | R4-01 | Isolierter Browsercrawler bei notwendigem JavaScript und sichere Logo-/Farbextraktion | Seiteninhalt verändert keine Regeln; Netzschutz greift auch bei Browser-Subrequests |
| R4-03 | R4-02, R2-05, R3-04 | Anonyme Analyse mit serverseitiger Session, Missbrauchslimits und interaktiver Vorschau | Maximal 20 Seiten; Ergebniszugriff nur mit Session; Fehler führen zu ehrlicher Teilansicht |
| R4-04 | R4-03, R1-04 | Registrierung beansprucht Vorschau atomar, entfernt anonymen Zugriff und startet Vertiefung | Fremde Session nicht beanspruchbar; keine Doppelübernahme; maximal 100 Seiten |
| R4-05 | R4-04 | Adaptive Fragen/Antworten, Neuberechnung und vollständige Einstiegsanalyse | Antworten ändern passende Analyse; Unterbrechung setzt fort; Quellen bleiben nachvollziehbar |

## Vertrieb und laufende Zusammenarbeit

| ID | Abhängigkeiten | Konkretes Ergebnis | Automatische Abnahme |
|---|---|---|---|
| R5-01 | R4-05 | Leistungskatalog-/Kalkulationsverträge, Versionen und interne Pflege | Ungültige Kalkulation abweisen; fehlender Katalog liefert keine erfundenen Preise |
| R5-02 | R5-01 | KI-Paketvorschlag, Angebotsversionen und Gesprächsvorbereitung | Alle Angebotsfelder bleiben vor Freigabe intern; Neuberechnung erhält Vorversion |
| R5-03 | R5-02 | Cal.com-Buchung, verifizierte Webhooks und Gesprächsübersicht | Signaturprüfung, Replay, Absage, Umbuchung und doppelte Zustellung |
| R5-04 | R5-03 | Menschlich bestätigte Beauftragung wandelt Interessent in Kunde um | Wissen/Dateien bleiben erhalten; kein automatischer Vertragsabschluss |
| R6-01 | R5-04 | Projekt-/Aufgaben-/Briefing-/Nachrichtenverträge, dann Migration und Dienste | Zustandsübergänge, Fristen, Eigentümer und RLS |
| R6-02 | R6-01 | Kundenakte und Portal für Briefings, Material, Aufgabenanfragen und Kommunikation | Anfrage wird Auftrag und Antwort; interne Notizen bleiben unsichtbar |
| R6-03 | R6-02 | Heute-Ansicht und wiederkehrende Leistungsaufträge | Termine lösen einmalig Arbeit aus; Zeitzone Europe/Berlin und Sommerzeit geprüft |

## Medien, externe Agenten und Marketing

| ID | Abhängigkeiten | Konkretes Ergebnis | Automatische Abnahme |
|---|---|---|---|
| R7-01 | R6-02, R2-04 | Medien-/Feedback-Verträge, Versionen und zeitbezogene Kommentare | Kommentar bezieht sich auf eindeutige Version; keine fremden Medien |
| R7-02 | R7-01 | Sharp-/FFmpeg-Worker, Vorschaubilder und begrenzte Verarbeitung | Ressourcenlimit, defekte Datei, Wiederholung und versionierte Ausgabe |
| R7-03 | R7-02 | Briefing-to-Asset-Ablauf und Kunden-/Gründerfreigaben | Neue Version braucht neue Freigabe; nur freigegebene Version publizierbar |
| R8-01 | R6-03, R9-02 | /v1-Verträge und generierte REST-Dokumentation; bestehende Routen kompatibel halten | Bestehende Clients unverändert; neue Routen haben dieselben fachlichen Rechte |
| R8-02 | R8-01 | Authentifizierter MCP-Server mit gemeinsamem Tool-/REST-Dienst | Toolaufruf erfüllt dieselben Scope-, Kunden-, Budget- und Freigabeprüfungen |
| R8-03 | R8-02 | Auftragsübergabe, externe Agentenfreigaben, Ablauf, Widerruf und Notbremse | Testagent bearbeitet Auftrag; Widerruf blockiert Folgeschritt und Download |
| R9-03 | R9-02, R7-03, R8-03 | Meta-/Google-Ads-Verträge und zunächst lesende Sandboxadapter | Richtige Kontenzuordnung, maskierte Fehler, begrenzte Wiederholungen |
| R9-04 | R9-03 | Kampagnenentwürfe, Freigaben und budgetgebundene Sandbox-Publikation | Idempotente Anlage; keine Publikation ohne Freigabe; Kosten reserviert |
| R9-05 | R9-04 | Kampagnenübersicht, erlaubte Änderungen und Reconciliation | Extern unbekannter Status blockiert riskantes Replay; Limit-/Versionsprüfung |

## Ergebnisse, Rechnungen und Betrieb

| ID | Abhängigkeiten | Konkretes Ergebnis | Automatische Abnahme |
|---|---|---|---|
| R10-01 | R9-05 | GA4-/Search-Console-/Ads-Adapter, Kennzahlverträge und Importhistorie | Quellen getrennt; verspätete Daten und fehlende Verbindung sichtbar |
| R10-02 | R10-01 | Ergebnisberichte, Experimente und belegte Optimierungsvorschläge | Keine Plattformumsätze doppelt addiert; Qualitätsgate vor Kundensichtbarkeit |
| R10-03 | R10-02 | Rechnungsentwürfe, freigegebene PDFs, Zahlungsstände und CSV-Export | Nummernkonkurrenz, Versionen, Kundenrechte und Kostenarten geprüft |
| R11-01 | R3-01, R1-04 | Lesende VPS-Kapazitätsprüfung und isoliertes Compose für Portal/Temporal/Worker | Keine fremden Dienste betroffen; eigener Ressourcenbedarf dokumentiert |
| R11-02 | R11-01 | Produktionsfähige Temporal-Konfiguration, private Netze und erweiterter Release-/Receiververtrag | Feste Image-Allowlist, Health, Wiederanlauf und Rollback kompatibel |
| R11-03 | R11-02, R2-04 | Verschlüsselte externe Sicherungen, Dateisicherung und Restore-Ablauf | Datenbank, Dateien und Workflowzustand aus unabhängiger Sicherung wiederhergestellt |
| R11-04 | R11-03 | OpenTelemetry, Prometheus, Grafana und Betriebsalarme | Alarm bei fehlendem Backup, vollem Datenträger und ausgefallenem Workflow |
| R11-05 | R10-03, R11-04 | ROASWELL-Pilot, Last-/Ausfalltest und dokumentierter Betriebsrunbook | Voller Kundenablauf; RPO <=24h/RTO <=4h getestet; menschliche Produktionsfreigabe |

## Externe Abnahmen und Freigaben

Anbieteradapter können mit synthetischen Fixtures entwickelt werden. Ein Live-Status erfordert reale Sandbox-Zugänge und nachgewiesene Abnahme. Keine automatische Bestellung oder Konto-/Tarifannahme.

Vor Kundennutzung erforderlich: Auth0-Login/OAuth-Abnahme, SMTP-Zustellung, Terminbuchung, R2-Datenstandort und Dateirestore, genehmigtes Modellbudget, Ads-Sandbox, Kalender-/Kontenzuordnung und Betreiberfreigaben. Beträge, Domainnamen und Anbieterkennungen sind validierte Betreiberkonfiguration, keine erfundenen Defaults.

Offene PRs #14/#15 werden separat bewertet. Dieser Plan erteilt keine Freigabe, deren Änderungen ungeprüft zu übernehmen oder deren Arbeit zu löschen.
