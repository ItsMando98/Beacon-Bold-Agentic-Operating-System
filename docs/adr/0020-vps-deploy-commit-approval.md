# ADR 0020: VPS-Deploy nur mit commit-gebundener Freigabe

Status: entschieden für den CI-Job `vps-staging-deploy`.

## Entscheidung

`STAGING_APPROVAL_REFERENCE` erlaubt einen Deploy nur, wenn sie den exakten Commit nennt: den 40-stelligen, kleingeschriebenen `github.sha` als eigenes Token. Ein Token endet an Anfang, Ende oder einem Zeichen außerhalb von `0-9` und `a-f`.

Die Referenz `founder-request-2026-10-01-existing-vps-no-new-paid-services` vom 1. Oktober 2026 erlaubt die Nutzung des vorhandenen VPS und untersagt neue bezahlte Dienste. Sie nennt keinen Commit und erlaubt keinen Deploy. Eine bloß nichtleere Zeichenkette erlaubt ebenfalls keinen Deploy. Ein anderer Commit, eine längere Hex-Kette oder Großschreibung zählen nicht als Nennung.

Fehlt die Nennung, beendet der Job den Schritt mit Fehler, bevor Schlüssel, known_hosts oder eine SSH-Verbindung entstehen. Das Log nennt den abgelehnten Commit und den Grund. Host, Deploy-Schlüssel und known_hosts werden nicht ausgegeben.

## Folge

Ein Push auf `main` deployt nicht allein deshalb, weil die Variable gesetzt ist. Für einen konkreten SHA muss die Variable diesen SHA enthalten, zum Beispiel `founder-approval-` plus den Commit. Bestehende Voraussetzungen `STAGING_READY=true` und `STAGING_TARGET=vps` bleiben bestehen.
