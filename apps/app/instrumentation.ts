import { loadEnvironment } from "@beacon/config";
export function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  )
    loadEnvironment("app", process.env);
}
