#!/usr/bin/env node
/** Rank cached whole-corpus obstacles without approving choices or changing sources. */
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {engineSignature} from './audit-acquired-sources.mjs';
import {READY_LIBRARY} from '../src/ready-library.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const args=process.argv.slice(2),option=(name,fallback)=>args.find(a=>a.startsWith(`--${name}=`))?.slice(name.length+3)??fallback;
for(const arg of args)if(!/^--(?:cache|output|limit)=/.test(arg))throw Error(`Unknown option: ${arg}`);
const cache=resolve(root,option('cache','research/contradb/scale-current-cache'));
const limit=Number(option('limit','30'));
if(!Number.isInteger(limit)||limit<1||limit>500)throw Error('limit must be an integer from 1 to 500');
const summary=JSON.parse(await readFile(join(cache,'summary.json'),'utf8'));
const signature=await engineSignature(),ready=new Set(READY_LIBRARY.map(s=>String(s.id)));
const rows=[];
for(const name of await readdir(cache)){
 if(!/^\d+\.json$/.test(name))continue;
 const item=JSON.parse(await readFile(join(cache,name),'utf8'));
 if(item.engineSignature!==summary.engineSignature)throw Error(`Mixed engine cache: ${name}`);
 if(item.error)throw Error(`Review error in ${name}: ${item.error}`);
 if(!ready.has(String(item.id)))rows.push(item);
}
const clauses=new Map(),diagnostics=new Map(),clusters=new Map();
const evidence=s=>({id:s.id,title:s.title,sourceUrl:s.sourceUrl,snapshotFingerprint:s.snapshotFingerprint,status:s.conventionalSuggestions.status,diagnostics:s.conventionalSuggestions.diagnostics,unresolvedRows:s.conventionalSuggestions.unresolvedRows,interpretation:s.conventionalSuggestions.interpretation});
for(const s of rows){
 const view=s.conventionalSuggestions;
 for(const text of new Set(view.unresolvedRows.map(r=>r.text))){
  const ids=clauses.get(text)??[];ids.push(s.id);clauses.set(text,ids);
 }
 for(const d of view.diagnostics){const key=`${d.code}: ${d.message}`,ids=diagnostics.get(key)??[];ids.push(s.id);diagnostics.set(key,ids);}
 if(view.unresolvedRows.length){const key=JSON.stringify([...new Set(view.unresolvedRows.map(r=>r.text))].sort()),ids=clusters.get(key)??[];ids.push(s.id);clusters.set(key,ids);}
}
const rank=(a,b)=>b.sources-a.sources||JSON.stringify(a).localeCompare(JSON.stringify(b));
const report={generatedAt:new Date().toISOString(),engineSignature:summary.engineSignature,currentEngineSignature:signature,engineUnchanged:signature===summary.engineSignature,cache,
 scope:'Cached hypothetical suggestions; source wording and choices preserved. Counts overlap and are not projected admissions. No new Ready entries, full-period, body, browser, GPU or audio certification.',
 totals:{reviewed:summary.statistics,ready:ready.size,unsaved:rows.length,statuses:Object.fromEntries([...new Set(rows.map(s=>s.conventionalSuggestions.status))].map(status=>[status,rows.filter(s=>s.conventionalSuggestions.status===status).length]))},
 candidates:rows.filter(s=>s.conventionalSuggestions.status==='import-admitted').map(evidence),
 motionBlocked:rows.filter(s=>s.conventionalSuggestions.status==='motion-or-validation-blocked').map(evidence),
 clauseRanking:[...clauses].map(([text,sourceIds])=>({text,sources:sourceIds.length,sourceIds,soleUnresolvedClauseSources:sourceIds.filter(id=>rows.find(s=>s.id===id).conventionalSuggestions.unresolvedRows.every(r=>r.text===text))})).sort(rank).slice(0,limit),
 diagnosticRanking:[...diagnostics].map(([diagnostic,sourceIds])=>({diagnostic,sources:sourceIds.length,sourceIds})).sort(rank).slice(0,limit),
 unresolvedClauseClusters:[...clusters].map(([texts,sourceIds])=>({texts:JSON.parse(texts),sources:sourceIds.length,sourceIds})).sort(rank).slice(0,limit),
 nearResolved:rows.filter(s=>s.conventionalSuggestions.unresolvedRows.length<=2&&s.conventionalSuggestions.status==='interpretation-blocked').map(evidence)};
const output=option('output','research/contradb/scale-candidates.json');
await writeFile(resolve(root,output),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,engineUnchanged:report.engineUnchanged,totals:report.totals,candidates:report.candidates.map(s=>({id:s.id,title:s.title})),motionBlocked:report.motionBlocked.map(s=>({id:s.id,title:s.title})),topClauses:report.clauseRanking.slice(0,10).map(({text,sources,soleUnresolvedClauseSources})=>({text,sources,soleUnresolvedClauseSources:soleUnresolvedClauseSources.length}))},null,2));
