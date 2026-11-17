# Tokentiva — MVP 0.1

## Hipótesis de negocio

Un emisor B2B quiere registrar activos y preparar operaciones con documentación y estados de revisión en una herramienta centralizada. El primer cliente paga por software y puesta en marcha, no por una promesa de rentabilidad ni por acceso a un mercado de inversión.

## Entrega alfa (esta rama)

- Sitio de presentación orientado a empresas.
- Panel demo con dos activos ficticios de ejemplo.
- Alta, listado, filtros, cambio simulado de estado y eliminación de activos.
- Persistencia local en el navegador (localStorage), no servidor.
- Avisos visibles de entorno demo y ausencia de operaciones financieras.
- Página en español, responsive, con metadatos noindex mientras sea alfa.

## Criterios de aceptación

- `npm install && npm run typecheck && npm run build` pasan.
- `npm run dev` muestra la portada y `/demo`.
- Los registros de demo persisten tras recargar el mismo navegador.
- Ningún formulario llama a servicios externos.
- No hay emisión real de tokens, captación de inversores, wallets, transferencias ni cobros.
- El proyecto sigue siendo público y mantiene copyright propietario de Eduardo Yauri.

## MVP comercial siguiente (NO implementado todavía)

1. Login, organizaciones multi-tenant, roles y auditoría.
2. Base de datos PostgreSQL con aislamiento por organización.
3. Activos y operaciones persistidos, historial de cambios y documentación cifrada.
4. Flujo de aprobación interna y clasificación jurídica por operación.
5. Onboarding y cobro SaaS del emisor (solo software).
6. Integraciones configurables con proveedores de KYC y asesoramiento regulatorio cuando proceda.

## Fuera de alcance hasta revisión legal y técnica

- Ofertas de inversión al público y captación de capital.
- Colocación o asesoramiento de instrumentos financieros.
- Emisión de tokens representativos de instrumentos reales.
- Custodia de claves o fondos; mercado secundario y pagos de dividendos.
- Cualquier actividad que requiera licencia de entidad financiera o de criptoactivos.

## Monetización inicial a validar

- Tarifa fija de configuración / onboarding.
- Suscripción mensual por organización y uso.
- Integraciones y white-label para emisores profesionales.

Las tarifas y comisiones se definirán con entrevistas a clientes y revisión legal; no hay previsiones comerciales validadas.
