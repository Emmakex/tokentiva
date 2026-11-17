import { pool } from "@/lib/server/db";

export type AssetKind = "real_estate" | "business_financing" | "energy" | "other";
export type AssetStatus = "draft" | "internal_review";
export type MemberRole = "owner" | "editor" | "viewer";

export type StoredAsset = {
  id: string;
  organization_id: string;
  name: string;
  kind: AssetKind;
  value_cents: string;
  status: AssetStatus;
  created_at: Date;
};

export async function listOrganizationsForUser(userId: string) {
  const { rows } = await pool.query<{ id: string; name: string; role: MemberRole }>(
    `SELECT o.id, o.name, m.role FROM organizations o
     JOIN memberships m ON m.organization_id = o.id
     WHERE m.user_id = $1 ORDER BY o.created_at DESC`,
    [userId]
  );
  return rows;
}

export async function createOrganizationForUser(userId: string, name: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{ id: string; name: string }>(
      "INSERT INTO organizations (name, created_by) VALUES ($1, $2) RETURNING id, name",
      [name, userId]
    );
    const org = result.rows[0];
    await client.query(
      "INSERT INTO memberships (organization_id, user_id, role) VALUES ($1, $2, 'owner')",
      [org.id, userId]
    );
    await client.query(
      "INSERT INTO audit_events (organization_id, actor_user_id, action, subject_id) VALUES ($1, $2, 'organization.created', $3)",
      [org.id, userId, org.id]
    );
    await client.query("COMMIT");
    return { ...org, role: "owner" as const };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAssetsForUser(userId: string, orgId: string): Promise<StoredAsset[] | null> {
  const membership = await pool.query(
    "SELECT 1 FROM memberships WHERE organization_id=$1 AND user_id=$2",
    [orgId, userId]
  );
  if (!membership.rowCount) return null;
  const { rows } = await pool.query<StoredAsset>(
    `SELECT a.id, a.organization_id, a.name, a.kind, a.value_cents, a.status, a.created_at
     FROM assets a WHERE a.organization_id = $1
     AND EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id=a.organization_id AND m.user_id=$2)
     ORDER BY a.created_at DESC LIMIT 100`,
    [orgId, userId]
  );
  return rows;
}

export async function createAssetForUser(
  userId: string, orgId: string, name: string, kind: AssetKind, valueCents: number
): Promise<StoredAsset | null> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<StoredAsset>(
      `INSERT INTO assets (organization_id, name, kind, value_cents, created_by)
       SELECT $1, $2, $3, $4, $5
       WHERE EXISTS (
         SELECT 1 FROM memberships m WHERE m.organization_id=$1
           AND m.user_id=$5 AND m.role IN ('owner','editor')
       )
       RETURNING id, organization_id, name, kind, value_cents, status, created_at`,
      [orgId, name, kind, valueCents, userId]
    );
    if (!rows.length) { await client.query("ROLLBACK"); return null; }
    await client.query(
      "INSERT INTO audit_events (organization_id, actor_user_id, action, subject_id) VALUES ($1,$2,'asset.created',$3)",
      [orgId, userId, rows[0].id]
    );
    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function updateAssetStatusForUser(userId: string, orgId: string, assetId: string, status: AssetStatus) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<StoredAsset>(
      `UPDATE assets SET status=$4, updated_at=now()
       WHERE organization_id=$1 AND id=$2
         AND EXISTS (
           SELECT 1 FROM memberships m WHERE m.organization_id=$1
             AND m.user_id=$3 AND m.role IN ('owner','editor')
         )
       RETURNING id, organization_id, name, kind, value_cents, status, created_at`,
      [orgId, assetId, userId, status]
    );
    if (!rows.length) { await client.query("ROLLBACK"); return null; }
    await client.query(
      "INSERT INTO audit_events (organization_id, actor_user_id, action, subject_id) VALUES ($1,$2,$3,$4)",
      [orgId, userId, "asset.status."+status, assetId]
    );
    await client.query("COMMIT");
    return rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}

export async function deleteAssetForUser(userId: string, orgId: string, assetId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const deleted = await client.query(
      `DELETE FROM assets WHERE organization_id=$1 AND id=$2
       AND EXISTS (
         SELECT 1 FROM memberships m WHERE m.organization_id=$1
           AND m.user_id=$3 AND m.role='owner'
       ) RETURNING id`,
      [orgId, assetId, userId]
    );
    if (!deleted.rowCount) { await client.query("ROLLBACK"); return false; }
    await client.query(
      "INSERT INTO audit_events (organization_id, actor_user_id, action, subject_id) VALUES ($1,$2,'asset.deleted',$3)",
      [orgId, userId, assetId]
    );
    await client.query("COMMIT");
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}
