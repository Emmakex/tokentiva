"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import InvitationsClient from "./invitations-client";

type Role = "owner" | "editor" | "viewer";
type Org = { id: string; name: string; role: Role };
type AssetKind = "real_estate" | "business_financing" | "energy" | "other";
type AssetStatus = "draft" | "internal_review";
type Asset = { id: string; name: string; kind: AssetKind; value_cents: string; status: AssetStatus; created_at: string };
const kindLabels: Record<AssetKind, string> = {
  real_estate: "Inmueble", business_financing: "Financiación empresarial", energy: "Energía", other: "Otro activo",
};
const money = (cents: string) => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 }).format(Number(cents) / 100);

async function api<T>(path: string, method = "GET", body?: object): Promise<T> {
  const result = await fetch(path, {
    method, cache: "no-store", credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!result.ok) {
    if (result.status === 401) throw new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
    if (result.status === 403) throw new Error("Verifica tu cuenta y activa la autenticación de dos factores.");
    if (result.status === 404) throw new Error("Recurso no encontrado o sin permisos.");
    if (result.status === 400) throw new Error("Comprueba los datos introducidos.");
    throw new Error("No ha sido posible completar la operación.");
  }
  return result.status === 204 ? (undefined as T) : result.json() as Promise<T>;
}

export default function WorkspaceClient({ userName }: { userName: string }) {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Org[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [orgName, setOrgName] = useState("");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AssetKind>("real_estate");
  const [amount, setAmount] = useState("");
  const [pending, setPending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadOrganizations = useCallback(async () => {
    const response = await api<{ organizations: Org[] }>("/api/organizations");
    setOrganizations(response.organizations);
    setSelectedId((current) => response.organizations.some(o => o.id === current)
      ? current : response.organizations[0]?.id ?? "");
    setLoaded(true);
  }, []);

  useEffect(() => {
    loadOrganizations().catch((err: Error) => { setLoaded(true); setError(err.message); });
  }, [loadOrganizations]);

  const loadAssets = useCallback(async (id: string) => {
    const response = await api<{ assets: Asset[] }>(`/api/organizations/${id}/assets`);
    setAssets(response.assets);
  }, []);

  useEffect(() => {
    if (!selectedId) { setAssets([]); return; }
    setAssets([]);
    loadAssets(selectedId).catch((err: Error) => setError(err.message));
  }, [selectedId, loadAssets]);

  const selected = organizations.find(org => org.id === selectedId);
  const canWrite = selected?.role === "owner" || selected?.role === "editor";

  async function run(action: () => Promise<void>) {
    if (pending) return;
    setPending(true); setError(""); setNotice("");
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : "Error inesperado."); }
    finally { setPending(false); }
  }

  function createOrg(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(async () => {
      const response = await api<{ organization: Org }>("/api/organizations", "POST", { name: orgName.trim() });
      setOrgName("");
      await loadOrganizations();
      setSelectedId(response.organization.id);
      setNotice("Organización creada correctamente.");
    });
  }

  function createAsset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedId || !canWrite) return;
    const match = amount.trim().match(/^(\d{1,10})(?:[.,](\d{1,2}))?$/);
    if (!match) { setError("Indica un importe positivo de hasta dos decimales."); return; }
    const valueCents = Number(match[1]) * 100 + Number((match[2] ?? "").padEnd(2, "0"));
    if (!Number.isSafeInteger(valueCents) || valueCents <= 0 || valueCents > 100000000000) {
      setError("El importe está fuera de los límites de esta versión."); return;
    }
    void run(async () => {
      await api(`/api/organizations/${selectedId}/assets`, "POST", { name: name.trim(), kind, valueCents });
      setName(""); setAmount(""); await loadAssets(selectedId);
      setNotice("Activo añadido en estado borrador.");
    });
  }

  function toggle(asset: Asset) {
    if (!selectedId || !canWrite) return;
    void run(async () => {
      await api(`/api/organizations/${selectedId}/assets/${asset.id}`, "PATCH",
        { status: asset.status === "draft" ? "internal_review" : "draft" });
      await loadAssets(selectedId);
      setNotice("Estado de revisión interna actualizado.");
    });
  }

  function remove(asset: Asset) {
    if (!selectedId || selected?.role !== "owner" || !window.confirm(`¿Eliminar "${asset.name}"?`)) return;
    void run(async () => {
      await api(`/api/organizations/${selectedId}/assets/${asset.id}`, "DELETE");
      await loadAssets(selectedId);
      setNotice("Activo eliminado.");
    });
  }

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return <div className="wrap workspace-inner">
    <div className="workspace-title">
      <div><p className="eyebrow">CONTROL DE EMISORES</p><h1>Bienvenido, {userName}</h1><p>Gestión privada de activos con datos persistentes y separación por organización.</p></div>
      <button type="button" className="workspace-logout" onClick={() => void signOut()}>Cerrar sesión</button>
    </div>
    <div className="notice"><strong>Entorno de desarrollo.</strong> No introduzcas documentación de identidad, información bancaria, claves privadas ni datos confidenciales. No se emiten tokens ni se captan fondos.</div>
    {error && <div className="workspace-message is-error" role="alert">{error}</div>}
    {notice && <div className="workspace-message" role="status">{notice}</div>}
    <section className="workspace-grid" aria-label="Organizaciones y activos">
      <div className="data-card workspace-organization">
        <div className="card-heading"><div><p className="eyebrow">TENANCY</p><h2>Organizaciones</h2></div></div>
        {!loaded ? <p className="workspace-help">Cargando organizaciones…</p> : organizations.length ? <>
          <label htmlFor="active-organization">Organización activa</label>
          <select id="active-organization" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {organizations.map(o => <option key={o.id} value={o.id}>{o.name} · {o.role}</option>)}
          </select>
          <p className="workspace-help">Solo se muestran organizaciones a las que pertenece tu usuario.</p>
        </> : <p className="workspace-help">Todavía no tienes ninguna organización. Crea una para comenzar.</p>}
        <form onSubmit={createOrg} className="workspace-form">
          <label htmlFor="org-name">Nueva organización</label>
          <input id="org-name" value={orgName} onChange={e => setOrgName(e.target.value)} minLength={3} maxLength={120} required placeholder="Ej. Inversiones Barcelona" />
          <button className="button" type="submit" disabled={pending}>Crear organización</button>
        </form>
      </div>
      <div className="data-card workspace-assets">
        <div className="card-heading"><div><p className="eyebrow">ACTIVOS</p><h2>Inventario real de prueba</h2></div><span className="workspace-counter">{assets.length} activos</span></div>
        {!selectedId ? <p className="workspace-help">Selecciona o crea una organización.</p> : <>
          {assets.length === 0 ? <p className="workspace-help">Aún no hay activos para esta organización.</p> : <div className="asset-list">
            {assets.map(asset => <article className="asset-row" key={asset.id}>
              <span className="asset-icon" aria-hidden="true">◇</span>
              <div className="asset-info"><h3>{asset.name}</h3><p>{kindLabels[asset.kind]} · {money(asset.value_cents)}</p><span className={asset.status === "draft" ? "state-pill" : "state-pill review"}>{asset.status === "draft" ? "Borrador" : "Revisión interna"}</span></div>
              <div className="asset-actions">
                {canWrite && <button type="button" disabled={pending} onClick={() => toggle(asset)}>{asset.status === "draft" ? "Enviar a revisión interna" : "Volver a borrador"}</button>}
                {selected?.role === "owner" && <button type="button" className="remove-button" disabled={pending} onClick={() => remove(asset)}>Eliminar</button>}
              </div>
            </article>)}
          </div>}
          {canWrite && <form onSubmit={createAsset} className="workspace-form">
            <h3>Añadir activo</h3>
            <label htmlFor="workspace-asset-name">Nombre</label>
            <input id="workspace-asset-name" value={name} onChange={e => setName(e.target.value)} minLength={3} maxLength={100} required placeholder="Ej. Edificio residencial" />
            <label htmlFor="workspace-asset-kind">Tipo</label>
            <select id="workspace-asset-kind" value={kind} onChange={e => setKind(e.target.value as AssetKind)}>
              {Object.entries(kindLabels).map(([id,label]) => <option value={id} key={id}>{label}</option>)}
            </select>
            <label htmlFor="workspace-asset-amount">Valor de referencia (€)</label>
            <input id="workspace-asset-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="250000,00" required />
            <button type="submit" className="button" disabled={pending}>Guardar borrador</button>
          </form>}
        </>}
      </div>
    </section>
    <InvitationsClient organizationId={selectedId} isOwner={selected?.role === "owner"} onAccepted={loadOrganizations} />
    <section className="compliance-card"><div className="compliance-symbol">!</div><div><h2>Operaciones financieras desactivadas</h2><p>Este panel registra datos operativos, no representa derechos reales ni realiza tokenizaciones. Antes de activar emisiones, pagos o inversores deberá superarse la evaluación legal y de seguridad.</p></div><span className="compliance-flag">BLOQUEADO</span></section>
  </div>;
}
