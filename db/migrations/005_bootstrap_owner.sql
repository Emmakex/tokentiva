-- F1e: habilitar exclusivamente invitación owner generada por el CLI offline de bootstrap.
-- El endpoint normal de invitaciones solo permite editor/viewer.
BEGIN;
ALTER TABLE organization_invitations
  DROP CONSTRAINT IF EXISTS organization_invitations_role_check;
ALTER TABLE organization_invitations
  ADD CONSTRAINT organization_invitations_role_check
  CHECK (role IN ('owner','editor','viewer'));
COMMIT;
