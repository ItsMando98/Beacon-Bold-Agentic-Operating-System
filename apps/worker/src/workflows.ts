import {
  type ExampleActivityInput,
  type ExampleActivityResult,
  type ExampleWorkflowInput,
  type ExampleWorkflowResult,
  type ExampleWorkflowState,
  exampleWorkflowInputSchema,
  exampleWorkflowResultSchema,
} from "@roaswell/schemas";
import {
  ApplicationFailure,
  defineQuery,
  proxyActivities,
  setHandler,
  sleep,
} from "@temporalio/workflow";

const { executeExample } = proxyActivities<{
  executeExample(input: ExampleActivityInput): Promise<ExampleActivityResult>;
}>({
  startToCloseTimeout: "2 seconds",
  scheduleToCloseTimeout: "10 seconds",
  retry: {
    initialInterval: "250 milliseconds",
    maximumInterval: "1 second",
    backoffCoefficient: 2,
    maximumAttempts: 3,
  },
});
export const exampleState = defineQuery<ExampleWorkflowState>("exampleState");
export async function exampleWorkflow(
  input: ExampleWorkflowInput,
): Promise<ExampleWorkflowResult> {
  const parsed = exampleWorkflowInputSchema.safeParse(input);
  if (!parsed.success)
    throw ApplicationFailure.nonRetryable(
      "Invalid example workflow input",
      "INVALID_INPUT",
    );
  const { tenantId, name, pauseMs } = parsed.data;
  let state: ExampleWorkflowState = {
    phase: "preparing",
    completedActivities: 0,
  };
  setHandler(exampleState, () => state);
  const prepared = await executeExample({ tenantId, name, step: "prepare" });
  state = { phase: "waiting", completedActivities: 1 };
  await sleep(pauseMs);
  state = { phase: "finishing", completedActivities: 1 };
  const finished = await executeExample({ tenantId, name, step: "finish" });
  state = { phase: "complete", completedActivities: 2 };
  return exampleWorkflowResultSchema.parse({ tenantId, prepared, finished });
}
