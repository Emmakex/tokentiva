import { readFile } from "node:fs/promises";
import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL obligatorio para migrar.");
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  for (const filename of ["001_domain.sql", "002_invites.sql"]) {
    const sql = await readFile(new URL("../db/migrations/" + filename, import.meta.url), "utf8");
    await pool.query(sql);
  }
  console.log("TOKENTIVA_DOMAIN_MIGRATIONS_OK");
} finally {
  await pool.end();
}
