#!/usr/bin/env bash
# Backup de PostgreSQL cifrado inmediatamente con age. Ejecutar desde raíz del repo.
set -euo pipefail
: "${TOKENTIVA_BACKUP_AGE_RECIPIENT:?Set the age recipient public key}"
command -v age >/dev/null || { echo "age CLI is required" >&2; exit 1; }
command -v docker >/dev/null || { echo "docker CLI is required" >&2; exit 1; }
export DOCKER_CONFIG="${DOCKER_CONFIG:-$HOME/.docker}"
umask 077
mkdir -p backups
output="backups/tokentiva-staging-$(date -u +%Y%m%dT%H%M%SZ).dump.age"
temp="${output}.tmp"
trap 'rm -f "$temp"' EXIT
docker compose --env-file deploy/.env.staging -f deploy/staging.compose.yml exec -T postgres \
  sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' \
  | age -r "$TOKENTIVA_BACKUP_AGE_RECIPIENT" -o "$temp"
test -s "$temp"
mv "$temp" "$output"
trap - EXIT
echo "TOKENTIVA_BACKUP_ENCRYPTED=$output"
echo "Important: back up TOKENTIVA_DOCS_KEY_B64 separately in a secret manager."
