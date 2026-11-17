import type { Metadata } from "next";
import InviteSignup from "./invite-signup";

export const metadata: Metadata = {
  title: "Acceso por invitación",
  robots: { index: false, follow: false },
};

export default function InvitePage() {
  return <main className="auth-page"><InviteSignup /></main>;
}
