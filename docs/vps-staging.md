# P0-7: Staging auf dem vorhandenen VPS

Status: SSH-Schlüsselzugang bestätigt; Server-Bestandsprüfung begonnen, Deployment offen. Stand: 1. Oktober 2026.

Der Gründer hat einen bestehenden VPS bereitgestellt und zusätzliches Staging unter Erhalt bestehender Dienste autorisiert. Der angegebene SSH-Benutzer ist `root`. `VPS_IP` und `VPS_PASSWORD` liegen ausschließlich in der ignorierten `.env`. Der nachträglich bereitgestellte lokale VPS-Ordner enthält ein bereits auf dem Server zugelassenes Ed25519-Schlüsselpaar. VPS-Ordner sind ausdrücklich aus Git und dem Docker-Build-Kontext ausgeschlossen. Werte und private Schlüssel werden weder dokumentiert noch in GitHub übertragen.

## Zugangsprüfung

Der SSH-Port 22 ist erreichbar. Passwort-Anmeldungen wurden mit `AuthenticationException` abgewiesen. Am 1. Oktober wurde das bereitgestellte Schlüsselpaar zur Laufzeit geladen, die Übereinstimmung von öffentlichem und privatem Schlüssel geprüft und eine ausschließlich schlüsselbasierte Root-Anmeldung mit `id -u` bestätigt. Ein weiterer Schlüssel war nicht nötig. Es wurden keine Serverdateien verändert, Schlüssel entfernt, Anmeldemethoden umgestellt oder Dienste gestartet.

Die lesende Bestandsprüfung bestätigt Ubuntu 24.04.4 LTS, x86_64, acht CPU-Kerne, rund 16 GB RAM und 417 GB freien Plattenplatz. Zum Prüfzeitpunkt waren rund 7,7 GB RAM verfügbar; der Swap war mit rund 3,3 von 4 GB belegt. Docker 29.3.0 und Compose v5.1.0 sind vorhanden. Es laufen 41 Container; unter anderem sind Ports 80 und 443 bereits belegt. Der vorgesehene eigene Staging-Pfad existiert noch nicht. Proxy-Zuordnung, Lastverlauf und verfügbare Kapazität müssen vor der Einrichtung genauer geprüft werden. Ein zweiter Proxy darf nicht die bestehenden Web-Ports übernehmen.

Der erstmals empfangene SSH-Hostschlüssel liegt ausschließlich im lokalen ignorierten Cache. Das ist eine Erstkontakt-Pinbindung, keine unabhängige Bestätigung durch den Anbieter. Vor dauerhafter CI-Einrichtung wird der Fingerabdruck über die Anbieter-Konsole bestätigt und als bekannter Host fest hinterlegt; wechselnde Schlüssel werden nicht automatisch akzeptiert.

## Vorgesehene Umsetzung

Die vier vorhandenen Docker-Ziele `api`, `app`, `web` und `migrate` sowie Vorwärtsmigrationen und Mandantentrennungstests werden weiterverwendet. Die AWS-Bereitstellung wird für dieses Ziel durch Docker Compose auf dem vorhandenen Server ersetzt. Es werden weder AWS-Ressourcen noch ein zusätzlicher VPS bestellt.

1. Nach erfolgreicher Anmeldung nur lesend Betriebssystem, Architektur, freien Speicher, Last, Docker/Compose, belegte Ports und vorhandenen Reverse Proxy prüfen. Echte Kundendaten und Anwendungskonfigurationen bestehender Dienste nicht lesen.
2. Eigener Pfad `/opt/beacon-bold-staging`, eigener Compose-Projektname, eigene Netzwerke und ausschließlich neue benannte Datenvolumes. Keine globalen Docker-Bereinigungen, keine Änderungen an fremden Containern oder Volumes. Falls Ressourcen nicht ausreichen, zuerst die konkrete Kapazitätsentscheidung vorlegen.
3. PostgreSQL/pgvector und Redis ausschließlich intern; keine öffentlichen Datenbankports. Administratorzugang nur für Migration und Backup, eingeschränkte `beacon_app`-Rolle für die API. Transportabsicherung und Secret-Dateien werden vor der Compose-Implementierung ausdrücklich festgelegt; lokale Entwicklungs-Passwörter sind unzulässig.
4. Anwendungen zunächst nur über freie Loopback-Ports erreichbar. Die HTTPS-Anbindung hängt vom vorhandenen Proxy ab. Belegte Ports 80/443 werden nicht übernommen und bestehende Websites nicht umkonfiguriert. Nur neue Staging-Hosts dürfen eingerichtet werden; Änderungen an produktiven DNS-Einträgen bleiben ausgeschlossen.
5. GitHub baut unveränderliche Release-Images nach bestandener CI. Ein dedizierter Deploy-Zugang ist auf dieses Staging begrenzt. Das Root-Passwort kommt nicht in GitHub; kein PR-Runner auf dem Anwendungsserver. Die Einrichtung dieses Zugangs und der Image-Registry bleibt offen.
6. Migration erfolgreich abschließen, bevor Anwendungen aktualisiert werden. Bei fehlgeschlagener Dienst-/HTTPS-Abnahme vorherige Anwendungsrevisionen wiederherstellen; Datenbankmigrationen bleiben vorwärts. Erst danach echten Merge-Deploy als bestanden dokumentieren.
7. Verschlüsselte Backups außerhalb des VPS, Wiederherstellungstest, Überwachung und Update-Verantwortung festlegen. Lokale Snapshots allein sind keine externe Datensicherung.

## Kostenfreigabe

Der bestehende Server vermeidet eine neue Serverbestellung. Seine laufenden Kosten, Auslastung, enthaltene Datentransfers und eventuelle Mehrkosten sind noch nicht bekannt. Daraus folgt keine Freigabe für Upgrades, zusätzlichen Speicher oder Backup-Dienste. Die AWS-Planung von 118,94 USD/Monat ist kein Kostenangebot für diesen VPS.

Nach der Bestandsprüfung wird ein konkreter Antrag mit bestehenden Serverkosten, zusätzlichen monatlichen Kosten, Backup-Speicher und gegebenenfalls Kapazitätsänderungen vorbereitet. Jede zusätzliche Geldwirkung benötigt gemäß AGENTS.md eine Gründerfreigabe; bis P1-8 ist dies ein dokumentierter manueller requestApproval-Antrag.

## Offene Abnahmen

- Unabhängig bestätigter Hostschlüssel; der SSH-Schlüsselzugang selbst ist bestanden.
- Ressourcen, Standort und Vereinbarkeit mit bestehenden Diensten; Frankfurt bleibt bis zur Standortentscheidung das dokumentierte Ziel.
- Compose-Konfiguration, begrenzter Deploy-Zugang, Image-Registry und Secret-Verteilung.
- Staging-DNS/HTTPS, Clerk-Live-Konfiguration, Backup und Wiederherstellung.
- Konkrete Kostenfreigabe und echter Merge-Deploy.
- GitHub-Branch-Schutz: bisher HTTP 403 im privaten Repository. Fehlgeschlagene Änderungen müssen verbindlich blockiert werden.

Gate 0 bleibt offen. Phase 1 beginnt erst nach nachgewiesener externer Abnahme. Die Terraform-Dateien bleiben vorerst als nicht provisionierte AWS-Alternative erhalten; ihre bestandenen Tests beweisen keine VPS-Abnahme.

Referenzen: [Docker Compose im Serverbetrieb](https://docs.docker.com/compose/how-tos/production/), [Compose-Secrets](https://docs.docker.com/compose/how-tos/use-secrets/), [GitHub-Sicherheit für Runner](https://docs.github.com/en/actions/reference/security/secure-use).
