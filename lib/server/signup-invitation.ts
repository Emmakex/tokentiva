import { createHash } from "node:crypto";
import { pool } from "@/lib/server/db";
import { normalizeEmail } from "@/lib/server/invitations";

const isToken = (code: unknown): code is string =>
  typeof code === "string" && /^[A-Za-z0-9_-]{43}$/.test(code);

export async function hasValidSignupInvitation(email: unknown, code: unknown): Promise<boolean> {
  if (typeof email !== "string" || !isToken(code)) return false;
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  const tokenHash = createHash("sha256").update(code, "utf8").digest("hex");
  const { rowCount } = await pool.query(
    `SELECT 1 FROM organization_invitations
      WHERE email=$1 AND token_hash=$2 AND consumed_at IS NULL
        AND revoked_at IS NULL AND expires_at>now() LIMIT 1`,
    [normalized, tokenHash]
  );
  return (rowCount ?? 0) > 0;
}
