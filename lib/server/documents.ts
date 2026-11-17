import { randomUUID } from "node:crypto";
import { pool } from "@/lib/server/db";
import { setTenantContext } from "@/lib/server/tenant-context";
import { configuredEncryptionKey,decryptDocument,encryptDocument,type DocumentMime } from "@/lib/server/document-crypto";

export type DocumentMeta={
  id:string;organization_id:string;asset_id:string;
  file_name:string;mime_type:DocumentMime;size_bytes:number;created_at:Date;
};
type StoredDocument=DocumentMeta&{
  sha256:string;iv:Buffer;auth_tag:Buffer;ciphertext:Buffer;
};

export function uploadsEnabled():boolean{
  return process.env.TOKENTIVA_DOCUMENT_UPLOADS_ENABLED==="true" &&
    !!process.env.TOKENTIVA_DOCS_KEY_B64 && !!process.env.TOKENTIVA_CLAMD_HOST;
}

/** Siempre comprueba membresía y que el activo pertenece al tenant. */
export async function listDocuments(userId:string,orgId:string,assetId:string):Promise<DocumentMeta[]|null>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await setTenantContext(client,orgId);
    const {rows}=await client.query<DocumentMeta>(
      `SELECT d.id,d.organization_id,d.asset_id,d.file_name,d.mime_type,d.size_bytes,d.created_at
       FROM asset_documents d
       JOIN assets a ON a.id=d.asset_id AND a.organization_id=d.organization_id
       WHERE d.organization_id=$1 AND d.asset_id=$2
         AND EXISTS(SELECT 1 FROM memberships m WHERE m.organization_id=$1 AND m.user_id=$3)
       ORDER BY d.created_at DESC LIMIT 100`,[orgId,assetId,userId]
    );
    const {rowCount}=await client.query(
      `SELECT 1 FROM assets a WHERE a.organization_id=$1 AND a.id=$2
       AND EXISTS(SELECT 1 FROM memberships m WHERE m.organization_id=$1 AND m.user_id=$3)`,
      [orgId,assetId,userId]
    );
    await client.query("COMMIT");
    return rowCount?rows:null;
  }catch(e){await client.query("ROLLBACK");throw e;}
  finally{client.release();}
}

export async function persistScannedDocument(
  userId:string,orgId:string,assetId:string,fileName:string,mimeType:DocumentMime,content:Buffer
):Promise<DocumentMeta|null>{
  const client=await pool.connect();
  const id=randomUUID();
  const encrypted=encryptDocument(content,orgId,assetId,id,configuredEncryptionKey());
  try{
    await client.query("BEGIN");
    await setTenantContext(client,orgId);
    const {rows}=await client.query<DocumentMeta>(
      `INSERT INTO asset_documents
         (id,organization_id,asset_id,file_name,mime_type,size_bytes,sha256,iv,auth_tag,ciphertext,created_by)
       SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
       WHERE EXISTS(
         SELECT 1 FROM assets a WHERE a.id=$3 AND a.organization_id=$2
           AND EXISTS(SELECT 1 FROM memberships m
             WHERE m.organization_id=$2 AND m.user_id=$11 AND m.role IN ('owner','editor'))
       )
       AND (SELECT COUNT(*) FROM asset_documents d WHERE d.organization_id=$2 AND d.asset_id=$3)<20
       RETURNING id,organization_id,asset_id,file_name,mime_type,size_bytes,created_at`,
      [id,orgId,assetId,fileName,mimeType,content.length,encrypted.sha256,
       encrypted.iv,encrypted.authTag,encrypted.ciphertext,userId]
    );
    if(!rows.length){await client.query("ROLLBACK");return null;}
    await client.query(
      "INSERT INTO audit_events (organization_id,actor_user_id,action,subject_id) VALUES($1,$2,'document.created',$3)",
      [orgId,userId,id]
    );
    await client.query("COMMIT");
    return rows[0];
  }catch(e){await client.query("ROLLBACK");throw e;}
  finally{client.release();}
}

export async function fetchDocument(
  userId:string,orgId:string,assetId:string,documentId:string
):Promise<{meta:DocumentMeta; bytes:Buffer}|null>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await setTenantContext(client,orgId);
    const {rows}=await client.query<StoredDocument>(
      `SELECT d.* FROM asset_documents d
       JOIN assets a ON a.id=d.asset_id AND a.organization_id=d.organization_id
       WHERE d.id=$4 AND d.organization_id=$1 AND d.asset_id=$2
         AND EXISTS(SELECT 1 FROM memberships m WHERE m.organization_id=$1 AND m.user_id=$3)`,
      [orgId,assetId,userId,documentId]
    );
    await client.query("COMMIT");
    if(!rows.length)return null;
    const d=rows[0];
    const bytes=decryptDocument({
      iv:d.iv,authTag:d.auth_tag,ciphertext:d.ciphertext,sha256:d.sha256
    },orgId,assetId,documentId,configuredEncryptionKey());
    return {meta:d,bytes};
  }catch(e){await client.query("ROLLBACK");throw e;}
  finally{client.release();}
}

export async function deleteDocument(
  userId:string,orgId:string,assetId:string,documentId:string
):Promise<boolean>{
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await setTenantContext(client,orgId);
    const result=await client.query(
      `DELETE FROM asset_documents d
       WHERE d.id=$4 AND d.organization_id=$1 AND d.asset_id=$2
         AND EXISTS(
           SELECT 1 FROM assets a WHERE a.id=$2 AND a.organization_id=$1)
         AND EXISTS(
           SELECT 1 FROM memberships m WHERE m.organization_id=$1 AND m.user_id=$3 AND m.role='owner'
         ) RETURNING id`,
      [orgId,assetId,userId,documentId]
    );
    if(!result.rowCount){await client.query("ROLLBACK");return false;}
    await client.query(
      "INSERT INTO audit_events (organization_id,actor_user_id,action,subject_id) VALUES($1,$2,'document.deleted',$3)",
      [orgId,userId,documentId]
    );
    await client.query("COMMIT");
    return true;
  }catch(e){await client.query("ROLLBACK");throw e;}
  finally{client.release();}
}
