// Overview grid adapted from Kiranism dashboard overview/layout.tsx (MIT).
import { Badge, Button } from "@beacon/ui";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@beacon/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@beacon/ui/components/table";
import {
  IconActivity,
  IconArrowRight,
  IconCircleCheck,
  IconRobot,
  IconTargetArrow,
  IconTimeline,
} from "@tabler/icons-react";
import Link from "next/link";

const metrics = [
  {
    title: "Aktive Agenten",
    icon: IconRobot,
    href: "/dashboard/agents",
    note: "Agentenverwaltung folgt",
  },
  {
    title: "Agentenläufe",
    icon: IconActivity,
    href: "/dashboard/runs",
    note: "Ausführung folgt",
  },
  {
    title: "Offene Freigaben",
    icon: IconCircleCheck,
    href: "/dashboard/approvals",
    note: "Freigabe-Workflow folgt",
  },
  {
    title: "Audit-Einträge",
    icon: IconTimeline,
    href: "/dashboard/audit",
    note: "Audit-Anbindung folgt",
  },
];

export function DashboardOverview() {
  return (
    <div className="dashboard-overview">
      <div className="dashboard-page-heading">
        <div>
          <h1>Betriebsoberfläche</h1>
          <p>Ziele, Agentenläufe und Freigaben für Beacon & Bold.</p>
        </div>
        <Badge variant="outline">Vorschau</Badge>
      </div>
      <p className="dashboard-status-notice">
        Die Betriebsdaten sind noch nicht angebunden.
      </p>
      <div className="dashboard-metrics">
        {metrics.map(({ title, icon: Icon, href, note }) => (
          <Card key={title} className="dashboard-metric">
            <CardHeader>
              <CardDescription>{title}</CardDescription>
              <CardTitle className="dashboard-metric-value">
                <span aria-hidden="true">—</span>
                <span className="sr-only">Noch keine Live-Daten</span>
              </CardTitle>
              <CardAction>
                <Icon
                  size={19}
                  stroke={1.7}
                  className="dashboard-muted"
                  aria-hidden="true"
                />
              </CardAction>
            </CardHeader>
            <CardFooter className="dashboard-metric-footer">
              <span>{note}</span>
              <Link href={href} aria-label={`${title} ansehen`}>
                <IconArrowRight size={16} aria-hidden="true" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
      <div className="dashboard-overview-panels">
        <Card className="dashboard-runs-panel">
          <CardHeader>
            <CardTitle>
              <h2>Letzte Agentenläufe</h2>
            </CardTitle>
            <CardDescription>
              Aufträge, Status und Ergebnisse im Überblick.
            </CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/runs">
                  Alle ansehen
                  <IconArrowRight size={15} aria-hidden="true" />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Auftrag</TableHead>
                  <TableHead scope="col">Agent</TableHead>
                  <TableHead scope="col">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell colSpan={3} className="dashboard-table-empty">
                    <div className="dashboard-empty">
                      <span className="dashboard-empty-icon">
                        <IconActivity
                          size={25}
                          stroke={1.5}
                          aria-hidden="true"
                        />
                      </span>
                      <h3>Noch keine Läufe angebunden</h3>
                      <p>
                        Hier erscheinen später die Schritte und Ergebnisse
                        deiner Agenten.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>Aktivität</h2>
            </CardTitle>
            <CardDescription>Entscheidungen und Änderungen.</CardDescription>
          </CardHeader>
          <CardContent className="dashboard-activity-empty">
            <div className="dashboard-empty">
              <span className="dashboard-empty-icon">
                <IconTimeline size={25} stroke={1.5} aria-hidden="true" />
              </span>
              <h3>Noch keine Aktivität angebunden</h3>
              <p>
                Das Audit wird hier nachvollziehbar, sobald die Anbindung steht.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/dashboard/audit">Audit ansehen</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card className="dashboard-goal-panel">
        <CardHeader>
          <CardTitle>
            <h2>Mit einem Ziel beginnen</h2>
          </CardTitle>
          <CardDescription>
            Aus einem klaren Auftrag werden später Aufgaben für deine Agenten.
          </CardDescription>
          <CardAction>
            <IconTargetArrow
              size={22}
              stroke={1.5}
              className="dashboard-muted"
              aria-hidden="true"
            />
          </CardAction>
        </CardHeader>
        <CardFooter className="dashboard-goal-footer">
          <p>Die Eingabe und Ausführung folgen in der nächsten Ausbaustufe.</p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/goals">
              Zielbereich öffnen
              <IconArrowRight size={15} aria-hidden="true" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
