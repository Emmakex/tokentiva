# Arquitectura — decisiones iniciales

## 0.1 alfa

Next.js 16 (App Router), React 19, TypeScript y CSS, sin backend ni servicios de terceros. Es un prototipo navegable. La información de la demo se guarda en localStorage y nunca debe contener datos sensibles.

## Producción B2B (plan, no implementado)

- **Aplicación:** Next.js + TypeScript; API server-side y esquemas de validación.
- **Persistencia:** PostgreSQL, migraciones controladas, backups y estrategia de recuperación.
- **Tenancy:** `organization_id` obligatorio en toda entidad y consulta, más controles de autorización por recurso.
- **Identidad:** proveedor de autenticación con MFA, sesión segura y roles de emisor, revisor y administrador.
- **Dominio:** Organization, User, Membership, Asset, Operation, Document, Review, AuditEvent.
- **Modelo de estados:** DRAFT → LEGAL_REVIEW → READY_INTERNAL. No existe transición a emisión real sin revisión y aprobación regulatoria específica.
- **Seguridad:** mínimos privilegios, secretos fuera del repositorio, validación del lado servidor, límites de tasa, CSRF/SSRF según superficie, registro de auditoría inmutable a nivel aplicación, cifrado en tránsito y reposo.
- **Documentos:** almacenamiento objeto privado, acceso temporal firmado, antivirus y política de retención.
- **Observabilidad:** logs sin datos sensibles, métricas y alertas.
- **Despliegue:** CI con verificación de tipos y compilación; ambientes development/staging/production y rollback.

## Regla de producto

El núcleo inicial gestiona operaciones de activos, no criptoactivos ni pagos. Cualquier contrato inteligente o integración blockchain será un adaptador futuro tras la validación jurídica de los derechos, el emisor y la jurisdicción.

## Protección de datos

No recoger documentación de identificación ni datos bancarios en la demo. La versión productiva requerirá diseño RGPD, base jurídica, derechos de interesados, acuerdos con encargados y control de residencia/retención de datos.
