#!/usr/bin/env bash
# Verifica que un backup cifrado pueda restaurarse sin modificar la base en servicio.
# Requiere age, Docker Compose y la identidad age de recuperación en un lugar seguro.
set -euo pipefail
[[ $# -eq 2 ]] || { echo "Usage: scripts/restore-drill-staging.sh <file.dump.age> <age-identity-file>" >&2; exit 2; }
backup="$1"
identity="$2"
[[ -s "$backup" && -r "$identity" ]] || { echo "Backup or identity missing" >&2; exit 1; }
command -v age >/dev/null || { echo "age CLI is required" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker CLI is required" >&2; exit 1; }

compose=(docker compose --env-file deploy/.env.staging -f deploy/staging.compose.yml)
db="tokentiva_restore_drill"
# No borrar una base que ya existiera: una ejecución anterior debe revisarse primero.
if "${compose[@]}" exec -T postgres sh -c 'psql -U "$POSTGRES_USER" -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname='"'"'tokentiva_restore_drill'"'"'"' | grep -q 1'; then
  echo "Restore drill DB already exists; refusing to overwrite." >&2
  exit 1
fi

"${compose[@]}" exec -T postgres sh -c 'createdb -U "$POSTGRES_USER" tokentiva_restore_drill'
cleanup() {
  "${compose[@]}" exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" --if-exists tokentiva_restore_drill' || true
}
trap cleanup EXIT
age --decrypt -i "$identity" "$backup" |
  "${compose[@]}" exec -T postgres sh -c \
    'pg_restore -U "$POSTGRES_USER" -d tokentiva_restore_drill --no-owner --no-acl'
"${compose[@]}" exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d tokentiva_restore_drill -Atqc "SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE relname='"'"'asset_documents'"'"'" | grep -qx t'
"${compose[@]}" exec -T postgres sh -c \
  'psql -U "$POSTGRES_USER" -d tokentiva_restore_drill -Atqc "SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('"'"'assets'"'"','"'"'asset_documents'"'"','"'"'organization_invitations'"'"')" | grep -qx 3'
echo "TOKENTIVA_STAGING_RESTORE_DRILL_OK"
echo "Check document decryption separately using the backed-up TOKENTIVA_DOCS_KEY_B64."
