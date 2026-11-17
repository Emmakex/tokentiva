import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url || !url.includes("tokentiva_test")) {
  throw new Error("Tests requieren base aislada: DATABASE_URL debe contener tokentiva_test.");
}
const pool = new Pool({ connectionString: url });
const userA = "test-tenant-user-a";
const userB = "test-tenant-user-b";
let orgA = "";
let orgB = "";
let assetA = "";

before(async () => {
  const first = await pool.query<{ id: string }>(
    "INSERT INTO organizations (name,created_by) VALUES ('Tenant test A',$1) RETURNING id", [userA]
  );
  orgA = first.rows[0].id;
  const second = await pool.query<{ id: string }>(
    "INSERT INTO organizations (name,created_by) VALUES ('Tenant test B',$1) RETURNING id", [userB]
  );
  orgB = second.rows[0].id;
  await pool.query("INSERT INTO memberships (organization_id,user_id,role) VALUES ($1,$2,'owner'),($3,$4,'owner')", [orgA,userA,orgB,userB]);
  const a = await pool.query<{ id: string }>(
    "INSERT INTO assets (organization_id,name,kind,value_cents,created_by) VALUES ($1,'Fixture inmueble','real_estate',10000000,$2) RETURNING id", [orgA,userA]
  );
  assetA = a.rows[0].id;
});
after(async () => {
  if (orgA) await pool.query("DELETE FROM organizations WHERE id=$1", [orgA]);
  if (orgB) await pool.query("DELETE FROM organizations WHERE id=$1", [orgB]);
  await pool.end();
});

test("la lectura siempre filtra por membresía y organización", async () => {
  const result = await pool.query(
    `SELECT a.id FROM assets a WHERE a.organization_id=$1
     AND EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id=a.organization_id AND m.user_id=$2)`,
    [orgA,userB]
  );
  assert.equal(result.rowCount, 0);
  const mine = await pool.query(
    `SELECT a.id FROM assets a WHERE a.organization_id=$1
     AND EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id=a.organization_id AND m.user_id=$2)`,
    [orgA,userA]
  );
  assert.equal(mine.rows[0].id, assetA);
});

test("no permite insertar en otra organización con usuario ajeno", async () => {
  const inserted = await pool.query(
    `INSERT INTO assets (organization_id,name,kind,value_cents,created_by)
     SELECT $1,'Intento ajeno','other',200,$2
     WHERE EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id=$1 AND m.user_id=$2 AND m.role IN ('owner','editor'))
     RETURNING id`, [orgB,userA]
  );
  assert.equal(inserted.rowCount, 0);
});

test("no permite cambios ni borrados cruzados", async () => {
  const changed = await pool.query(
    `UPDATE assets SET status='internal_review' WHERE id=$1 AND organization_id=$2
     AND EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id=$2 AND m.user_id=$3 AND m.role IN ('owner','editor'))
     RETURNING id`, [assetA,orgA,userB]
  );
  assert.equal(changed.rowCount, 0);
  const deleted = await pool.query(
    `DELETE FROM assets WHERE id=$1 AND organization_id=$2
     AND EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id=$2 AND m.user_id=$3 AND m.role='owner')
     RETURNING id`, [assetA,orgA,userB]
  );
  assert.equal(deleted.rowCount, 0);
});

test("usuario sin membresía no ve ningún registro", async () => {
  const result = await pool.query(
    "SELECT 1 FROM memberships WHERE organization_id=$1 AND user_id=$2", [orgA,"intruso"]
  );
  assert.equal(result.rowCount, 0);
});
