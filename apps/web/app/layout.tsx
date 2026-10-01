import "@roaswell/ui/fonts";
import "@roaswell/ui/styles.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  title: "ROASWELL",
  description: "Agentic Operating System",
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
