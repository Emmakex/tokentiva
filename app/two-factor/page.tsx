import type { Metadata } from "next";
import TwoFactorChallenge from "./two-factor-challenge";
export const metadata:Metadata={title:"Verificación en dos pasos",robots:{index:false,follow:false}};
export default function TwoFactorPage(){return <main className="auth-page"><TwoFactorChallenge/></main>;}
