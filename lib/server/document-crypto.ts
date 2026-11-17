import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const MAX_DOCUMENT_BYTES = 1_048_576;
export type DocumentMime = "application/pdf" | "image/png" | "image/jpeg";

export function configuredEncryptionKey(): Buffer {
  const raw=process.env.TOKENTIVA_DOCS_KEY_B64;
  if(!raw || !/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) throw new Error("Document encryption key missing or malformed");
  const key=Buffer.from(raw,"base64");
  if(key.length!==32 || key.toString("base64")!==raw) throw new Error("Document encryption key must be 32 base64-encoded bytes");
  return key;
}

export function sniffMime(data:Buffer):DocumentMime|null{
  if(data.length===0 || data.length>MAX_DOCUMENT_BYTES) return null;
  if(data.subarray(0,5).equals(Buffer.from("%PDF-"))) return "application/pdf";
  if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return "image/png";
  if(data.length>=3 && data[0]===255 && data[1]===216 && data[2]===255) return "image/jpeg";
  return null;
}

export function safeFilename(name:string):string|null{
  const cleaned=name.trim().replace(/[^A-Za-z0-9._-]/g,"_").replace(/^\.+/,"");
  return cleaned.length>=3 && cleaned.length<=120 && !cleaned.includes("..") ? cleaned : null;
}

export function decodeUpload(base64:string):Buffer|null{
  if(base64.length>Math.ceil(MAX_DOCUMENT_BYTES/3)*4 + 4 ||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) return null;
  const decoded=Buffer.from(base64,"base64");
  if(decoded.length<1 || decoded.length>MAX_DOCUMENT_BYTES || decoded.toString("base64")!==base64) return null;
  return decoded;
}

function aad(organizationId:string,assetId:string,documentId:string):Buffer{
  return Buffer.from(JSON.stringify([organizationId,assetId,documentId]),"utf8");
}

export function encryptDocument(
  plaintext:Buffer,organizationId:string,assetId:string,documentId:string,key:Buffer
){
  if(key.length!==32 || plaintext.length<1 || plaintext.length>MAX_DOCUMENT_BYTES) throw new Error("Invalid encryption input");
  const iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",key,iv);
  cipher.setAAD(aad(organizationId,assetId,documentId));
  const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
  return {
    iv, ciphertext, authTag:cipher.getAuthTag(),
    sha256:createHash("sha256").update(plaintext).digest("hex")
  };
}

export function decryptDocument(
  encrypted:{iv:Buffer;ciphertext:Buffer;authTag:Buffer;sha256:string},
  organizationId:string,assetId:string,documentId:string,key:Buffer
):Buffer{
  if(key.length!==32 || encrypted.iv.length!==12 || encrypted.authTag.length!==16) throw new Error("Invalid encryption metadata");
  const decipher=createDecipheriv("aes-256-gcm",key,encrypted.iv);
  decipher.setAAD(aad(organizationId,assetId,documentId));
  decipher.setAuthTag(encrypted.authTag);
  const data=Buffer.concat([decipher.update(encrypted.ciphertext),decipher.final()]);
  if(createHash("sha256").update(data).digest("hex")!==encrypted.sha256) throw new Error("Document integrity mismatch");
  return data;
}
