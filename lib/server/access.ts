import { auth } from "@/lib/auth";
import { unauthorized } from "@/lib/server/requests";

type VerifiedSession = { userId: string; email: string; emailVerified: boolean };

export async function requireMfa(request: Request): Promise<
  | { ok: true; session: VerifiedSession }
  | { ok: false; response: Response }
> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return { ok: false, response: unauthorized() };
  if (!session.user.emailVerified) {
    return { ok: false, response: Response.json({ error: "Verifica tu correo antes de acceder.", code: "EMAIL_VERIFICATION_REQUIRED" }, { status: 403 }) };
  }
  if (session.user.twoFactorEnabled !== true) {
    return { ok: false, response: Response.json({ error: "Configura la autenticación de dos factores.", code: "MFA_REQUIRED" }, { status: 403 }) };
  }
  return { ok: true, session: { userId: session.user.id, email: session.user.email, emailVerified: session.user.emailVerified } };
}

export function requireSameOrigin(request: Request): Response | null {
  const origin = request.headers.get("origin");
  const trusted = process.env.BETTER_AUTH_URL;
  // El cliente web siempre envía Origin en mutaciones fetch; denegar ausencias.
  if (!origin || !trusted) return Response.json({ error: "Origen no autorizado." }, { status: 403 });
  try {
    if (new URL(origin).origin !== new URL(trusted).origin) throw new Error("cross-origin");
  } catch {
    return Response.json({ error: "Origen no autorizado." }, { status: 403 });
  }
  return null;
}
