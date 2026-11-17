import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../lib/server/db";
import {
  createOrganizationForUser, createAssetForUser, listAssetsForUser,
  updateAssetStatusForUser, deleteAssetForUser
} from "../lib/server/tenant-data";

if (!process.env.DATABASE_URL?.includes("tokentiva_test")) {
  throw new Error("Los tests solo pueden ejecutarse contra una base tokentiva_test.");
}

const userA = "test-tenant-a";
const userB = "test-tenant-b";
const viewer = "test-viewer";
let orgA = "";
let orgB = "";
let assetA = "";

before(async () => {
  orgA = (await createOrganizationForUser(userA, "Organización A test")).id;
  orgB = (await createOrganizationForUser(userB, "Organización B test")).id;
  const asset = await createAssetForUser(userA, orgA, "Activo de A", "real_estate", 10000000);
  assert.ok(asset);
  assetA = asset.id;
  await pool.query("INSERT INTO memberships (organization_id,user_id,role) VALUES ($1,$2,'viewer')", [orgA, viewer]);
});
after(async () => {
  if (orgA) await pool.query("DELETE FROM organizations WHERE id=$1", [orgA]);
  if (orgB) await pool.query("DELETE FROM organizations WHERE id=$1", [orgB]);
  await pool.end();
});

test("la lectura del servicio no revela activos entre organizaciones", async () => {
  assert.equal(await listAssetsForUser(userB, orgA), null);
  assert.deepEqual(await listAssetsForUser(userB, orgB), []);
  const own = await listAssetsForUser(userA, orgA);
  assert.equal(own?.[0].id, assetA);
});

test("el servicio rechaza creación, cambio y borrado entre tenants", async () => {
  const created = await createAssetForUser(userB, orgA, "Otro activo", "other", 200);
  assert.equal(created, null);
  assert.equal(await updateAssetStatusForUser(userB, orgA, assetA, "internal_review"), null);
  assert.equal(await deleteAssetForUser(userB, orgA, assetA), false);
});

test("el rol viewer puede consultar pero no cambiar ni borrar activos", async () => {
  const read = await listAssetsForUser(viewer, orgA);
  assert.equal(read?.length, 1);
  assert.equal(await createAssetForUser(viewer, orgA, "Activo viewer", "other", 200), null);
  assert.equal(await updateAssetStatusForUser(viewer, orgA, assetA, "internal_review"), null);
  assert.equal(await deleteAssetForUser(viewer, orgA, assetA), false);
});

test("owner puede cambiar estado y se registra un evento de auditoría", async () => {
  const changed = await updateAssetStatusForUser(userA, orgA, assetA, "internal_review");
  assert.equal(changed?.status, "internal_review");
  const audit = await pool.query<{ action: string }>(
    "SELECT action FROM audit_events WHERE organization_id=$1 AND subject_id=$2 ORDER BY created_at DESC",
    [orgA, assetA]
  );
  assert.ok(audit.rows.some(row => row.action === "asset.status.internal_review"));
});
