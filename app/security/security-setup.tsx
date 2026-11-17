"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
type Enrollment={uri:string;codes:string[]};
export default function SecuritySetup({enabled,verifiedEmail}:{enabled:boolean;verifiedEmail:boolean}){
  const router=useRouter();
  const [password,setPassword]=useState("");
  const [code,setCode]=useState("");
  const [enrollment,setEnrollment]=useState<Enrollment|null>(null);
  const [error,setError]=useState("");
  const [done,setDone]=useState(false);
  const [busy,setBusy]=useState(false);
  async function start(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");
    try{
      const result=await authClient.twoFactor.enable({password,method:"totp",issuer:"Tokentiva"});
      if(result.error || !result.data || result.data.method!=="totp"){setError("No se pudo activar el autenticador. Verifica tu contraseña.");return;}
      setEnrollment({uri:result.data.totpURI,codes:result.data.backupCodes});
      setPassword("");
    }catch{setError("Error de configuración del segundo factor.");}finally{setBusy(false);}
  }
  async function confirm(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");
    try{
      const result=await authClient.twoFactor.verifyTotp({code:code.trim(),trustDevice:false});
      if(result.error){setError("Código inválido. Verifica la hora del dispositivo e inténtalo de nuevo.");return;}
      setDone(true);setCode("");
    }catch{setError("No se ha podido validar el código.");}finally{setBusy(false);}
  }
  const secret=enrollment ? new URL(enrollment.uri).searchParams.get("secret") : null;
  return <section className="auth-box security-box">
    <Link href="/" className="brand"><span className="brand-symbol">T</span> tokentiva<span className="brand-dot">.</span></Link>
    <p className="eyebrow">PROTECCIÓN OBLIGATORIA</p><h1>Seguridad de tu cuenta</h1>
    {!verifiedEmail ? <><p className="auth-intro">Debes verificar tu dirección de correo electrónico antes de acceder al espacio B2B. Comprueba tu correo de verificación.</p><Link className="auth-back" href="/login">Volver a acceso</Link></>
    : enabled||done ? <><p className="auth-intro">Autenticación en dos pasos activa. Tu cuenta ya dispone de protección adicional.</p><button className="button" type="button" onClick={()=>{router.push("/workspace");router.refresh();}}>Ir al panel</button></>
    : <><p className="auth-intro">Para acceder a las empresas debes activar un autenticador TOTP. No compartas los códigos ni el secreto.</p>
      {!enrollment?<form className="auth-form" onSubmit={start}><label htmlFor="security-pass">Contraseña actual</label><input id="security-pass" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button type="submit" className="button" disabled={busy}>{busy?"Configurando…":"Crear autenticador"}</button></form>
      : <><p className="auth-intro">Añade una cuenta manualmente en tu aplicación de autenticación usando la clave siguiente (secreto, no lo compartas):</p>
        <output className="secret-output">{secret}</output>
        <p className="auth-intro">Guarda estos códigos de recuperación en un lugar seguro. Solo se muestran durante la activación.</p>
        <ul className="recovery-list">{enrollment.codes.map(c=><li key={c}>{c}</li>)}</ul>
        <form className="auth-form" onSubmit={confirm}><label htmlFor="security-totp">Código de seis dígitos</label><input id="security-totp" value={code} maxLength={6} inputMode="numeric" autoComplete="one-time-code" onChange={e=>setCode(e.target.value)} required/><button type="submit" className="button" disabled={busy}>{busy?"Verificando…":"Verificar y activar"}</button></form>
      </>}
      {error&&<p className="auth-error" role="alert">{error}</p>}
    </>}
    <p className="auth-foot">El proceso de autenticación está gestionado por Better Auth. Nunca introduzcas el secreto de recuperación en páginas de terceros.</p>
  </section>;
}
