import {before,after,test} from "node:test";
import assert from "node:assert/strict";
import {createServer} from "node:net";
import {pool} from "../lib/server/db";
import {createOrganizationForUser,createAssetForUser} from "../lib/server/tenant-data";
import {persistScannedDocument,listDocuments,fetchDocument,deleteDocument} from "../lib/server/documents";
import {decryptDocument,encryptDocument,sniffMime,safeFilename,decodeUpload,MAX_DOCUMENT_BYTES} from "../lib/server/document-crypto";
import {scanWithClamAv} from "../lib/server/clamav";
import {setTenantContext} from "../lib/server/tenant-context";

if(!process.env.DATABASE_URL?.includes("tokentiva_test"))throw new Error("Test DB only");
process.env.TOKENTIVA_DOCS_KEY_B64=Buffer.alloc(32,7).toString("base64");
const ownerA="docs-owner-a",ownerB="docs-owner-b",viewerA="docs-viewer";
let orgA="",orgB="",assetA="",docId="";
const sample=Buffer.from("%PDF-1.7\nTest harmless synthetic document\n%%EOF\n","ascii");

before(async()=>{
  orgA=(await createOrganizationForUser(ownerA,"Empresa privada A")).id;
  orgB=(await createOrganizationForUser(ownerB,"Empresa privada B")).id;
  const asset=await createAssetForUser(ownerA,orgA,"Activo documentos A","real_estate",500000);
  assert.ok(asset);
  assetA=asset.id;
  await pool.query("INSERT INTO memberships(organization_id,user_id,role) VALUES($1,$2,'viewer')",[orgA,viewerA]);
  const stored=await persistScannedDocument(ownerA,orgA,assetA,"demo.pdf","application/pdf",sample);
  assert.ok(stored);
  docId=stored.id;
});
after(async()=>{
  if(orgA)await pool.query("DELETE FROM organizations WHERE id=$1",[orgA]);
  if(orgB)await pool.query("DELETE FROM organizations WHERE id=$1",[orgB]);
  await pool.end();
});

test("AES-GCM vincula el contenido al tenant y detecta manipulación",()=>{
  const key=Buffer.alloc(32,9);
  const encrypted=encryptDocument(sample,orgA,assetA,docId,key);
  assert.notDeepEqual(encrypted.ciphertext,sample);
  assert.deepEqual(decryptDocument(encrypted,orgA,assetA,docId,key),sample);
  assert.throws(()=>decryptDocument(encrypted,orgB,assetA,docId,key));
  assert.throws(()=>decryptDocument(encrypted,orgA,assetA,docId,Buffer.alloc(32,8)));
  assert.throws(()=>decryptDocument({...encrypted,ciphertext:Buffer.alloc(sample.length)},orgA,assetA,docId,key));
});

test("validación MIME y tamaño estricta",()=>{
  assert.equal(sniffMime(sample),"application/pdf");
  assert.equal(sniffMime(Buffer.from("fake PDF")) ,null);
  assert.equal(sniffMime(Buffer.alloc(MAX_DOCUMENT_BYTES+1)),null);
  assert.equal(safeFilename("../../evil.pdf"),null);
  assert.equal(safeFilename("demo.pdf"),"demo.pdf");
  assert.deepEqual(decodeUpload(sample.toString("base64")),sample);
  assert.equal(decodeUpload("%%%"),null);
});

test("el servicio permite a su empresa y deniega al tenant ajeno",async()=>{
  const mine=await listDocuments(ownerA,orgA,assetA);
  assert.equal(mine?.some(d=>d.id===docId),true);
  assert.equal(await listDocuments(ownerB,orgA,assetA),null);
  assert.equal(await fetchDocument(ownerB,orgA,assetA,docId),null);
  assert.equal(await fetchDocument(ownerA,orgB,assetA,docId),null);
  const read=await fetchDocument(viewerA,orgA,assetA,docId);
  assert.deepEqual(read?.bytes,sample);
  assert.equal(await deleteDocument(viewerA,orgA,assetA,docId),false);
  assert.equal(await persistScannedDocument(ownerB,orgA,assetA,"other.pdf","application/pdf",sample),null);
});

test("PostgreSQL RLS oculta los documentos sin contexto o con contexto distinto",async()=>{
  assert.equal((await pool.query("SELECT id FROM asset_documents WHERE id=$1",[docId])).rowCount,0);
  const client=await pool.connect();
  try{
    await client.query("BEGIN");
    await setTenantContext(client,orgB);
    assert.equal((await client.query("SELECT id FROM asset_documents WHERE id=$1",[docId])).rowCount,0);
    assert.equal((await client.query("DELETE FROM asset_documents WHERE id=$1 RETURNING id",[docId])).rowCount,0);
    await client.query("COMMIT");
  }catch(err){await client.query("ROLLBACK");throw err;}
  finally{client.release();}
});

async function fakeClamd(verdict:"OK"|"FOUND") {
  const server=createServer(socket=>{
    let buffer=Buffer.alloc(0);
    socket.on("data",(chunk:Buffer)=>{
      buffer=Buffer.concat([buffer,chunk]);
      if(buffer.length<14 || buffer.subarray(0,10).toString()!=="zINSTREAM\0")return;
      const n=buffer.readUInt32BE(10);
      if(buffer.length>=14+n+4){
        socket.end(Buffer.from("stream: "+(verdict==="OK"?"OK":"Eicar-Test-Signature FOUND")+"\0"));
      }
    });
  });
  await new Promise<void>(resolve=>server.listen(0,"127.0.0.1",resolve));
  const address=server.address();
  if(!address||typeof address==="string")throw new Error("Test socket missing");
  return {server,port:address.port};
}

test("el protocolo antivirus acepta exclusivamente el resultado limpio",async()=>{
  const clean=await fakeClamd("OK");
  try{await scanWithClamAv(sample,{host:"127.0.0.1",port:clean.port});}
  finally{await new Promise<void>(r=>clean.server.close(()=>r()));}
  const infected=await fakeClamd("FOUND");
  try{await assert.rejects(scanWithClamAv(sample,{host:"127.0.0.1",port:infected.port}));}
  finally{await new Promise<void>(r=>infected.server.close(()=>r()));}
});

test("el propietario puede eliminar su documento y se registra auditoría",async()=>{
  assert.equal(await deleteDocument(ownerA,orgA,assetA,docId),true);
  assert.equal(await fetchDocument(ownerA,orgA,assetA,docId),null);
  const audit=await pool.query(
    "SELECT 1 FROM audit_events WHERE organization_id=$1 AND subject_id=$2 AND action='document.deleted'",[orgA,docId]
  );
  assert.equal(audit.rowCount,1);
});
