# AWS Agent Toolkit

Einrichtung am 30. September 2026 gemäß der offiziellen Anleitung:
https://raw.githubusercontent.com/aws/agent-toolkit-for-aws/refs/heads/main/setup-instructions/setup.md

- AWS CLI 2.37.6 benutzerspezifisch installiert; MSI-Signatur von Amazon gültig.
- Profil beacon-bold, Standardregion eu-central-1 (Frankfurt), klassisches Konto.
- Browser-Anmeldung erfolgreich; STS bestätigt das Konto. Der aktuelle Zugang ist eine Root-Anmeldung. Automatische Deployments benötigen eine eigene begrenzte OIDC-Rolle; Root-Zugang wird nicht an GitHub weitergegeben.
- 24 Standard-Skills installiert; entfernten Skill-Katalog erfolgreich abgefragt.
- AWS-MCP für Codex, Claude Code, Cursor und Gemini eingerichtet. In allen vier Einträgen AWS_MCP_PROXY_PROFILES=beacon-bold gesetzt; die vier Zuordnungen geprüft. Andere MCP-Einträge erhalten.
- AWS-Regeln in AGENTS.md, CLAUDE.md, GEMINI.md und der Cursor-Regel ergänzt. Bestehende Projektregeln bleiben erhalten und haben Vorrang.
- OpenClaw erhielt Skills; die AWS-CLI unterstützt dort keine automatische MCP-Einrichtung. Es wurde keine manuelle OpenClaw-Verbindung behauptet.

Die Toolkit-Steuerung und der MCP-Endpunkt liegen gemäß AWS-Anleitung in us-east-1. Das ändert die geplante Staging-Region Frankfurt nicht.

Die neue MCP-Verbindung und die Skills werden erst in einem neuen Codex-Chat geladen. Der Katalogtest bestätigt das Toolkit; ein MCP-Werkzeugaufruf aus dem neuen Chat steht noch aus. AWS-Zugangsdaten liegen außerhalb des Repositorys. Die Anmeldung gilt laut AWS zwölf Stunden und lässt sich bis zu 90 Tage ohne erneute Browser-Anmeldung erneuern.

Für ein weiteres Konto: aws login --profile NAME ausführen, NAME zur durch Leerzeichen getrennten AWS_MCP_PROXY_PROFILES-Liste in den MCP-Konfigurationen hinzufügen und das Coding-Werkzeug neu starten.

## Fortsetzung

Im neuen Chat mit diesem Projekt fortfahren: P0-7 vollständig vorbereiten, Terraform und Container prüfen, eine begrenzte GitHub-OIDC-Rolle einrichten und die Staging-Kosten vor der Bereitstellung konkret zur Freigabe vorlegen. Keine Produktionsänderungen. Gate 0 benötigt zusätzlich wirksamen GitHub-Branch-Schutz. Phase 1 beginnt erst nach bestandenem Gate 0.

Der aktuelle Dockerfile ist eine lokale Vorbereitung mit getrennten API-, App- und Web-Zielen. Er deployt keinen Platzhalter-Worker. Terraform, Cloud-Migrationen und automatisches Deployment sind noch offen.
