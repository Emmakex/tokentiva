"use client";

import {useEffect,useState,type FormEvent} from "react";

type Role="owner"|"editor"|"viewer";
type Asset={id:string;name:string};
type Document={id:string;file_name:string;mime_type:string;size_bytes:number;created_at:string};
const MAX=1_048_576;
const allowed=["application/pdf","image/png","image/jpeg"];
const size=(n:number)=>new Intl.NumberFormat("es-ES").format(n/1024)+" KB";
function asBase64(file:File):Promise<string>{
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("No se pudo leer el archivo."));
    reader.onload=()=> {
      const value=reader.result;
      if(typeof value!=="string"||!value.includes(",")){reject(new Error("Codificación inválida"));return;}
      resolve(value.slice(value.indexOf(",")+1));
    };
    reader.readAsDataURL(file);
  });
}

export default function DocumentsClient({
  organizationId,assets,role
}:{organizationId:string;assets:Asset[];role?:Role}){
  const [assetId,setAssetId]=useState("");
  const [documents,setDocuments]=useState<Document[]>([]);
  const [available,setAvailable]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  useEffect(()=>{
    setAssetId(current=>assets.some(a=>a.id===current)?current:assets[0]?.id??"");
  },[assets,organizationId]);

  useEffect(()=>{
    let cancelled=false;
    setLoaded(false);setDocuments([]);setAvailable(false);setError("");setNotice("");
    if(!organizationId||!assetId){setLoaded(true);return;}
    const run=async()=>{
      const response=await fetch(`/api/organizations/${organizationId}/assets/${assetId}/documents`,{cache:"no-store"});
      if(!response.ok)throw new Error("No se pudieron consultar los documentos.");
      const data=await response.json() as {documents:Document[];uploadEnabled:boolean};
      if(!cancelled){setDocuments(data.documents);setAvailable(data.uploadEnabled);setLoaded(true);}
    };
    run().catch((e:Error)=>{if(!cancelled){setError(e.message);setLoaded(true);}});
    return()=>{cancelled=true;};
  },[organizationId,assetId]);

  async function refresh(){
    const response=await fetch(`/api/organizations/${organizationId}/assets/${assetId}/documents`,{cache:"no-store"});
    if(!response.ok)throw new Error("No se pudo refrescar la lista.");
    const data=await response.json() as {documents:Document[];uploadEnabled:boolean};
    setDocuments(data.documents);setAvailable(data.uploadEnabled);
  }

  async function upload(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!file||!assetId||!organizationId||busy)return;
    if(file.size<1||file.size>MAX||!allowed.includes(file.type)){
      setError("Solo PDF, PNG o JPEG de hasta 1 MB.");return;
    }
    setBusy(true);setError("");setNotice("");
    try{
      const base64=await asBase64(file);
      const result=await fetch(`/api/organizations/${organizationId}/assets/${assetId}/documents`,{
        method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",
        body:JSON.stringify({fileName:file.name,mimeType:file.type,base64}),
      });
      if(!result.ok)throw new Error(result.status===422?"Documento rechazado por el antivirus.":"No se pudo almacenar el documento.");
      setFile(null);
      const input=document.getElementById("asset-document-input") as HTMLInputElement|null;
      if(input)input.value="";
      await refresh();
      setNotice("Documento cifrado y guardado en la organización.");
    }catch(e){setError(e instanceof Error?e.message:"Error de subida.");}
    finally{setBusy(false);}
  }

  async function download(doc:Document){
    if(!organizationId||!assetId||busy)return;
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/organizations/${organizationId}/assets/${assetId}/documents/${doc.id}`,{credentials:"same-origin",cache:"no-store"});
      if(!response.ok)throw new Error("No se pudo descargar el documento.");
      const blob=await response.blob();
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement("a");
      anchor.href=url;anchor.download=doc.file_name;
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){setError(e instanceof Error?e.message:"Error de descarga.");}
    finally{setBusy(false);}
  }

  async function remove(doc:Document){
    if(!organizationId||!assetId||busy||!confirm("¿Eliminar definitivamente este documento?"))return;
    setBusy(true);setError("");setNotice("");
    try{
      const response=await fetch(`/api/organizations/${organizationId}/assets/${assetId}/documents/${doc.id}`,{
        method:"DELETE",credentials:"same-origin"
      });
      if(!response.ok)throw new Error("No se pudo eliminar el documento.");
      await refresh();setNotice("Documento eliminado.");
    }catch(e){setError(e instanceof Error?e.message:"Error de eliminación.");}
    finally{setBusy(false);}
  }

  return <section className="invite-box" aria-labelledby="private-docs-title">
    <p className="eyebrow">DOCUMENTACIÓN / TENANT</p>
    <h2 id="private-docs-title">Documentos protegidos</h2>
    <p className="invite-help">Archivos pequeños cifrados y aislados por organización. No subas DNI, datos bancarios ni contratos reales durante esta fase alfa.</p>
    {error&&<p role="alert" className="auth-error">{error}</p>}
    {notice&&<p role="status" className="workspace-message">{notice}</p>}
    <div className="docs-grid">
      <div>
        <label htmlFor="doc-asset-select">Activo asociado</label>
        <select id="doc-asset-select" value={assetId} onChange={e=>setAssetId(e.target.value)} disabled={!assets.length||busy}>
          {assets.map(asset=><option key={asset.id} value={asset.id}>{asset.name}</option>)}
        </select>
        {!assets.length ? <p className="invite-help">Primero registra un activo para gestionar sus documentos.</p>:
          !loaded ? <p className="invite-help">Consultando…</p> :
          documents.length===0 ? <p className="invite-help">Este activo no tiene documentos.</p> :
          <ul className="docs-list">{documents.map(doc=><li key={doc.id}>
            <div><strong>{doc.file_name}</strong><small>{size(doc.size_bytes)} · {new Date(doc.created_at).toLocaleDateString("es-ES")}</small></div>
            <div><button type="button" disabled={busy} onClick={()=>void download(doc)}>Descargar</button>
              {role==="owner"&&<button type="button" disabled={busy} onClick={()=>void remove(doc)}>Eliminar</button>}</div>
          </li>)}</ul>}
      </div>
      <div>
        <h3>Nuevo documento</h3>
        {!available?<p className="workspace-message">Subidas desactivadas hasta configurar cifrado y antivirus en el entorno de pruebas.</p>:
          role==="viewer"?<p className="invite-help">Tu rol permite consultar pero no añadir documentos.</p>:
          <form className="docs-form" onSubmit={upload}>
            <label htmlFor="asset-document-input">Archivo PDF, PNG o JPEG (máx. 1 MB)</label>
            <input id="asset-document-input" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" required onChange={e=>setFile(e.target.files?.[0]??null)} />
            <button type="submit" className="button" disabled={busy||!file||!assetId}>{busy?"Validando…":"Analizar y almacenar"}</button>
          </form>}
      </div>
    </div>
  </section>;
}
