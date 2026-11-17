import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../lib/server/db";
import { createAssetForUser, createOrganizationForUser } from "../lib/server/tenant-data";
import { setTenantContext } from "../lib/server/tenant-context";

if (!process.env.DATABASE_URL?.includes("tokentiva_test")) {
  throw new Error("DATABASE_URL de pruebas inválida.");
}
let orgA="",orgB="",assetId="";
const userA="rls-user-a",userB="rls-user-b";

before(async () => {
  orgA=(await createOrganizationForUser(userA,"Empresa RLS A")).id;
  orgB=(await createOrganizationForUser(userB,"Empresa RLS B")).id;
  const asset=await createAssetForUser(userA,orgA,"Activo sensible test","other",500000);
  assert.ok(asset);
  assetId=asset.id;
});
after(async () => {
  if(orgA) await pool.query("DELETE FROM organizations WHERE id=$1",[orgA]);
  if(orgB) await pool.query("DELETE FROM organizations WHERE id=$1",[orgB]);
  await pool.end();
});

test("la conexión de tests no es superusuario ni BYPASSRLS",async()=>{
  const {rows}=await pool.query<{rolsuper:boolean;rolbypassrls:boolean}>(
    "SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname = current_user"
  );
  assert.equal(rows[0].rolsuper,false);
  assert.equal(rows[0].rolbypassrls,false);
});

test("sin contexto de organización RLS deniega la consulta incluso con SQL directo",async()=>{
  const {rows}=await pool.query<{id:string}>("SELECT id FROM assets WHERE id=$1",[assetId]);
  assert.deepEqual(rows,[]);
});

test("el contexto de otra organización no revela ni modifica el activo",async()=>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await setTenantContext(client,orgB);
    assert.equal((await client.query("SELECT id FROM assets WHERE id=$1",[assetId])).rowCount,0);
    assert.equal((await client.query("UPDATE assets SET status='internal_review' WHERE id=$1 RETURNING id",[assetId])).rowCount,0);
    assert.equal((await client.query("DELETE FROM assets WHERE id=$1 RETURNING id",[assetId])).rowCount,0);
    await client.query("COMMIT");
  }catch(err){await client.query("ROLLBACK");throw err;}
  finally{client.release();}
});

test("el contexto correcto permite leer el activo pero no filtra por usuario: la autorización sigue en SQL",async()=>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await setTenantContext(client,orgA);
    const {rows}=await client.query<{id:string}>("SELECT id FROM assets WHERE id=$1",[assetId]);
    assert.equal(rows[0]?.id,assetId);
    await client.query("COMMIT");
  }catch(err){await client.query("ROLLBACK");throw err;}
  finally{client.release();}
});
