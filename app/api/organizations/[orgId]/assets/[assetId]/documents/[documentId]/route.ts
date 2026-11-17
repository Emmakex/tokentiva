import { requireMfa,requireSameOrigin } from "@/lib/server/access";
import { isUuid,notFound,serverError } from "@/lib/server/requests";
import { fetchDocument,deleteDocument } from "@/lib/server/documents";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{orgId:string;assetId:string;documentId:string}>};
const headers={
  "Cache-Control":"private, no-store, max-age=0",
  "X-Content-Type-Options":"nosniff",
  "Content-Security-Policy":"default-src 'none'; sandbox",
};

export async function GET(request:Request,{params}:Context){
  const access=await requireMfa(request);
  if(!access.ok)return access.response;
  const {orgId,assetId,documentId}=await params;
  if(!isUuid(orgId)||!isUuid(assetId)||!isUuid(documentId))return notFound();
  try{
    const result=await fetchDocument(access.session.userId,orgId,assetId,documentId);
    if(!result)return notFound();
    // No renderizar documentos en la web: descarga octet-stream sin sniffing.
    const name=result.meta.file_name.replace(/[^A-Za-z0-9._-]/g,"_");
    return new Response(new Uint8Array(result.bytes),{
      headers:{
        ...headers,
        "Content-Type":"application/octet-stream",
        "Content-Disposition":'attachment; filename="'+name+'"',
        "Content-Length":String(result.bytes.length),
      }
    });
  }catch{return serverError();}
}

export async function DELETE(request:Request,{params}:Context){
  const originError=requireSameOrigin(request);
  if(originError)return originError;
  const access=await requireMfa(request);
  if(!access.ok)return access.response;
  const {orgId,assetId,documentId}=await params;
  if(!isUuid(orgId)||!isUuid(assetId)||!isUuid(documentId))return notFound();
  try{
    const removed=await deleteDocument(access.session.userId,orgId,assetId,documentId);
    if(!removed)return notFound();
    return new Response(null,{status:204,headers});
  }catch{return serverError();}
}
