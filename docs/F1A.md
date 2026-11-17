# F1a — Persistencia y aislamiento por empresa

## Entregado en código

- Autenticación mediante Better Auth + PostgreSQL con contraseña hash gestionada por la librería.
- Registro público **desactivado por defecto** (variables de entorno; apertura temporal solo para creación inicial controlada).
- Espacio `/workspace` protegido en servidor con sesión real.
- Organizaciones y membresías: roles `owner`, `editor`, `viewer`.
- Inventario persistente por organización con operaciones de lectura, alta, revisión interna y eliminación.
- Comprobación server-side de membresía y rol en **todas** las rutas de activos; acceso a otro tenant retorna 404.
- Auditoría de creación de organización, creación/cambio/borrado de activo en transacciones SQL.
- Tests sobre base PostgreSQL aislada que verifican acceso y mutaciones cruzadas prohibidas.
- Se conserva `/demo` como demostración anónima sin backend.

## Configuración local

```bash
cp .env.example .env.local
# Configurar DATABASE_URL, BETTER_AUTH_URL y BETTER_AUTH_SECRET (seguro).
npm install
# Crear tablas de autenticación en base con Better Auth CLI:
npx auth@1.7.25 migrate --yes
# Crear tablas de dominio Tokentiva:
npm run db:domain:migrate
npm run dev
```

Para dar de alta el **primer usuario**, poner temporalmente `TOKENTIVA_SIGNUP_ENABLED=true` y `NEXT_PUBLIC_TOKENTIVA_SIGNUP_ENABLED=true`; crear la cuenta en `/login`, y **volver a false** y reiniciar/recompilar. Esto es solo bootstrap de desarrollo: en producción implementar invitaciones verificadas y MFA obligatorio.

Las rutas de API dependen de cookies de sesión válidas de Better Auth; ningún ID de usuario enviado por el cliente se utiliza como autoridad.

## Pendiente para cerrar F1 completo

- MFA TOTP y flujo formal de invitaciones.
- Verificación de correo y recuperación de contraseña mediante proveedor de email.
- Política de seguridad completa: RLS en PostgreSQL como segunda barrera, límites de tasa por ruta y pruebas de pentest.
- Control de eliminación/exportación de datos, ciclo de vida del usuario, respaldos y restauración probados.
- Gestión de operaciones y documentos privados cifrados.
- Pruebas de navegador y pruebas integradas de login real.
- Ambiente staging y secretos de despliegue.

**No usar aún con documentos sensibles, datos KYC, operaciones ni dinero real.**
