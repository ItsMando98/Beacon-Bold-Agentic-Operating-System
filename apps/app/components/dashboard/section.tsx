import { Badge, Button } from "@beacon/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@beacon/ui/components/card";
import { IconArrowLeft } from "@tabler/icons-react";
import Link from "next/link";
import { type DashboardSection, dashboardNavigation } from "./navigation";

const descriptions = {
  goals: "Ziele und Erfolgskriterien für die Agentur.",
  agents: "Agenten, ihre Zuständigkeiten und Berechtigungen.",
  runs: "Aufträge, Schritte, Tool-Aufrufe und Ergebnisse.",
  approvals: "Entscheidungen über geplante Ausgaben und Aktionen.",
  audit: "Änderungen mit Akteur, Grund und Ergebnis.",
};
const nextSteps = {
  goals: "Die Eingabe von Zielen folgt als interaktive Vorschau.",
  agents:
    "Agenten werden hier angezeigt, sobald ihre Verwaltung angebunden ist.",
  runs: "Läufe werden hier angezeigt, sobald die Ausführung angebunden ist.",
  approvals:
    "Freigaben werden verfügbar, sobald der Freigabe-Workflow angebunden ist.",
  audit: "Die Audit-Historie wird nach der Anbindung angezeigt.",
};

export function DashboardSectionPage({
  section,
}: {
  section: Exclude<DashboardSection, "overview">;
}) {
  const item = dashboardNavigation.find((entry) => entry.key === section);
  if (!item) return null;
  const Icon = item.icon;
  return (
    <div className="dashboard-section-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>{item.title}</h1>
          <p>{descriptions[section]}</p>
        </div>
        <Badge variant="outline">Vorschau</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dieser Bereich wird als Nächstes angebunden</CardTitle>
          <CardDescription>
            Die Navigation ist bereit. Es sind noch keine Live-Daten verfügbar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="dashboard-empty dashboard-section-empty">
            <span className="dashboard-empty-icon">
              <Icon size={28} stroke={1.5} aria-hidden="true" />
            </span>
            <h2>Noch keine Live-Daten</h2>
            <p>{nextSteps[section]}</p>
            <Button variant="outline" asChild>
              <Link href="/">
                <IconArrowLeft size={16} aria-hidden="true" />
                Zur Übersicht
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
