# Tokentiva F1c — alta invitada y protección PostgreSQL (parcial)

## Incorporado

### Alta por invitación

- `/invite` permite crear un usuario sin abrir un registro público.
- El hook **before** de Better Auth rechaza toda petición `/sign-up/email` que no incluya un código de invitación válido para el mismo correo.
- El código se envía en `X-Tokentiva-Invitation` y solo se almacena como hash SHA-256.
- No basta con registrarse: se exige verificar el correo, activar TOTP y consumir el código en `/workspace`.
- Códigos caducados, revocados, consumidos o dirigidos a otro correo no permiten darse de alta.
- `TOKENTIVA_SIGNUP_ENABLED=true` solo omite el hook cuando `NODE_ENV !== "production"`, para bootstrap **local**. En despliegues no se permite el registro abierto.

El propietario aún distribuye manualmente el código por canal privado. No se envían invitaciones automáticas ni se ofrecen inversiones.

### PostgreSQL RLS — inventario de activos

- Migración `003_asset_rls.sql` activa **ENABLE + FORCE ROW LEVEL SECURITY** sobre `assets`.
- Filtro `organization_id` deniega todo acceso sin `app.organization_id`.
- El acceso se realiza en transacciones `BEGIN ... COMMIT/ROLLBACK`, fijando `app.organization_id` con `set_config(..., true)` (transacción local).
- Se mantiene además la comprobación explícita de membresía y permisos por usuario en SQL: RLS no reemplaza la autorización de la aplicación.
- CI ejecuta pruebas de lectura, escritura y borrado con rol PostgreSQL **NOSUPERUSER NOBYPASSRLS**, diferente del rol de migraciones.
- **Limitación**: RLS todavía no cubre `organizations`, `memberships`, `organization_invitations` ni `audit_events`. No declarar aún aislamiento completo por RLS.

### Operaciones deshabilitadas

No hay tokens reales, custodia, inversión, pagos, mercado secundario ni carga de documentos personales.

## Instalación y roles de base de datos

Las migraciones deberán ejecutarse con un rol autorizado para DDL. La aplicación deberá usar otro rol de PostgreSQL sin SUPERUSER ni BYPASSRLS, con permisos mínimos. No utilices el usuario propietario/superusuario de PostgreSQL como runtime.

```bash
npm install
npx auth@1.7.25 migrate --yes  # conectar con usuario de migraciones
npm run db:domain:migrate        # 001, 002, 003 con usuario de migraciones
# Crear y conceder permisos mínimos al usuario de runtime con el DBA.
# Configurar el DATABASE_URL del runtime con ese usuario restringido.
npm run dev
```

Para probar el aislamiento, CI crea un rol de pruebas restringido. El entorno real necesita privilegios diferenciados y una prueba de acceso cruzado equivalente.

## Almacenamiento documental: contrato y pendientes

No implementamos cargas de archivo sin antes seleccionar almacenamiento privado y controles de seguridad. Para el siguiente cambio:

1. Bucket privado con acceso exclusivamente servidor y cifrado en reposo.
2. Registros `Document` vinculados obligatoriamente a organización + activo; políticas de acceso y metadatos.
3. Límites de tamaño y MIME verificados en servidor, escaneo antimalware antes de marcar un archivo como disponible.
4. Descarga autenticada con permisos comprobados por organización, enlaces temporales de corta vida y sin URLs públicas persistentes.
5. Políticas de eliminación/retención, logs sin datos sensibles y backup con recuperación comprobada.
6. Pruebas de archivos cruzados por tenant y fugas de permisos.

Hasta entonces: **no cargar DNIs, datos bancarios, documentación de inversión o documentos de clientes reales**.

## No declarado terminado

- Envío automatizado de invitaciones.
- Gestión de eliminación de usuarios, recuperación de acceso y administración de MFA.
- RLS sobre el resto de entidades multiempresa.
- Documentos privados, backups y restauración real.
- Pruebas completas en navegador y SMTP real.
- Pentest externo y cumplimiento RGPD/servicios financieros.

El repositorio es público, pero permanece bajo copyright © 2026 Eduardo Yauri.
