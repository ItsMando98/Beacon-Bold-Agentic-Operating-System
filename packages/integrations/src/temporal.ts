import { temporalConnectionSchema } from "@roaswell/schemas";
import {
  NativeConnection,
  Worker,
  type WorkerOptions,
} from "@temporalio/worker";
/** Infrastructure adapter. Configuration values and credentials never enter logs. */
export async function createTemporalWorker(
  environment: Record<string, string | undefined>,
  options: Pick<WorkerOptions, "workflowsPath" | "activities">,
) {
  const parsed = temporalConnectionSchema.safeParse(environment);
  if (!parsed.success)
    throw new Error(
      `Invalid worker configuration: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`,
    );
  const config = parsed.data;
  const connection = await NativeConnection.connect({
    address: config.TEMPORAL_ADDRESS,
    tls: config.APP_ENV !== "development" || Boolean(config.TEMPORAL_API_KEY),
    ...(config.TEMPORAL_API_KEY ? { apiKey: config.TEMPORAL_API_KEY } : {}),
  });
  try {
    const worker = await Worker.create({
      ...options,
      connection,
      namespace: config.TEMPORAL_NAMESPACE,
      taskQueue: config.TEMPORAL_TASK_QUEUE,
      shutdownGraceTime: "5 seconds",
    });
    return { worker, close: () => connection.close() };
  } catch (error) {
    await connection.close();
    throw error;
  }
}
