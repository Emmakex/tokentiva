"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function TwoFactorChallenge(){
  const router=useRouter();
  const [mode,setMode]=useState<"totp"|"backup">("totp");
  const [code,setCode]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    setError("");setLoading(true);
    try {
      const result=mode==="totp"
        ? await authClient.twoFactor.verifyTotp({code:code.trim(),trustDevice:false})
        : await authClient.twoFactor.verifyBackupCode({code:code.trim(),disableSession:false});
      if(result.error) {setError("Código inválido, caducado o sin desafío activo.");return;}
      router.replace("/workspace");router.refresh();
    } catch {setError("No se ha podido verificar el código.");}
    finally{setLoading(false);}
  }
  return <section className="auth-box">
    <Link href="/" className="brand"><span className="brand-symbol">T</span> tokentiva<span className="brand-dot">.</span></Link>
    <p className="eyebrow">SEGURIDAD DE CUENTA</p><h1>Verificación en dos pasos</h1>
    <p className="auth-intro">Introduce el código de tu aplicación de autenticación o un código de recuperación.</p>
    <form className="auth-form" onSubmit={submit}>
      <label htmlFor="mfa-code">{mode==="totp"?"Código de 6 dígitos":"Código de recuperación"}</label>
      <input id="mfa-code" value={code} onChange={e=>setCode(e.target.value)} autoComplete={mode==="totp"?"one-time-code":"off"} required maxLength={mode==="totp"?6:60} inputMode={mode==="totp"?"numeric":"text"} placeholder={mode==="totp"?"000000":"Código de respaldo"}/>
      {error&&<p className="auth-error" role="alert">{error}</p>}
      <button className="button" type="submit" disabled={loading}>{loading?"Validando…":"Verificar y continuar"}</button>
    </form>
    <button type="button" className="auth-switch" onClick={()=>{setMode(mode==="totp"?"backup":"totp");setCode("");setError("");}}>{mode==="totp"?"Usar código de recuperación":"Usar aplicación de autenticación"}</button>
    <p className="auth-foot">Si has perdido los dos métodos, contacta con el administrador. No existe acceso alternativo por contraseña.</p>
    <Link className="auth-back" href="/login">← Volver a acceso</Link>
  </section>;
}
