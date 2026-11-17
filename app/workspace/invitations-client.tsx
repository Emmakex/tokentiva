"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";

type Pending = {id:string;email:string;role:"editor"|"viewer";expires_at:string};
type InvitationResponse = {invitation:{code:string;id:string;expiresAt:string}};

async function requestJson<T>(path:string,method="GET",body?:object):Promise<T>{
  const response=await fetch(path,{
    method,credentials:"same-origin",cache:"no-store",
    headers:body?{"Content-Type":"application/json"}:undefined,
    body:body?JSON.stringify(body):undefined
  });
  if(!response.ok) throw new Error(
    response.status===403 ? "Acceso protegido: revisa tu correo y el doble factor."
      : response.status===404 ? "No tienes permisos para administrar invitaciones."
      : response.status===400 ? "La invitación no es válida, está caducada o no corresponde a tu correo."
      : "No se pudo completar la solicitud."
  );
  return response.status===204?(undefined as T):response.json() as Promise<T>;
}

export default function InvitationsClient({
  organizationId,isOwner,onAccepted
}:{organizationId:string;isOwner:boolean;onAccepted:()=>Promise<void>}){
  const [email,setEmail]=useState("");
  const [role,setRole]=useState<"editor"|"viewer">("viewer");
  const [code,setCode]=useState("");
  const [issued,setIssued]=useState("");
  const [pending,setPending]=useState<Pending[]>([]);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const load=useCallback(async()=>{
    if(!organizationId||!isOwner){setPending([]);return;}
    const data=await requestJson<{invitations:Pending[]}>(`/api/organizations/${organizationId}/invitations`);
    setPending(data.invitations);
  },[organizationId,isOwner]);

  useEffect(()=>{
    setIssued("");setError("");
    void load().catch((e:Error)=>setError(e.message));
  },[load]);

  async function run(action:()=>Promise<void>){
    if(busy)return;setBusy(true);setError("");setNotice("");
    try{await action();}catch(err){setError(err instanceof Error?err.message:"Error inesperado.");}
    finally{setBusy(false);}
  }

  function invite(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!organizationId||!isOwner)return;
    void run(async()=>{
      const data=await requestJson<InvitationResponse>(`/api/organizations/${organizationId}/invitations`,"POST",{email,role});
      setIssued(data.invitation.code);
      setEmail("");
      setNotice("Código creado. Entrégalo únicamente a la persona invitada por un canal privado.");
      await load();
    });
  }

  function accept(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    void run(async()=>{
      await requestJson<{accepted:boolean}>("/api/invitations/accept","POST",{code:code.trim()});
      setCode("");
      setNotice("Invitación aceptada. La organización ya aparece en tu panel.");
      await onAccepted();
    });
  }

  function revoke(id:string){
    if(!organizationId||!isOwner)return;
    void run(async()=>{
      await requestJson(`/api/organizations/${organizationId}/invitations`,"DELETE",{id});
      setIssued("");setNotice("Invitación revocada.");await load();
    });
  }

  return <section className="invite-box" aria-labelledby="invitations-title">
    <p className="eyebrow">COLABORACIÓN SEGURA</p>
    <h2 id="invitations-title">Acceso a organizaciones</h2>
    <p className="invite-help">Los nuevos colaboradores pueden crear su cuenta desde una invitación. Para unirse deben verificar el correo y activar el segundo factor. El código caduca a los siete días y solo se acepta una vez.</p>
    {error&&<p className="auth-error" role="alert">{error}</p>}
    {notice&&<p className="workspace-message" role="status">{notice}</p>}
    <div className="invite-grid">
      {isOwner&&organizationId&&<div>
        <h3>Invitar colaborador</h3>
        <form onSubmit={invite}>
          <label htmlFor="invite-email">Correo verificado del usuario</label>
          <input id="invite-email" type="email" autoComplete="off" value={email} required onChange={e=>setEmail(e.target.value)} placeholder="colaborador@empresa.com"/>
          <label htmlFor="invite-role">Permisos</label>
          <select id="invite-role" value={role} onChange={e=>setRole(e.target.value as "editor"|"viewer")}>
            <option value="viewer">Lector</option>
            <option value="editor">Editor</option>
          </select>
          <button className="button" type="submit" disabled={busy}>Crear invitación</button>
        </form>
        {issued&&<div className="invite-output">
          <strong>Código de un solo uso</strong>
          <code>{issued}</code>
          <button type="button" onClick={()=>void navigator.clipboard.writeText(issued)}>Copiar código</button>
          <p className="invite-help">Este código no se volverá a mostrar. Comparte también la página /invite por un canal privado. No publiques el código.</p>
        </div>}
        {pending.length>0&&<><h3>Invitaciones pendientes</h3>
          <ul className="invite-list">{pending.map(p=><li key={p.id}>{p.email} · {p.role} · hasta {new Date(p.expires_at).toLocaleDateString("es-ES")}
            <button type="button" disabled={busy} onClick={()=>revoke(p.id)}>Revocar</button>
          </li>)}</ul></>}
      </div>}
      <div>
        <h3>Aceptar una invitación</h3>
        <form onSubmit={accept}>
          <label htmlFor="invite-code">Código recibido</label>
          <input id="invite-code" value={code} onChange={e=>setCode(e.target.value)} autoComplete="off" required maxLength={43} placeholder="Pega el código de invitación"/>
          <button className="button" type="submit" disabled={busy}>Unirme a la organización</button>
        </form>
        <p className="invite-help">La plataforma comprobará que el correo de tu cuenta coincide con el destinatario. Si aún no tienes cuenta, <Link href="/invite">créala con tu invitación</Link>. No autoriza inversiones ni transferencias.</p>
      </div>
    </div>
  </section>;
}
