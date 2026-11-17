import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { pool } from "@/lib/server/db";
import { sendVerificationEmail } from "@/lib/server/mailer";

export const auth = betterAuth({
  appName: "Tokentiva",
  database: pool,
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.TOKENTIVA_SIGNUP_ENABLED !== "true",
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
  plugins: [twoFactor({ issuer: "Tokentiva" })],
  rateLimit: { enabled: true, window: 60, max: 30 },
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [],
});
