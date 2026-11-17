import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { hasValidSignupInvitation } from "@/lib/server/signup-invitation";
import { twoFactor } from "better-auth/plugins";
import { pool } from "@/lib/server/db";
import { sendVerificationEmail } from "@/lib/server/mailer";

export const auth = betterAuth({
  appName: "Tokentiva",
  database: pool,
  emailAndPassword: {
    enabled: true,
    // El alta no es pública: un hook valida la invitación ANTES de crear usuarios.
    disableSignUp: false,
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email") return;
      // Bootstrap permitido solo en desarrollo local (nunca en staging/producción).
      const localBootstrap = process.env.NODE_ENV !== "production" &&
        process.env.TOKENTIVA_SIGNUP_ENABLED === "true";
      if (localBootstrap) return;
      const code = ctx.headers?.get("x-tokentiva-invitation");
      if (!(await hasValidSignupInvitation(ctx.body?.email, code))) {
        throw new APIError("FORBIDDEN", { message: "Invitation required." });
      }
    }),
  },
  plugins: [twoFactor({ issuer: "Tokentiva" })],
  rateLimit: { enabled: true, window: 60, max: 30 },
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [],
});
