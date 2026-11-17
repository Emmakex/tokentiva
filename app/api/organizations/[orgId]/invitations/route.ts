import { requireMfa, requireSameOrigin } from "@/lib/server/access";
import { createInvitation, listInvitations, normalizeEmail, revokeInvitation } from "@/lib/server/invitations";
import { badRequest, isUuid, notFound, readObject, serverError } from "@/lib/server/requests";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{orgId:string}> };

export async function GET(request:Request,{params}:Context) {
  const access=await requireMfa(request);
  if(!access.ok) return access.response;
  const {orgId}=await params;
  if(!isUuid(orgId)) return notFound();
  try {
    const invitations=await listInvitations(access.session.userId,orgId);
    return Response.json({invitations},{headers:{"Cache-Control":"no-store"}});
  } catch { return serverError(); }
}

export async function POST(request:Request,{params}:Context) {
  const originError=requireSameOrigin(request);
  if(originError) return originError;
  const access=await requireMfa(request);
  if(!access.ok) return access.response;
  const {orgId}=await params;
  if(!isUuid(orgId)) return notFound();
  const body=await readObject(request);
  const email=typeof body?.email==="string" ? normalizeEmail(body.email) : null;
  const role=body?.role;
  if(!email || (role!=="editor" && role!=="viewer")) return badRequest();
  try {
    const result=await createInvitation(access.session.userId,orgId,email,role);
    if(!result) return notFound();
    return Response.json({invitation:result},{status:201,headers:{"Cache-Control":"no-store"}});
  } catch { return serverError(); }
}

export async function DELETE(request:Request,{params}:Context) {
  const originError=requireSameOrigin(request);
  if(originError) return originError;
  const access=await requireMfa(request);
  if(!access.ok) return access.response;
  const {orgId}=await params;
  if(!isUuid(orgId)) return notFound();
  const body=await readObject(request);
  if(typeof body?.id!=="string" || !isUuid(body.id)) return badRequest();
  try {
    const revoked=await revokeInvitation(access.session.userId,orgId,body.id);
    if(!revoked) return notFound();
    return new Response(null,{status:204});
  } catch { return serverError(); }
}
