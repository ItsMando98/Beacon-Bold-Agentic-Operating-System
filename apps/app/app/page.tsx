import { DashboardOverview } from "../components/dashboard/overview";
import { DashboardShell } from "../components/dashboard/shell";

export default function Page() {
  return (
    <DashboardShell>
      <DashboardOverview />
    </DashboardShell>
  );
}
