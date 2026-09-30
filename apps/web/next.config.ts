import type { NextConfig } from "next";

const config: NextConfig = {
  output: "standalone",
  transpilePackages: ["@beacon/ui", "@beacon/config"],
};
export default config;
