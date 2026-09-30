# Staging-Vorbereitung (P0-7, offen)

Ziel: AWS Frankfurt, ECS Fargate, RDS PostgreSQL/pgvector, ECR und Secrets Manager. Staging-Domain: staging.beaconandbold.com. Die vorhandene Domain wird nicht verändert, bevor die DNS-Delegation konkret vorbereitet ist.

Der Dockerfile im Projektstamm hat die Ziele api, app und web. Das Node-Basisimage ist auf einen Digest fixiert; der Build verwendet das eingefrorene pnpm-Lockfile. Runtime-Container laufen als unprivilegierter Benutzer. Die API enthält ein eigenständig ausführbares Bundle; die Next-Apps verwenden Standalone-Ausgaben und lokale Schriften. Der Platzhalter-Worker wird noch nicht deployt.

Lokale Abnahme: alle drei Images bauen; API-Health und beide Startseiten antworten erfolgreich. Ohne APP_ENV/SERVICE_MODE brechen alle drei Runtime-Container mit Exitcode 1 ab. Das bestätigt lokale Container, nicht einen Cloud-Deploy.

## Noch umzusetzen

- Terraform für Netzwerk, Datenbank, ECR, ECS, Secrets Manager, HTTPS und DNS; Provider-Lockfile und echte Validierung.
- Begrenzte GitHub-OIDC-Rolle und Staging-Umgebung; keine statischen AWS-Schlüssel und kein Root-Zugang in GitHub.
- Vorwärtsgerichtete Foundation-Migration als eigener Deployment-Schritt mit eingeschränkter Laufzeitrolle.
- Deployment ausschließlich nach erfolgreichen Prüfungen und Merge auf main; Versions- und Health-Abnahme.
- Konkrete Kostenplanung und freigegebenes Betriebsbudget vor kostenpflichtiger Bereitstellung.
- Wirksamen GitHub-Branch-Schutz ermöglichen; der aktuelle private Tarif unterstützt ihn nicht.

Clerk- und Temporal-Cloud-Konfiguration werden weiterhin benötigt. Phase 1 beginnt erst nach Gate 0. Ein erfolgreicher Toolkit-Login erfüllt dieses Gate nicht. Der Entwurfs-PR darf erst als P0-7 fertig gemeldet werden, wenn alle genannten Abnahmen einschließlich Staging bestanden sind.
