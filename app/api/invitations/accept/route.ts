import { requireMfa, requireSameOrigin } from "@/lib/server/access";
import { acceptInvitation } from "@/lib/server/invitations";
import { badRequest, readObject, serverError } from "@/lib/server/requests";

export const runtime="nodejs";
export async function POST(request:Request) {
  const originError=requireSameOrigin(request);
  if(originError) return originError;
  const access=await requireMfa(request);
  if(!access.ok) return access.response;
  const body=await readObject(request);
  if(typeof body?.code!=="string") return badRequest();
  try {
    const result=await acceptInvitation(access.session.userId,access.session.email,access.session.emailVerified,body.code);
    if(result!=="accepted") return Response.json({error:"Invitación no válida o ya utilizada."},{status:400});
    return Response.json({accepted:true});
  } catch { return serverError(); }
}
