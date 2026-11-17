/**
 * Validación de configuración antes de lanzar compose. Lee las variables desde
 * el shell (ej. export -a; source deploy/.env.staging; export +a).
 * Nunca muestra credenciales.
 */
const env=process.env;
const fail=[];
const required=[
  "TOKENTIVA_STAGING_DOMAIN","TOKENTIVA_DB_ADMIN_PASSWORD","TOKENTIVA_DB_APP_PASSWORD",
  "BETTER_AUTH_SECRET","TOKENTIVA_SMTP_HOST","TOKENTIVA_SMTP_USER",
  "TOKENTIVA_SMTP_PASSWORD","TOKENTIVA_SMTP_FROM","TOKENTIVA_DOCS_KEY_B64"
];
for(const key of required)if(!env[key]||env[key].includes("CHANGE_ME")||env[key].includes(".invalid"))fail.push(key);
const domain=env.TOKENTIVA_STAGING_DOMAIN;
if(domain && (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)||domain.endsWith(".invalid")))fail.push("TOKENTIVA_STAGING_DOMAIN");
for(const key of ["TOKENTIVA_DB_ADMIN_PASSWORD","TOKENTIVA_DB_APP_PASSWORD"]){
  if(env[key] && !/^[a-f0-9]{32,}$/i.test(env[key]))fail.push(key+" (must be random hex, 32+ chars)");
}
if(env.TOKENTIVA_DB_ADMIN_PASSWORD === env.TOKENTIVA_DB_APP_PASSWORD)fail.push("DB passwords must differ");
if((env.BETTER_AUTH_SECRET?.length??0)<32)fail.push("BETTER_AUTH_SECRET");
if(env.TOKENTIVA_DOCS_KEY_B64 && Buffer.from(env.TOKENTIVA_DOCS_KEY_B64,"base64").length!==32)fail.push("TOKENTIVA_DOCS_KEY_B64");
if(env.TOKENTIVA_DOCUMENT_UPLOADS_ENABLED==="true")fail.push("TOKENTIVA_DOCUMENT_UPLOADS_ENABLED must be false for initial staging");
if(fail.length){console.error("STAGING_CONFIG_INVALID:",[...new Set(fail)].join(", "));process.exit(1);}
console.log("TOKENTIVA_STAGING_CONFIG_OK");
