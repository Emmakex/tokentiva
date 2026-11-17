-- Tokentiva F1b: invitaciones con secreto de un solo uso, guardado exclusivamente como hash.
BEGIN;
CREATE TABLE IF NOT EXISTS organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254 AND email = lower(trim(email))),
  role TEXT NOT NULL CHECK (role IN ('editor','viewer')),
  token_hash CHAR(64) NOT NULL UNIQUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS idx_org_invite_active
  ON organization_invitations(organization_id, expires_at)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;
COMMIT;
