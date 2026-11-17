-- Ejecutar exclusivamente con rol administrador de migraciones.
-- psql recibe app_password vía -v; nunca almacenar la contraseña en este fichero.
SELECT format(
  'CREATE ROLE tokentiva_app LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD %L',
  :'app_password'
) WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='tokentiva_app') \gexec

ALTER ROLE tokentiva_app NOSUPERUSER NOBYPASSRLS LOGIN PASSWORD :'app_password';
SELECT format('GRANT CONNECT ON DATABASE %I TO tokentiva_app', current_database()) \gexec
GRANT USAGE ON SCHEMA public TO tokentiva_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO tokentiva_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO tokentiva_app;
