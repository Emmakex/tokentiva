import { requireMfa,requireSameOrigin } from "@/lib/server/access";
import { isUuid,notFound,serverError,badRequest } from "@/lib/server/requests";
import { listDocuments,persistScannedDocument,uploadsEnabled } from "@/lib/server/documents";
import { readDocumentPayload } from "@/lib/server/document-payload";
import { MAX_DOCUMENT_BYTES,decodeUpload,safeFilename,sniffMime } from "@/lib/server/document-crypto";
import { scanUploadedFile } from "@/lib/server/clamav";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Context={params:Promise<{orgId:string;assetId:string}>};
const noStore={"Cache-Control":"private, no-store"};

export async function GET(request:Request,{params}:Context){
  const access=await requireMfa(request);
  if(!access.ok)return access.response;
  const {orgId,assetId}=await params;
  if(!isUuid(orgId)||!isUuid(assetId))return notFound();
  try{
    const documents=await listDocuments(access.session.userId,orgId,assetId);
    if(!documents)return notFound();
    return Response.json({documents,uploadEnabled:uploadsEnabled()},{headers:noStore});
  }catch{return serverError();}
}

export async function POST(request:Request,{params}:Context){
  const originError=requireSameOrigin(request);
  if(originError)return originError;
  const access=await requireMfa(request);
  if(!access.ok)return access.response;
  const {orgId,assetId}=await params;
  if(!isUuid(orgId)||!isUuid(assetId))return notFound();
  // Fail-closed: sin ClamAV y clave válida no acepta documentos.
  if(!uploadsEnabled())return Response.json({error:"Subidas desactivadas hasta configurar antivirus y cifrado."},{status:503,headers:noStore});
  const payload=await readDocumentPayload(request);
  const fileName=payload && safeFilename(payload.fileName);
  const bytes=payload && decodeUpload(payload.base64);
  const mime=bytes&&sniffMime(bytes);
  if(!payload||!fileName||!bytes||!mime||mime!==payload.mimeType||bytes.length>MAX_DOCUMENT_BYTES)return badRequest();
  try{
    // El escaneo debe terminar limpiamente antes de cifrar y almacenar.
    await scanUploadedFile(bytes);
  }catch{return Response.json({error:"Documento rechazado: el antivirus no pudo certificar su limpieza."},{status:422,headers:noStore});}
  try{
    const document=await persistScannedDocument(access.session.userId,orgId,assetId,fileName,mime,bytes);
    if(!document)return notFound();
    return Response.json({document},{status:201,headers:noStore});
  }catch{return serverError();}
}
