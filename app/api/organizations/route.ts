import { requireMfa, requireSameOrigin } from "@/lib/server/access";
import { createOrganizationForUser, listOrganizationsForUser } from "@/lib/server/tenant-data";
import { badRequest, readObject, serverError, textField } from "@/lib/server/requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const access = await requireMfa(request);
  if (!access.ok) return access.response;
  try {
    const organizations = await listOrganizationsForUser(access.session.userId);
    return Response.json({ organizations }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return serverError();
  }
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const access = await requireMfa(request);
  if (!access.ok) return access.response;
  const body = await readObject(request);
  const name = textField(body?.name, 120);
  if (!name) return badRequest();
  try {
    const organization = await createOrganizationForUser(access.session.userId, name);
    return Response.json({ organization }, { status: 201 });
  } catch {
    return serverError();
  }
}
