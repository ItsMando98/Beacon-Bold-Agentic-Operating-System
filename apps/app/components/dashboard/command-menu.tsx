"use client";

import { Button, Input } from "@beacon/ui";
import { IconSearch, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { Dialog } from "radix-ui";
import { useEffect, useRef, useState } from "react";
import { dashboardNavigation } from "./navigation";

export function CommandMenu({ theme }: { theme: "light" | "dark" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  const items = dashboardNavigation.filter((item) =>
    item.title.toLocaleLowerCase("de").includes(query.toLocaleLowerCase("de")),
  );
  function changeOpen(value: boolean) {
    setOpen(value);
    if (!value) setQuery("");
  }
  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger asChild>
        <Button
          variant="outline"
          className="dashboard-search-trigger"
          aria-label="Seiten suchen"
        >
          <IconSearch size={16} aria-hidden="true" />
          <span>Seiten suchen…</span>
          <kbd>⌘ / Ctrl K</kbd>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dashboard-dialog-overlay" />
        <Dialog.Content
          className="dashboard-command dashboard-theme"
          data-theme={theme}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="dashboard-dialog-heading">
            <Dialog.Title>Seiten suchen</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Suche schließen">
                <IconX size={18} aria-hidden="true" />
              </Button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="dashboard-muted">
            Finde einen Bereich im Workspace.
          </Dialog.Description>
          <Input
            ref={inputRef}
            aria-label="Suchbegriff"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Übersicht, Agenten, Freigaben…"
          />
          <div className="dashboard-command-results">
            {items.map(({ key, title, href, icon: Icon }) => (
              <Link
                href={href}
                key={key}
                className="dashboard-command-result"
                onClick={() => changeOpen(false)}
              >
                <Icon size={18} aria-hidden="true" />
                {title}
              </Link>
            ))}
            {items.length === 0 && (
              <p role="status" className="dashboard-muted">
                Keine passende Seite gefunden.
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
