import "@roaswell/ui/fonts";
import "@roaswell/ui/styles.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = {
  title: "Kundenbereich | ROASWELL",
  description: "Dein persönlicher Bereich für die Zusammenarbeit mit ROASWELL",
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <body>
        <header className="border-b px-6 py-5">
          <a href="/" className="font-semibold tracking-tight">
            ROASWELL
          </a>
        </header>
        <main className="mx-auto max-w-3xl px-6 py-16">{children}</main>
      </body>
    </html>
  );
}
