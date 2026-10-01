import "@roaswell/ui/fonts";
import "@roaswell/ui/styles.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  title: "Betrieb | ROASWELL",
  description: "Freigaben, Abläufe und Ergebnisse",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
