import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "../src/components/button";

const meta = {
  title: "Button",
  component: Button,
  args: { children: "Aktion ausführen" },
} satisfies Meta<typeof Button>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Primary: Story = {};
export const Outline: Story = { args: { variant: "outline" } };
export const Disabled: Story = { args: { disabled: true } };
