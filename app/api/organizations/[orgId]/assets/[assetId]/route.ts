import { requireMfa, requireSameOrigin } from "@/lib/server/access";
import { deleteAssetForUser, updateAssetStatusForUser, type AssetStatus } from "@/lib/server/tenant-data";
import { badRequest, isUuid, notFound, readObject, serverError } from "@/lib/server/requests";

export const runtime = "nodejs";
type Context = { params: Promise<{ orgId: string; assetId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const access = await requireMfa(request);
  if (!access.ok) return access.response;
  const { orgId, assetId } = await params;
  if (!isUuid(orgId) || !isUuid(assetId)) return notFound();
  const body = await readObject(request);
  if (body?.status !== "draft" && body?.status !== "internal_review") return badRequest();
  try {
    const asset = await updateAssetStatusForUser(access.session.userId, orgId, assetId, body.status as AssetStatus);
    if (!asset) return notFound();
    return Response.json({ asset });
  } catch { return serverError(); }
}

export async function DELETE(request: Request, { params }: Context) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const access = await requireMfa(request);
  if (!access.ok) return access.response;
  const { orgId, assetId } = await params;
  if (!isUuid(orgId) || !isUuid(assetId)) return notFound();
  try {
    const deleted = await deleteAssetForUser(access.session.userId, orgId, assetId);
    if (!deleted) return notFound();
    return new Response(null, { status: 204 });
  } catch { return serverError(); }
}
