/**
 * Smoke test no autenticado: comprueba salud pública y denegación de APIs privadas.
 * No crea usuarios, documentos, inversiones ni datos reales.
 */
const origin = process.env.TOKENTIVA_STAGING_URL?.replace(/\/$/, "");
if (!origin || !origin.startsWith("https://")) {
  console.error("TOKENTIVA_STAGING_URL must be an HTTPS origin.");
  process.exit(2);
}
const base = new URL(origin);
if (base.pathname !== "/" || base.search || base.hash) {
  console.error("TOKENTIVA_STAGING_URL must be an origin only.");
  process.exit(2);
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}
try {
  const health = await fetch(origin + "/api/health", { cache: "no-store" });
  assert(health.status === 200, "health must be 200");
  const body = await health.json();
  assert(body.status === "ok", "health body must be ok");
  const publicPage = await fetch(origin + "/", { redirect:"manual" });
  assert(publicPage.status === 200, "landing must be 200");
  const privatePage = await fetch(origin + "/workspace", { redirect: "manual" });
  assert([302,303,307,308].includes(privatePage.status), "workspace must redirect without a session");
  const blocked = await fetch(origin + "/api/organizations", { redirect:"manual" });
  assert(blocked.status === 401, "organization API must reject anonymous access");
  console.log("TOKENTIVA_STAGING_SMOKE_OK");
} catch (error) {
  console.error("TOKENTIVA_STAGING_SMOKE_FAILED:", error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
