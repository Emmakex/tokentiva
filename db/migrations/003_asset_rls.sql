-- F1c: Row-Level Security en inventario de activos.
-- Ejecutar con rol de migraciones, no con el usuario runtime.
-- Este cambio es deny-by-default cuando no existe contexto de organización.
BEGIN;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS assets_by_organization ON assets;
CREATE POLICY assets_by_organization ON assets
  FOR ALL
  USING (
    organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid
  )
  WITH CHECK (
    organization_id = NULLIF(current_setting('app.organization_id', true), '')::uuid
  );
COMMIT;
