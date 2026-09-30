# Vorläufiges Design System

Signal-Orange (#ff6b35), neutrale Flächen, Bricolage Grotesque und JetBrains Mono. Die Schriften werden über @fontsource lokal ausgeliefert. Button, Tag/Badge und Formularfeld stammen aus dem offiziellen shadcn/ui-Registry (Radix, new-york), mit gemeinsamen semantischen Tokens. Die Quelle ist ausdrücklich ein neuer Ausgangspunkt, keine Übernahme eines vorhandenen Design Systems.

```sh
pnpm storybook
pnpm build:storybook
```

Foundation zeigt eine interaktive lokale Formularvorschau, einen Tag, Button-Varianten und einen korrekt beschrifteten Fehlerzustand. Es werden keine Daten gespeichert oder nach außen versandt. Stories für die drei einzelnen Komponenten sind ebenfalls vorhanden.
