import Link from "next/link";
import type { Metadata } from "next";
import DemoClient from "./demo-client";

export const metadata: Metadata = {
  title: "Panel de demostración",
  description: "Demostración sin transacciones de la gestión de activos en Tokentiva.",
};

export default function DemoPage() {
  return (
    <main className="demo-shell">
      <aside className="sidebar">
        <Link href="/" className="brand" aria-label="Tokentiva — inicio"><span className="brand-symbol">T</span> tokentiva<span className="brand-dot">.</span></Link>
        <p className="sidebar-section">ESPACIO DEMO</p>
        <nav className="sidebar-nav" aria-label="Navegación del panel">
          <a href="#resumen" className="nav-current">◫ <span>Resumen</span></a>
          <a href="#activos">▦ <span>Activos</span></a>
          <a href="#cumplimiento">◈ <span>Cumplimiento</span></a>
        </nav>
        <div className="sidebar-bottom"><span className="demo-indicator">● Entorno de prueba</span><p>Sin cuenta, servidor de datos ni emisión real.</p><Link href="/">← Volver a inicio</Link></div>
      </aside>
      <div className="demo-main">
        <div className="demo-topbar"><span>Tokentiva / Panel de control</span><span className="topbar-pill">ALFA · DATOS FICTICIOS</span></div>
        <DemoClient />
        <footer className="demo-footer">© 2026 Eduardo Yauri · Todos los derechos reservados · Datos almacenados localmente en este dispositivo</footer>
      </div>
    </main>
  );
}
