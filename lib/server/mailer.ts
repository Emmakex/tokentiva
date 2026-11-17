import { createTransport } from "nodemailer";

// Nunca imprimir enlaces ni tokens de verificación en logs.
export async function sendVerificationEmail(to: string, url: string) {
  const host = process.env.TOKENTIVA_SMTP_HOST;
  const user = process.env.TOKENTIVA_SMTP_USER;
  const pass = process.env.TOKENTIVA_SMTP_PASSWORD;
  const from = process.env.TOKENTIVA_SMTP_FROM;
  if (!host || !user || !pass || !from) throw new Error("Email verification transport is not configured.");
  const port = Number(process.env.TOKENTIVA_SMTP_PORT || "465");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid SMTP port.");
  const transport = createTransport({
    host, port, secure: port === 465,
    auth: { user, pass },
    requireTLS: port !== 465,
  });
  await transport.sendMail({
    from, to,
    subject: "Verifica tu correo · Tokentiva",
    text: "Confirma tu dirección de correo para acceder a Tokentiva:\n" + url + "\n\nSi no has solicitado este acceso, ignora el mensaje.",
  });
}
