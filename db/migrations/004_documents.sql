-- F1d: documentación pequeña en PostgreSQL, cifrada a nivel de aplicación.
-- La tabla fuerza RLS incluso al propietario. Los roles runtime deben ser NOBYPASSRLS.
BEGIN;
CREATE TABLE IF NOT EXISTS asset_documents (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  file_name VARCHAR(120) NOT NULL,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('application/pdf','image/png','image/jpeg')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes BETWEEN 1 AND 1048576),
  sha256 CHAR(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  iv BYTEA NOT NULL CHECK (octet_length(iv) = 12),
  auth_tag BYTEA NOT NULL CHECK (octet_length(auth_tag) = 16),
  ciphertext BYTEA NOT NULL CHECK (octet_length(ciphertext) = size_bytes),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_asset_docs_org_asset_created
  ON asset_documents(organization_id, asset_id, created_at DESC);
ALTER TABLE asset_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE asset_documents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS documents_by_org ON asset_documents;
CREATE POLICY documents_by_org ON asset_documents FOR ALL
  USING (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid)
  WITH CHECK (organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid);
COMMIT;
