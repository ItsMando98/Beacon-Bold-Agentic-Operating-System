import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function invokeAws(...args) {
  return JSON.parse(
    execFileSync(
      "aws",
      [
        ...args,
        "--region",
        "eu-central-1",
        "--output",
        "json",
        "--no-cli-pager",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
}

export async function deployStaging({
  aws = invokeAws,
  wait = (args) =>
    execFileSync("aws", args, { stdio: "pipe", timeout: 660000 }),
  fetcher = fetch,
  env = process.env,
} = {}) {
  const cluster = "beacon-bold-staging";
  const release = env.GITHUB_SHA;
  if (!/^[a-f0-9]{40}$/.test(release ?? ""))
    throw new Error("A full release commit is required");
  if (env.GITHUB_REF !== "refs/heads/main")
    throw new Error("Only main may deploy");
  const registry = "212626318809.dkr.ecr.eu-central-1.amazonaws.com";
  const subnets = env.STAGING_SUBNETS?.split(",");
  const securityGroup = env.STAGING_SECURITY_GROUP;
  if (
    !subnets?.every((value) => /^subnet-[a-f0-9]+$/.test(value)) ||
    !/^sg-[a-f0-9]+$/.test(securityGroup ?? "")
  )
    throw new Error("Staging network configuration required");

  function register(service, source) {
    const definition = aws(
      "ecs",
      "describe-task-definition",
      "--task-definition",
      source,
    ).taskDefinition;
    const allowed = [
      "family",
      "taskRoleArn",
      "executionRoleArn",
      "networkMode",
      "containerDefinitions",
      "volumes",
      "placementConstraints",
      "requiresCompatibilities",
      "cpu",
      "memory",
      "runtimePlatform",
      "ephemeralStorage",
    ];
    const input = Object.fromEntries(
      allowed
        .filter((key) => definition[key] !== undefined)
        .map((key) => [key, definition[key]]),
    );
    const image = aws(
      "ecr",
      "describe-images",
      "--repository-name",
      `beacon-bold-staging-${service}`,
      "--image-ids",
      `imageTag=${release}`,
    ).imageDetails[0].imageDigest;
    input.containerDefinitions[0].image = `${registry}/beacon-bold-staging-${service}@${image}`;
    return aws(
      "ecs",
      "register-task-definition",
      "--cli-input-json",
      JSON.stringify(input),
    ).taskDefinition.taskDefinitionArn;
  }

  let migrationTask;
  try {
    const definition = register("migrate", "beacon-bold-staging-migrate");
    const result = aws(
      "ecs",
      "run-task",
      "--cluster",
      cluster,
      "--launch-type",
      "FARGATE",
      "--platform-version",
      "1.4.0",
      "--task-definition",
      definition,
      "--network-configuration",
      JSON.stringify({
        awsvpcConfiguration: {
          subnets,
          securityGroups: [securityGroup],
          assignPublicIp: "ENABLED",
        },
      }),
    );
    if (result.failures?.length || result.tasks?.length !== 1)
      throw new Error("Migration task did not start");
    migrationTask = result.tasks[0].taskArn;
    wait([
      "ecs",
      "wait",
      "tasks-stopped",
      "--region",
      "eu-central-1",
      "--cluster",
      cluster,
      "--tasks",
      migrationTask,
    ]);
    const completed = aws(
      "ecs",
      "describe-tasks",
      "--cluster",
      cluster,
      "--tasks",
      migrationTask,
    );
    if (
      completed.failures?.length ||
      completed.tasks[0]?.containers?.[0]?.exitCode !== 0
    )
      throw new Error("Migration failed; services were not updated");
  } catch (error) {
    if (migrationTask)
      aws(
        "ecs",
        "stop-task",
        "--cluster",
        cluster,
        "--task",
        migrationTask,
        "--reason",
        "Migration deployment failed or timed out",
      );
    throw error;
  }

  const previous = {};
  try {
    for (const service of ["api", "app", "web"]) {
      const name = `${cluster}-${service}`;
      const result = aws(
        "ecs",
        "describe-services",
        "--cluster",
        cluster,
        "--services",
        name,
      );
      if (result.failures?.length || !result.services[0])
        throw new Error("Staging service missing");
      previous[service] = {
        taskDefinition: result.services[0].taskDefinition,
        desiredCount: result.services[0].desiredCount,
      };
      const definition = register(service, previous[service].taskDefinition);
      aws(
        "ecs",
        "update-service",
        "--cluster",
        cluster,
        "--service",
        name,
        "--task-definition",
        definition,
        "--desired-count",
        "1",
      );
      wait([
        "ecs",
        "wait",
        "services-stable",
        "--region",
        "eu-central-1",
        "--cluster",
        cluster,
        "--services",
        name,
      ]);
      const deployed = aws(
        "ecs",
        "describe-services",
        "--cluster",
        cluster,
        "--services",
        name,
      ).services[0];
      if (deployed.taskDefinition !== definition || deployed.runningCount !== 1)
        throw new Error("Service rolled back or did not start");
    }
    for (const url of [
      "https://staging.beaconandbold.com/health",
      "https://app.staging.beaconandbold.com",
      "https://web.staging.beaconandbold.com",
    ]) {
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) throw new Error("Staging HTTPS health failed");
      if (url.endsWith("/health") && (await response.json()).status !== "ok")
        throw new Error("API health contract failed");
    }
    console.log(
      `Staging release ${release} passed migration, image digest and HTTPS checks`,
    );
  } catch (error) {
    for (const [service, state] of Object.entries(previous)) {
      aws(
        "ecs",
        "update-service",
        "--cluster",
        cluster,
        "--service",
        `${cluster}-${service}`,
        "--task-definition",
        state.taskDefinition,
        "--desired-count",
        String(state.desiredCount),
      );
    }
    // Forward migrations remain applied; never restore or down-migrate automatically.
    throw error;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  await deployStaging();
