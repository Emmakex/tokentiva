/** Limita el tamaño antes de decodificar JSON. Una petición mal formada no se almacena. */
export async function readDocumentPayload(request:Request):Promise<{
  fileName:string; mimeType:string; base64:string;
}|null>{
  const max=1_600_000;
  const declared=request.headers.get("content-length");
  if(declared && Number(declared)>max) return null;
  if(!request.body) return null;
  const reader=request.body.getReader();
  const parts:Uint8Array[]=[];
  let length=0;
  try{
    while(true){
      const {value,done}=await reader.read();
      if(done)break;
      length+=value.byteLength;
      if(length>max){await reader.cancel();return null;}
      parts.push(value);
    }
    if(length===0) return null;
    const data:unknown=JSON.parse(Buffer.concat(parts.map(p=>Buffer.from(p))).toString("utf8"));
    if(!data || Array.isArray(data) || typeof data!=="object")return null;
    const payload=data as Record<string,unknown>;
    if(typeof payload.fileName!=="string" || typeof payload.mimeType!=="string" || typeof payload.base64!=="string")return null;
    return {fileName:payload.fileName,mimeType:payload.mimeType,base64:payload.base64};
  }catch{return null;}
  finally{reader.releaseLock();}
}
