import { loadEnvironment } from "@roaswell/config";
import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
export default function config(phase: string): NextConfig {
  if (phase !== PHASE_PRODUCTION_BUILD) loadEnvironment("web", process.env);
  return {
    output: "standalone",
    transpilePackages: ["@roaswell/ui", "@roaswell/config"],
  };
}
