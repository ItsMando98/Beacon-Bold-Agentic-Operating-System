// Exercise the built worker, including its separately emitted workflow bundle.
const { createExampleWorker } = (await import(
  new URL("../../apps/worker/dist/worker.js", import.meta.url).href
)) as typeof import("../../apps/worker/src/worker.js");

import {
  type ExampleAdapter,
  localExampleAdapter,
} from "../../packages/integrations/src/example.js";

const [mode, taskQueue] = process.argv.slice(2);
if (!taskQueue || !["normal", "retry", "timeout"].includes(mode ?? ""))
  throw new Error("Invalid test worker arguments");
const adapter: ExampleAdapter = {
  async execute(input, attempt) {
    process.send?.({ type: "attempt", attempt, step: input.step });
    if (mode === "retry" && attempt < 3)
      throw new Error("Synthetic transient failure");
    if (mode === "timeout") return new Promise(() => {});
    return localExampleAdapter.execute(input, attempt);
  },
};
const { worker, close } = await createExampleWorker(
  {
    APP_ENV: "development",
    TEMPORAL_ADDRESS: "127.0.0.1:17233",
    TEMPORAL_NAMESPACE: "default",
    TEMPORAL_TASK_QUEUE: taskQueue,
  },
  adapter,
);
try {
  const running = worker.run();
  process.send?.({ type: "ready" });
  await running;
} finally {
  await close();
}
