// Sidebar/header composition adapted from Kiranism dashboard layout (MIT).
"use client";

import { Button } from "@beacon/ui";
import {
  IconChevronRight,
  IconLayoutSidebar,
  IconMoon,
  IconSun,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { type ReactNode, useEffect, useState } from "react";
import { CommandMenu } from "./command-menu";
import { type DashboardSection, dashboardNavigation } from "./navigation";
import { useDashboardSettings } from "./settings-provider";
import { DashboardSidebar } from "./sidebar";

export function DashboardShell({
  children,
  section = "overview",
  authenticated = false,
}: {
  children: ReactNode;
  section?: DashboardSection;
  authenticated?: boolean;
}) {
  const { collapsed, setCollapsed, theme, setTheme } = useDashboardSettings();
  const [mobileOpen, setMobileOpen] = useState(false);
  const title =
    dashboardNavigation.find((item) => item.key === section)?.title ??
    "Übersicht";
  useEffect(() => {
    function toggleSidebar(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "b" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (window.matchMedia("(max-width: 767px)").matches)
          setMobileOpen((value) => !value);
        else setCollapsed((value) => !value);
      }
    }
    window.addEventListener("keydown", toggleSidebar);
    return () => window.removeEventListener("keydown", toggleSidebar);
  }, [setCollapsed]);
  return (
    <div
      className="dashboard-shell dashboard-theme"
      data-collapsed={collapsed}
      data-theme={theme}
    >
      <a href="#main-content" className="dashboard-skip-link">
        Zum Inhalt springen
      </a>
      <aside className="dashboard-sidebar" aria-label="Workspace">
        <DashboardSidebar
          section={section}
          collapsed={collapsed}
          authenticated={authenticated}
        />
      </aside>
      <div className="dashboard-inset">
        <header className="dashboard-header">
          <div className="dashboard-breadcrumb">
            <Button
              variant="ghost"
              size="icon"
              className="dashboard-desktop-toggle"
              aria-label={
                collapsed
                  ? "Seitenleiste ausklappen"
                  : "Seitenleiste einklappen"
              }
              aria-expanded={!collapsed}
              onClick={() => setCollapsed((value) => !value)}
            >
              <IconLayoutSidebar size={18} aria-hidden="true" />
            </Button>
            <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
              <Dialog.Trigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="dashboard-mobile-toggle"
                  aria-label="Navigation öffnen"
                >
                  <IconLayoutSidebar size={18} aria-hidden="true" />
                </Button>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className="dashboard-dialog-overlay" />
                <Dialog.Content
                  className="dashboard-mobile-sidebar dashboard-theme"
                  data-theme={theme}
                >
                  <Dialog.Title className="sr-only">Navigation</Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Bereiche der Betriebsoberfläche
                  </Dialog.Description>
                  <Dialog.Close asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="dashboard-mobile-close"
                      aria-label="Navigation schließen"
                    >
                      <IconX size={18} aria-hidden="true" />
                    </Button>
                  </Dialog.Close>
                  <DashboardSidebar
                    section={section}
                    authenticated={authenticated}
                    onNavigate={() => setMobileOpen(false)}
                  />
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <span className="dashboard-header-divider" />
            <nav aria-label="Breadcrumb">
              <ol>
                <li>
                  <Link href="/">Workspace</Link>
                </li>
                <li aria-hidden="true">
                  <IconChevronRight size={14} />
                </li>
                <li aria-current="page">{title}</li>
              </ol>
            </nav>
          </div>
          <div className="dashboard-header-actions">
            <CommandMenu theme={theme} />
            <Button
              variant="ghost"
              size="icon"
              aria-label={
                theme === "light"
                  ? "Dunkelmodus aktivieren"
                  : "Hellmodus aktivieren"
              }
              onClick={() =>
                setTheme((value) => (value === "light" ? "dark" : "light"))
              }
            >
              {theme === "light" ? (
                <IconMoon size={18} aria-hidden="true" />
              ) : (
                <IconSun size={18} aria-hidden="true" />
              )}
            </Button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="dashboard-page">
          {children}
        </main>
      </div>
    </div>
  );
}
