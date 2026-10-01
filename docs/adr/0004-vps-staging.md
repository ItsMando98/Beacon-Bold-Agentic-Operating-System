# ADR 0004: Vorhandenen VPS für Staging verwenden

Status: Umsetzung autorisiert am 1. Oktober 2026; externe Abnahme noch offen.

Der Gründer hat den vorhandenen VPS für zusätzliches Staging unter Erhalt bestehender Dienste freigegeben und ausdrücklich Vorbereitung plus Deployment angefordert. Nach lesender Kapazitätsprüfung ist kein neuer Server und kein Hardware-Upgrade erforderlich. Der AWS-Weg aus ADR 0003 bleibt nicht provisionierte Alternative; kein AWS-Budget wird dafür aktiviert.

Die vorhandenen Runtime-Images, Vorwärtsmigrationen und Tests werden über ein separates Compose-Projekt betrieben. PostgreSQL verwendet einen authentifizierten lokalen Socket statt TCP; Redis einen isolierten internen TLS-Endpunkt. Gemeinsame Zod-Validierung erlaubt die TLS-Ausnahme ausschließlich für den festen lokalen Socketpfad. Das erhält den Standard verifizierter TLS-Verbindungen für entfernte Datenbanken und macht keine generelle Ausnahme für Staging.

Neue App-Routen verwenden das vorhandene Traefik-Netzwerk und dessen Cloudflare-Zertifikatsresolver. Kundenanwendungen, ihre Datenvolumes und produktive DNS-Einträge werden nicht verändert. Builds und Tests laufen in GitHub; serverseitig werden nur fertige Images importiert. Der erzwungene SSH-Receiver begrenzt den separaten CI-Schlüssel auf eigene Staging-Deploys und verschlüsselte Backups. Konfiguration und Secrets bleiben außerhalb des Image-Artefakts.

Der öffentlich gestellte GitHub-Branch unterstützt nun Schutz mit allen neun Pflichtprüfungen einschließlich Administratoren. Die vorhandene absichtlich fehlschlagende PR #4 wurde für die Abnahme wieder geöffnet; ein Merge ohne Bypass wurde mit `9 of 9 required status checks are expected` verweigert und die PR anschließend wieder geschlossen.

Der Deploy-Auftrag erlaubt die Nutzung bestehender Kapazität, keine zusätzlichen bezahlten Dienste. Clerk- und DNS-Konfiguration stellt der Gründer bereit. Offene Nachweise: echte Images/Compose auf VPS, Migration/Mandantentrennung, drei gültige HTTPS-Endpunkte, externer verschlüsselter Backup-/Restore-Test und tatsächlicher Merge-Deploy. Standortbestätigung bleibt beim Betreiber. Gate 0 bleibt bis zu den Nachweisen offen; keine Phase-1-Implementierung.
