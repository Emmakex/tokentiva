import type { PoolClient } from "pg";

/**
 * La variable dura únicamente hasta COMMIT/ROLLBACK.
 * IMPORTANTE: usar SIEMPRE dentro de una transacción BEGIN en la misma conexión.
 * Nunca usar SET de sesión con conexiones reutilizadas.
 */
export async function setTenantContext(client: PoolClient, organizationId: string): Promise<void> {
  await client.query("SELECT set_config('app.organization_id', $1, true)", [organizationId]);
}
