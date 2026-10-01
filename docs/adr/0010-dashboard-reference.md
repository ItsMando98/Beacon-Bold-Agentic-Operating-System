# ADR 0010: Betriebsoberfläche nach dem Kiranism-Dashboard

Status: beschlossen durch die ausdrückliche Nutzerkorrektur am 1. Oktober 2026.

Die Betriebsoberfläche verwendet wie im Konzept vorgesehen
[Kiranism/next-shadcn-dashboard-starter](https://github.com/Kiranism/next-shadcn-dashboard-starter)
als Vorlage für Layouts und Komponenten. Der vorherige Bildentwurf wurde vom
Gründer abgelehnt und wird nicht umgesetzt.

Referenzrevision: 7705dfc0d13889e45c26a55ad5908da6a7a9a605.
Sidebar-/Header-/PageContainer-Komposition und die Overview-Aufteilung werden
für Beacon & Bold adaptiert. Card und Table werden aus dieser Revision übernommen;
MIT-Lizenz und Herkunft stehen in licenses/kiranism-dashboard.txt.

Next.js, das bestehende Monorepo, Auth0 und die Radix-basierten gemeinsamen
Komponenten bleiben die Grundlage. Die aktuelle Vorlage verwendet Base UI,
Clerk und weitere Anbieter; diese werden nicht für die Layout-Adaption übernommen.
Signal-Orange, Bricolage Grotesque und JetBrains Mono bleiben die Markentokens.

P1-11 wird in einzeln prüfbare Aufgaben geteilt: P1-11a Oberfläche/Navigation,
P1-11b ausdrücklich gekennzeichnete interaktive Beispielstrecke mit gemeinsamen
Schemas, P1-11c echte Anbindung nach ihren Backend-Abhängigkeiten.
P1-11a zeigt keine Betriebszahlen oder erfundenen Agenten als echte Daten.
Die öffentliche Vorschau enthält ausschließlich statische Darstellung;
geschützte Betriebsdaten bleiben hinter Session und lokalem Mandanten-Binding.
