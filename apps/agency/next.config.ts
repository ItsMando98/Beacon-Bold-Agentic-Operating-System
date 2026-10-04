import { loadEnvironment } from "@roaswell/config";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { agencyShellHeaders } from "./src/headers";

export default function config(phase: string): NextConfig {
  if (phase !== PHASE_PRODUCTION_BUILD) loadEnvironment("agency", process.env);
  return {
    output: "standalone",
    poweredByHeader: false,
    transpilePackages: ["@roaswell/ui", "@roaswell/config"],
    webpack(webpackConfig) {
      webpackConfig.resolve.extensionAlias = {
        ".js": [".ts", ".tsx", ".js"],
      };
      return webpackConfig;
    },
    async headers() {
      return [{ source: "/:path*", headers: agencyShellHeaders() }];
    },
  };
}
