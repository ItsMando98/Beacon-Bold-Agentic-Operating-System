import { expect, it, vi } from "vitest";
import { deployStaging } from "../../scripts/deploy-staging.mjs";

function fixture(migrationExit = 0) {
  const states = new Map();
  const aws = vi.fn((...args: string[]) => {
    const operation = args[1];
    const name =
      args[args.indexOf("--services") + 1] ??
      args[args.indexOf("--service") + 1];
    if (operation === "describe-task-definition")
      return {
        taskDefinition: {
          family: "fictional",
          containerDefinitions: [{ name: "fictional", image: "old" }],
        },
      };
    if (operation === "describe-images")
      return { imageDetails: [{ imageDigest: `sha256:${"a".repeat(64)}` }] };
    if (operation === "register-task-definition")
      return { taskDefinition: { taskDefinitionArn: "release-definition" } };
    if (operation === "run-task")
      return { tasks: [{ taskArn: "migration-task" }], failures: [] };
    if (operation === "describe-tasks")
      return { tasks: [{ containers: [{ exitCode: migrationExit }] }] };
    if (operation === "describe-services")
      return {
        services: [
          states.get(name) ?? {
            taskDefinition: "bootstrap-definition",
            desiredCount: 0,
          },
        ],
      };
    if (operation === "update-service") {
      const service = args[args.indexOf("--service") + 1];
      states.set(service, {
        taskDefinition: args[args.indexOf("--task-definition") + 1],
        desiredCount: Number(args[args.indexOf("--desired-count") + 1]),
        runningCount: 1,
      });
    }
    return {};
  });
  return {
    aws,
    states,
    wait: vi.fn(),
    fetcher: vi.fn(async () => ({
      ok: true,
      json: async () => ({ status: "ok" }),
    })),
    env: {
      GITHUB_SHA: "b".repeat(40),
      GITHUB_REF: "refs/heads/main",
      STAGING_SUBNETS: "subnet-123,subnet-456",
      STAGING_SECURITY_GROUP: "sg-123",
    },
  };
}

it("never changes services after a failed migration", async () => {
  const dependencies = fixture(1);
  await expect(deployStaging(dependencies)).rejects.toThrow("Migration failed");
  expect(
    dependencies.aws.mock.calls.some((args) => args[1] === "update-service"),
  ).toBe(false);
  expect(
    dependencies.aws.mock.calls.some((args) => args[1] === "stop-task"),
  ).toBe(true);
});
it("restores all previous services when HTTPS acceptance fails", async () => {
  const dependencies = fixture();
  dependencies.fetcher.mockResolvedValue({
    ok: false,
    json: async () => ({ status: "failed" }),
  });
  await expect(deployStaging(dependencies)).rejects.toThrow(
    "HTTPS health failed",
  );
  expect(
    [...dependencies.states.values()].every(
      (state) =>
        state.taskDefinition === "bootstrap-definition" &&
        state.desiredCount === 0,
    ),
  ).toBe(true);
  expect(dependencies.states.size).toBe(3);
});
it("refuses a non-main release before any AWS call", async () => {
  const dependencies = fixture();
  dependencies.env.GITHUB_REF = "refs/heads/feature";
  await expect(deployStaging(dependencies)).rejects.toThrow("Only main");
  expect(dependencies.aws).not.toHaveBeenCalled();
});
it("deploys digest-pinned images and checks all three HTTPS endpoints", async () => {
  const dependencies = fixture();
  await deployStaging(dependencies);
  const registrations = dependencies.aws.mock.calls.filter(
    (args) => args[1] === "register-task-definition",
  );
  expect(registrations).toHaveLength(4);
  expect(
    registrations.every((args) =>
      JSON.parse(args[3]).containerDefinitions[0].image.includes("@sha256:"),
    ),
  ).toBe(true);
  expect(dependencies.fetcher).toHaveBeenCalledTimes(3);
});
