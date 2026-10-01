import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export async function migrate(client, directory) {
  // Session lock serializes deploys; each migration commits independently.
  await client.query("SELECT pg_advisory_lock(7070001)");
  try {
    await client.query("CREATE SCHEMA IF NOT EXISTS beacon_meta");
    await client.query(`CREATE TABLE IF NOT EXISTS beacon_meta.migrations (
      name text PRIMARY KEY, checksum text NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`);
    const names = (await readdir(directory))
      .filter((name) => /^\d{4}_[a-z_]+\.sql$/.test(name))
      .sort();
    const applied = await client.query(
      "SELECT name, checksum FROM beacon_meta.migrations ORDER BY name",
    );
    if (applied.rows.some((row) => !names.includes(row.name)))
      throw new Error("Applied migration missing from release");
    for (const name of names) {
      const sql = await readFile(join(directory, name), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const previous = applied.rows.find((row) => row.name === name);
      if (previous) {
        if (previous.checksum !== checksum)
          throw new Error("Applied migration changed; add a forward migration");
        continue;
      }
      if (applied.rows.some((row) => row.name > name))
        throw new Error("Out-of-order migration refused");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO beacon_meta.migrations(name,checksum) VALUES ($1,$2)",
          [name, checksum],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock(7070001)");
  }
}
