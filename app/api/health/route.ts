import { pool } from "@/lib/server/db";
import { scanUploadedFile } from "@/lib/server/clamav";
import { uploadsEnabled } from "@/lib/server/documents";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Respuesta deliberadamente mínima: no expone nombres de servicios ni información de conexión.
export async function GET() {
  try {
    await pool.query("SELECT 1");
    if (uploadsEnabled()) {
      await scanUploadedFile(Buffer.from("tokentiva-ready-check", "ascii"));
    }
    return Response.json({ status: "ok" }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json({ status: "unavailable" }, {
      status: 503, headers: { "Cache-Control": "no-store" },
    });
  }
}
