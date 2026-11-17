import Link from "next/link";

const pillars = [
  { number: "01", title: "Emisores", text: "Centraliza las empresas, responsables y documentación de cada operación." },
  { number: "02", title: "Activos", text: "Organiza inmuebles, proyectos y derechos económicos con datos estructurados." },
  { number: "03", title: "Operaciones", text: "Prepara emisiones y sus estados de revisión, con trazabilidad desde el origen." },
];

export default function Home() {
  return (
    <main>
      <header className="site-header wrap">
        <Link href="/" className="brand" aria-label="Tokentiva — inicio"><span className="brand-symbol">T</span> tokentiva<span className="brand-dot">.</span></Link>
        <nav aria-label="Navegación principal">
          <a href="#plataforma">Plataforma</a>
          <a href="#enfoque">Enfoque</a>
          <Link className="button button-small" href="/login">Acceso empresas <span aria-hidden="true">↗</span></Link>
        </nav>
      </header>

      <section className="hero wrap">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> INFRAESTRUCTURA B2B PARA RWA</p>
          <h1>Los activos reales.<br /><span className="gradient-text">Una nueva dimensión digital.</span></h1>
          <p className="lead">Tokentiva organiza el camino desde el activo hasta una operación preparada para su revisión, cumplimiento y futura digitalización.</p>
          <div className="hero-actions">
            <Link className="button" href="/demo">Entrar en la demostración <span aria-hidden="true">↗</span></Link>
            <a className="button-ghost" href="#plataforma">Conocer la plataforma <span aria-hidden="true">↓</span></a>
          </div>
          <p className="microcopy">Versión alfa · Sin inversiones reales ni emisión de tokens</p>
        </div>
        <div className="hero-visual" aria-label="Vista conceptual del flujo de activos">
          <div className="panel-preview">
            <div className="preview-head"><span className="preview-logo">T</span><span>Espacio de trabajo</span><span className="preview-tag">DEMO</span></div>
            <div className="preview-title">Ciclo de una operación</div>
            <div className="preview-step"><span className="step-icon">01</span><div><strong>Registro del activo</strong><small>Datos y documentación</small></div><span className="step-ok">✓</span></div>
            <div className="step-line" />
            <div className="preview-step"><span className="step-icon">02</span><div><strong>Configuración</strong><small>Condiciones de la operación</small></div><span className="step-ok">✓</span></div>
            <div className="step-line" />
            <div className="preview-step"><span className="step-icon">03</span><div><strong>Revisión regulatoria</strong><small>Validación previa a cualquier emisión</small></div><span className="step-wait">Pendiente</span></div>
            <div className="preview-foot">Sin blockchain, pagos ni captación de capital en esta fase</div>
          </div>
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        </div>
      </section>

      <section className="section wrap" id="plataforma">
        <div className="section-kicker">LO QUE ESTAMOS CONSTRUYENDO</div>
        <div className="section-heading"><h2>Infraestructura, no especulación.</h2><p>Un flujo de trabajo claro para los emisores. Primero organizamos los activos y las operaciones; la tecnología financiera regulada llegará mediante las autorizaciones y socios pertinentes.</p></div>
        <div className="features-grid">{pillars.map((p) => (
          <article className="feature-card" key={p.number}><span className="feature-number">{p.number}</span><h3>{p.title}</h3><p>{p.text}</p></article>
        ))}</div>
      </section>

      <section className="section wrap" id="enfoque">
        <div className="focus-banner">
          <div><p className="section-kicker">PRIMERA VERSIÓN</p><h2>Una demostración operativa, sin riesgo financiero.</h2><p>Explora el registro de activos y los estados simulados de revisión. Los datos de esta demo se almacenan únicamente en tu navegador.</p></div>
          <Link className="button" href="/demo">Abrir panel demo ↗</Link>
        </div>
      </section>

      <footer className="site-footer wrap"><span>© 2026 Eduardo Yauri · Todos los derechos reservados</span><span>Tokentiva · Proyecto en desarrollo · No constituye una oferta de inversión</span></footer>
    </main>
  );
}
