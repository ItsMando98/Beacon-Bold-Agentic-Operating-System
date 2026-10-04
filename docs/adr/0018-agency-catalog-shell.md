# ADR 0018: Agentur-Katalogshell

Status: Shell only. Anvil owns draft and publish (ADR 0017 auf dem Catalog-Server-Branch). Harbor owns the preview pipeline, CI, and DNS.

## Entscheidung

Die Katalogshell ist die eigene Next.js-App `apps/agency` für den Origin https://agency.beaconandbold.com. Sie zeigt Angebote und Pakete aus Seed v1 in Array-Reihenfolge. Die Vorschau der Paketkarten und der Preisnotiz kommt aus `render-catalog.mjs`. Hero, Prozess, About, Kontakt und die Fußnote gehören zur öffentlichen Website und sind nicht Teil der Vorschau.

Der Tab hält einen ungespeicherten Puffer. Veröffentlichen sendet nur eine gespeicherte Entwurfsrevision. Ist der Puffer schmutzig, wird zuerst gespeichert und danach genau die Revision veröffentlicht, die das Speichern zurückgibt. Ein schmutziger Puffer selbst wird abgelehnt. Eine gespeicherte Revision wird nicht abgelehnt, nur weil ihr Inhalt Seed v1 gleicht. Abgelehnt wird nur ein Publish ohne gespeicherte Revision. Die Übernahme von Seed v1 ist kein Publish.

Der Client spricht Anvils Vertrag an: POST `/catalog/draft` mit `{ pricingNote, offers, packages }`, Antwort `{ revision, pricingNote, offers, packages }`, POST `/catalog/publish` mit `{ revision }`, Antwort das CatalogSnapshot. GET `/catalog` und GET `/catalog/draft` gehören zum selben Vertrag. Aufrufe gehen nur an https://agency.beaconandbold.com. Die Shell setzt kein Cookie auf `.beaconandbold.com`.

Solange die Routen explizit `null` sind oder die Seite nicht auf dem Agency-Origin liegt, bleibt der temporäre lokale Seed-Adapter der Fallback. Er schreibt Seed v1 nicht um.

Kundenportal, Marketing-App, API, Worker, Datenbank, Infra, CI und DNS bleiben unverändert.
