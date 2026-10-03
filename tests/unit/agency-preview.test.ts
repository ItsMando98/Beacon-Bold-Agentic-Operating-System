import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import {
  assertPreviewLocation,
  createPreviewProxy,
  deployManifestText,
  findViolations,
  guardDeployTree,
  listDeployFiles,
  main,
  planAgencyPreview,
  previewCommands,
  previewEnvironment,
  readAgencyPackage,
  serveAgencyPreview,
} from "../../scripts/agency-preview.mjs";

const root = fileURLToPath(new URL("../..", import.meta.url));

it("accepts the current deploy manifests", () => {
  expect(guardDeployTree(root)).toEqual([]);
  const files = listDeployFiles(root);
  expect(files).toContain(".github/workflows/ci.yml");
  expect(files).toContain(".github/workflows/agency-preview.yml");
  expect(files).toContain("infra/vps/compose.yaml");
  expect(
    files.some((file) => file.endsWith(".ts") || file.endsWith(".tsx")),
  ).toBe(false);
});

it("fails closed on apex deploy, the public Pages project, and a static upload", () => {
  const workflow = [
    "name: publish apex",
    "jobs:",
    "  deploy:",
    "    environment: production",
    "    steps:",
    "      - run: npx wrangler pages deploy site --project-name beaconandbold",
  ].join("\n");
  const rules = findViolations(".github/workflows/apex.yml", workflow).map(
    (item) => item.rule,
  );
  expect(rules).toContain("apex-pages-project");
  expect(rules).toContain("pages-or-workers-deploy");
  expect(rules).toContain("static-site-upload");
  expect(rules).toContain("production-environment");
});

it("fails closed when DNS would be created for the agency or client host", () => {
  const terraform = readFileSync(join(root, "infra/staging/https.tf"), "utf8");
  expect(findViolations("infra/staging/https.tf", terraform)).toEqual([]);
  for (const host of [
    "agency.beaconandbold.com",
    "clients.beaconandbold.com",
  ]) {
    const rules = findViolations(
      "infra/staging/https.tf",
      `${terraform}\nname = "${host}"\n`,
    ).map((item) => item.host);
    expect(rules).toContain(host);
  }
  const compose = readFileSync(join(root, "infra/vps/compose.yaml"), "utf8");
  expect(findViolations("infra/vps/compose.yaml", compose)).toEqual([]);
  expect(
    findViolations(
      "infra/vps/compose.yaml",
      `${compose}\nHost(\`clients.beaconandbold.com\`)`,
    ).some((item) => item.rule === "forbidden-dns-host"),
  ).toBe(true);
});

it("keeps existing staging hosts and does not treat them as the public apex", () => {
  const staging = [
    "https://staging.beaconandbold.com/health",
    "https://app.staging.beaconandbold.com",
    "https://web.staging.beaconandbold.com",
    "https://api.beaconandbold.com",
  ].join("\n");
  expect(findViolations("scripts/deploy-staging.mjs", staging)).toEqual([]);
  expect(
    findViolations("docs-not-scanned.yml", "https://beaconandbold.com/").some(
      (item) => item.rule === "apex-host",
    ),
  ).toBe(true);
  expect(
    findViolations(
      "wrangler.toml",
      'name = "beaconandbold"\npages_build_output_dir = "site"',
    ).some((item) => item.rule === "apex-pages-project"),
  ).toBe(true);
});

it("scans package scripts only, so an origin string in a description is not DNS", () => {
  const raw = JSON.stringify({
    name: "@example/agency",
    description: "Origin https://agency.beaconandbold.com is not a DNS record",
    scripts: { dev: "next dev --port 3010" },
  });
  expect(
    findViolations(
      "apps/agency/package.json",
      deployManifestText("apps/agency/package.json", raw),
    ),
  ).toEqual([]);
  const deploying = JSON.stringify({
    scripts: { deploy: "wrangler pages deploy site" },
  });
  expect(
    findViolations(
      "package.json",
      deployManifestText("package.json", deploying),
    ).map((item) => item.rule),
  ).toEqual(
    expect.arrayContaining(["pages-or-workers-deploy", "static-site-upload"]),
  );
});

it("refuses production, staging, and remote data before a preview starts", () => {
  expect(() => previewEnvironment({ APP_ENV: "production" })).toThrow(
    "APP_ENV=production",
  );
  expect(() => previewEnvironment({ APP_ENV: "staging" })).toThrow(
    "APP_ENV=staging",
  );
  expect(() => previewEnvironment({ SERVICE_MODE: "live" })).toThrow(
    "SERVICE_MODE=live",
  );
  expect(() =>
    previewEnvironment({
      DATABASE_URL: "postgres://user:pass@db.example.com:5432/beacon",
    }),
  ).toThrow("remote DATABASE_URL");
  expect(() =>
    previewEnvironment({ PUBLIC_API_URL: "https://beaconandbold.com" }),
  ).toThrow("remote PUBLIC_API_URL");
  const env = previewEnvironment({
    PATH: "/usr/bin",
    GITHUB_TOKEN: "secret-token",
    CLOUDFLARE_API_TOKEN: "cf-token",
    DATABASE_URL: "postgres://user:pass@127.0.0.1:15432/beacon",
    PUBLIC_API_URL: "http://127.0.0.1:3002",
  });
  expect(env.APP_ENV).toBe("development");
  expect(env.SERVICE_MODE).toBe("mock");
  expect(env.BEACON_PREVIEW).toBe("agency-shell");
  expect(env.BEACON_PRODUCTION).toBe("false");
  expect(env.DATABASE_URL).toContain("127.0.0.1");
  expect(env.GITHUB_TOKEN).toBeUndefined();
  expect(env.CLOUDFLARE_API_TOKEN).toBeUndefined();
  expect(JSON.stringify(env)).not.toContain("beaconandbold.com");
});

it("waits for apps/agency and does not invent a shell", async () => {
  const directory = mkdtempSync(join(tmpdir(), "agency-preview-empty-"));
  try {
    expect(planAgencyPreview(directory)).toMatchObject({
      ready: false,
      surface: "agency-shell",
      production: false,
      apexDeploy: false,
      dnsChanges: false,
      clientsDashboard: false,
      packageDir: "apps/agency",
      packageName: null,
    });
    const spawnImpl = () => {
      throw new Error("spawned");
    };
    await expect(
      serveAgencyPreview({ root: directory, spawnImpl }),
    ).resolves.toMatchObject({
      ready: false,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("plans only the agency shell that is in this checkout", () => {
  const plan = planAgencyPreview(root);
  expect(plan).toMatchObject({
    ready: true,
    surface: "agency-shell",
    production: false,
    packageName: "@roaswell/agency",
  });
  const commands = previewCommands(readAgencyPackage(root));
  expect(commands).toEqual({
    port: 3004,
    build: ["pnpm", "--filter", "@roaswell/agency", "build"],
    run: [
      "pnpm",
      "--filter",
      "@roaswell/agency",
      "exec",
      "next",
      "start",
      "--port",
      "3004",
      "--hostname",
      "127.0.0.1",
    ],
  });
  expect(commands.build?.join(" ")).not.toContain("@roaswell/api");
  expect(commands.run.join(" ")).not.toContain("@roaswell/api");
});

it("builds and starts only the agency package", async () => {
  const directory = mkdtempSync(join(tmpdir(), "agency-preview-"));
  mkdirSync(join(directory, "apps", "agency"), { recursive: true });
  writeFileSync(
    join(directory, "apps", "agency", "package.json"),
    JSON.stringify({
      name: "@example/agency",
      scripts: { build: "next build", start: "next start --port 3010" },
    }),
  );
  const seen: { argv: string[]; preview?: string }[] = [];
  try {
    await expect(
      serveAgencyPreview({
        root: directory,
        env: { PATH: process.env.PATH ?? "", GITHUB_TOKEN: "nope" },
        spawnImpl: async (argv, options) => {
          seen.push({
            argv,
            preview: options.env.BEACON_PREVIEW,
          });
          throw new Error("stop-before-network");
        },
      }),
    ).rejects.toThrow("stop-before-network");
    expect(seen[0]).toEqual({
      argv: ["pnpm", "--filter", "@example/agency", "build"],
      preview: "agency-shell",
    });
    expect(
      previewCommands({
        name: "@example/agency",
        scripts: { dev: "next dev" },
      }),
    ).toMatchObject({
      port: 3010,
      build: null,
      run: [
        "pnpm",
        "--filter",
        "@example/agency",
        "exec",
        "next",
        "dev",
        "--port",
        "3010",
        "--hostname",
        "127.0.0.1",
      ],
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("marks loopback responses as a non-production agency preview", async () => {
  const origin = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("agency-shell");
  });
  await new Promise<void>((resolve) => origin.listen(0, "127.0.0.1", resolve));
  const address = origin.address();
  if (!address || typeof address === "string")
    throw new Error("origin missing");
  const proxy = createPreviewProxy(address.port);
  try {
    const url = await proxy.listen();
    expect(url.startsWith("http://127.0.0.1:")).toBe(true);
    const response = await fetch(url, { redirect: "manual" });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("agency-shell");
    expect(response.headers.get("x-beacon-preview")).toBe("agency-shell");
    expect(response.headers.get("x-beacon-production")).toBe("false");
    expect(response.headers.get("x-beacon-data")).toBe("local-only");
    assertPreviewLocation(302, "/catalog");
    expect(() =>
      assertPreviewLocation(302, "https://beaconandbold.com/"),
    ).toThrow("loopback");
    expect(() =>
      assertPreviewLocation(302, "https://agency.beaconandbold.com/"),
    ).toThrow("loopback");
  } finally {
    await proxy.close();
    origin.close();
  }
});

it("keeps the preview workflow on pull requests and the guard command green", async () => {
  const workflow = readFileSync(
    join(root, ".github/workflows/agency-preview.yml"),
    "utf8",
  );
  expect(workflow).toContain("pull_request");
  expect(workflow).not.toMatch(/^\s*push:/m);
  expect(workflow).not.toContain("workflow_dispatch");
  expect(workflow).not.toContain("beaconandbold.com");
  const logs: string[] = [];
  const original = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    await main(["--guard"], root);
    await main(["--plan"], root);
  } finally {
    console.log = original;
  }
  expect(logs).toContain("preview-guard: ok");
  expect(logs.some((line) => line.includes('"ready":true'))).toBe(true);
  expect(logs.join("\n")).toContain("will run apps/agency on loopback");
  expect(logs.join("\n")).toContain("production: false");
});
