import { type ChildProcess, fork } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import {
  Client,
  Connection,
  WorkflowFailedError,
  type WorkflowHandle,
} from "@temporalio/client";
import { afterAll, afterEach, beforeAll, expect, test } from "vitest";
import {
  exampleWorkflowResultSchema,
  exampleWorkflowStateSchema,
} from "../../packages/schemas/src/workflow.js";

const children = new Set<ChildProcess>();
const workflows: WorkflowHandle[] = [];
let connection: Connection;
let client: Client;
beforeAll(async () => {
  connection = await Connection.connect({ address: "127.0.0.1:17233" });
  client = new Client({ connection, namespace: "default" });
});
async function kill(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGKILL");
  await exited;
  children.delete(child);
}
afterEach(async () => {
  await Promise.all([...children].map(kill));
  for (const handle of workflows.splice(0)) {
    const status = (await handle.describe()).status.name;
    if (status === "RUNNING")
      await handle.terminate("Synthetic acceptance cleanup");
  }
});
afterAll(async () => {
  await connection?.close();
});

async function startWorker(mode: string, taskQueue: string) {
  const child = fork(
    fileURLToPath(new URL("../fixtures/temporal-worker.ts", import.meta.url)),
    [mode, taskQueue],
    {
      execArgv: ["--import", "tsx"],
      stdio: ["ignore", "pipe", "pipe", "ipc"],
    },
  );
  children.add(child);
  let diagnostics = "";
  child.stdout?.on("data", (data) => {
    diagnostics = (diagnostics + data.toString()).slice(-5000);
  });
  child.stderr?.on("data", (data) => {
    diagnostics = (diagnostics + data.toString()).slice(-5000);
  });
  const attempts: number[] = [];
  child.on("message", (message) => {
    if (
      typeof message === "object" &&
      message !== null &&
      "type" in message &&
      message.type === "attempt" &&
      "attempt" in message &&
      typeof message.attempt === "number"
    )
      attempts.push(message.attempt);
  });
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Worker did not become ready: ${diagnostics}`)),
      20_000,
    );
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", () => {
      clearTimeout(timer);
      reject(new Error(`Worker exited: ${diagnostics}`));
    });
    child.on("message", (message) => {
      if (
        typeof message === "object" &&
        message !== null &&
        "type" in message &&
        message.type === "ready"
      ) {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  return { child, attempts };
}
async function startWorkflow(taskQueue: string, pauseMs = 0) {
  const handle = await client.workflow.start("exampleWorkflow", {
    taskQueue,
    workflowId: `p1-7-test-${randomUUID()}`,
    workflowExecutionTimeout: "45 seconds",
    args: [
      {
        tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        name: "Invented Example",
        pauseMs,
      },
    ],
  });
  workflows.push(handle);
  return handle;
}

test("a workflow resumes in a new worker process without repeating completed activities", async () => {
  const queue = `p1-7-restart-${randomUUID()}`;
  const first = await startWorker("normal", queue);
  const handle = await startWorkflow(queue, 8000);
  await expect
    .poll(
      async () =>
        exampleWorkflowStateSchema.parse(await handle.query("exampleState"))
          .phase,
      { timeout: 15_000, interval: 200 },
    )
    .toBe("waiting");
  const runId = (await handle.describe()).runId;
  expect(first.attempts).toEqual([1]);
  const firstPid = first.child.pid;
  await kill(first.child);
  expect((await handle.describe()).status.name).toBe("RUNNING");
  const second = await startWorker("normal", queue);
  expect(second.child.pid).not.toBe(firstPid);
  const result = exampleWorkflowResultSchema.parse(await handle.result());
  expect(result.prepared.step).toBe("prepare");
  expect(result.finished.step).toBe("finish");
  expect(second.attempts).toEqual([1]);
  expect((await handle.describe()).runId).toBe(runId);
  const history = await handle.fetchHistory();
  expect(
    history.events?.filter(
      (event) => event.activityTaskCompletedEventAttributes,
    ),
  ).toHaveLength(2);
}, 60_000);

test("transient activity failures are retried with a bounded attempt count", async () => {
  const queue = `p1-7-retry-${randomUUID()}`;
  const { attempts } = await startWorker("retry", queue);
  const result = exampleWorkflowResultSchema.parse(
    await (await startWorkflow(queue)).result(),
  );
  expect(result.prepared.attempt).toBe(3);
  expect(result.finished.attempt).toBe(3);
  expect(attempts).toEqual([1, 2, 3, 1, 2, 3]);
}, 60_000);

test("a stalled activity times out and fails the workflow after three attempts", async () => {
  const queue = `p1-7-timeout-${randomUUID()}`;
  const { attempts } = await startWorker("timeout", queue);
  const handle = await startWorkflow(queue);
  await expect(handle.result()).rejects.toBeInstanceOf(WorkflowFailedError);
  expect(attempts).toEqual([1, 2, 3]);
  const history = await handle.fetchHistory();
  const timedOut = history.events?.find(
    (event) => event.activityTaskTimedOutEventAttributes,
  )?.activityTaskTimedOutEventAttributes;
  expect(timedOut?.failure?.timeoutFailureInfo).toBeTruthy();
  expect((await handle.describe()).status.name).toBe("FAILED");
}, 60_000);
