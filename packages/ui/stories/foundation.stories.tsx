import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Badge } from "../src/components/badge";
import { Button } from "../src/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "../src/components/field";
import { Input } from "../src/components/input";

function Foundation() {
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-8 py-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold">Beacon & Bold</h1>
        <p className="text-muted-foreground">Vorläufige Design-Grundlagen</p>
      </header>
      <section className="flex flex-col gap-4" aria-label="Komponenten">
        <h2 className="text-xl font-semibold">Button, Tag und Formularfeld</h2>
        <Badge variant="secondary">Vorschau</Badge>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
          }}
          className="flex flex-col gap-5"
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="project-name">Projektname</FieldLabel>
              <Input
                id="project-name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved(false);
                }}
                required
                aria-describedby="project-description"
              />
              <FieldDescription id="project-description">
                Eine lokale Vorschau ohne Speicherung von Kundendaten.
              </FieldDescription>
            </Field>
          </FieldGroup>
          <div className="flex flex-wrap gap-3">
            <Button type="submit">Vorschau speichern</Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setName("");
                setSaved(false);
              }}
            >
              Zurücksetzen
            </Button>
          </div>
          {saved && <p role="status">Vorschau für {name} gespeichert.</p>}
        </form>
      </section>
      <section className="flex flex-col gap-4" aria-label="Validierung">
        <h2 className="text-xl font-semibold">Fehlerzustand</h2>
        <Field data-invalid>
          <FieldLabel htmlFor="invalid-email">E-Mail-Adresse</FieldLabel>
          <Input
            id="invalid-email"
            type="email"
            defaultValue="beispiel"
            aria-invalid
            aria-describedby="email-error"
          />
          <FieldError id="email-error">
            Bitte eine gültige E-Mail-Adresse eingeben.
          </FieldError>
        </Field>
      </section>
    </main>
  );
}
const meta = { title: "Foundation", component: Foundation } satisfies Meta<
  typeof Foundation
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Components: Story = {};
