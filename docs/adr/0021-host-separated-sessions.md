# ADR 0021: Host-getrennte Sitzungen und Kundenzuweisung

Status: Vorgeschlagen mit dieser Änderung.

Die Nummern 0018, 0019 und 0020 sind belegt. 0018 ist die Katalogshell, 0019 die Vorschau der Hülle, 0020 das Staging-Deploy-Gate. Diese Entscheidung nimmt keine dieser Nummern.

## Entscheidung

`agency.beaconandbold.com` und `clients.beaconandbold.com` sind dieselbe Site. `SameSite` trennt sie nicht. Eine Agentursitzung gilt nur auf dem Agentur-Host. Eine Kundensitzung gilt nur auf dem Kunden-Host.

Beide Sitzungscookies bleiben host-only. Sie bekommen kein `Domain`-Attribut, auch nicht `Domain=.beaconandbold.com`. Die Agentur-App liest nur ihr eigenes Cookie, die Kunden-App nur ihres. Ein Cookie, das für den anderen Host signiert wurde, bleibt ungültig, auch wenn es denselben `SameSite`-Wert und dasselbe Secret trägt.

Die Katalogshell, die auf `agency.beaconandbold.com` läuft, ist `apps/agency`. Die Host-Bindung der Agentursitzung liegt in dieser App (`apps/agency/proxy.ts`). Sie benutzt den bestehenden Katalogvertrag und fügt keine zweite Katalog-API hinzu.

`apps/app` ist die bestehende Betriebsoberfläche. Sie ist nicht die Katalogshell und trägt die Agentur-Host-Sitzung nicht.

Die Kundenbindung bleibt auf der Kunden-App `apps/portal` für `clients.beaconandbold.com`.

Die öffentliche Website, DNS, Cloudflare und der Deploy-Pfad bleiben unverändert.

Draft-Lesen, Draft-Speichern und Publish verlangen weiterhin exakt `Origin: https://agency.beaconandbold.com`. Der Clients-Origin hat keinen Katalog-Schreibweg.

Ein angemeldeter Kunde liest nur die veröffentlichten Pakete, die seiner Organisation aus dem aktuellen `CatalogSnapshot` zugewiesen sind. Er sieht den Entwurf nicht und keine Pakete einer anderen Organisation. Eine Organisation ohne Zuweisung erhält eine leere Liste, nicht den ganzen Katalog. Die Zuweisung ist kein zweiter Katalog und kein Kundenportal.

Seed-Version 1, `publishedAt` `2026-10-04T00:29:00+02:00`, die idempotente Publish-Revision, EUR, `month` und `adSpend` bleiben wie in ADR 0017.

## Offen

Eine echte Auth0-Anmeldung auf den beiden Hosts ist mit dieser Änderung nicht abgenommen. Die Host-Prüfung und die Kundenzuweisung sind serverseitig getestet. Solange diese Anmeldung fehlt, setzt die Katalogshell kein Login-Cookie aus einem Auth0-Login. Sie weist den Clients-Host trotzdem ab und setzt die host-only Agentur-Sitzung, sobald ein Subjekt vorliegt.
