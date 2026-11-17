import { createConnection } from "node:net";

/** ClamAV clamd zINSTREAM protocol. Clean result is the only success state. */
export async function scanWithClamAv(
  content:Buffer,
  opts:{host:string;port:number}
):Promise<void>{
  if(!Number.isInteger(opts.port) || opts.port<1 || opts.port>65535) throw new Error("Invalid clamd port");
  if(content.length===0 || content.length>1_048_576) throw new Error("Invalid scan size");
  await new Promise<void>((resolve,reject)=>{
    const socket=createConnection({host:opts.host,port:opts.port});
    let response="";
    let finished=false;
    function complete(error?:Error){
      if(finished)return;
      finished=true;socket.destroy();
      if(error) reject(error); else resolve();
    }
    socket.setTimeout(10_000,()=>complete(new Error("Antivirus timeout")));
    socket.on("error",()=>complete(new Error("Antivirus unavailable")));
    socket.on("end",()=>{
      if(!finished)complete(new Error("Antivirus returned incomplete response"));
    });
    socket.on("data",(chunk:Buffer)=>{
      response+=chunk.toString("utf8");
      if(response.length>1024){complete(new Error("Invalid antivirus response"));return;}
      const end=response.indexOf("\0");
      if(end===-1)return;
      const answer=response.slice(0,end).trim();
      if(answer==="stream: OK")complete();
      else complete(new Error("File failed antivirus scan"));
    });
    socket.on("connect",()=>{
      const size=Buffer.alloc(4);
      size.writeUInt32BE(content.length,0);
      socket.write(Buffer.from("zINSTREAM\0","ascii"));
      socket.write(size);
      socket.write(content);
      socket.write(Buffer.alloc(4));
    });
  });
}

export async function scanUploadedFile(content:Buffer):Promise<void>{
  const host=process.env.TOKENTIVA_CLAMD_HOST;
  const port=Number(process.env.TOKENTIVA_CLAMD_PORT ?? "3310");
  if(!host || !/^(127\.0\.0\.1|localhost|clamav)$/.test(host)) {
    throw new Error("ClamAV must be on a local or private trusted service");
  }
  await scanWithClamAv(content,{host,port});
}
