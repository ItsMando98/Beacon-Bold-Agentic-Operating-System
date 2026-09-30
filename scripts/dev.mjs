import { spawn } from "node:child_process";

const command = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const child = spawn(command, ["exec", "turbo", "dev"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { APP_ENV: "development", SERVICE_MODE: "mock", ...process.env },
});
child.on("exit", (code) => process.exit(code ?? 1));
