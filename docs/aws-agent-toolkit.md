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

Fortsetzungsprüfung am 30. September: AWS-MCP erschien nicht in der Werkzeugliste dieses Chats. Der exakt konfigurierte uvx-Proxy wurde deshalb direkt über das MCP-Protokoll geprüft: Initialisierung mit Proxy 1.7.0, Werkzeugliste und entfernter aws___run_script-Aufruf von STS GetCallerIdentity erfolgreich. AWS_MCP_PROXY_PROFILES=beacon-bold liefert Konto 212626318809 mit Root-Anmeldung. Ein CLI-Katalogtest allein wurde nicht als MCP-Abnahme gewertet. Keine Secret-Werte wurden gelesen. AWS-Zugangsdaten liegen außerhalb des Repositorys. Die Anmeldung gilt laut AWS zwölf Stunden und lässt sich bis zu 90 Tage ohne erneute Browser-Anmeldung erneuern.

Für ein weiteres Konto: aws login --profile NAME ausführen, NAME zur durch Leerzeichen getrennten AWS_MCP_PROXY_PROFILES-Liste in den MCP-Konfigurationen hinzufügen und das Coding-Werkzeug neu starten.

## Fortsetzung

Im neuen Chat mit diesem Projekt fortfahren: P0-7 vollständig vorbereiten, Terraform und Container prüfen, eine begrenzte GitHub-OIDC-Rolle einrichten und die Staging-Kosten vor der Bereitstellung konkret zur Freigabe vorlegen. Keine Produktionsänderungen. Gate 0 benötigt zusätzlich wirksamen GitHub-Branch-Schutz. Phase 1 beginnt erst nach bestandenem Gate 0.

Terraform-Bootstrap, Frankfurt-Infrastruktur, begrenzte OIDC-Rolle, Vorwärtsmigration und CI-Deployment sind nun vorbereitet. Zwei Terraform-Sicherheitstests sind simuliert bestanden; sechs echte lokale Integrationstests und vier simulierte Deploymenttests bestanden. Cloud-Provisionierung, OIDC-Annahme durch GitHub und Cloud-Migration stehen nach Kostenfreigabe aus. Der Dockerfile enthält zusätzlich ein kurzlebiges Migrationsziel; kein Platzhalter-Worker. [Kostenfreigabe](staging-approval.md) und [Staging-Runbook](../infra/staging/README.md) dokumentieren den nächsten menschlichen Freigabepunkt.
