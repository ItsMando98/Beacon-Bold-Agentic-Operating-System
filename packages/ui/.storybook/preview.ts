import "../src/fonts";
import type { Preview } from "@storybook/react-vite";
import "../src/styles.css";

const preview: Preview = {
  // Playwright owns the acceptance scan; avoid two axe runs in the same iframe.
  parameters: { layout: "padded", a11y: { test: "error" } },
  initialGlobals: { a11y: { manual: true } },
};
export default preview;
