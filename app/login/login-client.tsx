"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const canSignUp = process.env.NEXT_PUBLIC_TOKENTIVA_SIGNUP_ENABLED === "true";

export default function LoginClient() {
  const router = useRouter();
  const [register, setRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError(""); setLoading(true);
    try {
      const result = register
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError("No se ha podido completar el acceso. Comprueba las credenciales o contacta con el administrador.");
        return;
      }
      router.replace("/workspace");
      router.refresh();
    } catch {
      setError("No se ha podido conectar con el servicio de acceso.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="auth-box">
    <Link href="/" className="brand"><span className="brand-symbol">T</span> tokentiva<span className="brand-dot">.</span></Link>
    <p className="eyebrow">ESPACIO PRIVADO B2B</p>
    <h1>{register ? "Crear acceso" : "Accede a tu organización"}</h1>
    <p className="auth-intro">Área de gestión de activos y operaciones preparatorias. No admite inversiones ni movimientos de fondos.</p>
    <form onSubmit={submit} className="auth-form">
      {register && <><label htmlFor="login-name">Nombre</label><input id="login-name" autoComplete="name" required minLength={3} maxLength={80} value={name} onChange={e => setName(e.target.value)} /></>}
      <label htmlFor="login-email">Correo electrónico</label>
      <input id="login-email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
      <label htmlFor="login-password">Contraseña</label>
      <input id="login-password" type="password" autoComplete={register ? "new-password" : "current-password"} minLength={12} required value={password} onChange={e => setPassword(e.target.value)} />
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button type="submit" className="button" disabled={loading}>{loading ? "Verificando…" : (register ? "Crear usuario" : "Entrar al panel")}</button>
    </form>
    {canSignUp && <button className="auth-switch" type="button" onClick={() => { setRegister(!register); setError(""); }}>{register ? "Ya tengo cuenta → Entrar" : "Activación inicial → Crear cuenta"}</button>}
    <p className="auth-foot">Acceso restringido. El registro público está {canSignUp ? "habilitado temporalmente para pruebas" : "desactivado"}.</p>
    <Link href="/" className="auth-back">← Volver al inicio</Link>
  </div>;
}
