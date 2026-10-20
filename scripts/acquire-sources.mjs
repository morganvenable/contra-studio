import {createHash} from 'node:crypto';
import {readFile,writeFile,rename,mkdir,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {readContraDbSource,makeContraDbSnapshot} from '../src/contradb-source.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=text=>createHash('sha256').update(text).digest('hex');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const exists=path=>access(path).then(()=>true,()=>false);
async function atomic(path,value){await writeFile(path+'.tmp',JSON.stringify(value,null,2)+'\n');await rename(path+'.tmp',path);}
export function sanitizePage(html){return html.replace(/<(input|meta)\b[^>]*>/gi,tag=>/csrf|authenticity|token|password/i.test(tag)?'':tag);}
export function canonicalize(html,id,time){
 const options={sourceUrl:`https://contradb.com/dances/${id}`,retrievedAt:time};
 const raw=readContraDbSource(html,options),clean=readContraDbSource(sanitizePage(html),options);
 if(!raw.record||!clean.record)throw Error('no-source-record');
 if(raw.record.snapshotId!==clean.record.snapshotId)throw Error('sanitization-changed-source');
 if(clean.diagnostics.some(d=>d.code==='active-source-element'))throw Error('active-source-element');
 if(clean.diagnostics.some(d=>['figure-outside-table','source-field','source-table'].includes(d.code)))throw Error('incomplete-source-preservation');
 if(clean.diagnostics.some(d=>d.code==='source-id-conflict')||clean.record.sourceId!==String(id))throw Error('source-id-conflict');
 const snapshot=makeContraDbSnapshot(clean.record),round=readContraDbSource(JSON.stringify(snapshot));
 if(round.record?.snapshotId!==clean.record.snapshotId)throw Error('snapshot-roundtrip-changed');
 return{snapshot,fingerprint:clean.record.snapshotId,rows:clean.record.rows.length,structurallyValid:clean.structurallyValid,diagnostics:clean.diagnostics.map(d=>({code:d.code,severity:d.severity,row:d.row}))};
}
export function parseArgs(args){
 const options={run:false,limit:Infinity,intervalMs:1100,retryFailures:false};
 for(let i=0;i<args.length;i++){
  const arg=args[i];if(arg==='--run')options.run=true;else if(arg==='--retry-failures')options.retryFailures=true;
  else if(arg==='--help')options.help=true;
  else if(['--limit','--interval-ms','--output'].includes(arg)){const value=args[++i];if(value===undefined)throw Error('Missing value');if(arg==='--output')options.output=resolve(value);else{const n=Number(value);if(!Number.isSafeInteger(n)||n<(arg==='--limit'?1:1000))throw Error('Invalid numeric option');options[arg==='--limit'?'limit':'intervalMs']=n;}}
  else throw Error('Unknown argument: '+arg);
 }
 return options;
}
export async function acquire(options={},deps={}){
 const fetcher=deps.fetch??fetch,pause=deps.sleep??sleep,now=deps.now??(()=>Date.now());
 const output=options.output??join(root,'research/contradb');await mkdir(join(output,'snapshots'),{recursive:true});
 const catalogue=deps.catalogue??JSON.parse(await readFile(join(root,'public/contradb-index.json'),'utf8')).records;
 const fixtureDir=deps.fixtureDir??join(root,'test-data/contradb');
 const manifestPath=join(output,'manifest.json');let manifest={schema:'contra-studio/source-acquisition',version:1,records:{}};
 if(await exists(manifestPath)){manifest=JSON.parse(await readFile(manifestPath,'utf8'));if(manifest.version!==1||!manifest.records)throw Error('Invalid manifest');}
 const ids=[...new Set(catalogue.map(r=>String(r.id)))];if(ids.some(id=>!/^\d{1,10}$/.test(id)||Number(id)<1))throw Error('Invalid catalogue ID');
 const pending=[];let retained=0,resumed=0;
 for(const id of ids){if(await exists(join(fixtureDir,id+'.json'))){retained++;continue;}const prior=manifest.records[id];if(prior){let verified=false;if(prior.status==='saved'||prior.status==='saved-with-diagnostics'){try{const text=await readFile(join(output,'snapshots',id+'.json'),'utf8');const parsed=readContraDbSource(text);verified=parsed.record?.sourceId===id&&parsed.record?.snapshotId===prior.snapshotFingerprint&&(!prior.snapshotSha256||sha(text)===prior.snapshotSha256)&&!parsed.diagnostics.some(d=>['source-id-conflict','active-source-element'].includes(d.code));}catch{}}else verified=!options.retryFailures;if(verified){resumed++;continue;}}pending.push(id);}
 const summary={catalogue:ids.length,retained,resumed,pending:pending.length,attempted:0,saved:0,failed:0};
 if(!options.run)return summary;
 const interval=Math.max(1000,options.intervalMs??1100);let last=-Infinity,consecutiveNetwork=0;
 for(const id of pending.slice(0,options.limit??Infinity)){
  const url=`https://contradb.com/dances/${id}`,entry={id,url,retrievedAt:new Date(now()).toISOString(),status:'failed',attempts:0};let stop=false;
  for(let attempt=0;attempt<3;attempt++){
   await pause(Math.max(0,last+interval-now()));last=now();entry.attempts++;
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
   try{
    const response=await fetcher(url,{redirect:'manual',credentials:'omit',signal:controller.signal,headers:{Accept:'text/html','User-Agent':'ContraStudioSourceResearch/1.0 (public choreography archive)'}});entry.httpStatus=response.status;
    if(response.status===403){await response.body?.cancel();entry.reason='http-403';stop=true;break;}
    if(response.status===429||response.status===503){
     const retry=response.headers.get('retry-after');await response.body?.cancel();
     const delay=retry===null?2000*2**attempt:/^\d+$/.test(retry)?Number(retry)*1000:Math.max(0,Date.parse(retry)-now());
     entry.reason='http-'+response.status;
     if(!Number.isFinite(delay)||delay>120000||attempt===2){stop=true;break;}
     await pause(Math.max(interval,delay));continue;
    }
    if(!response.ok){await response.body?.cancel();entry.reason='http-'+response.status;break;}
    if(!/^text\/html(?:;|$)/i.test(response.headers.get('content-type')??'')){await response.body?.cancel();entry.reason='unexpected-content-type';break;}
    const date=response.headers.get('date'),modified=response.headers.get('last-modified');if(date&&Number.isFinite(Date.parse(date)))entry.serverDate=new Date(date).toISOString();if(modified&&Number.isFinite(Date.parse(modified)))entry.lastModified=new Date(modified).toISOString();
    if(Number(response.headers.get('content-length'))>500000){await response.body?.cancel();entry.reason='response-too-large';break;}
    const reader=response.body.getReader(),chunks=[];let length=0;
    while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>500000){await reader.cancel();throw Error('response-too-large');}chunks.push(Buffer.from(part.value));}
    const bytes=Buffer.concat(chunks);entry.responseSha256=sha(bytes);entry.responseBytes=bytes.length;
    const parsed=canonicalize(bytes.toString('utf8'),id,entry.retrievedAt);
    await atomic(join(output,'snapshots',id+'.json'),parsed.snapshot);
    Object.assign(entry,{status:parsed.structurallyValid?'saved':'saved-with-diagnostics',snapshotFingerprint:parsed.fingerprint,snapshotSha256:sha(JSON.stringify(parsed.snapshot,null,2)+'\n'),rows:parsed.rows,diagnostics:parsed.diagnostics});delete entry.reason;consecutiveNetwork=0;break;
   }catch(error){
    const known=['response-too-large','no-source-record','sanitization-changed-source','active-source-element','snapshot-roundtrip-changed','source-id-conflict','incomplete-source-preservation'];
    entry.reason=known.includes(error.message)?error.message:'network-or-storage-error';
    if(known.includes(error.message))break;
    consecutiveNetwork++;if(consecutiveNetwork>=3){stop=true;break;}if(attempt<2)await pause(2000*2**attempt);
   }finally{clearTimeout(timer);}
  }
  manifest.records[id]=entry;manifest.updatedAt=new Date(now()).toISOString();await atomic(manifestPath,manifest);
  summary.attempted++;if(entry.status.startsWith('saved'))summary.saved++;else summary.failed++;
  deps.onRecord?.(entry,summary);if(stop){summary.stopped=entry.reason;break;}
 }
 return summary;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 try{const options=parseArgs(process.argv.slice(2));if(options.help)console.log('Usage: node --experimental-strip-types scripts/acquire-sources.mjs [--run] [--limit N] [--interval-ms N>=1000] [--retry-failures] [--output DIR]\nDefault: local summary only. Saves canonical snapshots and a resumable manifest under research/contradb; never promotes dances to Ready.');else console.log(JSON.stringify(await acquire(options,{onRecord:(e,s)=>console.log(JSON.stringify({id:e.id,status:e.status,rows:e.rows,reason:e.reason,completed:s.attempted}))}),null,2));}catch(error){console.error(error.message);process.exitCode=1;}
}
