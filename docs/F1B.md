# F1b — Segundo factor y acceso por invitación

**Versión 0.3 alfa — no apta para clientes ni operaciones financieras reales.**

## Incluido en esta entrega

- Mejoras en autenticación Better Auth: TOTP + códigos de recuperación, con sesión completada solo tras desafío cuando está habilitado.
- Requisito para acceder a `/workspace` y a sus endpoints: correo verificado y TOTP activo.
- Pantalla `/security` para configurar TOTP y descargar/guardar códigos de recuperación.
- Pantalla `/two-factor` para resolver los desafíos de inicio de sesión.
- Correo verificado mediante envío SMTP configurable; si faltan secretos, no es posible verificar nuevos usuarios.
- Invitaciones owner → editor/viewer con token aleatorio de 256 bits, hash SHA-256 en PostgreSQL, expiración de 7 días, consumo único y revocación.
- Para aceptar una invitación, el usuario ya debe tener **cuenta propia** y **correo verificado** idéntico al destinatario, además de TOTP activado.
- Generación de códigos por el owner (mostrados solo una vez), comunicación manual por canal privado; todavía no se envían invitaciones por correo.
- Validación explícita de Origin para mutaciones, y pruebas del servicio de invitaciones con base PostgreSQL separada.

## Desarrollo / despliegue

1. Configurar `DATABASE_URL`, `BETTER_AUTH_URL` y `BETTER_AUTH_SECRET` por entorno.
2. Configurar `TOKENTIVA_SMTP_HOST`, `TOKENTIVA_SMTP_PORT`, `TOKENTIVA_SMTP_USER`, `TOKENTIVA_SMTP_PASSWORD`, `TOKENTIVA_SMTP_FROM` (valores solo en entorno, nunca en Git).
3. Ejecutar `npm install`, `npx auth@1.7.25 migrate --yes` y `npm run db:domain:migrate`.
4. En **desarrollo local exclusivamente**, habilitar temporalmente `TOKENTIVA_SIGNUP_ENABLED=true` y `NEXT_PUBLIC_TOKENTIVA_SIGNUP_ENABLED=true`; dar de alta cuentas, confirmar correo por SMTP, deshabilitar registro y reiniciar/recompilar.
5. El usuario inicia sesión, configura TOTP en `/security`, guarda códigos de recuperación y accede a `/workspace`.
6. Un propietario crea una invitación y comparte el código de manera privada. El usuario ya provisionado inicia sesión y acepta el código desde su panel.

## Limitaciones explícitas

- No hay registro autónomo **por invitación**: las cuentas invitadas deben aprovisionarse primero desde el bootstrap controlado. Abrir el registro globalmente en producción está prohibido.
- No hay MFA obligatorio para métodos de autenticación diferentes de email + contraseña porque no existen otros métodos activos.
- No hay almacenamiento de documentos privados (archivos) ni KYC. Ninguna pantalla admite documentación personal sensible.
- No hay RLS de PostgreSQL como defensa adicional ni auditoría operativa anti-tampering aún.
- No hay prueba E2E del navegador, flujo de correo real ni pentest. El CI únicamente valida migraciones, servicios y build.
- No hay emisiones de tokens, inversionistas, negociación, custodia ni pagos.

## Próxima revisión

1. Onboarding por invitación con aprovisionamiento seguro sin abrir el registro público.
2. MFA y validación de correos con proveedor SMTP real en staging.
3. RLS/roles de base de datos y prueba de aislamiento en contexto API.
4. Documentos cifrados y almacenados en bucket privado, respaldos y RGPD.
