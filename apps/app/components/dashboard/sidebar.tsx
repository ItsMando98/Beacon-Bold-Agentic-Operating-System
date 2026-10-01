// Layout adapted from Kiranism/next-shadcn-dashboard-starter (MIT).
"use client";

import { Button } from "@beacon/ui";
import {
  IconArrowUpRight,
  IconBolt,
  IconLogin,
  IconLogout,
} from "@tabler/icons-react";
import Link from "next/link";
import { type DashboardSection, dashboardNavigation } from "./navigation";

export function DashboardSidebar({
  section,
  collapsed = false,
  authenticated = false,
  onNavigate,
}: {
  section: DashboardSection;
  collapsed?: boolean;
  authenticated?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className="dashboard-sidebar-content">
      <Link
        href="/"
        className="dashboard-brand"
        aria-label="Beacon & Bold – Übersicht"
        onClick={onNavigate}
      >
        <span className="dashboard-brand-mark">
          <IconBolt size={20} aria-hidden="true" />
        </span>
        <span className="dashboard-sidebar-label">
          <strong>Beacon & Bold</strong>
          <small>Agentic Operating System</small>
        </span>
      </Link>
      <nav aria-label="Hauptnavigation" className="dashboard-navigation">
        <p className="dashboard-group-label dashboard-sidebar-label">
          Workspace
        </p>
        {dashboardNavigation.map(({ key, title, href, icon: Icon }) => (
          <Link
            key={key}
            href={href}
            onClick={onNavigate}
            className="dashboard-nav-link"
            aria-current={section === key ? "page" : undefined}
            aria-label={title}
            title={collapsed ? title : undefined}
          >
            <Icon size={18} stroke={1.7} aria-hidden="true" />
            <span className="dashboard-sidebar-label">{title}</span>
          </Link>
        ))}
      </nav>
      <div className="dashboard-sidebar-footer">
        <div className="dashboard-preview-note dashboard-sidebar-label">
          <span className="dashboard-preview-dot" />
          <span>
            Oberflächenvorschau<small>Keine Live-Daten</small>
          </span>
        </div>
        <Button variant="ghost" className="dashboard-account" asChild>
          <a
            href={
              authenticated
                ? "/auth/logout"
                : "/auth/login?returnTo=/operations"
            }
            aria-label={authenticated ? "Abmelden" : "Anmelden"}
          >
            {authenticated ? (
              <IconLogout size={18} aria-hidden="true" />
            ) : (
              <IconLogin size={18} aria-hidden="true" />
            )}
            <span className="dashboard-sidebar-label">
              {authenticated ? "Abmelden" : "Anmelden"}
            </span>
            <IconArrowUpRight
              size={15}
              className="dashboard-sidebar-label dashboard-account-arrow"
              aria-hidden="true"
            />
          </a>
        </Button>
      </div>
    </div>
  );
}
