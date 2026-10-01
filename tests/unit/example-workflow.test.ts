import { expect, test } from "vitest";
import { localExampleAdapter } from "../../packages/integrations/src/example.js";
import {
  exampleWorkflowInputSchema,
  temporalConnectionSchema,
} from "../../packages/schemas/src/workflow.js";

test("workflow input is strict and bounds the durable wait", () => {
  const input = {
    tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Invented Example",
  };
  expect(exampleWorkflowInputSchema.parse(input).pauseMs).toBe(0);
  for (const invalid of [
    { ...input, pauseMs: -1 },
    { ...input, pauseMs: 30_001 },
    { ...input, tenantId: "wrong" },
    { ...input, extra: true },
  ])
    expect(exampleWorkflowInputSchema.safeParse(invalid).success).toBe(false);
});
test("local example preserves tenant and validates the activity attempt", async () => {
  const input = {
    tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    name: "Invented Example",
    step: "prepare" as const,
  };
  expect(await localExampleAdapter.execute(input, 2)).toEqual({
    ...input,
    attempt: 2,
    message: "prepare: Invented Example",
  });
  await expect(localExampleAdapter.execute(input, 4)).rejects.toThrow();
});
test("Temporal permits local development and requires runtime authentication elsewhere", () => {
  expect(
    temporalConnectionSchema.parse({ APP_ENV: "development" }).TEMPORAL_ADDRESS,
  ).toBe("127.0.0.1:17233");
  expect(
    temporalConnectionSchema.safeParse({ APP_ENV: "staging" }).success,
  ).toBe(false);
  expect(
    temporalConnectionSchema.safeParse({ APP_ENV: "production" }).success,
  ).toBe(false);
  expect(
    temporalConnectionSchema.safeParse({
      APP_ENV: "development",
      TEMPORAL_ADDRESS: "https://bad",
    }).success,
  ).toBe(false);
});
