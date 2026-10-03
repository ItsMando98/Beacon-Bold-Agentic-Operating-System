# CI und Pflichtprüfungen

Die sieben unabhängigen Checks heißen `lint`, `typecheck`, `test`, `build`, `secret-scan`, `integration` und `browser`. Sie laufen für Pull Requests und nach Merge auf main. Installationen verwenden das eingefrorene Lockfile. Gitleaks scannt die vollständige Git-Historie und maskiert Fundstellen. Integration startet echte lokale Dienste; Browser prüft Komponenten, Tastaturbedienung, Kontrast und Startseiten. Der Build prüft außerdem, dass vier Apps bei ungültiger Startkonfiguration abbrechen.

Administratoren richten den Branch-Schutz mit `.github/branch-protection.json` ein:

```sh
gh api --method PUT repos/ItsMando98/Beacon-Bold-Agentic-Operating-System/branches/main/protection --input .github/branch-protection.json
```

Dieser Aufruf wurde versucht und von GitHub mit HTTP 403 abgelehnt: Ein privates Repository benötigt einen unterstützten Tarif. Die Sichtbarkeit wurde nicht verändert. Die Checks laufen trotzdem; ein verbindlich erzwungener Merge-Block ist noch nicht nachgewiesen.

Der absichtlich fehlschlagende PR #4 zeigte einen roten `test`-Check; die übrigen Checks bestanden. Er wurde geschlossen und nie gemergt. P0-3 und Gate 0 bleiben extern offen bis Branch-Schutz verfügbar und aktiviert ist. Alle sieben Checks am finalen Stand des UI-PR #7 waren erfolgreich vor dessen Merge.

## Aktueller VPS-Betrieb (1. Oktober 2026)

Alle neun Checks sind erzwungen; der Branch-Schutz und der VPS-Deploy sind nachgewiesen (siehe implementation-status.md). AWS ist stillgelegt: kein AWS-Deploy-Job, keine OIDC-Anmeldung und kein ECR-Push. terraform bleibt als bestehender Pflichtcheck für die archivierten lokalen Mock-Vorlagen bestehen; er verwendet keine AWS-Zugänge. Deployments gehen ausschließlich über den eingeschränkten VPS-Receiver und benötigen weiterhin die dokumentierte Gründerfreigabe.

## Agentur-Hülle, Vorschau

`preview-guard` prüft Deploy-Manifeste und bricht ab, bevor ein Workflow die öffentliche Apex-Website deployen oder die DNS-Namen `agency.beaconandbold.com` und `clients.beaconandbold.com` anlegen würde. Der Pull-Request-Workflow `agency-shell-preview` startet nur `apps/agency` auf dem Loopback, und nur wenn diese App im Checkout liegt. Der Check ist in `.github/branch-protection.json` eingetragen. Ihn in GitHub als Pflichtprüfung zu speichern bleibt ein manueller Administrator-Schritt; dieser Stand führt ihn nicht aus. Details: [agency-preview.md](agency-preview.md).
