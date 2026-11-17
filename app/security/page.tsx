import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import SecuritySetup from "./security-setup";
export const metadata:Metadata={title:"Protección de cuenta",robots:{index:false,follow:false}};
export const dynamic="force-dynamic";
export default async function SecurityPage(){
  const session=await auth.api.getSession({headers:await headers()});
  if(!session) redirect("/login");
  return <main className="auth-page"><SecuritySetup enabled={session.user.twoFactorEnabled === true} verifiedEmail={session.user.emailVerified === true}/></main>;
}
