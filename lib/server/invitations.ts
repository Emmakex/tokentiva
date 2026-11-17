import { createHash, randomBytes } from "node:crypto";
import { pool } from "@/lib/server/db";

export type InvitationRole = "editor" | "viewer";
export const INVITATION_MAX_DAYS = 7;
const sha = (token: string) => createHash("sha256").update(token, "utf8").digest("hex");

export function normalizeEmail(email: string): string | null {
  const value = email.trim().toLowerCase();
  if (value.length < 3 || value.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return null;
  return value;
}

export async function createInvitation(
  ownerId: string, orgId: string, email: string, role: InvitationRole
): Promise<{ code: string; id: string; expiresAt: string } | null> {
  const code = randomBytes(32).toString("base64url");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Evita que un cliente abra un número ilimitado de invitaciones activas.
    const roleResult = await client.query(
      "SELECT 1 FROM memberships WHERE organization_id=$1 AND user_id=$2 AND role='owner'",
      [orgId, ownerId]
    );
    if (!roleResult.rowCount) { await client.query("ROLLBACK"); return null; }
    const active = await client.query<{count: string}>(
      `SELECT count(*)::text AS count FROM organization_invitations
       WHERE organization_id=$1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now()`,
      [orgId]
    );
    if (Number(active.rows[0].count) >= 10) { await client.query("ROLLBACK"); return null; }
    const inserted = await client.query<{id:string;expires_at:Date}>(
      `INSERT INTO organization_invitations (organization_id,email,role,token_hash,created_by,expires_at)
       VALUES ($1,$2,$3,$4,$5,now() + INTERVAL '7 days') RETURNING id,expires_at`,
      [orgId, email, role, sha(code), ownerId]
    );
    await client.query(
      "INSERT INTO audit_events (organization_id,actor_user_id,action,subject_id) VALUES($1,$2,'invitation.created',$3)",
      [orgId, ownerId, inserted.rows[0].id]
    );
    await client.query("COMMIT");
    return { id: inserted.rows[0].id, code, expiresAt: inserted.rows[0].expires_at.toISOString() };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally { client.release(); }
}

export async function listInvitations(ownerId: string, orgId: string) {
  const { rows } = await pool.query<{id:string;email:string;role:InvitationRole;expires_at:Date}>(
    `SELECT i.id,i.email,i.role,i.expires_at
     FROM organization_invitations i
     WHERE i.organization_id=$1 AND i.consumed_at IS NULL AND i.revoked_at IS NULL
       AND i.expires_at > now() AND EXISTS (
        SELECT 1 FROM memberships m WHERE m.organization_id=i.organization_id
          AND m.user_id=$2 AND m.role='owner'
       ) ORDER BY i.created_at DESC LIMIT 20`,
    [orgId, ownerId]
  );
  return rows;
}

export async function revokeInvitation(ownerId:string,orgId:string,id:string):Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `UPDATE organization_invitations i SET revoked_at=now()
       WHERE i.id=$3 AND i.organization_id=$1 AND i.consumed_at IS NULL AND i.revoked_at IS NULL
         AND EXISTS(SELECT 1 FROM memberships m WHERE m.organization_id=$1 AND m.user_id=$2 AND m.role='owner')
       RETURNING i.id`,[orgId,ownerId,id]
    );
    if (!result.rowCount) { await client.query("ROLLBACK"); return false; }
    await client.query(
      "INSERT INTO audit_events (organization_id,actor_user_id,action,subject_id) VALUES($1,$2,'invitation.revoked',$3)",
      [orgId,ownerId,id]
    );
    await client.query("COMMIT");
    return true;
  } catch(err) { await client.query("ROLLBACK"); throw err; }
  finally { client.release(); }
}

export async function acceptInvitation(
  userId: string, email: string, emailVerified: boolean, code: string
): Promise<"accepted" | "rejected" | "already_member"> {
  if (!emailVerified || !/^[A-Za-z0-9_-]{43}$/.test(code)) return "rejected";
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const invitation = await client.query<{
      id:string;organization_id:string;email:string;role:InvitationRole
    }>(
      `SELECT id,organization_id,email,role FROM organization_invitations
       WHERE token_hash=$1 AND consumed_at IS NULL AND revoked_at IS NULL
         AND expires_at>now() FOR UPDATE`,
      [sha(code)]
    );
    const target = invitation.rows[0];
    if (!target || target.email !== normalizeEmail(email)) {
      await client.query("ROLLBACK"); return "rejected";
    }
    const member = await client.query(
      "SELECT 1 FROM memberships WHERE organization_id=$1 AND user_id=$2",
      [target.organization_id,userId]
    );
    if (member.rowCount) { await client.query("ROLLBACK"); return "already_member"; }
    await client.query(
      "INSERT INTO memberships (organization_id,user_id,role) VALUES($1,$2,$3)",
      [target.organization_id,userId,target.role]
    );
    await client.query("UPDATE organization_invitations SET consumed_at=now() WHERE id=$1",[target.id]);
    await client.query(
      "INSERT INTO audit_events (organization_id,actor_user_id,action,subject_id) VALUES ($1,$2,'invitation.accepted',$3)",
      [target.organization_id,userId,target.id]
    );
    await client.query("COMMIT");
    return "accepted";
  } catch(err) { await client.query("ROLLBACK"); throw err; }
  finally { client.release(); }
}
