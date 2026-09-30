import { loadEnvironment } from "@beacon/config";

loadEnvironment("worker", process.env);
// Phase 0 entrypoint only. Temporal activities and workflows are added in P1-7.
console.info(
  "Worker entrypoint ready. Workflow execution is not implemented yet.",
);
