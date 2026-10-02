import { loadEnvironment } from "@roaswell/config";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
export default function config(phase: string): NextConfig {
  if (phase !== PHASE_PRODUCTION_BUILD) loadEnvironment("portal", process.env);
  return {
    output: "standalone",
    transpilePackages: [
      "@roaswell/ui",
      "@roaswell/config",
      "@roaswell/schemas",
      "@roaswell/integrations",
    ],
    webpack(config) {
      config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
      return config;
    },
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Cache-Control", value: "private, no-store" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "same-origin" },
          ],
        },
      ];
    },
  };
}
