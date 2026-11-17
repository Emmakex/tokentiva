import { readFile } from "node:fs/promises";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL obligatorio para migrar.");
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  const sql = await readFile(new URL("../db/migrations/001_domain.sql", import.meta.url), "utf8");
  await pool.query(sql);
  console.log("TOKENTIVA_DOMAIN_MIGRATION_OK");
} finally {
  await pool.end();
}
