"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

export default function InviteSignup() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function signUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage(""); setIsError(false);
    try {
      if (!/^[A-Za-z0-9_-]{43}$/.test(code.trim())) {
        setMessage("Comprueba el código de invitación (43 caracteres).");
        setIsError(true);
        return;
      }
      const result = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Tokentiva-Invitation": code.trim(),
        },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });
      if (!result.ok) {
        setMessage("No se ha podido completar el alta. Comprueba el código, el correo y los datos.");
        setIsError(true);
        return;
      }
      setPassword(""); setCode("");
      setMessage("Solicitud aceptada. Verifica tu dirección de correo y entra con tu contraseña. Después configura el segundo factor y acepta la invitación en el panel con el código original.");
    } catch {
      setMessage("Error de conexión con el servicio de registro.");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  return <section className="auth-box">
    <Link href="/" className="brand"><span className="brand-symbol">T</span> tokentiva<span className="brand-dot">.</span></Link>
    <p className="eyebrow">ACCESO POR INVITACIÓN</p>
    <h1>Crea tu cuenta</h1>
    <p className="auth-intro">Solo pueden registrarse las personas invitadas por una empresa. Debes controlar el correo al que se envió la invitación.</p>
    <form className="auth-form" onSubmit={signUp}>
      <label htmlFor="invitation-code">Código de invitación</label>
      <input id="invitation-code" required value={code} onChange={e=>setCode(e.target.value)} autoComplete="off" maxLength={43} />
      <label htmlFor="invitation-name">Nombre</label>
      <input id="invitation-name" required minLength={3} maxLength={80} value={name} onChange={e=>setName(e.target.value)} autoComplete="name" />
      <label htmlFor="invitation-email">Correo de la invitación</label>
      <input id="invitation-email" required type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" />
      <label htmlFor="invitation-password">Nueva contraseña (mínimo 12 caracteres)</label>
      <input id="invitation-password" required type="password" minLength={12} maxLength={128} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="new-password" />
      {message && <p role={isError ? "alert" : "status"} className={isError ? "auth-error" : "workspace-message"}>{message}</p>}
      <button className="button" type="submit" disabled={busy}>{busy ? "Comprobando…" : "Crear cuenta invitada"}</button>
    </form>
    <p className="auth-foot">El alta no otorga acceso a empresas hasta confirmar el correo, configurar TOTP y aceptar el código desde el panel.</p>
    <Link href="/login" className="auth-back">← Ya tengo cuenta</Link>
  </section>;
}
