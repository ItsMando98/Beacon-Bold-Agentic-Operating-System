import { Connection } from "@temporalio/client";
import { Client } from "pg";
import { createClient } from "redis";
import { describe, expect, it } from "vitest";

describe("local infrastructure", () => {
  it("enables pgvector and uses a role that cannot bypass tenant policies", async () => {
    const client = new Client({
      connectionString:
        process.env.DATABASE_URL ??
        "postgresql://beacon_app:local-development-only@127.0.0.1:15432/beacon",
      connectionTimeoutMillis: 5000,
    });
    await client.connect();
    try {
      const extension = await client.query(
        "SELECT extname FROM pg_extension WHERE extname='vector'",
      );
      expect(extension.rows).toHaveLength(1);
      const role = await client.query(
        "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user",
      );
      expect(role.rows[0]).toEqual({ rolsuper: false, rolbypassrls: false });
    } finally {
      await client.end();
    }
  });
  it("responds to Redis PING", async () => {
    const client = createClient({
      url: process.env.REDIS_URL ?? "redis://127.0.0.1:16379",
      socket: { connectTimeout: 5000, reconnectStrategy: false },
    });
    client.on("error", () => {});
    await client.connect();
    try {
      expect(await client.ping()).toBe("PONG");
    } finally {
      await client.close();
    }
  });
  it("connects to Temporal and lists namespaces", async () => {
    const connection = await Connection.connect({
      address: process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:17233",
      connectTimeout: "5s",
    });
    try {
      const namespaces = await connection.workflowService.listNamespaces({});
      expect(
        namespaces.namespaces?.some(
          (item) => item.namespaceInfo?.name === "default",
        ),
      ).toBe(true);
    } finally {
      await connection.close();
    }
  });
  it("serves Mailpit readiness", async () => {
    const response = await fetch(
      process.env.MAILPIT_URL ?? "http://127.0.0.1:18025/readyz",
      { signal: AbortSignal.timeout(5000) },
    );
    expect(response.ok).toBe(true);
  });
});
