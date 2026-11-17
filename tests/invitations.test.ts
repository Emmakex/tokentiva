import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../lib/server/db";
import { createOrganizationForUser } from "../lib/server/tenant-data";
import { acceptInvitation,createInvitation,listInvitations,normalizeEmail,revokeInvitation } from "../lib/server/invitations";

if (!process.env.DATABASE_URL?.includes("tokentiva_test")) throw new Error("Solo base tokentiva_test");
const owner="test-invite-owner";
const other="test-invite-other";
const invited="test-invite-target";
const verifiedEmail="destinatario@example.org";
let orgA="";
let orgB="";
before(async()=>{
  orgA=(await createOrganizationForUser(owner,"Organización invites A")).id;
  orgB=(await createOrganizationForUser(other,"Organización invites B")).id;
});
after(async()=>{
  if(orgA) await pool.query("DELETE FROM organizations WHERE id=$1",[orgA]);
  if(orgB) await pool.query("DELETE FROM organizations WHERE id=$1",[orgB]);
  await pool.end();
});

test("normaliza emails y rechaza los inválidos",()=>{
  assert.equal(normalizeEmail("  Test@EXAMPLE.ORG  "),"test@example.org");
  assert.equal(normalizeEmail("no-es-email"),null);
});

test("solo un owner puede emitir códigos y listar invitaciones",async()=>{
  const denied=await createInvitation(other,orgA,verifiedEmail,"viewer");
  assert.equal(denied,null);
  const generated=await createInvitation(owner,orgA,verifiedEmail,"editor");
  assert.ok(generated);
  assert.equal(generated.code.length,43);
  const active=await listInvitations(owner,orgA);
  assert.equal(active.some(i=>i.id===generated.id),true);
  assert.deepEqual(await listInvitations(other,orgA),[]);
  const stored=await pool.query<{token_hash:string}>(
    "SELECT token_hash FROM organization_invitations WHERE id=$1",[generated.id]
  );
  assert.ok(stored.rows[0].token_hash!==generated.code);
  assert.equal(stored.rows[0].token_hash.length,64);
  assert.equal(await revokeInvitation(other,orgA,generated.id),false);
  assert.equal(await revokeInvitation(owner,orgA,generated.id),true);
  assert.equal(await acceptInvitation(invited,verifiedEmail,true,generated.code),"rejected");
});

test("rechaza email incorrecto, correo no verificado, expiración y reutilización",async()=>{
  const generated=await createInvitation(owner,orgA,verifiedEmail,"viewer");
  assert.ok(generated);
  assert.equal(await acceptInvitation(invited,verifiedEmail,false,generated.code),"rejected");
  assert.equal(await acceptInvitation(invited,"other@example.org",true,generated.code),"rejected");
  assert.equal(await acceptInvitation(invited,verifiedEmail,true,generated.code),"accepted");
  assert.equal(await acceptInvitation("intruso",verifiedEmail,true,generated.code),"rejected");
  const membership=await pool.query<{role:string}>(
    "SELECT role FROM memberships WHERE user_id=$1 AND organization_id=$2",[invited,orgA]
  );
  assert.equal(membership.rows[0].role,"viewer");
  const otherOrg=await pool.query(
    "SELECT 1 FROM memberships WHERE user_id=$1 AND organization_id=$2",[invited,orgB]
  );
  assert.equal(otherOrg.rowCount,0);
  const expired=await createInvitation(owner,orgA,"expired@example.org","viewer");
  assert.ok(expired);
  await pool.query("UPDATE organization_invitations SET expires_at=now()-interval '1 minute' WHERE id=$1",[expired.id]);
  assert.equal(await acceptInvitation("new", "expired@example.org", true, expired.code),"rejected");
});
