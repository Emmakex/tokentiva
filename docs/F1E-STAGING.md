# Tokentiva — F1e: staging reproducible y recuperación

**Estado: código preparado. Aún no instalado en un servidor ni validado con servicios reales.**

## Arquitectura

- **Caddy**: único servicio con puertos publicados, 80/443 (HTTPS automático).
- **Next.js**: imagen Docker standalone, usuario no root; solo puerto interno 3000.
- **PostgreSQL 16**: volumen persistente y sin puertos publicados, usuario `tokentiva_admin` para migraciones y `tokentiva_app` para la aplicación (sin privilegios superuser ni BYPASSRLS).
- **ClamAV**: imagen oficial y base de firmas persistente, accesible solo desde la red privada; tiene acceso saliente a Internet para renovar firmas, pero **no** publica el puerto TCP 3310.
- **Migrator**: servicio de un solo uso, ejecutado a mano, que migra Better Auth y el dominio y provisiona el usuario runtime.
- La contraseña y la clave para documentos se suministran por variables de entorno, **nunca en Git**.

**Capacidad:** ClamAV recomienda al menos 3 GiB y preferentemente 4 GiB para su propio contenedor. Reserva al menos 6–8 GiB de RAM para staging, según la carga y el sistema operativo. No reutilices las bases de datos ni los contenedores de otros productos.

Fuentes: [Docker Next.js](https://docs.docker.com/guides/nextjs/), [ClamAV oficial](https://docs.clamav.net/manual/Installing/Docker.html), [Better Auth Security](https://better-auth.com/docs/reference/security).

## Preparación previa

Se necesita un servidor Linux con Docker Engine + Compose, dominio propio apuntado al servidor, puertos 80/443 disponibles y buzón SMTP de pruebas. El dominio **no se ha elegido ni configurado desde este repositorio**.

```bash
git clone https://github.com/Emmakex/tokentiva.git
cd tokentiva
cp deploy/.env.staging.example deploy/.env.staging
chmod 600 deploy/.env.staging

openssl rand -hex 24       # generar DOS contraseñas distintas de PostgreSQL
openssl rand -base64 48    # BETTER_AUTH_SECRET
openssl rand -base64 32    # TOKENTIVA_DOCS_KEY_B64
```

Editar `deploy/.env.staging` para poner dominio real, las 2 claves PostgreSQL, secretos, SMTP, clave documental. Todos los secretos deben guardarse además en un gestor de secretos protegido. No copiar el archivo a tickets, chats, PRs ni logs.

La URL interna de PostgreSQL se construye desde las contraseñas de la plantilla: utiliza **solo caracteres hexadecimales** para las contraseñas SQL y no uses caracteres reservados en ellas. DNS debe resolver al servidor y no debe existir un proxy de autenticación ajeno entre Caddy y Next.js.

**Importante:** `deploy/.env.staging` es para staging únicamente. No reutilizarlo en producción.

## Despliegue inicial

Todos los comandos se ejecutan desde la raíz del repositorio. Antes de habilitar subidas, mantener `TOKENTIVA_DOCUMENT_UPLOADS_ENABLED=false`.

```bash
set -a
source deploy/.env.staging
set +a
node scripts/check-staging-config.mjs

docker compose --env-file deploy/.env.staging -f deploy/staging.compose.yml config --quiet
docker compose --env-file deploy/.env.staging -f deploy/staging.compose.yml build app migrator
docker compose --env-file deploy/.env.staging -f deploy/staging.compose.yml up -d postgres clamav
# ClamAV tarda en cargar y actualizar firmas; inspecciona "docker compose ps".
docker compose --env-file deploy/.env.staging -f deploy/staging.compose.yml run --rm migrator
```

Después, **solo si la base de datos está vacía**, crear el primer propietario usando el CLI offline (no expone un endpoint de administrador):

```bash
docker compose --env-file deploy/.env.staging -f deploy/staging.compose.yml \
  run --rm \
  -e TOKENTIVA_BOOTSTRAP_EMAIL=responsable@tu-dominio.es \
  -e TOKENTIVA_BOOTSTRAP_ORG="Empresa piloto" \
  migrator node scripts/bootstrap-owner.mjs
```

Guardar el código en privado (se muestra una sola vez y caduca en 24 h). El propietario usa `https://TU_DOMINIO/invite` para registrar su cuenta, verifica el correo mediante SMTP, configura TOTP en `/security` y acepta su código desde el panel.

Luego:

```bash
docker compose --env-file deploy/.env.staging -f deploy/staging.compose.yml up -d app proxy
TOKENTIVA_STAGING_URL=https://TU_DOMINIO node scripts/staging-smoke.mjs
```

**No ejecutar bootstrap en una base con empresas reales o ya configurada.** El script rechaza cualquier ejecución cuando existen organizaciones.

## Documentos y antivirus

Subidas cerradas por defecto. Solo tras comprobar SMTP, TOTP, aislamiento, el escáner real y backups restaurados podrá habilitarse `TOKENTIVA_DOCUMENT_UPLOADS_ENABLED=true` para pruebas con archivos **ficticios**. Ver [F1D](F1D.md).

ClamAV puede requerir varios minutos tras el arranque; si su servicio está caído, la aplicación deniega subidas. Nunca abrir 3310 al exterior. Es imprescindible comprobar con archivo limpio y con un patrón de prueba de laboratorio EICAR, aislado y sin difundir material sospechoso.

## Backup cifrado y recuperación

El repositorio incluye `scripts/backup-staging.sh` y `scripts/restore-drill-staging.sh`.

Se requiere instalar **age** en el servidor y crear una identidad age **fuera del host público**, guardada por el responsable del proyecto. En el servidor se almacena **solo la clave pública age** `TOKENTIVA_BACKUP_AGE_RECIPIENT`.

```bash
set -a
source deploy/.env.staging
set +a
bash scripts/backup-staging.sh
bash scripts/restore-drill-staging.sh backups/<archivo>.dump.age /ruta-privada/identidad-age.txt
```

La restauración usa una base temporal llamada `tokentiva_restore_drill` y la borra después de validar tablas y RLS. **No modifica la base `tokentiva` en servicio.** No ejecutes una restauración de producción sobre staging sin una revisión específica.

El backup contiene el **ciphertext**, no la clave AES. Por tanto, guarda `TOKENTIVA_DOCS_KEY_B64` en un almacén de secretos distinto. Para confirmar recuperabilidad completa, verifica que puedas descifrar un documento ficticio restaurado usando esa clave.

Define una política de backup automático, cifrado, retención y restauración en el operador de infraestructura. CI prueba `pg_dump/pg_restore`, pero **no demuestra que exista una copia externa recuperable**.

## Validación y cierre

- [ ] DNS y HTTPS públicos validados.
- [ ] PostgreSQL runtime sin superuser/BYPASSRLS; RLS en activos y documentos.
- [ ] ClamAV real actualizado, diagnóstico limpio y rechazo de prueba EICAR.
- [ ] SMTP real, verificación de correo, login y TOTP.
- [ ] Invitación owner inicial y colaborador (sin alta abierta).
- [ ] Usuario B no puede leer ni descargar documentos de A.
- [ ] Backup age off-site restaurado con clave de documentos.
- [ ] Pruebas de escritorio/móvil, logs, monitorización, RGPD y gestión de incidentes.

Hasta completar estas comprobaciones la versión sigue siendo **alfa**, no beta apta para clientes. Sin emisión de tokens, custodia, operaciones financieras ni pagos de inversión.

**Copyright © 2026 Eduardo Yauri — Todos los derechos reservados.**
