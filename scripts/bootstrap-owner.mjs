/**
 * Bootstrap excepcional de staging: ejecutable solo mediante el contenedor migrator
 * con credenciales de DDL. Genera una única invitación owner de 24 horas y no
 * admite reaperturas ni registros públicos.
 */
import { createHash, randomBytes } from "node:crypto";
import { Pool } from "pg";

const email = process.env.TOKENTIVA_BOOTSTRAP_EMAIL?.trim().toLowerCase();
const name = process.env.TOKENTIVA_BOOTSTRAP_ORG?.trim();
const url = process.env.DATABASE_URL;

if (!url || !email || !name ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    name.length < 3 || name.length > 120) {
  console.error("Required: DATABASE_URL, TOKENTIVA_BOOTSTRAP_EMAIL, TOKENTIVA_BOOTSTRAP_ORG");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(851724, 1)");
  const existing = await client.query("SELECT 1 FROM organizations LIMIT 1");
  if (existing.rowCount) throw new Error("Bootstrap prohibited: an organization already exists.");
  const org = await client.query(
    "INSERT INTO organizations(name,created_by) VALUES($1,'staging-bootstrap') RETURNING id",
    [name]
  );
  const code = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(code).digest("hex");
  await client.query(
    `INSERT INTO organization_invitations
      (organization_id,email,role,token_hash,created_by,expires_at)
      VALUES($1,$2,'owner',$3,'staging-bootstrap',now()+interval '24 hours')`,
    [org.rows[0].id, email, tokenHash]
  );
  await client.query("COMMIT");
  console.log("TOKENTIVA_BOOTSTRAP_CREATED");
  console.log("Email: " + email);
  console.log("Invitation code (save privately, only displayed once): " + code);
  console.log("Expires in 24 hours. Use /invite, verify email, configure MFA, and accept code.");
} catch (err) {
  await client.query("ROLLBACK");
  console.error(err instanceof Error ? err.message : "Bootstrap failed");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
