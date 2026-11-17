
export async function readObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await request.text();
    if (!text || text.length > 4_096) return null;
    const value: unknown = JSON.parse(text);
    if (!value || Array.isArray(value) || typeof value !== "object") return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

export const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

export function textField(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length >= 3 && text.length <= max ? text : null;
}

export const badRequest = () => Response.json({ error: "Datos inválidos." }, { status: 400 });
export const unauthorized = () => Response.json({ error: "Acceso no autorizado." }, { status: 401 });
export const notFound = () => Response.json({ error: "No encontrado." }, { status: 404 });
export const serverError = () => Response.json({ error: "Error del servidor. Inténtalo más tarde." }, { status: 500 });
