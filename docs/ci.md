# CI und Pflichtprüfungen

Die sieben unabhängigen Checks heißen `lint`, `typecheck`, `test`, `build`, `secret-scan`, `integration` und `browser`. Sie laufen für Pull Requests und nach Merge auf main. Installationen verwenden das eingefrorene Lockfile. Gitleaks scannt die vollständige Git-Historie und maskiert Fundstellen. Integration startet echte lokale Dienste; Browser prüft Komponenten, Tastaturbedienung, Kontrast und Startseiten. Der Build prüft außerdem, dass vier Apps bei ungültiger Startkonfiguration abbrechen.

Administratoren richten den Branch-Schutz mit `.github/branch-protection.json` ein:

```sh
gh api --method PUT repos/ItsMando98/Beacon-Bold-Agentic-Operating-System/branches/main/protection --input .github/branch-protection.json
```

Dieser Aufruf wurde versucht und von GitHub mit HTTP 403 abgelehnt: Ein privates Repository benötigt einen unterstützten Tarif. Die Sichtbarkeit wurde nicht verändert. Die Checks laufen trotzdem; ein verbindlich erzwungener Merge-Block ist noch nicht nachgewiesen.

Der absichtlich fehlschlagende PR #4 zeigte einen roten `test`-Check; die übrigen Checks bestanden. Er wurde geschlossen und nie gemergt. P0-3 und Gate 0 bleiben extern offen bis Branch-Schutz verfügbar und aktiviert ist. Alle sieben Checks am finalen Stand des UI-PR #7 waren erfolgreich vor dessen Merge.
