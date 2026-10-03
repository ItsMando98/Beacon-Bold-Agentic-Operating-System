# ADR 0017: Agenturkatalog

Status: Vorgeschlagen mit dieser Änderung.

## Entscheidung

Der Leistungskatalog lebt in der bestehenden API und in der bestehenden Datenbank `beacon`. Es gibt keine zweite Datenbank, keine zweite App und kein Kundenportal.

Version 1 ist die übernommene Seed-Datei. Diese Übernahme ist kein Publish. `publishedAt` bleibt `2026-10-04T00:29:00+02:00`. Die Zeile hat keine Draft-Revision. Ein erneutes Ausführen der Übernahme legt keine weitere Zeile an und erhöht die Version nicht. Der nächste echte Publish einer gespeicherten Draft-Revision wird Version 2.

`CatalogSnapshot` ist unveränderlich. `OfferDraft` ist veränderbar und nur mit Agency-Auth lesbar. Publish nimmt eine gespeicherte Revision. Dieselbe Revision liefert denselben Snapshot. Ein fehlgeschlagener Publish lässt den bisherigen Snapshot stehen.

Draft-Schreiben und Publish akzeptiert der Server nur, wenn `Origin` genau `https://agency.beaconandbold.com` ist. Das ist keine Cookie-Eigenschaft. Sitzungscookies der Agentur bleiben host-only: kein `Domain`-Attribut. `SameSite` trennt `agency.beaconandbold.com` und `clients.beaconandbold.com` nicht, weil beide zur selben Site gehören.

Der Katalog ist ein Datensatz der Agentur, kein Kundendatensatz. Die Tabellen haben keine `tenant_id`. Es gibt keine Kundenakte und keinen Kunden-Ereigniskanal.

Neue Publish-Zeitstempel sind UTC-ISO-Zeichenketten. Die Seed-Zeichenkette wird nicht umformatiert. Die Revision ist der SHA-256 der kanonischen Draft-JSON. Menschen brauchen `surface: agency`. Maschinen ohne Kundensurface brauchen den Catalog-Scope.

## Offen

Eine echte Auth0-Anmeldung auf `https://agency.beaconandbold.com` ist mit dieser Änderung nicht abgenommen. Die Origin-Prüfung ist serverseitig getestet.
