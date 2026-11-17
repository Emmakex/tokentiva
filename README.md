# Tokentiva

**Infraestructura B2B para preparar y gestionar operaciones de tokenización de activos reales (RWA).**

Repositorio público de software en desarrollo. **Versión 0.1.0 alfa: demostración sin operaciones financieras reales.**

## Probar la demo

Requisitos: Node.js 20.9+ y npm.

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000` y visitar `/demo`. También se puede ejecutar `npm run typecheck` y `npm run build`.

La demo permite crear, filtrar, revisar de forma simulada y eliminar activos. Los datos se guardan exclusivamente en `localStorage` del navegador. No introduzcas datos personales, bancarios ni confidenciales.

## Producto y roadmap

- [Alcance y criterios del MVP](docs/MVP.md)
- [Arquitectura y seguridad previstas](docs/ARCHITECTURE.md)
- [Puertas regulatorias](docs/REGULATORY-GATES.md)

El desarrollo comercial empezará por emisores B2B y gestión SaaS; cualquier tokenización real, oferta de inversión o movimiento de fondos está fuera de alcance hasta contar con evaluación jurídica y los permisos/proveedores necesarios.

## Propiedad intelectual

**Copyright © 2026 Eduardo Yauri. Todos los derechos reservados.**

Este repositorio es público, pero sus materiales originales están sujetos a licencia propietaria, **no open source**. Consulta [LICENSE](LICENSE) para las condiciones. Las dependencias de terceros conservan sus propias licencias.

---

**Tokentiva** · Real World Asset Tokenization Infrastructure
