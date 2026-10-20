/** Incremental offline review. Suggestions never become approved interpretations. */
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {readFile,readdir,writeFile,rename,mkdir,access} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {summarizeResult,aggregateViews} from './audit-coverage.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const sha=value=>createHash('sha256').update(value).digest('hex');
const exists=path=>access(path).then(()=>true,()=>false);
async function atomic(path,value){await writeFile(path+'.tmp',JSON.stringify(value,null,2)+'\n');await rename(path+'.tmp',path);}
export async function engineSignature(directory=root){
 const files=[];
 async function walk(relative){for(const entry of await readdir(join(directory,relative),{withFileTypes:true})){
  const path=join(relative,entry.name);
  if(entry.isDirectory())await walk(path);
  else if(/\.(?:ts|js|json)$/.test(entry.name)&&!/\.(?:test|spec)\./.test(entry.name))files.push(path);
 }}
 await walk('src');
 files.push('package-lock.json','scripts/audit-coverage.mjs','scripts/audit-acquired-sources.mjs');
 const hash=createHash('sha256');
 for(const path of files.sort()){hash.update(path.replaceAll('\\','/'));hash.update('\0');hash.update(await readFile(join(directory,path)));hash.update('\0');}
 return hash.digest('hex');
}
async function defaultReview(input){
 const [{readContraDbImport},{prepareContraDbReview}]=await Promise.all([import('../src/contradb-import.ts'),import('../src/source-review.ts')]);
 const raw=readContraDbImport(input),review=prepareContraDbReview(input);
 return {title:raw.record?.title,rawDefaults:summarizeResult(raw),
  conventionalSuggestions:{...summarizeResult(review.result),choiceStatus:'suggested-not-approved',suggestionKinds:[...new Set(review.suggestions.map(s=>s.kind))].sort(),interpretation:review.interpretation}};
}
export async function auditPass({snapshotDir=join(root,'research/contradb/snapshots'),outputDir=join(root,'research/contradb/review-cache'),includeFixtures=false,signature,onProgress=()=>{},shouldStop=()=>false}={},deps={}){
 const {readContraDbSource}=await import('../src/contradb-source.ts');
 signature??=await engineSignature();await mkdir(outputDir,{recursive:true});
 const fixtures=deps.fixtureDir??join(root,'test-data/contradb');
 const files=new Map();
 if(includeFixtures)for(const name of await readdir(fixtures))if(/^[1-9]\d{0,9}\.json$/.test(name))files.set(name,join(fixtures,name));
 if(await exists(snapshotDir))for(const name of await readdir(snapshotDir)){
  if(!/^[1-9]\d{0,9}\.json$/.test(name)||files.has(name))continue;
  if(!includeFixtures&&await exists(join(fixtures,name)))continue;
  files.set(name,join(snapshotDir,name));
 }
 const sources=[],statistics={available:files.size,reviewed:0,reused:0,errors:0};
 for(const [name,path] of [...files].sort(([a],[b])=>Number(a.slice(0,-5))-Number(b.slice(0,-5)))){
  if(shouldStop())break;
  const id=name.slice(0,-5),cachePath=join(outputDir,name);let item,inputHash,reviewedNow=false;
  try{
   const input=await readFile(path,'utf8');inputHash=sha(input);
   let cached;try{cached=JSON.parse(await readFile(cachePath,'utf8'));}catch{}
   const key=sha(signature+'\0'+inputHash);
   if(cached?.schema==='contra-studio/acquired-source-review'&&cached.version===1&&cached.id===id&&cached.cacheKey===key&&cached.inputSha256===inputHash&&cached.engineSignature===signature){
    item=cached;statistics.reused++;
   }else{
    const envelope=JSON.parse(input),parsed=readContraDbSource(input);
    if(envelope.schema!=='contra-studio/contradb-snapshot'||!parsed.record||parsed.record.sourceId!==id)throw Error('Invalid snapshot envelope or filename/source identity mismatch.');
    item={schema:'contra-studio/acquired-source-review',version:1,id,cacheKey:key,inputSha256:inputHash,engineSignature:signature,snapshotFingerprint:parsed.record.snapshotId,sourceUrl:parsed.record.sourceUrl,reviewedAt:new Date().toISOString(),...(await (deps.review??defaultReview)(input))};
    await atomic(cachePath,item);statistics.reviewed++;reviewedNow=true;
   }
  }catch(error){
   item={schema:'contra-studio/acquired-source-review',version:1,id,inputSha256:inputHash,engineSignature:signature,error:error.message,reviewedAt:new Date().toISOString()};
   // Error records deliberately have no cache key, so a later pass retries.
   await atomic(cachePath,item);
  }
  if(item.error)statistics.errors++;
  sources.push(item);
  if(reviewedNow&&statistics.reviewed%20===0)onProgress(statistics);
 }
 const report={schema:'contra-studio/acquired-source-review-summary',version:1,generatedAt:new Date().toISOString(),engineSignature:signature,snapshotDir:resolve(snapshotDir),includeFixtures,statistics,
  method:'Offline raw defaults and hypothetical conventional suggestions; no approved choices, Ready mutations, additional whole-period, body, browser, GPU or audio certification.',
  views:Object.fromEntries(['rawDefaults','conventionalSuggestions'].map(view=>[view,aggregateViews(sources,view)])),
  errors:sources.filter(s=>s.error).map(({id,error})=>({id,error}))};
 await atomic(join(outputDir,'summary.json'),report);
 return report;
}
export function parseArgs(args){
 const options={watch:false};
 for(const arg of args){
  if(arg==='--watch')options.watch=true;
  else if(arg==='--once')options.watch=false;
  else if(arg==='--include-fixtures')options.includeFixtures=true;
  else if(arg.startsWith('--snapshot-dir='))options.snapshotDir=resolve(arg.slice(15));
  else if(arg.startsWith('--output-dir='))options.outputDir=resolve(arg.slice(13));
  else if(arg.startsWith('--stop-file='))options.stopFile=resolve(arg.slice(12));
  else throw Error(`Unknown option: ${arg}`);
 }
 return options;
}
if(process.argv[1]&&pathToFileURL(resolve(process.argv[1])).href===import.meta.url){
 const options=parseArgs(process.argv.slice(2)),signature=await engineSignature();let stopped=false,lastSummary;
 process.on('SIGINT',()=>{stopped=true;});process.on('SIGTERM',()=>{stopped=true;});
 do{
  if(options.stopFile&&await exists(options.stopFile))break;
  // Imports stay cached: never relabel an old loaded engine with changed source bytes.
  if(await engineSignature()!==signature)throw Error('Engine source changed; restart the audit to use the new implementation.');
  const report=await auditPass({...options,signature,shouldStop:()=>stopped||!!options.stopFile&&existsSync(options.stopFile),onProgress:statistics=>console.log(JSON.stringify({progress:statistics}))});
  const summary=JSON.stringify({statistics:report.statistics,statuses:Object.fromEntries(Object.entries(report.views).map(([name,view])=>[name,view.statuses]))});
  if(summary!==lastSummary){console.log(summary);lastSummary=summary;}
  if(!options.watch||stopped)break;
  await new Promise(done=>setTimeout(done,2000));
 }while(!stopped);
}
