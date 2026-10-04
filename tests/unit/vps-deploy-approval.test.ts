import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";

const workflowPath = ".github/workflows/ci.yml";
const deployedSha = "d4da61e48bd676d34aae67ec7b05998c99457f7a";
const otherSha = "a".repeat(40);
const octoberReference =
  "founder-request-2026-10-01-existing-vps-no-new-paid-services";
const secrets = {
  VPS_HOST: "synthetic-vps.example.invalid",
  VPS_DEPLOY_KEY: "synthetic-deploy-key-not-a-credential",
  VPS_KNOWN_HOSTS: "synthetic-known-hosts-not-a-credential",
};

function jobBody(workflow: string, jobName: string) {
  const lines = workflow.split("\n");
  const nameLine = lines.indexOf(`    name: ${jobName}`);
  expect(nameLine).toBeGreaterThan(-1);
  let start = nameLine;
  while (start > 0 && !/^ {2}[A-Za-z0-9_-]+:\s*$/.test(lines[start] ?? ""))
    start -= 1;
  let end = lines.length;
  for (let index = nameLine + 1; index < lines.length; index += 1) {
    if (/^ {2}[A-Za-z0-9_-]+:\s*$/.test(lines[index] ?? "")) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

function runScripts(job: string) {
  const lines = job.split("\n");
  const scripts: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const block = lines[index]?.match(/^(\s+)run:\s+\|\s*$/);
    if (block?.[1]) {
      const indent = block[1].length;
      const body: string[] = [];
      for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
        const line = lines[cursor] ?? "";
        if (line.trim() === "") {
          body.push("");
          continue;
        }
        const current = line.match(/^ */)?.[0].length ?? 0;
        if (current <= indent) break;
        body.push(line.slice(indent + 2));
      }
      while (body.at(-1) === "") body.pop();
      scripts.push(body.join("\n"));
      continue;
    }
    const inline = lines[index]?.match(/^\s+run:\s+([^|>].*)$/);
    if (inline?.[1]) scripts.push(inline[1]);
  }
  return scripts;
}

function executeDeployJob(approvalReference: string, githubSha: string) {
  const workflow = readFileSync(workflowPath, "utf8");
  const job = jobBody(workflow, "vps-staging-deploy");
  expect(job).not.toMatch(/^[ \t]*continue-on-error\s*:/m);
  expect(job).not.toMatch(/^ {6,}if\s*:/m);
  const scripts = runScripts(job);
  expect(scripts.some((script) => script.includes("ssh "))).toBe(true);

  const home = mkdtempSync(join(tmpdir(), "vps-deploy-home-"));
  const bin = mkdtempSync(join(tmpdir(), "vps-deploy-bin-"));
  const workspace = mkdtempSync(join(tmpdir(), "vps-deploy-work-"));
  const sshLog = join(workspace, "ssh.log");
  writeFileSync(
    join(bin, "ssh"),
    `#!/bin/sh\nprintf '%s\\n' "$*" >> ${JSON.stringify(sshLog)}\nexit 0\n`,
  );
  chmodSync(join(bin, "ssh"), 0o755);
  writeFileSync(join(workspace, "runtime-images.tar.gz"), "synthetic-archive");

  let status = 0;
  let stdout = "";
  let stderr = "";
  for (const script of scripts) {
    const result = spawnSync("bash", ["-c", script], {
      cwd: workspace,
      encoding: "utf8",
      env: {
        PATH: `${bin}:${process.env.PATH ?? ""}`,
        HOME: home,
        APPROVAL_REFERENCE: approvalReference,
        GITHUB_SHA: githubSha,
        ...secrets,
      },
    });
    stdout += result.stdout ?? "";
    stderr += result.stderr ?? "";
    status = result.status ?? 1;
    if (status !== 0) break;
  }
  return {
    status,
    output: `${stdout}${stderr}`,
    sshTrace: existsSync(sshLog) ? readFileSync(sshLog, "utf8") : "",
    keyWritten: existsSync(join(home, ".ssh", "beacon_deploy")),
    knownHostsWritten: existsSync(join(home, ".ssh", "known_hosts")),
  };
}

function expectRefused(approvalReference: string, githubSha = deployedSha) {
  const result = executeDeployJob(approvalReference, githubSha);
  expect(result.sshTrace).toBe("");
  expect(result.keyWritten).toBe(false);
  expect(result.knownHostsWritten).toBe(false);
  expect(result.output).toContain(`approval does not name commit ${githubSha}`);
  expect(result.output).toContain(
    "A non-empty approval string is not authorization for this SHA.",
  );
  expect(result.output).toContain("No SSH connection was opened.");
  for (const secret of Object.values(secrets))
    expect(result.output).not.toContain(secret);
  return result;
}

it("does not deploy an unrelated SHA for a non-empty approval string", () => {
  const result = expectRefused("not-empty");
  expect(result.status).not.toBe(0);
});

it("does not deploy a new SHA for the 1 October 2026 VPS scope reference", () => {
  const result = expectRefused(octoberReference);
  expect(result.status).not.toBe(0);
  expect(result.output).toContain(octoberReference);
  expect(result.output).toContain("does not name this commit");
});

it("does not treat a different commit, a longer hex string, or uppercase as approval", () => {
  expectRefused(`founder-approval-${otherSha}`);
  expectRefused(`${deployedSha}a`);
  expectRefused(`a${deployedSha}`);
  expectRefused(`founder-approval-${deployedSha}a`);
  expectRefused(`founder-approval-a${deployedSha}`);
  expectRefused(deployedSha.toUpperCase());
});

it("does not deploy when the commit id contains a newline", () => {
  for (const githubSha of [`${deployedSha}\n`, `${deployedSha}\n.*`]) {
    for (const approvalReference of [octoberReference, "not-empty"]) {
      const result = executeDeployJob(approvalReference, githubSha);
      expect(result.status).not.toBe(0);
      expect(result.sshTrace).toBe("");
      expect(result.keyWritten).toBe(false);
      expect(result.knownHostsWritten).toBe(false);
      expect(result.output).toContain(
        "GITHUB_SHA is not a 40-character lowercase commit id.",
      );
      expect(result.output).not.toContain(githubSha);
      for (const secret of Object.values(secrets))
        expect(result.output).not.toContain(secret);
    }
  }
});

it("does not print secrets when the commit id is not a lowercase SHA", () => {
  const result = executeDeployJob(octoberReference, secrets.VPS_DEPLOY_KEY);
  expect(result.status).not.toBe(0);
  expect(result.sshTrace).toBe("");
  expect(result.keyWritten).toBe(false);
  expect(result.output).toContain(
    "GITHUB_SHA is not a 40-character lowercase commit id.",
  );
  expect(result.output).toContain("No SSH connection was opened.");
  for (const secret of Object.values(secrets))
    expect(result.output).not.toContain(secret);
});

it("opens SSH only when the approval names the exact commit", () => {
  const result = executeDeployJob(
    `founder-approval-${deployedSha}`,
    deployedSha,
  );
  expect(result.status).toBe(0);
  expect(result.sshTrace).toContain(`deploy ${deployedSha}`);
  expect(result.sshTrace).not.toContain(secrets.VPS_DEPLOY_KEY);
  expect(result.sshTrace).not.toContain(secrets.VPS_KNOWN_HOSTS);
  for (const secret of Object.values(secrets))
    expect(result.output).not.toContain(secret);
});
