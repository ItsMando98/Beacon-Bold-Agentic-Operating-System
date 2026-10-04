# ADR 0018: Host-getrennte Sitzungen und Kundenzuweisung

Status: Vorgeschlagen mit dieser Änderung.

## Entscheidung

`agency.beaconandbold.com` und `clients.beaconandbold.com` sind dieselbe Site. `SameSite` trennt sie nicht. Eine Agentursitzung gilt nur auf dem Agentur-Host. Eine Kundensitzung gilt nur auf dem Kunden-Host.

Beide Sitzungscookies bleiben host-only. Sie bekommen kein `Domain`-Attribut, auch nicht `Domain=.beaconandbold.com`. Die Agentur-App liest nur ihr eigenes Cookie, die Kunden-App nur ihres. Ein Cookie, das für den anderen Host signiert wurde, bleibt ungültig, auch wenn es denselben `SameSite`-Wert und dasselbe Secret trägt.

Die öffentliche Website, DNS, Cloudflare und der Deploy-Pfad bleiben unverändert.

Draft-Lesen, Draft-Speichern und Publish verlangen weiterhin exakt `Origin: https://agency.beaconandbold.com`. Der Clients-Origin hat keinen Katalog-Schreibweg.

Ein angemeldeter Kunde liest nur die veröffentlichten Pakete, die seiner Organisation aus dem aktuellen `CatalogSnapshot` zugewiesen sind. Er sieht den Entwurf nicht und keine Pakete einer anderen Organisation. Eine Organisation ohne Zuweisung erhält eine leere Liste, nicht den ganzen Katalog. Die Zuweisung ist kein zweiter Katalog und kein Kundenportal.

Seed-Version 1, `publishedAt` `2026-10-04T00:29:00+02:00`, die idempotente Publish-Revision, EUR, `month` und `adSpend` bleiben wie in ADR 0017.

## Offen

Eine echte Auth0-Anmeldung auf den beiden Hosts ist mit dieser Änderung nicht abgenommen. Die Host-Prüfung und die Kundenzuweisung sind serverseitig getestet.
