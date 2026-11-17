import { auth } from "@/lib/auth";
import { createOrganizationForUser, listOrganizationsForUser } from "@/lib/server/tenant-data";
import { badRequest, readObject, serverError, textField, unauthorized } from "@/lib/server/requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return unauthorized();
  try {
    const organizations = await listOrganizationsForUser(session.user.id);
    return Response.json({ organizations }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return unauthorized();
  const body = await readObject(request);
  const name = textField(body?.name, 120);
  if (!name) return badRequest();
  try {
    const organization = await createOrganizationForUser(session.user.id, name);
    return Response.json({ organization }, { status: 201 });
  } catch {
    return serverError();
  }
}
