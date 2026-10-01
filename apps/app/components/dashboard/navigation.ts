import {
  IconActivity,
  IconCircleCheck,
  IconLayoutDashboard,
  IconRobot,
  IconTargetArrow,
  IconTimeline,
} from "@tabler/icons-react";

export const dashboardNavigation = [
  { key: "overview", title: "Übersicht", href: "/", icon: IconLayoutDashboard },
  {
    key: "goals",
    title: "Ziele",
    href: "/dashboard/goals",
    icon: IconTargetArrow,
  },
  {
    key: "agents",
    title: "Agenten",
    href: "/dashboard/agents",
    icon: IconRobot,
  },
  {
    key: "runs",
    title: "Agentenläufe",
    href: "/dashboard/runs",
    icon: IconActivity,
  },
  {
    key: "approvals",
    title: "Freigaben",
    href: "/dashboard/approvals",
    icon: IconCircleCheck,
  },
  {
    key: "audit",
    title: "Audit",
    href: "/dashboard/audit",
    icon: IconTimeline,
  },
] as const;

export type DashboardSection = (typeof dashboardNavigation)[number]["key"];
