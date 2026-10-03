import { spawn } from "node:child_process";
import { appendFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export const FORBIDDEN_DNS_HOSTS = [
  "agency.beaconandbold.com",
  "clients.beaconandbold.com",
];

export const PREVIEW_HEADERS = {
  "x-beacon-preview": "agency-shell",
  "x-beacon-production": "false",
  "x-beacon-data": "local-only",
  "cache-control": "no-store",
};

const SKIP_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  ".terraform",
  ".next",
  "dist",
  "migration-dist",
  ".turbo",
  "coverage",
]);

const APEX_HOST = /(?<![.\w])beaconandbold\.com/i;
const DEPLOY_COMMAND =
  /wrangler(?:\.js)?\s+pages\s+deploy|wrangler(?:\.js)?\s+deploy|\bnpx\s+wrangler|\bpnpm\s+(?:dlx\s+|exec\s+)?wrangler|cloudflare\/wrangler-action|cloudflare\/pages-action|actions\/upload-pages-artifact|actions\/deploy-pages|\bpages\s+deploy\b/i;
const PRODUCTION_ENVIRONMENT =
  /(?:^|\n)\s*environment:\s*["']?production["']?|(?:^|\n)\s*environment:\s*\n\s*name:\s*["']?production["']?|APP_ENV\s*[:=]\s*["']?production["']?/i;
const STATIC_SITE =
  /(?:\bpages\s+deploy\b|\bdirectory:\s*|\bpath:\s*)\s*["']?(?:\.\/)?(?:site|sites\/public|public-site|static-site|beaconandbold-site)(?:\/|["'\s]|$)/i;
const PAGES_PROJECT =
  /beaconandbold\.pages\.dev|project[-_ ]?name["'\s:=]+["']?beaconandbold["']?(?![\w.-])|cloudflare_pages_project[\s\S]{0,240}beaconandbold/i;
const BLOCKED_NAME =
  /TOKEN|SECRET|PASSWORD|PASSWD|PRIVATE|CREDENTIAL|AWS_|CLOUDFLARE|CF_|DATABASE_URL|REDIS_URL|API_KEY|DEPLOY_KEY|VPS_/i;
const DEPLOY_WORD = /\b(wrangler|terraform|ssh|docker|kubectl|pages|dns)\b/i;

export function findViolations(path, text) {
  const violations = [];
  const haystack = text.toLowerCase();
  for (const host of FORBIDDEN_DNS_HOSTS) {
    if (haystack.includes(host)) {
      violations.push({ path, rule: "forbidden-dns-host", host });
    }
  }
  if (APEX_HOST.test(text)) violations.push({ path, rule: "apex-host" });
  if (DEPLOY_COMMAND.test(text)) {
    violations.push({ path, rule: "pages-or-workers-deploy" });
  }
  if (PRODUCTION_ENVIRONMENT.test(text)) {
    violations.push({ path, rule: "production-environment" });
  }
  if (STATIC_SITE.test(text)) {
    violations.push({ path, rule: "static-site-upload" });
  }
  if (
    PAGES_PROJECT.test(text) ||
    (/(^|\/)wrangler\.(toml|json|jsonc)$/.test(path) &&
      /["']beaconandbold["']/.test(text))
  ) {
    violations.push({ path, rule: "apex-pages-project" });
  }
  return violations;
}

export function deployManifestText(rel, raw) {
  if (!rel.endsWith("package.json")) return raw;
  try {
    const pkg = JSON.parse(raw);
    return JSON.stringify(pkg.scripts ?? {});
  } catch {
    return raw;
  }
}

function isDeployManifest(rel) {
  if (rel.startsWith(".github/workflows/") && /\.ya?ml$/.test(rel)) return true;
  if (rel.startsWith("infra/") && /\.(tf|tfvars|ya?ml|py)$/.test(rel)) {
    return true;
  }
  if (/(^|\/)wrangler\.(toml|json|jsonc)$/.test(rel)) return true;
  if (rel === "scripts/deploy-staging.mjs") return true;
  if (/(^|\/)package\.json$/.test(rel)) return true;
  if (rel === "Dockerfile" || rel.endsWith("/Dockerfile")) return true;
  return false;
}

export function listDeployFiles(root) {
  const files = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (SKIP_DIRECTORIES.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const rel = relative(root, full);
      if (isDeployManifest(rel)) files.push(rel);
    }
  };
  walk(root);
  return files.sort();
}

export function guardDeployTree(root) {
  return listDeployFiles(root).flatMap((rel) => {
    const raw = readFileSync(join(root, rel));
    if (raw.includes(0)) return [];
    return findViolations(rel, deployManifestText(rel, raw.toString("utf8")));
  });
}

export function formatViolations(violations) {
  return violations
    .map(
      (item) =>
        `${item.path}: ${item.rule}${item.host ? ` (${item.host})` : ""}`,
    )
    .join("\n");
}

export function isLoopbackUrl(value) {
  if (value.toLowerCase().includes("beaconandbold.com")) return false;
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function previewEnvironment(source = {}) {
  if (source.APP_ENV === "production" || source.APP_ENV === "staging") {
    throw new Error(`Preview refuses APP_ENV=${source.APP_ENV}`);
  }
  if (source.SERVICE_MODE === "live") {
    throw new Error("Preview refuses SERVICE_MODE=live");
  }
  for (const key of ["DATABASE_URL", "REDIS_URL", "PUBLIC_API_URL"]) {
    const value = source[key];
    if (
      typeof value === "string" &&
      value.length > 0 &&
      !isLoopbackUrl(value)
    ) {
      throw new Error(`Preview refuses remote ${key}`);
    }
  }
  const env = {};
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== "string" || BLOCKED_NAME.test(key)) continue;
    env[key] = value;
  }
  if (
    typeof source.DATABASE_URL === "string" &&
    isLoopbackUrl(source.DATABASE_URL)
  ) {
    env.DATABASE_URL = source.DATABASE_URL;
  }
  if (typeof source.REDIS_URL === "string" && isLoopbackUrl(source.REDIS_URL)) {
    env.REDIS_URL = source.REDIS_URL;
  }
  if (
    typeof source.PUBLIC_API_URL === "string" &&
    isLoopbackUrl(source.PUBLIC_API_URL)
  ) {
    env.PUBLIC_API_URL = source.PUBLIC_API_URL;
  }
  env.APP_ENV = "development";
  env.SERVICE_MODE = "mock";
  env.AUTH_ENABLED = "false";
  env.BEACON_PREVIEW = "agency-shell";
  env.BEACON_PRODUCTION = "false";
  env.HOSTNAME = "127.0.0.1";
  return env;
}

export function readAgencyPackage(root) {
  const path = join(root, "apps", "agency", "package.json");
  if (!existsSync(path)) return null;
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  if (typeof pkg.name !== "string" || pkg.name.length === 0) {
    throw new Error("apps/agency/package.json needs a name");
  }
  return pkg;
}

export function planAgencyPreview(root) {
  const pkg = readAgencyPackage(root);
  return {
    ready: Boolean(pkg),
    surface: "agency-shell",
    production: false,
    apexDeploy: false,
    dnsChanges: false,
    clientsDashboard: false,
    data: "local-only",
    packageDir: "apps/agency",
    packageName: pkg?.name ?? null,
  };
}

export function portFromScript(script) {
  const match = script.match(/--port(?:=|\s+)(\d+)/);
  return match ? Number(match[1]) : null;
}

export function previewCommands(pkg) {
  const scriptName = pkg.scripts?.start
    ? "start"
    : pkg.scripts?.dev
      ? "dev"
      : null;
  if (!scriptName) {
    throw new Error("Agency shell package needs a start or dev script");
  }
  const port = portFromScript(pkg.scripts[scriptName]) ?? 3010;
  return {
    port,
    build: pkg.scripts?.build ? ["pnpm", "--filter", pkg.name, "build"] : null,
    run: ["pnpm", "--filter", pkg.name, scriptName],
  };
}

export function assertPreviewCommand(argv) {
  if (DEPLOY_WORD.test(argv.join(" "))) {
    throw new Error("Preview command is not a deploy");
  }
  if (argv[0] !== "pnpm" || argv[1] !== "--filter") {
    throw new Error("Preview command must use pnpm --filter");
  }
}

export function assertPreviewResponse(headers) {
  if (headers.get("x-beacon-preview") !== "agency-shell") {
    throw new Error("Preview response is missing the agency-shell marker");
  }
  if (headers.get("x-beacon-production") !== "false") {
    throw new Error("Preview response is marked as production");
  }
}

export function assertPreviewLocation(status, location) {
  if (status < 300 || status >= 400 || !location || location.startsWith("/")) {
    return;
  }
  let host = "";
  try {
    host = new URL(location).hostname.replace(/^\[|\]$/g, "");
  } catch {
    throw new Error("Preview redirect is not a local URL");
  }
  if (host !== "127.0.0.1" && host !== "localhost" && host !== "::1") {
    throw new Error("Preview redirect left loopback");
  }
}

function isFatalPreviewError(error) {
  const message = error instanceof Error ? error.message : String(error);
  return message.startsWith("Preview ");
}

export function createPreviewProxy(targetPort) {
  if (!Number.isInteger(targetPort) || targetPort < 1 || targetPort > 65535) {
    throw new Error("Preview target port must stay on loopback");
  }
  const server = createServer((request, response) => {
    if (!request.url?.startsWith("/")) {
      response.writeHead(400, PREVIEW_HEADERS);
      response.end();
      return;
    }
    const upstream = httpRequest(
      {
        hostname: "127.0.0.1",
        port: targetPort,
        path: request.url,
        method: request.method,
        headers: {
          host: `127.0.0.1:${targetPort}`,
          accept: request.headers.accept ?? "*/*",
        },
      },
      (upstreamResponse) => {
        const headers = { ...PREVIEW_HEADERS };
        const location = upstreamResponse.headers.location;
        if (typeof location === "string") headers.location = location;
        const type = upstreamResponse.headers["content-type"];
        if (typeof type === "string") headers["content-type"] = type;
        response.writeHead(upstreamResponse.statusCode ?? 502, headers);
        upstreamResponse.pipe(response);
      },
    );
    upstream.on("error", () => {
      if (!response.headersSent) response.writeHead(502, PREVIEW_HEADERS);
      response.end();
    });
    request.pipe(upstream);
  });
  return {
    listen() {
      return new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          const address = server.address();
          if (!address || typeof address === "string") {
            reject(new Error("Preview proxy did not bind loopback"));
            return;
          }
          resolve(`http://127.0.0.1:${address.port}/`);
        });
      });
    },
    close() {
      return new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

export async function waitForPreview(url, child, fetchImpl, timeoutMs = 90000) {
  const started = Date.now();
  let lastError = "Preview did not respond";
  while (Date.now() - started < timeoutMs) {
    if (
      child?.exitCode !== null &&
      child?.exitCode !== undefined &&
      child.exitCode !== 0
    ) {
      throw new Error(`Preview process exited ${child.exitCode}`);
    }
    try {
      const response = await fetchImpl(url, { redirect: "manual" });
      assertPreviewLocation(response.status, response.headers.get("location"));
      if (response.status < 500) {
        assertPreviewResponse(response.headers);
        return {
          status: response.status,
          headers: {
            "x-beacon-preview": response.headers.get("x-beacon-preview"),
            "x-beacon-production": response.headers.get("x-beacon-production"),
            "x-beacon-data": response.headers.get("x-beacon-data"),
          },
        };
      }
      lastError = `Preview status ${response.status}`;
    } catch (error) {
      if (isFatalPreviewError(error)) throw error;
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(lastError);
}

function defaultSpawn(argv, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(argv[0], argv.slice(1), {
      cwd: options.cwd,
      env: options.env,
      stdio: "inherit",
      detached: options.detached === true,
    });
    child.on("error", reject);
    if (options.detached) {
      resolve(child);
      return;
    }
    child.on("exit", (code) => {
      if (code === 0) resolve(child);
      else reject(new Error(`${argv.join(" ")} exited ${code}`));
    });
  });
}

export async function stopChild(child) {
  if (!child || child.exitCode !== null) return;
  try {
    if (child.pid) process.kill(-child.pid, "SIGTERM");
    else child.kill("SIGTERM");
  } catch {
    try {
      child.kill("SIGTERM");
    } catch {
      // The preview process has already stopped.
    }
  }
}

export async function serveAgencyPreview({
  root,
  env = process.env,
  spawnImpl = defaultSpawn,
  fetchImpl = fetch,
} = {}) {
  const violations = guardDeployTree(root);
  if (violations.length > 0) throw new Error(formatViolations(violations));
  const plan = planAgencyPreview(root);
  if (!plan.ready) return plan;
  const childEnv = previewEnvironment(env);
  const commands = previewCommands(readAgencyPackage(root));
  if (commands.build) assertPreviewCommand(commands.build);
  assertPreviewCommand(commands.run);
  const runEnv = {
    ...childEnv,
    PORT: String(commands.port),
    HOSTNAME: "127.0.0.1",
  };
  let child;
  let proxy;
  try {
    if (commands.build) {
      await spawnImpl(commands.build, {
        cwd: root,
        env: runEnv,
        detached: false,
      });
    }
    child = await spawnImpl(commands.run, {
      cwd: root,
      env: runEnv,
      detached: true,
    });
    proxy = createPreviewProxy(commands.port);
    const url = await proxy.listen();
    const checked = await waitForPreview(url, child, fetchImpl);
    return {
      ...plan,
      url,
      status: checked.status,
      headers: checked.headers,
      production: false,
      catalogServerStarted: false,
    };
  } finally {
    if (proxy) await proxy.close();
    if (child) await stopChild(child);
  }
}

function printPlan(plan) {
  console.log(JSON.stringify(plan));
  if (plan.ready) {
    console.log("Agency shell preview will run apps/agency on loopback.");
    console.log("production: false");
    return;
  }
  console.log("Agency shell preview is armed and waiting.");
  console.log("apps/agency/package.json is not in this checkout.");
  console.log("No substitute shell was started.");
  console.log(
    "No apex deploy, DNS record, or production data access was performed.",
  );
}

function writeGitHubOutput(plan) {
  if (!process.env.GITHUB_OUTPUT) return;
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `ready=${plan.ready ? "true" : "false"}\n`,
  );
}

export async function main(argv = process.argv.slice(2), root = process.cwd()) {
  const command = argv[0] ?? "--all";
  if (command === "--guard") {
    const violations = guardDeployTree(root);
    if (violations.length > 0) throw new Error(formatViolations(violations));
    console.log("preview-guard: ok");
    return;
  }
  if (command === "--plan") {
    const plan = planAgencyPreview(root);
    printPlan(plan);
    writeGitHubOutput(plan);
    return;
  }
  if (command === "--serve" || command === "--all") {
    if (command === "--all") {
      const violations = guardDeployTree(root);
      if (violations.length > 0) throw new Error(formatViolations(violations));
      const plan = planAgencyPreview(root);
      printPlan(plan);
      writeGitHubOutput(plan);
      if (!plan.ready) return;
    }
    const result = await serveAgencyPreview({ root });
    if (!result.ready) {
      printPlan(result);
      return;
    }
    console.log(JSON.stringify(result));
    console.log(`production: ${result.production}`);
    console.log(`catalogServerStarted: ${result.catalogServerStarted}`);
    console.log(`x-beacon-preview: ${result.headers["x-beacon-preview"]}`);
    console.log(
      `x-beacon-production: ${result.headers["x-beacon-production"]}`,
    );
    console.log(`x-beacon-data: ${result.headers["x-beacon-data"]}`);
    return;
  }
  throw new Error("Use --guard, --plan, --serve, or no argument");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
