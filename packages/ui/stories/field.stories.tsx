import type { Meta, StoryObj } from "@storybook/react-vite";
import { Field, FieldLabel } from "../src/components/field";
import { Input } from "../src/components/input";

function FormField() {
  return (
    <Field>
      <FieldLabel htmlFor="customer">Kundenname</FieldLabel>
      <Input id="customer" placeholder="Beispielkunde" />
    </Field>
  );
}
const meta = { title: "Formularfeld", component: FormField } satisfies Meta<
  typeof FormField
>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
