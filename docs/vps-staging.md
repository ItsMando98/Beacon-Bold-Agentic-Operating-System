# P0-7: Staging auf dem vorhandenen VPS

Status: technische VPS-Eignung für kleines Staging bestätigt; Konfiguration, Lastabnahme und Deployment offen. Stand: 1. Oktober 2026.

Der Gründer hat einen bestehenden VPS bereitgestellt und zusätzliches Staging unter Erhalt bestehender Dienste autorisiert. Der angegebene SSH-Benutzer ist `root`. `VPS_IP` und `VPS_PASSWORD` liegen ausschließlich in der ignorierten `.env`. Der nachträglich bereitgestellte lokale VPS-Ordner enthält ein bereits auf dem Server zugelassenes Ed25519-Schlüsselpaar. VPS-Ordner sind ausdrücklich aus Git und dem Docker-Build-Kontext ausgeschlossen. Werte und private Schlüssel werden weder dokumentiert noch in GitHub übertragen.

## Zugangsprüfung

Der SSH-Port 22 ist erreichbar. Passwort-Anmeldungen wurden mit `AuthenticationException` abgewiesen. Am 1. Oktober wurde das bereitgestellte Schlüsselpaar zur Laufzeit geladen, die Übereinstimmung von öffentlichem und privatem Schlüssel geprüft und eine ausschließlich schlüsselbasierte Root-Anmeldung mit `id -u` bestätigt. Ein weiterer Schlüssel war nicht nötig. Es wurden keine Serverdateien verändert, Schlüssel entfernt, Anmeldemethoden umgestellt oder Dienste gestartet.

Die lesende Bestandsprüfung bestätigt Ubuntu 24.04.4 LTS, x86_64, acht CPU-Kerne, rund 16 GB RAM und 417 GB freien Plattenplatz. Zum Prüfzeitpunkt waren rund 7,7 GB RAM verfügbar; der Swap war mit rund 3,3 von 4 GB belegt. Docker 29.3.0 und Compose v5.1.0 sind vorhanden. Es laufen 41 Container; unter anderem sind Ports 80 und 443 bereits belegt. Der vorgesehene eigene Staging-Pfad existiert noch nicht. Die vertiefte Prüfung von Proxy und aktueller Kapazität ist nachfolgend dokumentiert; ein längerer Lastverlauf bleibt offen. Ein zweiter Proxy darf nicht die bestehenden Web-Ports übernehmen.

## Ergebnis der Deployment-Eignungsprüfung

Ein kleines zusätzliches synthetisches Staging ist auf diesem VPS technisch möglich. Ein Hardware-Upgrade ist anhand der Messung nicht erforderlich. Das ist eine Kapazitätsaufnahme und Konfigurationsprüfung, keine bestandene Deployment- oder Lastabnahme.

| Prüfung | Nachweis vom 1. Oktober 2026 |
|---|---|
| CPU | Acht Kerne, Load Average 0,24 / 0,42 / 0,50; fünf aktuelle Messungen im Abstand von zwei Sekunden zeigen 92–97 % ungenutzte CPU-Kapazität. |
| RAM | Rund 7,53 GiB verfügbar. Memory-Pressure über 10/60/300 Sekunden jeweils null. Rund 3,18 GiB Swap belegt, im kurzen vmstat-Fenster kein Ein-/Auslagern. |
| Speicher | 417 GB frei auf dem bestehenden Dateisystem. |
| Bestehende Dienste | 41 Container laufen, keiner als unhealthy oder restarting markiert; keine Kernel-OOM-Ereignisse in den letzten 24 Stunden. Viele Container haben keine expliziten Ressourcenlimits: Lastspitzen bestehender Dienste bleiben ein Betriebsrisiko. |
| Containerbetrieb | Docker 29.3.0, Compose v5.1.0, x86_64, cgroups v2, AppArmor/seccomp vorhanden. Die vorhandenen Linux-Container passen zur Architektur. |
| Web-Anbindung | Coolify 4.0.0 mit Traefik v3.6 besitzt bereits 80/443. Docker-Provider aktiv, automatische Veröffentlichung unmarkierter Container deaktiviert. File-Provider und Cloudflare-DNS-Challenge mit Resolver `cloudflare` eingerichtet; keine Secret-Werte gelesen. |
| Isolation | Keine Beacon-Container, -Netzwerke oder -Volumes vorhanden. Kandidaten 18080–18082 sowie 15432/16379 derzeit unbelegt; Datenbankports sollen trotzdem nicht veröffentlicht werden. |
| Image-Registries | HTTPS-Anfragen vom VPS erreichen GHCR und Docker Hub (HTTP 405 auf HEAD bzw. 401 ohne Registry-Anmeldung). Das bestätigt Erreichbarkeit, keine Pull-Berechtigung für private Images. |
| DNS | Alle drei geplanten Staging-Hosts lösen weder lokal noch vom VPS aus auf. DNS/HTTPS-Abnahme deshalb noch offen. |
| Laufzeitkonfiguration | Lokale `.env` ist development/mock; Clerk-Schlüssel fehlen dort. Vorhandene fremde Coolify-Umgebungen wurden nicht gelesen. Ihre Werte werden nicht als verfügbar angenommen. |
| Wartung | Automatische Updates aktiv; ein Neustart ist als erforderlich markiert. Kein Neustart oder Update wurde ausgelöst. Wartungsfenster für bestehende Dienste bleibt beim Betreiber. |

Vorgesehener Startkorridor: maximal 3 GiB RAM und zwei CPU-Kerne insgesamt für die fünf dauerhaft laufenden Dienste (API, App, Web, PostgreSQL, Redis), zusätzlich höchstens 512 MiB RAM und 0,5 CPU für den kurzlebigen Migrationslauf. Das sind noch zu implementierende Grenzen und unter realistischer synthetischer Last zu prüfen. Builds laufen in GitHub, damit sie den gemeinsam genutzten VPS nicht zusätzlich belasten. Längerfristige Lastspitzen wurden nicht gemessen.

Empfohlene Integration: eigener Staging-Stack über das vorhandene Coolify/Traefik, nur API/App/Web mit neuen eindeutig benannten Staging-Routen im Proxy-Netz. PostgreSQL und Redis bleiben ausschließlich in einem neuen internen Netz. Keine bestehenden Web-Port-Bindungen, Proxy-Konfigurationen oder fremden Volumes ersetzen. Coolify unterstützt versionierte Docker-Compose-Anwendungen; eine automatische GitHub-Auslösung darf unsere CI- und Freigabegates nicht umgehen.

Vor einem echten Deploy sind eine VPS-Compose-Datei mit Ressourcenlimits, Healthchecks und separaten Volumes, eine VPS-fähige geprüfte Datenbank-Transportkonfiguration sowie eine Pipeline mit Migration vor Dienststart erforderlich. Die derzeitige Pipeline verwendet ECR/ECS und die Migrations-Imagevorbereitung enthält das AWS-RDS-CA-Bundle. Dieser Stand ist noch keine fertige VPS-Bereitstellung.

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
- Standort und Vereinbarkeit unter synthetischer Last; grundlegende Ressourcen- und Proxy-Eignung sind bestätigt. Frankfurt bleibt bis zur Standortentscheidung das dokumentierte Ziel.
- Compose-Konfiguration, begrenzter Deploy-Zugang, Image-Registry und Secret-Verteilung.
- Staging-DNS/HTTPS, Clerk-Live-Konfiguration, Backup und Wiederherstellung.
- Konkrete Kostenfreigabe und echter Merge-Deploy.
- GitHub-Branch-Schutz: bisher HTTP 403 im privaten Repository. Fehlgeschlagene Änderungen müssen verbindlich blockiert werden.

Gate 0 bleibt offen. Phase 1 beginnt erst nach nachgewiesener externer Abnahme. Die Terraform-Dateien bleiben vorerst als nicht provisionierte AWS-Alternative erhalten; ihre bestandenen Tests beweisen keine VPS-Abnahme.

Referenzen: [Coolify Docker Compose](https://coolify.io/docs/applications/builds/docker-compose), [Coolify Traefik](https://coolify.io/docs/core/networking/proxy/traefik/overview), [Docker Compose im Serverbetrieb](https://docs.docker.com/compose/how-tos/production/), [Compose-Secrets](https://docs.docker.com/compose/how-tos/use-secrets/), [GitHub-Sicherheit für Runner](https://docs.github.com/en/actions/reference/security/secure-use).
