import { Pool } from "pg";

declare global {
  // Evita múltiples pools en desarrollo durante hot reload.
  // eslint-disable-next-line no-var
  var tokentivaPool: Pool | undefined;
}

export const pool = globalThis.tokentivaPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});
if (process.env.NODE_ENV !== "production") globalThis.tokentivaPool = pool;
