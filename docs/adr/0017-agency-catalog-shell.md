# ADR 0017: Agentur-Katalogshell

Status: Shell only. Anvil owns draft and publish. Harbor owns the preview pipeline, CI, and DNS.

## Entscheidung

Die Katalogshell ist die eigene Next.js-App `apps/agency` für den Origin https://agency.beaconandbold.com. Sie zeigt Angebote und Pakete aus Seed v1 in Array-Reihenfolge. Die Vorschau der Paketkarten und der Preisnotiz kommt aus `render-catalog.mjs`. Hero, Prozess, About, Kontakt und die Fußnote gehören zur öffentlichen Website und sind nicht Teil der Vorschau.

Der Tab hält einen ungespeicherten Puffer. Veröffentlichen sendet nur eine gespeicherte Entwurfsrevision. Ist der Puffer schmutzig, wird zuerst gespeichert und danach genau die Revision veröffentlicht, die das Speichern zurückgibt. Ein schmutziger Puffer selbst wird abgelehnt.

Anvils Routen sind in diesem Baum noch nicht vorhanden. Die Shell erfindet keinen zweiten Server. Ein typisierter Client ruft Anvils Routen nur vom Agency-Origin auf, sobald `anvilCatalogRoutes` gesetzt ist. Bis dahin nutzt die Oberfläche einen ausdrücklich temporären lokalen Seed-Adapter. Dieser Adapter schreibt Seed v1 nicht um.

Die Shell setzt kein Cookie auf `.beaconandbold.com`. Kundenportal, Marketing-App, API, Worker, Datenbank, Infra, CI und DNS bleiben unverändert.

## Offene Entscheidung

Die konkreten Pfade von Anvils Draft- und Publish-Routen stehen nicht im Repo. `anvilCatalogRoutes` bleibt deshalb `null`. Das ist keine zweite API und keine Abnahme von Anvil.
