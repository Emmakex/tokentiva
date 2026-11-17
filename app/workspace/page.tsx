import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import WorkspaceClient from "./workspace-client";

export const metadata: Metadata = {
  title: "Panel de emisores",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  if (!session.user.emailVerified || session.user.twoFactorEnabled !== true) redirect("/security");
  return <main className="workspace-page">
    <header className="site-header wrap">
      <Link href="/" className="brand"><span className="brand-symbol">T</span> tokentiva<span className="brand-dot">.</span></Link>
      <span className="workspace-header-badge">ÁREA B2B · ALFA</span>
    </header>
    <WorkspaceClient userName={session.user.name} />
    <footer className="site-footer wrap"><span>© 2026 Eduardo Yauri. Todos los derechos reservados.</span><span>Sin captación, emisiones ni pagos reales.</span></footer>
  </main>;
}
