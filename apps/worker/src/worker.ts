import { fileURLToPath } from "node:url";
import {
  createTemporalWorker,
  type ExampleAdapter,
  localExampleAdapter,
} from "@beacon/integrations";
import {
  exampleActivityInputSchema,
  exampleActivityResultSchema,
} from "@beacon/schemas";
import { Context } from "@temporalio/activity";
import { ApplicationFailure } from "@temporalio/common";
export async function createExampleWorker(
  environment: Record<string, string | undefined>,
  adapter: ExampleAdapter = localExampleAdapter,
) {
  const extension = import.meta.url.endsWith(".ts") ? "ts" : "js";
  return createTemporalWorker(environment, {
    workflowsPath: fileURLToPath(
      new URL(`./workflows.${extension}`, import.meta.url),
    ),
    activities: {
      async executeExample(input: unknown) {
        const parsed = exampleActivityInputSchema.safeParse(input);
        if (!parsed.success)
          throw ApplicationFailure.nonRetryable(
            "Invalid example activity input",
            "INVALID_INPUT",
          );
        const result = exampleActivityResultSchema.safeParse(
          await adapter.execute(parsed.data, Context.current().info.attempt),
        );
        if (
          !result.success ||
          result.data.tenantId !== parsed.data.tenantId ||
          result.data.name !== parsed.data.name ||
          result.data.step !== parsed.data.step
        )
          throw ApplicationFailure.nonRetryable(
            "Invalid example adapter result",
            "INVALID_RESULT",
          );
        return result.data;
      },
    },
  });
}
