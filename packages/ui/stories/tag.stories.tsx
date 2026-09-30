import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../src/components/badge";

const meta = {
  title: "Tag",
  component: Badge,
  args: { children: "Wartet auf Freigabe", variant: "secondary" },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
