# ADR 0022: Katalogshell im bestehenden VPS-Staging starten

Status: entschieden für den Start von `apps/agency` im vorhandenen Staging-Deploy.

Die Nummern 0018, 0019, 0020 und 0021 sind belegt. 0018 lässt Infra, CI und DNS für die Shell selbst unverändert. Diese Entscheidung ändert nur den Staging-Start. Sie verwendet keine dieser Nummern.

## Entscheidung

Die Next.js-App `apps/agency` wird im bestehenden VPS-Staging wie API, App und Web gebaut und gestartet. Das Image-Ziel heißt `agency`. Der Prozess hört auf Port 3004. Das Image liegt im selben Archiv wie api, app, web und migrate. Der Receiver startet es mit demselben Compose-Projekt und demselben `up --wait`. Portal bleibt außerhalb dieses Empfängers.

Es gibt keinen neuen öffentlichen Host, keinen neuen Traefik-Router und keine DNS-Änderung. Die drei bestehenden Staging-Hosts bleiben die einzigen Router. Die drei HTTPS-Prüfungen bleiben unverändert. `agency.beaconandbold.com` wird nicht als neuer Staging-Name eingetragen. Eine Agentursitzung bleibt nur auf diesem Host gültig. Der Start setzt kein `Domain`-Attribut und erfindet kein Auth0-Subjekt.

`HOSTNAME=0.0.0.0` ist nur die Bind-Adresse, damit der Prozess wie die anderen Next.js-Apps im Container lauscht. Next schreibt diese Adresse in `nextUrl.hostname`. Die Host-Prüfung liest deshalb den `Host`-Header. `0.0.0.0`, `127.0.0.1` und jeder andere Name bleiben abgelehnt.

`STAGING_APPROVAL_REFERENCE` und die commit-gebundene Prüfung vor jedem SSH-Zugriff bleiben unverändert. Eine nichtleere Zeichenkette ohne diesen Commit bleibt abgelehnt.

Die zusätzliche Katalogshell nutzt dieselben Grenzen wie die anderen Next.js-Apps: 512 MiB und 0,375 CPU. Die Obergrenze der dauerhaft laufenden Staging-Dienste wird dadurch 3 GiB RAM und 2,375 CPU. Das bleibt der vorhandene VPS. Es wird kein neuer Server und kein neuer bezahlter Dienst bestellt.

## Folge

Solange kein DNS-Eintrag die Katalogshell erreicht, antwortet sie nicht über einen neuen öffentlichen Namen. Der Container startet trotzdem. Die Host-Prüfung wird nicht gelockert: nur `agency.beaconandbold.com` darf weiterlaufen. Ein Staging-Name, eine IP, localhost, `workers.dev` oder `pages.dev` wird abgelehnt. Das Sitzungscookie entsteht nur für `agency.beaconandbold.com` und ohne `Domain`-Attribut. Die Prüfung im Container sendet diesen Host an Port 3004 auf der Loopback-Adresse. Die Loopback-Adresse selbst ist kein gültiger Agentur-Host.
