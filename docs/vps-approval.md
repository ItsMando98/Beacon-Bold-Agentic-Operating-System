# requestApproval: vorhandenes VPS-Staging

Stand: 1. Oktober 2026. P1-8 ist noch nicht implementiert; dieser Eintrag ist der manuelle Freigabenachweis für P0-7.

Der Gründer hat zusätzliches Staging auf dem vorhandenen VPS unter Erhalt bestehender Dienste erlaubt und anschließend ausdrücklich Vorbereitung und Deployment angefordert. Er richtet die drei Staging-DNS-Namen ein und stellt Clerk-Konfiguration bereit. Der frühere AWS-Antrag wird für dieses Deployment nicht verwendet; kein AWS-Apply und keine AWS-Ressourcen werden aktiviert.

| Umfang | Zusätzliche Kosten / Grenze |
|---|---|
| VPS-Kapazität | Kein neuer Mietvertrag und kein Upgrade: **0 zusätzliche feste Server-Mietkosten** durch eine Bestellung. Bestehende Serverrechnung bleibt beim Betreiber. |
| Staging-Limits | 2,5 GiB RAM / zwei CPU-Kerne für dauerhafte Dienste, zusätzlich nacheinander 512 MiB / 0,5 CPU für Migration und Abnahme. |
| Daten/Logs | Neue eigene Volumes auf vorhandenem Speicher; Logs maximal drei Dateien zu je 10 MiB pro Dienst. Keine neuen kostenpflichtigen Speicherdienste. |
| GitHub CI | Öffentliches Repository, bestehende GitHub-Actions-Nutzung. Runtime-Artefakte nur für main, ein Tag Aufbewahrung. Keine Tarifbuchung oder Änderung der GitHub-Abrechnung. Variable Speicher-/Transferkosten und enthaltene Kontingente werden hier nicht als kostenfrei garantiert. |
| Backup | Verschlüsselter Dump höchstens 64 MiB pro externer Kopie; GitHub-Backup-Artefakte höchstens 1 MiB je Lauf und sieben Tage Aufbewahrung; vorhandener lokaler Speicher für Wiederherstellungsschlüssel und erste externe Kopie. Kein bezahlter Backup-Dienst wird bestellt. |
| DNS / Clerk | Nutzung der vom Gründer bereitgestellten Konfiguration. Keine Registrierung, Tarifänderung oder Zahlung durch den Agenten. |

**Erlaubter Umfang:** bestehende Infrastruktur benutzen, ausschließlich Staging betreiben, keine zusätzlichen bezahlten Ressourcen bestellen. Neue Anbietergebühren, Upgrades oder Überschreitung bestehender Kontingente benötigen einen neuen konkreten Antrag. Der Monatsbetrag des bestehenden VPS-Vertrags ist nicht bekannt und wird nicht erfunden.

Der Gründer hat ausdrücklich zugestimmt: „Ja, den begrenzten CI-Zugang einrichten“. Ein eigener, ausschließlich auf Deploy/Backup beschränkter SSH-Schlüssel ist eingerichtet und als GitHub-Actions-Secret gespeichert. Die echte SSH-Abnahme verweigert allgemeine Shell-Befehle. VPS-Adresse und gepinnter Hostschlüssel sind ebenfalls hinterlegt. Private Clerk-Schlüssel und der ursprüngliche administrative Root-Schlüssel werden nicht nach GitHub übertragen. Der private Backup-Wiederherstellungsschlüssel bleibt ausschließlich lokal.

Gate 0 bleibt unabhängig von dieser Autorisierung offen bis zum echten Merge-Deploy mit Migration, Mandantentrennung, HTTPS und externem Backup-/Restore-Nachweis. Der Branch-Schutz ist inzwischen aktiviert und ein fehlerhafter Merge wurde tatsächlich verweigert.

Diese Freigabe nennt keinen Commit. Sie erlaubt die Nutzung des vorhandenen VPS ohne neue bezahlte Dienste. Sie ist keine Deploy-Freigabe für einen späteren SHA. Ein VPS-Deploy darf nur laufen, wenn `STAGING_APPROVAL_REFERENCE` genau den deployten Commit als eigenes Token nennt.
