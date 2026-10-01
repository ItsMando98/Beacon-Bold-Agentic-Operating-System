import "@beacon/ui/fonts";
import "@beacon/ui/styles.css";
import "./dashboard.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DashboardSettingsProvider } from "../components/dashboard/settings-provider";
export const metadata: Metadata = {
  title: "Betrieb | Beacon & Bold",
  description: "Freigaben, Abläufe und Ergebnisse",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <DashboardSettingsProvider>{children}</DashboardSettingsProvider>
      </body>
    </html>
  );
}
