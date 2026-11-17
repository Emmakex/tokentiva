#!/bin/sh
set -eu

: "${DATABASE_URL:?Missing DATABASE_URL}"
: "${TOKENTIVA_DB_APP_PASSWORD:?Missing TOKENTIVA_DB_APP_PASSWORD}"
: "${BETTER_AUTH_SECRET:?Missing BETTER_AUTH_SECRET}"
: "${BETTER_AUTH_URL:?Missing BETTER_AUTH_URL}"

# El contenedor migrator NO debe ejecutar el servidor Next.js, ni alojar secretos en Git.
./node_modules/.bin/auth migrate --yes
node scripts/migrate-domain.mjs
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -v "app_password=${TOKENTIVA_DB_APP_PASSWORD}" -f scripts/provision-runtime-role.sql
echo TOKENTIVA_STAGING_MIGRATIONS_OK
