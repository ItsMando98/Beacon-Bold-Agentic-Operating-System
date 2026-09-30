# requestApproval: P0-7 Staging

Status: **offen**, 30. September 2026. Es wurde nichts provisioniert und keine laufende Cloud-Ressource gestartet. P1-8 ist noch nicht implementiert; dieser dokumentierte Gründerantrag ist der manuelle Freigabepunkt für P0-7.

Zur Freigabe: AWS-Konto 212626318809, ausschließlich Frankfurt (eu-central-1), Bootstrap und Staging laut `infra/staging`, anschließend automatisches Container-Deployment nach erfolgreicher CI auf main. Geplant sind **118,94 USD pro Monat** bei 730 Betriebsstunden. Beantragt werden **150 USD Monatsbudget**, Alarm bei 120 USD tatsächlichen Kosten und bei einer Prognose über 150 USD. Kein Savings Plan, keine Reservierung, keine Produktion und kein Modellbudget.

| Bestandteil | USD / Monat |
|---|---:|
| Drei Fargate-Container, je 0,25 vCPU / 0,5 GiB | 31,09 |
| RDS PostgreSQL db.t4g.micro | 13,87 |
| 20 GB gp3-Datenbankvolumen | 2,74 |
| Redis cache.t4g.micro | 13,14 |
| Application Load Balancer | 19,71 |
| Reserve für eine kontinuierliche LCU | 5,84 |
| Fünf öffentliche IPv4-Adressen | 18,25 |
| Drei KMS-Schlüssel | 3,00 |
| Zwei Secrets-Manager-Einträge | 0,80 |
| Delegierte Staging-DNS-Zone | 0,50 |
| Reserve: Logs, Images, State, API-Aufrufe, Transfer, Migration und Deployment-Überlappung | 10,00 |
| **Gesamt** | **118,94** |

Fargate-, RDS-, Redis-, Speicher- und ALB-Preise wurden am 30. September über die AWS Price List API für Frankfurt abgefragt; SKU, Nutzungsart, Rate und maschinell berechnete Beträge stehen in [staging-costs.json](staging-costs.json). Ergänzende veröffentlichte Preise: [IPv4](https://aws.amazon.com/vpc/pricing/), [KMS](https://aws.amazon.com/kms/pricing/), [Secrets Manager](https://aws.amazon.com/secrets-manager/pricing/), [DNS](https://aws.amazon.com/route53/pricing/).

Annahmen: eine Instanz pro Dienst, geringe synthetische Staging-Last, keine NAT-Gateways, keine Spot-Abhängigkeit, keine Free-Tier-Gutschriften eingerechnet. Die Datenbank kann bis 30 GB wachsen; Snapshots, RDS-Burst-CPU, zusätzliche ALB-Kapazität, IPv4 bei Rolling Deployments und verbleibende Images können Zusatzkosten verursachen. Das Budget alarmiert kontoweit, einschließlich ungetaggter Kosten. Es ist **keine technische Ausgabensperre**. Keine Umsatzsteuer oder Wechselkursumrechnung enthalten.

Clerk, Temporal Cloud, GitHub-Tarifupgrade, Domainregistrierung und weitere Anbieter sind nicht Bestandteil dieses AWS-Antrags. Der Worker bleibt bis Phase 1 undeployt; Temporal wird in P0-7 nicht gekauft. Clerk benötigt gültige Staging-Konfiguration vor dem App-Deploy. GitHub Pro bzw. eine andere geeignete Repository-Lösung ist eine separate Gründerentscheidung; öffentliche Sichtbarkeit wird nicht automatisch gesetzt.

Vor Apply: Gründerfreigabe mit Name, Datum und Referenz dokumentieren; konkrete Bootstrap- und Staging-Pläne prüfen und deren Hashes an die Freigabe anhängen. Ein eingegebener Terraform-String allein ist kein Freigabenachweis. Bei geänderten Ressourcen oder höheren Kosten erneut freigeben. `STAGING_READY` bleibt aus, bis Budgetfreigabe, DNS-Delegation, gültige Laufzeitkonfiguration und wirksamer Branch-Schutz nachgewiesen sind.

Offene Eingaben: Freigabe, Empfängeradresse für Budgetalarme, Clerk-Konfiguration und Delegation von staging.beaconandbold.com. Secret-Werte werden ausschließlich privat im AWS-Dienst gepflegt.

Freigabeentscheidung: **ausstehend**. Die Antwort auf diesen konkreten Antrag wird hier mit Datum und erlaubtem Umfang festgehalten.
