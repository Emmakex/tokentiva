import { requireMfa, requireSameOrigin } from "@/lib/server/access";
import { createAssetForUser, listAssetsForUser, type AssetKind } from "@/lib/server/tenant-data";
import { badRequest, isUuid, notFound, readObject, serverError, textField } from "@/lib/server/requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ orgId: string }> };
const kinds: AssetKind[] = ["real_estate", "business_financing", "energy", "other"];

export async function GET(request: Request, { params }: Context) {
  const access = await requireMfa(request);
  if (!access.ok) return access.response;
  const { orgId } = await params;
  if (!isUuid(orgId)) return notFound();
  try {
    const assets = await listAssetsForUser(access.session.userId, orgId);
    if (!assets) return notFound();
    return Response.json({ assets }, { headers: { "Cache-Control": "no-store" } });
  } catch { return serverError(); }
}

export async function POST(request: Request, { params }: Context) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const access = await requireMfa(request);
  if (!access.ok) return access.response;
  const { orgId } = await params;
  if (!isUuid(orgId)) return notFound();
  const body = await readObject(request);
  const name = textField(body?.name, 100);
  if (!name || !kinds.includes(body?.kind as AssetKind) ||
    typeof body?.valueCents !== "number" || !Number.isSafeInteger(body.valueCents) ||
    body.valueCents <= 0 || body.valueCents > 100000000000) return badRequest();
  try {
    const asset = await createAssetForUser(access.session.userId, orgId, name, body.kind as AssetKind, body.valueCents);
    if (!asset) return notFound();
    return Response.json({ asset }, { status: 201 });
  } catch { return serverError(); }
}
