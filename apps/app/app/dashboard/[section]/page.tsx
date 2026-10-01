import { notFound } from "next/navigation";
import { dashboardNavigation } from "../../../components/dashboard/navigation";
import { DashboardSectionPage } from "../../../components/dashboard/section";
import { DashboardShell } from "../../../components/dashboard/shell";

export default async function Page({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = dashboardNavigation.find(
    (entry) => entry.key === section && entry.key !== "overview",
  );
  if (!item || item.key === "overview") notFound();
  return (
    <DashboardShell section={item.key}>
      <DashboardSectionPage section={item.key} />
    </DashboardShell>
  );
}
