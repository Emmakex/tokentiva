"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Kind = "Inmueble" | "Financiación empresarial" | "Energía" | "Otros";
type Stage = "BORRADOR" | "SIMULACIÓN DE REVISIÓN";
type Asset = { id: string; name: string; kind: Kind; amount: number; stage: Stage; createdAt: string };

const KEY = "tokentiva-demo-assets-v1";
const EXAMPLES: Asset[] = [
  { id: "sample-1", name: "Ejemplo · Edificio residencial", kind: "Inmueble", amount: 850000, stage: "BORRADOR", createdAt: "2026-11-17" },
  { id: "sample-2", name: "Ejemplo · Ampliación empresarial", kind: "Financiación empresarial", amount: 250000, stage: "SIMULACIÓN DE REVISIÓN", createdAt: "2026-11-17" },
];
const KINDS: Kind[] = ["Inmueble", "Financiación empresarial", "Energía", "Otros"];
const money = (n: number) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function isAsset(x: unknown): x is Asset {
  if (typeof x !== "object" || x === null) return false;
  const a = x as Record<string, unknown>;
  return typeof a.id === "string" && typeof a.name === "string" && a.name.length <= 160
    && KINDS.includes(a.kind as Kind) && typeof a.amount === "number" && Number.isFinite(a.amount)
    && a.amount > 0 && a.amount <= 1000000000000
    && (a.stage === "BORRADOR" || a.stage === "SIMULACIÓN DE REVISIÓN")
    && typeof a.createdAt === "string";
}

export default function DemoClient() {
  const [assets, setAssets] = useState<Asset[]>(EXAMPLES);
  const [hydrated, setHydrated] = useState(false);
  const [filter, setFilter] = useState<"TODOS" | Stage>("TODOS");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("Inmueble");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) {
        const stored: unknown = JSON.parse(raw);
        if (Array.isArray(stored) && stored.length <= 100 && stored.every(isAsset)) setAssets(stored);
      }
    } catch {
      // La demo sigue funcionando si el navegador bloquea el almacenamiento.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(assets));
    } catch {
      // Sin almacenamiento disponible, la sesión se mantiene en memoria.
    }
  }, [assets, hydrated]);

  const total = useMemo(() => assets.reduce((sum, item) => sum + item.amount, 0), [assets]);
  const inReview = assets.filter((item) => item.stage === "SIMULACIÓN DE REVISIÓN").length;
  const filtered = assets.filter((item) => filter === "TODOS" || item.stage === filter);

  function addAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanName = name.trim();
    const value = Number(amount);
    if (cleanName.length < 3 || cleanName.length > 100) {
      setError("Introduce un nombre de 3 a 100 caracteres.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0 || value > 1000000000000) {
      setError("Introduce un importe válido superior a cero.");
      return;
    }
    if (assets.length >= 100) {
      setError("La demo admite un máximo de 100 activos.");
      return;
    }
    const newAsset: Asset = {
      id: window.crypto.randomUUID(), name: cleanName, kind, amount: value,
      stage: "BORRADOR", createdAt: new Date().toISOString().slice(0, 10),
    };
    setAssets((current) => [newAsset, ...current]);
    setName(""); setAmount(""); setError(""); setFilter("TODOS");
  }

  function toggleStage(id: string) {
    setAssets((current) => current.map((item) => item.id === id ? {
      ...item, stage: item.stage === "BORRADOR" ? "SIMULACIÓN DE REVISIÓN" : "BORRADOR",
    } : item));
  }

  function removeAsset(id: string) {
    setAssets((current) => current.filter((item) => item.id !== id));
  }

  return (
    <div className="demo-content">
      <header className="demo-intro" id="resumen"><div><p className="eyebrow">WORKSPACE / DEMOSTRACIÓN</p><h1>Panel de activos</h1><p>Organiza activos y simula su preparación. Ninguna acción crea tokens ni operaciones reales.</p></div><span className="env-label">● Demo local</span></header>
      <div className="notice"><strong>Entorno de demostración.</strong> Los registros son ficticios o introducidos por ti; no se envían a ningún servidor. No introduzcas información personal ni confidencial.</div>
      <section className="stats-grid" aria-label="Estadísticas del panel">
        <div className="stat"><span>Activos registrados</span><strong>{assets.length}</strong><small>En este navegador</small></div>
        <div className="stat"><span>Importe de referencia</span><strong>{money(total)}</strong><small>Valor ilustrativo, no fondos captados</small></div>
        <div className="stat"><span>Revisión simulada</span><strong>{inReview}</strong><small>No equivale a aprobación legal</small></div>
      </section>
      <section className="demo-grid" id="activos">
        <div className="data-card">
          <div className="card-heading"><div><p className="eyebrow">INVENTARIO</p><h2>Activos</h2></div><button type="button" className="reset-button" onClick={() => { setAssets(EXAMPLES); setFilter("TODOS"); }}>Restablecer ejemplos</button></div>
          <div className="filter-tabs" aria-label="Filtrar activos">
            <button type="button" className={filter === "TODOS" ? "active" : ""} onClick={() => setFilter("TODOS")}>Todos</button>
            <button type="button" className={filter === "BORRADOR" ? "active" : ""} onClick={() => setFilter("BORRADOR")}>Borradores</button>
            <button type="button" className={filter === "SIMULACIÓN DE REVISIÓN" ? "active" : ""} onClick={() => setFilter("SIMULACIÓN DE REVISIÓN")}>En simulación</button>
          </div>
          <div className="asset-list">
            {filtered.length === 0 ? <p className="empty-state">No hay activos en este filtro.</p> : filtered.map((asset) => (
              <article className="asset-row" key={asset.id}>
                <div className="asset-icon" aria-hidden="true">{asset.kind === "Inmueble" ? "▤" : asset.kind === "Energía" ? "☼" : "◇"}</div>
                <div className="asset-info"><h3>{asset.name}</h3><p>{asset.kind} · {money(asset.amount)}</p><span className={asset.stage === "BORRADOR" ? "state-pill" : "state-pill review"}>{asset.stage === "BORRADOR" ? "Borrador" : "Revisión simulada"}</span></div>
                <div className="asset-actions"><button type="button" onClick={() => toggleStage(asset.id)} aria-label={asset.stage === "BORRADOR" ? "Simular revisión de " + asset.name : "Volver a borrador " + asset.name}>{asset.stage === "BORRADOR" ? "Simular revisión" : "Volver a borrador"}</button><button type="button" className="remove-button" onClick={() => removeAsset(asset.id)} aria-label={"Eliminar " + asset.name}>Eliminar</button></div>
              </article>
            ))}
          </div>
        </div>
        <div className="data-card form-card">
          <div className="card-heading"><div><p className="eyebrow">NUEVO REGISTRO</p><h2>Añadir activo</h2></div></div>
          <form onSubmit={addAsset}>
            <label htmlFor="asset-name">Nombre del activo</label>
            <input id="asset-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} placeholder="Ej. Local comercial" required />
            <label htmlFor="asset-kind">Tipo de activo</label>
            <select id="asset-kind" value={kind} onChange={(event) => setKind(event.target.value as Kind)}>{KINDS.map((option) => <option key={option}>{option}</option>)}</select>
            <label htmlFor="asset-amount">Valor de referencia (€)</label>
            <input id="asset-amount" type="number" min="1" max="1000000000000" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Ej. 250000" required />
            {error && <p role="alert" className="form-error">{error}</p>}
            <button className="button form-submit" type="submit">Guardar borrador <span aria-hidden="true">↗</span></button>
          </form>
          <div className="form-hint">Este formulario es una simulación local. No guarda datos en un backend ni admite archivos personales.</div>
        </div>
      </section>
      <section className="compliance-card" id="cumplimiento"><div className="compliance-symbol">!</div><div><h2>Puerta de cumplimiento</h2><p>El paso a una emisión real permanece bloqueado. Harán falta clasificación jurídica, revisión regulatoria, políticas KYC/AML y proveedores autorizados cuando corresponda.</p></div><span className="compliance-flag">NO HABILITADO</span></section>
    </div>
  );
}
