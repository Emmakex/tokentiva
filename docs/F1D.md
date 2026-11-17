# Tokentiva F1d — documentos privados y staging

**Estado:** código integrado en una rama de desarrollo. No equivale a una instalación staging ni a autorización para datos sensibles.

## Decisión pragmática para la beta

Se utiliza PostgreSQL 16 para documentos pequeños **hasta 1 MiB**, evitando desplegar todavía un servicio de almacenamiento independiente. El campo `ciphertext` contiene bytes cifrados por aplicación con **AES-256-GCM**, nonce de 96 bits aleatorio, etiqueta de autenticación de 128 bits y AAD vinculada al ID de empresa, activo y documento. Se almacena además SHA-256 del contenido original para comprobar integridad.

- Formatos admitidos: PDF, PNG y JPEG; se verifican firmas mágicas y MIME declarado.
- Máximo de 20 documentos por activo y 1 MiB por documento; no usarlo para grandes volúmenes.
- RLS `ENABLE + FORCE` sobre `asset_documents` por ID de empresa y transacciones con contexto local.
- Además de RLS: alta solo `owner/editor`, descarga `owner/editor/viewer`, eliminación solo `owner`. Todos requieren correo verificado y TOTP.
- Descarga `application/octet-stream`, como adjunto, con `nosniff`, no-store y CSP sandbox.
- Eventos de auditoría al crear y borrar. No existe papelera ni versiones.
- Los secretos de cifrado **solo** en el entorno de ejecución, nunca en GitHub.

## Puerta de habilitación fail-closed

`TOKENTIVA_DOCUMENT_UPLOADS_ENABLED=false` por defecto.

Para habilitar se requieren:

1. Clave `TOKENTIVA_DOCS_KEY_B64` generada con `openssl rand -base64 32`, conservada mediante gestor de secretos y **respaldada de forma segura fuera de la base de datos**. Perder la clave implica perder el acceso a documentos.
2. Servicio **ClamAV clamd** operativo y actualizado, accesible por loopback o nombre de servicio privado `clamav`. Nunca publicar el puerto 3310 en Internet.
3. `TOKENTIVA_CLAMD_HOST` y `TOKENTIVA_CLAMD_PORT=3310`. El escaneo usa `zINSTREAM\0`; solo una respuesta exacta de limpieza permite almacenar. Timeouts, antivirus caído, detecciones y errores **rechazan la subida**.
4. Cambiar `TOKENTIVA_DOCUMENT_UPLOADS_ENABLED=true` solo después de validar el escaneo real y preparar copia/restauración de BD y clave.
5. Ejecutar la migración 004 con rol administrador de migraciones, y aplicar permisos al usuario runtime `NOSUPERUSER NOBYPASSRLS` **después** de migrar. Verificar en CI y staging.

La disponibilidad declarada en el frontend solo indica configuración básica: no sustituye un health check de ClamAV. Si falla el servicio, el endpoint rechaza la subida.

## Preparación de staging — pendiente de credenciales y recursos

- Instancia independiente del entorno de otros productos; configuración de secretos por entorno.
- Dominio de staging HTTPS, TLS vigente, `BETTER_AUTH_URL` exacto e invitaciones restringidas.
- PostgreSQL 16, usuario DDL separado del runtime, conexiones cifradas donde corresponda.
- SMTP controlado para verificación de correo, sin enviar pruebas a clientes reales.
- ClamAV privado y actualizado, verificación práctica con EICAR de laboratorio y archivo limpio.
- Copias de seguridad cifradas de PostgreSQL; recuperar en una base de ensayo y validar documentos con clave resguardada.
- Pruebas manuales del flujo registro invitado → verificación email → TOTP → organizaciones → permisos → subir, descargar y eliminar.
- Evaluación RGPD, retención, borrado, prevención de malware, logging y respuesta a incidentes antes de permitir documentación real.
- Revisar CPU/RAM y crecimiento de base de datos; migrar a objeto privado S3 compatible cuando sea necesario.

## Tests CI

- Pruebas de aislamiento de datos con rol PostgreSQL no privilegiado.
- Lecturas/borrados de documentos denegados para otras organizaciones.
- Cifrado AES-GCM, manipulación de ciphertext y AAD.
- Validación de MIME, longitud y formatos.
- Simulación del protocolo `clamd INSTREAM` limpio/infectado **sin un antivirus real**.
- Compilación y comprobación TypeScript.

**Limitaciones:** no se ha probado aún un escaneo ClamAV real, backups, recuperación ni pruebas completas E2E de navegador. No subir documentos reales de identidad o financiación.

## Copyright

© 2026 Eduardo Yauri. Todos los derechos reservados. El repositorio público continúa sujeto a licencia propietaria.
