import { betterAuth } from "better-auth";
import { pool } from "@/lib/server/db";

export const auth = betterAuth({
  appName: "Tokentiva",
  database: pool,
  emailAndPassword: {
    enabled: true,
    disableSignUp: process.env.TOKENTIVA_SIGNUP_ENABLED !== "true",
    minPasswordLength: 12,
    maxPasswordLength: 128,
  },
  rateLimit: { enabled: true, window: 60, max: 30 },
  trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [],
});
