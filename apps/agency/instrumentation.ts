import { loadEnvironment } from "@roaswell/config";
export function register() {
  if (
    process.env.NEXT_RUNTIME === "nodejs" &&
    process.env.NEXT_PHASE !== "phase-production-build"
  ) {
    try {
      loadEnvironment("agency", process.env);
    } catch (error) {
      // Next catches rejected instrumentation hooks without terminating the server.
      // Exit before accepting traffic when required runtime configuration is invalid.
      console.error(
        error instanceof Error
          ? error.message
          : "Invalid runtime configuration",
      );
      process.exit(1);
    }
  }
}
