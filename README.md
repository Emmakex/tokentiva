# Tokentiva

**Infraestructura B2B para preparar y gestionar operaciones de tokenización de activos reales (RWA).**

Versión **0.5.0-alpha** · Repositorio público · Licencia propietaria.

## Desarrollo

Requisitos: Node.js >= 22.12, npm, PostgreSQL 16+ y servidor SMTP para verificación de cuentas.

```bash
npm install
cp .env.example .env.local
# Configurar DATABASE_URL, BETTER_AUTH_URL, BETTER_AUTH_SECRET y SMTP.
npx auth@1.7.25 migrate --yes
npm run db:domain:migrate
npm run dev
```

- `/`: presentación comercial.
- `/demo`: demostración ficticia sin backend.
- `/login`: acceso privado; registro abierto desactivado por defecto.
- `/invite`: registro únicamente con una invitación válida.
- `/security`: configuración de autenticación TOTP.
- `/two-factor`: desafío TOTP / código de recuperación.
- `/workspace`: empresas y activos persistentes (requiere correo verificado y TOTP).

El propietario genera una invitación para un correo concreto. El invitado crea su cuenta en `/invite`, verifica el correo, configura TOTP y acepta su invitación desde el panel. No hay envío automático del código: se comparte por un canal privado.

## Documentación

- [MVP y alcance](docs/MVP.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [F1a: multiempresa y base de datos](docs/F1A.md)
- [F1b: MFA, correo e invitaciones](docs/F1B.md)
- [F1c: alta por invitación y RLS en activos](docs/F1C.md)
- [F1d: documentos cifrados y guía de staging](docs/F1D.md)
- [Puertas legales](docs/REGULATORY-GATES.md)

## Seguridad y limitaciones

Solo alfa para pruebas. No introducir datos de identificación, bancarios o financieros reales. **No hay tokens reales, inversión, custodia ni pagos**. Se incluyen documentos cifrados en PostgreSQL bajo permisos y RLS; las subidas están **desactivadas por defecto** y necesitan ClamAV y clave antes de habilitarse. Faltan pruebas integradas en staging, respaldos/restauración y validación legal.

## Copyright

**© 2026 Eduardo Yauri · Todos los derechos reservados**.
El repositorio es público pero no open source. Véase [LICENSE](LICENSE). Las dependencias de terceros mantienen sus licencias.
