import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:13000", trace: "retain-on-failure" },
  webServer: [
    {
      command: "node apps/api/dist/server.js",
      url: "http://127.0.0.1:13002/health",
      reuseExistingServer: false,
      env: { APP_ENV: "development", SERVICE_MODE: "mock", PORT: "13002" },
    },
    {
      command:
        "node apps/app/node_modules/next/dist/bin/next start apps/app --port 13000",
      url: "http://127.0.0.1:13000",
      reuseExistingServer: false,
      env: { APP_ENV: "development", SERVICE_MODE: "mock" },
    },
    {
      command:
        "node packages/ui/node_modules/vite/bin/vite.js preview packages/ui --outDir storybook-static --port 16006 --host 127.0.0.1",
      url: "http://127.0.0.1:16006",
      reuseExistingServer: false,
    },
  ],
});
