import type { Metadata } from "next";
import LoginClient from "./login-client";

export const metadata: Metadata = {
  title: "Acceso a empresas",
  description: "Acceso privado al espacio de emisores de Tokentiva.",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <main className="auth-page"><LoginClient /></main>;
}
