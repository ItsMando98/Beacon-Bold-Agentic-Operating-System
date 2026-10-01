# VPS-Staging

Eigenständiges Compose-Projekt `beacon-bold-staging` unter `/opt/beacon-bold-staging`. Bestehende Coolify-/Traefik-Dienste werden weder neu gestartet noch verändert. Neue Router verwenden ausschließlich die drei freigegebenen Staging-Hosts. Die produktiven DNS-Namen bleiben unangetastet.

## Aufbau

API, App und Web laufen ohne Root-Rechte mit schreibgeschütztem Dateisystem, begrenzten temporären Verzeichnissen, entfernten Linux-Capabilities, Prozesslimits und begrenzten Logs. Alle dauerhaft laufenden Dienste zusammen haben 2,5 GiB RAM und zwei CPU-Kerne als Obergrenze. Migration/Abnahme laufen nacheinander mit jeweils höchstens 512 MiB und 0,5 CPU.

PostgreSQL lauscht ausschließlich auf einem lokalen Unix-Socket und besitzt überhaupt kein Container-Netzwerk. Passwortanmeldung mit SCRAM ist auch auf dem Socket erzwungen. Nur API und Migrations-/Abnahmecontainer erhalten diesen Socket. PostgreSQL-Passwörter sind getrennt für Administrator und eingeschränkte App-Rolle. Redis liegt in einem separaten internen Netzwerk und erfordert Passwort plus verifiziertes TLS. Zertifikat-Erneuerung ist spätestens vor Ablauf von 365 Tagen erforderlich.

Secret-Dateien befinden sich ausschließlich im eigenen, für andere Host-Benutzer unzugänglichen Verzeichnis `secrets` (0700). Ausgewählte Dateien werden schreibgeschützt ausschließlich in die Dienste eingebunden, die sie benötigen. Die Datei-Rechte erlauben dem jeweiligen nicht privilegierten Containerprozess das Lesen; auf dem Host verhindert das übergeordnete private Verzeichnis den Zugriff. Die Runtime lädt Werte erst im Prozess; weder Compose noch Image-Builds erhalten private Clerk-/Datenbankwerte. Der öffentliche Clerk-Schlüssel ist Build-/Runtime-Konfiguration.

Die Foundation enthält keine Phase-1-Fachmodelle. Migrationen bleiben vorwärts, unveränderte Dateiprüfsummen und Advisory Lock sichern Wiederholungen. Die Abnahme verwendet ausschließlich erfundene Mandanten in einer zurückgerollten Transaktion und prüft Lesen, verweigertes mandantenfremdes Schreiben, Rollenrechte und Redis-TLS.

## Deploy-Zugang

Der ursprüngliche Root-Schlüssel bleibt lokal. GitHub erhält einen gesonderten Schlüssel mit `restrict` und erzwungenem Aufruf des root-eigenen `receiver.py`. Er erlaubt ausschließlich `deploy <40-stelliger Commit>` und `backup`, keine interaktive Shell, Portweiterleitung oder frei wählbare Docker-Befehle.

Der Receiver prüft den Commit gegen den aktuellen öffentlichen main-Stand sowie Plattform, Revision und exakt vier feste Image-Namen im Image-Archiv. Größen-/Pfadprüfungen erfolgen vor Docker-Import. Compose-Datei, Einstellungen und Secret-Dateien kommen nicht aus dem übertragenen Archiv und werden dadurch nicht überschrieben. Deploy und Backup sind durch eine eigene Dateisperre serialisiert.

GitHub baut Images nach erfolgreicher CI. Erst main erzeugt ein kurzlebiges Image-Artefakt (ein Tag Aufbewahrung); PRs speichern keine Runtime-Artefakte. Der Deploy benötigt `STAGING_TARGET=vps`, `STAGING_READY=true`, eine dokumentierte Freigabereferenz und die Secrets `VPS_HOST`, `VPS_DEPLOY_KEY`, `VPS_KNOWN_HOSTS`. Letztere pinnen den bekannten Hostschlüssel. Main-Branch-Schutz verlangt alle neun Prüfungen und gilt auch für Administratoren. Der AWS-Deploy bleibt auf `STAGING_TARGET=aws` beschränkt.

Der Ablauf startet ausschließlich eigene Datenbankdienste, erstellt eine verschlüsselte Sicherung, führt Migration und Mandantentrennungstest aus, startet Anwendungen und prüft alle drei HTTPS-Endpunkte mit gültigem Zertifikat. Fehler nach Dienstwechsel stellen die vorherigen Anwendungsimages wieder her; bei Erstinstallation werden nur eigene Anwendungen gestoppt. Datenvolumes bleiben erhalten; Migrationen werden niemals rückwärts ausgeführt.

## Backups und Betrieb

`backup` erzeugt einen PostgreSQL-Dump im Prozess-Pipe und verschlüsselt ihn unmittelbar mit OpenSSL CMS/AES-256 für ein separates RSA-Zertifikat. Nur dessen öffentlicher Teil liegt auf dem Server; der private Wiederherstellungsschlüssel bleibt lokal im ignorierten VPS-Ordner. Keine unverschlüsselten Dumps werden gespeichert. Backup-Artefakte sind auf 64 MiB begrenzt; größere Sicherungen benötigen eine neue Speicher-/Betriebsentscheidung.

Vor Gate 0: Sicherung außerhalb des VPS speichern und in einer separaten Testdatenbank wiederherstellen, echten Merge-Deploy und HTTPS beweisen. Dauerhafte Backup-Abholung und Verantwortlichkeit müssen dokumentiert sein; eine ausschließlich lokale Kopie auf dem VPS ist kein externer Backup-Nachweis.

Keine globale Docker-Bereinigung, kein Stoppen fremder Dienste, keine Änderungen an produktiven DNS-Einträgen oder bestehender Proxy-Konfiguration. Ein erforderlicher Host-Neustart bleibt ein menschlich geplantes Wartungsfenster. Root-Deploy-Receiver und Compose werden nur durch den administrativen Projektzugang aktualisiert, niemals über den beschränkten CI-Schlüssel.
