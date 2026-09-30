# CI und Pflichtprüfungen

Die fünf unabhängigen Checks heißen `lint`, `typecheck`, `test`, `build` und `secret-scan`. Alle laufen für Pull Requests und nach einem Merge auf main. Jeder Installationsschritt verwendet das eingefrorene Lockfile. Gitleaks scannt die vollständige Git-Historie und maskiert Fundstellen.

Administratoren richten den Branch-Schutz mit `.github/branch-protection.json` ein:

```sh
gh api --method PUT repos/ItsMando98/Beacon-Bold-Agentic-Operating-System/branches/main/protection --input .github/branch-protection.json
```

Das verlangt Administratorrechte und einen GitHub-Tarif, der geschützte Branches in privaten Repositories unterstützt. Ein nicht unterstützter Tarif wird als offener externer Abnahmepunkt dokumentiert; die Repository-Sichtbarkeit wird nicht verändert.

Abnahmeszenario P0-3: separater Branch und PR mit einem absichtlich fehlschlagenden Test. `test` muss fehlschlagen und der Merge muss blockiert sein. Den Test-PR schließen; den fehlerhaften Test nie nach main mergen.

Compose-Integrationstests und Browser-/Storybook-Abnahme werden mit P0-4 bzw. P0-5 zusätzlich in CI integriert.
