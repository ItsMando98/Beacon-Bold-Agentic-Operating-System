import { readFile } from "node:fs/promises";
import { Client } from "pg";
import { migrate } from "../packages/db/migrate.mjs";

async function main() {
  let client;
  try {
    client = new Client({
      ssl:
        process.env.APP_ENV === "staging"
          ? {
              ca: await readFile(process.env.PGSSLROOTCERT, "utf8"),
              rejectUnauthorized: true,
            }
          : undefined,
      connectionTimeoutMillis: 10000,
      statement_timeout: 60000,
    });
    if (!process.env.DB_APP_PASSWORD)
      throw new Error("DB_APP_PASSWORD is required");
    await client.connect();
    await migrate(client, "packages/db/migrations");
    // PostgreSQL format(%L) safely quotes the password; never log SQL or parameters.
    const result = await client.query(
      "SELECT format('ALTER ROLE beacon_app LOGIN PASSWORD %L', $1::text) AS sql",
      [process.env.DB_APP_PASSWORD],
    );
    await client.query(result.rows[0].sql);
    console.log("Foundation migration succeeded");
  } catch {
    // Driver errors can contain connection details; redact all external diagnostics.
    console.error("Foundation migration failed; inspect database privately");
    process.exitCode = 1;
  } finally {
    await client?.end();
  }
}
main();
