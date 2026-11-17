# Tokentiva

**Plataforma B2B para preparar y gestionar operaciones de tokenización de activos reales (RWA).**

Versión **0.2.0-alpha** · Repositorio público con licencia propietaria.

## Desarrollo

Node.js 22.12+, npm y PostgreSQL 16+.

```bash
npm install
cp .env.example .env.local
# Rellenar DATABASE_URL, BETTER_AUTH_URL y BETTER_AUTH_SECRET.
npx auth@1.7.25 migrate --yes
npm run db:domain:migrate
npm run dev
```

- `/` — web de presentación.
- `/demo` — demostración ficticia y local, sin backend.
- `/login` — inicio de sesión, altas desactivadas por defecto.
- `/workspace` — área privada de organizaciones y activos en PostgreSQL.

La configuración del primer usuario y las variables necesarias se explican en [F1a](docs/F1A.md). El acceso a la API requiere sesión; cada operación de activos comprueba la pertenencia a la organización en el servidor.

## Pruebas

```bash
npm run typecheck
npm run build
# Requiere PostgreSQL de pruebas aislado, con DATABASE_URL terminada en tokentiva_test:
npm run db:domain:migrate
npm test
```

## Documentación

- [MVP y alcance](docs/MVP.md)
- [Arquitectura de seguridad](docs/ARCHITECTURE.md)
- [Entrega F1a](docs/F1A.md)
- [Puertas regulatorias](docs/REGULATORY-GATES.md)

**No hay emisiones de tokens, captación de inversores, custodia, mercados ni pagos financieros.** No introduzcas datos personales sensibles o documentación regulatoria: esta versión es alfa de desarrollo.

## Propiedad intelectual

**Copyright © 2026 Eduardo Yauri — Todos los derechos reservados.**
El repositorio es público, pero no open source. Consulta [LICENSE](LICENSE). Los componentes de terceros conservan sus respectivas licencias.
