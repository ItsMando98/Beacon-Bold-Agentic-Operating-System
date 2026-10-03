import type { NextConfig } from "next";
import { agencyShellHeaders } from "./src/headers";

const config: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  transpilePackages: ["@roaswell/ui"],
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

export default config;
