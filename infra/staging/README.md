# Staging (P0-7, externe Abnahme offen)

AWS-Konto 212626318809, eu-central-1. Terraform 1.13.5, AWS-Provider 6.14.1 mit signiertem Lockfile. Runtime-Images: api, app, web und ein kurzlebiges Migrationsimage; kein Worker. Mock-Provider-Tests provisionieren nichts.

## Freigabe und Voraussetzungen

[Kostenantrag](../../docs/staging-approval.md) vom Gründer freigeben lassen. Kein Apply, Image-Push oder kostenpflichtiger Dienststart davor. Ein Terraform-String ersetzt die dokumentierte Freigabe nicht. GitHub-Branch-Schutz mit `.github/branch-protection.json` einschließlich terraform anwenden und blockierten fehlerhaften Merge nachweisen. Aktuell liefert GitHub 403 für das private Repository. STAGING_READY bleibt aus. Alarmadresse und gültige Clerk-Staging-Konfiguration bereitstellen. Root-Anmeldung wird niemals an GitHub weitergegeben.

## Bootstrap nach Freigabe

Mit dem administrativen Profil beacon-bold, getrennt von GitHub:

```powershell
$env:AWS_PROFILE = 'beacon-bold'
terraform -chdir=infra/staging/bootstrap init -lockfile=readonly
terraform -chdir=infra/staging/bootstrap plan -var='approval_reference=ACTUAL_APPROVAL_REFERENCE' -out=bootstrap.tfplan
Get-FileHash infra/staging/bootstrap/bootstrap.tfplan -Algorithm SHA256
# Plan prüfen, Hash an Freigabe anhängen, ausschließlich diesen Plan anwenden:
terraform -chdir=infra/staging/bootstrap apply bootstrap.tfplan
```

Bootstrap erstellt verschlüsselten/versionierten S3-State mit Public-Access-Sperre und TLS, zwei KMS-Schlüssel, GitHub-OIDC, einen leeren Runtime-Secret-Container und eine eigene Zone staging.beaconandbold.com. Am 30. September existierten weder OIDC-Provider noch Route53-Zonen; bei später bestehenden Ressourcen zuerst Import prüfen. Den lokalen Bootstrap-State anschließend sicher sichern. Secret-Werte werden nie im State gespeichert.

Die ausgegebenen Name-Server von einem Menschen beim vorhandenen DNS-Betreiber ausschließlich für die Staging-Subdomain delegieren lassen. Terraform bearbeitet keine produktive DNS-Zone. Delegation prüfen, bevor ACM-Validierung beginnt.

## Staging-Plan nach Bootstrap

staging.tfvars.example privat kopieren und mit Bootstrap-Ausgaben, Alarmadresse, Freigabereferenz und verfügbarer PostgreSQL-17-Version füllen. 17.11 wurde in Frankfurt abgefragt. backend.hcl.example kopieren und kms_key_id aus dem Bootstrap ergänzen.

```powershell
terraform -chdir=infra/staging init -backend-config=backend.hcl -lockfile=readonly
terraform -chdir=infra/staging plan -var-file=staging.tfvars -out=staging.tfplan
Get-FileHash infra/staging/staging.tfplan -Algorithm SHA256
# Plan prüfen und freigeben, dann gespeicherten Plan anwenden:
terraform -chdir=infra/staging apply staging.tfplan
```

State/Pläne bleiben außerhalb von Git und CI-Artefakten. S3 verwendet native Sperrdateien (use_lockfile), kein DynamoDB. GitHub hat keinen State-Zugriff und führt kein Terraform-Apply aus. RDS: Löschschutz, sieben Tage Backups, Pflicht-Abschlusssnapshot, 20–30 GB Speicher. Redis: isoliert, verschlüsselt, Single-AZ. Fargate hat öffentliche IPv4 für ausgehende Laufzeitdienste; eingehend ist ausschließlich der ALB erlaubt. Kein NAT-Gateway.

## Laufzeitwerte

Secret-Wert ausschließlich privat im AWS-Dienst pflegen, niemals in tfvars, GitHub, Chat oder Terraform. JSON-Schlüssel:

- DB_APP_PASSWORD: Passwort der eingeschränkten Rolle beacon_app.
- DATABASE_URL: PostgreSQL-Verbindung mit beacon_app, demselben Passwort, RDS-Host, Datenbank beacon und TLS.
- REDIS_URL: rediss-Verbindung zum ausgegebenen Cache-Endpunkt.
- CLERK_SECRET_KEY und NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: gültige Staging-Werte.

Migration erhält RDS-Administratorwerte ausschließlich über ECS-Secret-Referenzen, die API nur die eingeschränkte Rolle. Terraform liest keine Secret-Werte/-Versionen. Agenten prüfen Verbindungen ausschließlich über asm-exec mit {{resolve:secretsmanager:...:SecretString:...}}. Der öffentliche RDS-CA-Bundle ist im Dockerfile per SHA256 fixiert; die Migration prüft das Serverzertifikat.

## Automatisches Deployment

Repository-Variablen aus Terraform vorbereiten: STAGING_SUBNETS (kommagetrennt), STAGING_SECURITY_GROUP, STAGING_APPROVAL_REFERENCE, STAGING_CLERK_PUBLISHABLE_KEY (öffentlicher Buildwert). STAGING_READY=true erst nach nachgewiesenen Voraussetzungen setzen. Keine private Zugangsinformation in diesen Variablen.

OIDC vertraut exakt repo:ItsMando98@145494629/Beacon-Bold-Agentic-Operating-System@1398081452:ref:refs/heads/main und Audience sts.amazonaws.com. Claims wurden über GitHub abgefragt. Ein Environment darf nicht ohne angepasste Trust-Policy hinzugefügt werden. Keine PR-/Branch-/Repository-Wildcard. PassRole ist auf fünf feste Rollen und ECS begrenzt. GitHub besitzt keine IAM-, Infrastruktur-, Datenbank- oder Secret-Leserechte.

Merge auf main durchläuft Lint, Typprüfung, Unit-/Integrationstests, Build, Browser, Secret-Scan und Terraform. Danach vier Commit-Images in festen ECR-Repositories veröffentlichen. Migration muss mit Exitcode 0 enden. Anschließend Dienste per Image-Digest aktualisieren, tatsächliche ECS-Revisionen und drei HTTPS-Endpunkte prüfen. Bei Fehlern vorherige Dienstrevisionen und Anzahlen wiederherstellen. Migrationen bleiben vorwärts angewandt.

Foundation: pgvector, leere Schemas und eingeschränkte Rolle. Runner serialisiert mit Advisory Lock und verweigert veränderte, fehlende oder nachträglich einsortierte Migrationen. Mandantenmodelle bleiben P1-1. Der Integrationstest benutzt zwei erfundene Mandanten in einem zurückgerollten lokalen Fixture.

## Externe Abnahme

Nach Freigabe und Merge dokumentieren: CI-Run/Commit, OIDC-Annahme durch GitHub, Migration-Exitcode, laufende Image-Digests, HTTPS-Health und blockierter fehlerhafter Merge. Erst dann P0-7/Gate 0 abschließen. Der Entwurfs-PR bleibt offen; Phase 1 startet nicht. Lokale und simulierte Tests ersetzen keinen Cloud-Nachweis.
