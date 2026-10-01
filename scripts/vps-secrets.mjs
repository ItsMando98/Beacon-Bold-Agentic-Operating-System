import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const directory = resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Secret directory required");
await mkdir(directory, { recursive: true, mode: 0o700 });
try {
  await access(join(directory, "owner_password"));
  throw new Error("Existing secrets must not be overwritten");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const create = async (name, value) =>
  writeFile(join(directory, name), value, { mode: 0o444, flag: "wx" });
const owner = randomBytes(32).toString("base64url");
const app = randomBytes(32).toString("base64url");
const redis = randomBytes(32).toString("base64url");
await create("owner_password", owner);
await create("app_password", app);
await create(
  "database_url",
  `postgresql://beacon_app:${app}@localhost/beacon?host=/var/run/postgresql`,
);
await create("redis_password", redis);
await create("redis_url", `rediss://default:${redis}@redis:6379`);
const certificate = spawnSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:3072",
    "-nodes",
    "-sha256",
    "-days",
    "365",
    "-subj",
    "/CN=redis",
    "-addext",
    "subjectAltName=DNS:redis,DNS:localhost",
    "-keyout",
    join(directory, "redis_key"),
    "-out",
    join(directory, "redis_cert"),
  ],
  { stdio: "ignore" },
);
if (certificate.status !== 0)
  throw new Error("TLS certificate creation failed");
const { readFile, chmod } = await import("node:fs/promises");
await chmod(join(directory, "redis_key"), 0o444);
await create("redis_ca", await readFile(join(directory, "redis_cert")));
await create(
  "redis_config",
  `port 0\ntls-port 6379\ntls-cert-file /run/secrets/redis_cert\ntls-key-file /run/secrets/redis_key\ntls-ca-cert-file /run/secrets/redis_ca\ntls-auth-clients no\nrequirepass ${redis}\nappendonly yes\nmaxmemory 128mb\nmaxmemory-policy allkeys-lru\n`,
);
console.log("VPS secret files created without disclosure");
