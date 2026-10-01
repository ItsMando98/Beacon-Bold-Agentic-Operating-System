import { tenantContextSchema } from "@roaswell/schemas";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type {
  NodePgDatabase,
  NodePgTransaction,
} from "drizzle-orm/node-postgres";
import type { models } from "./models.js";

export type TenantTransaction = NodePgTransaction<
  typeof models,
  ExtractTablesWithRelations<typeof models>
>;

/** Caller must resolve an authenticated tenant in P1-4; never accept a request's tenant unchecked. */
export async function withTenant<T>(
  database: NodePgDatabase<typeof models>,
  tenantId: string,
  operation: (transaction: TenantTransaction) => Promise<T>,
): Promise<T> {
  const context = tenantContextSchema.parse({ tenantId });
  return database.transaction(async (transaction) => {
    const role = await transaction.execute<{
      rolsuper: boolean;
      rolbypassrls: boolean;
      current_user: string;
    }>(
      sql`SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
    );
    if (
      role.rows[0]?.current_user !== "beacon_app" ||
      role.rows[0].rolsuper ||
      role.rows[0].rolbypassrls
    ) {
      throw new Error(
        "Tenant operations require the restricted beacon_app role",
      );
    }
    await transaction.execute(
      sql`SELECT set_config('app.tenant_id', ${context.tenantId}, true)`,
    );
    return operation(transaction);
  });
}
