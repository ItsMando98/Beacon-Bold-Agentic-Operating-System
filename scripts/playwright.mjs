import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const executable = fileURLToPath(
  new URL("../node_modules/@playwright/test/cli.js", import.meta.url),
);
const browsers = fileURLToPath(
  new URL("../.cache/playwright", import.meta.url),
);
const child = spawn(process.execPath, [executable, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH ?? browsers,
  },
});
child.on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
child.on("exit", (code) => process.exit(code ?? 1));
