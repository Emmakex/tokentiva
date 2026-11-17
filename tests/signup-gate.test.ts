import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { pool } from "../lib/server/db";
import { auth } from "../lib/auth";
import { createOrganizationForUser } from "../lib/server/tenant-data";
import { createInvitation, revokeInvitation } from "../lib/server/invitations";
import { hasValidSignupInvitation } from "../lib/server/signup-invitation";

if (!process.env.DATABASE_URL?.includes("tokentiva_test")) {
  throw new Error("DATABASE_URL de pruebas inválida.");
}
let orgId = "";
const owner = "signup-owner";
const address = "new-invite@example.org";

before(async () => {
  orgId = (await createOrganizationForUser(owner, "Organización signup tests")).id;
});
after(async () => {
  if (orgId) await pool.query("DELETE FROM organizations WHERE id=$1", [orgId]);
  await pool.end();
});

test("servicio de invitación exige código, email, vigencia y no revocación", async () => {
  assert.equal(await hasValidSignupInvitation(address, ""), false);
  assert.equal(await hasValidSignupInvitation("invalid", "a".repeat(43)), false);
  const invitation = await createInvitation(owner, orgId, address, "viewer");
  assert.ok(invitation);
  assert.equal(await hasValidSignupInvitation(address, invitation.code), true);
  assert.equal(await hasValidSignupInvitation("attacker@example.org", invitation.code), false);
  await revokeInvitation(owner, orgId, invitation.id);
  assert.equal(await hasValidSignupInvitation(address, invitation.code), false);
});

test("endpoint Better Auth no permite registro sin invitación", async () => {
  const response = await auth.handler(new Request("http://localhost:3000/api/auth/sign-up/email", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Origin": "http://localhost:3000" },
    body: JSON.stringify({name:"Intento no autorizado",email:"noinvited@example.org",password:"Password+NotInvited#2026"}),
  }));
  assert.equal(response.status, 403);
});
