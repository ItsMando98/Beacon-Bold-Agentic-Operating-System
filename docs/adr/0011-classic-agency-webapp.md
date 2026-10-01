# ADR 0011: Klassische Agentur-Webapp mit agentenfähigem Kern

Status: Produktziel durch den Gründer am 1. Oktober 2026 ausdrücklich klargestellt; Umsetzung folgt in einzelnen Aufgaben.

## Entscheidung

Beacon & Bold baut eine vollständige Webapp für den Marketing-Agenturbetrieb bis zum Vollbetrieb. Die Oberfläche ist klassisch aufgebaut und vollständig für Menschen bedienbar. KI-Agenten können im Hintergrund dieselben Geschäftsaktionen übernehmen.

Die frühere Interpretation „Agent-first, UI-second“ als reine Beobachtungs-, Chat- oder Freigabeoberfläche wird ersetzt. Menschen können Kunden, Projekte, Aufgaben, Kampagnen, Content, Assets, Kommunikation, Termine und Finanzen direkt in Fachseiten verwalten. Tabellen, Detailseiten, Formulare und Boards sind reguläre Bedienwege. Chat und Streaming ergänzen die App.

## Gemeinsamer Kern

Zod-Verträge, Geschäftsregeln und Datensätze werden für menschliche und agentische Bedienung gemeinsam verwendet. REST und MCP sind Zugänge zur gleichen Geschäftslogik. Rechte sind je Identität begrenzt; gleiche Geschäftsaktionen bedeuten nicht gleiche Berechtigungen. Mandantentrennung, Audit, Idempotenz und Geldfreigaben werden serverseitig durchgesetzt. Ein Formular darf keine Agenten-Grenze umgehen.

Providerverwaltete Identitätsaktionen wie Passwort-Wiederherstellung bleiben bei Auth0; Agenten erhalten keine Passwörter oder pauschalen Verwaltungsrechte. Systemadministration, Produktion und rechtliche Freigaben bleiben an die bestehenden menschlichen Eingriffspunkte gebunden.

Ein Agentenausfall darf eine unabhängig ausführbare Fachaktion nicht blockieren. Sperren laufender Workflows, Notbremsen und erforderliche Freigaben gelten weiterhin.

## Oberfläche und Konten

Der im Konzept benannte Kiranism-Dashboard-Starter bleibt Layout-/Komponentenvorlage. Die dort verwendeten Auth-/Hosting-Anbieter werden nicht übernommen. Auth0 bleibt beschlossen, VPS bleibt der aktive Hosting-Pfad.

Login, Signup, Logout, Passwort-Wiederherstellung, Profil und verständlicher Zugriffsstatus werden früh als P1-4a gebaut. Arbeitsbereichs-/Mitgliedschaftsverwaltung folgt als P1-4b nach ausdrücklicher Zugangs- und Rollenentscheidung. Signup erteilt allein keinen Zugriff auf bestehende Arbeitsbereiche. Automatisches kommerzielles Kunden-Onboarding und Abrechnung bleiben P4-1.

## Folgen für den Plan

P1-11 umfasst den klassischen App-Rahmen, eine direkt bedienbare Auftrags-/Aufgabenstrecke und ergänzende Agenten-Assistenz. Die Fachmodule in Phase 2/3 erhalten jeweils klassische Bedienwege und Agentenanbindung. Gate 3 verlangt Vollbetrieb auf beiden Wegen, zusätzlich zu Freigaben, Audit und gemessener Autonomie.

Der bestehende Dashboard-PR #14 ist ein geprüfter Rahmen, keine Abnahme des vollständigen Produkts. Seine Aufgabenbeschreibung und Navigation sind vor Folgearbeit mit diesem Produktziel abzugleichen.

## Noch offene Entscheidungen

- Neue Accounts: Einladung/Freigabe für bestehende Arbeitsbereiche oder automatische Erstellung eigener Arbeitsbereiche?
- Rollen, Kundenzugriff, Einladungen, Rechtevergabe und Widerrufsverantwortung.
- Konkrete Pflichtfelder, Statusübergänge und Lebenszyklen je Fachmodul.
- Anbieter-, Rechts- und Betriebsentscheidungen für reale Nutzung.

Diese Entscheidung aktiviert weder öffentliche Registrierung im Auth0-Tenant noch einen Produktionsdienst. Grundlegende Kontofunktionen werden vor Fachmodulen umgesetzt; die offenen Zugangsfragen werden vor ihrer jeweiligen Implementierung beantwortet.
