#!/usr/bin/env node
/** Offline, bounded source inspection. Never invents choices or regenerates archives. */
import {readFileSync,existsSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

const help=`Usage: node --experimental-strip-types scripts/inspect-source.mjs ID [ID ...] [--review] [--couples=N]

Inspect 1–20 explicit ContraDB IDs using only bundled data. Prefer saved Ready
interpretations (including their reviewed choices), otherwise inspect retained
snapshots without supplying new choices. Missing snapshots are metadata-only
or absent. --couples=2..12 additionally compiles available dances and reports
declared period fields and adapter IDs from the first repeat. Compilation is
not whole-period motion, GPU or audio verification. No network or file writes.
--review explicitly prepares conventional suggestions for raw snapshots and
reports their remaining diagnostics. Suggested choices are not authored source
facts or saved approvals; Ready archives retain their already saved choices.

Output: one JSON object; rows/figures capped at 64, diagnostics at 12, text at
240 characters. Each bounded list reports total and omitted counts. Exit 2
means invalid usage; exit 1 means an inspection error (not an unresolved source).
`;
const clip=value=>typeof value==='string'&&value.length>240?value.slice(0,239)+'…':value;
const bounded=(items,limit=12)=>({items:items.slice(0,limit),total:items.length,omitted:Math.max(0,items.length-limit)});
const root=new URL('../',import.meta.url);

export function parseArgs(args){
 if(args.includes('--help')||args.includes('-h'))return{help:true};
 const ids=[];let couples,review=false;
 for(const arg of args){
  if(arg==='--review'){
   if(review)throw Error('--review must occur at most once.');review=true;
  }else if(arg.startsWith('--couples=')){
   const value=arg.slice(10);
   if(couples!==undefined||!/^\d+$/.test(value)||+value<2||+value>12)throw Error('--couples must occur once with an integer from 2 to 12.');
   couples=+value;
  }else if(/^[1-9]\d{0,9}$/.test(arg))ids.push(arg);
  else throw Error(`Invalid argument: ${clip(arg)}`);
 }
 if(!ids.length||ids.length>20)throw Error('Supply between 1 and 20 explicit numeric source IDs.');
 return{ids:[...new Set(ids)],couples,...(review?{review:true}:{})};
}

export async function inspectSources(ids,{couples,review=false}={}){
 // Validate exported callers too; IDs become local fixture filenames below.
 const validated=parseArgs([...ids,...(review?['--review']:[]),...(couples===undefined?[]:[`--couples=${couples}`])]);
 const [{READY_LIBRARY},{readContraDbImport}]=await Promise.all([import('../src/ready-library.ts'),import('../src/contradb-import.ts')]);
 const catalogue=JSON.parse(readFileSync(new URL('public/contradb-index.json',root),'utf8'));
 const ready=new Map(READY_LIBRARY.map(item=>[String(item.id),item]));
 const metadata=new Map(catalogue.records.map(item=>[String(item.id),item]));
 const output=[];
 for(const id of validated.ids){
  try{
   const saved=ready.get(id),fixture=new URL(`test-data/contradb/${id}.json`,root),retained=existsSync(fixture),meta=metadata.get(id);
   const base={id,availability:saved?'ready-archive':retained?'retained-snapshot':meta?'metadata-only':'absent',retainedSnapshot:retained};
   if(!saved&&!retained){output.push({...base,...(meta?{title:clip(meta.title),author:clip(meta.author),formation:clip(meta.formation)}:{}),...(review?{review:{status:'not-run',reason:'No retained source or saved interpretation.'}}:{}),...(couples===undefined?{}:{compilation:{status:'not-run',reason:'No retained source or saved interpretation.'}})});continue;}
   const input=saved?saved.archive:readFileSync(fixture,'utf8');
   let result=readContraDbImport(input),reviewSummary;
   if(review){
    if(saved)reviewSummary={status:'saved-choices-retained',suggestions:bounded([])};
    else{
     const {prepareContraDbReview}=await import('../src/source-review.ts');
     const prepared=prepareContraDbReview(input);
     const choices=Object.entries(prepared.interpretation).flatMap(([key,value])=>key==='rows'?Object.entries(value).flatMap(([rowId,row])=>Object.entries(row).map(([name,choice])=>({path:`rows.${rowId}.${name}`,value:choice}))):[{path:key,value}]);
     reviewSummary={status:'suggested-not-authored',baselineCoverage:result.coverage,suggestions:bounded(prepared.suggestions.map(s=>({rowId:s.rowId,kind:s.kind,message:clip(s.message)}))),choices:bounded(choices.map(c=>({path:c.path,valueJson:clip(JSON.stringify(c.value)),truncated:JSON.stringify(c.value).length>240})),64)};
     result=prepared.result;
    }
   }
   const record=result.record;
   const figures=result.dance?.figures??result.rows.flatMap(row=>row.figures);
   const item={...base,...(reviewSummary?{review:reviewSummary}:{}),title:clip(record?.title??saved?.title),author:clip(record?.author??saved?.author),formation:clip(record?.formation),sourceUrl:record?.sourceUrl,snapshotId:record?.snapshotId,coverage:result.coverage,
    figures:bounded(figures.map(f=>({id:f.id,kind:f.kind,beats:f.beats,who:f.who,amount:f.amount,direction:f.direction,passingShoulder:f.passingShoulder,entry:f.entry,exit:f.exit,progression:f.progression})),64),
    unresolvedRows:bounded(result.rows.filter(row=>!row.resolved).map(row=>({id:row.source.id,beats:row.source.beats,text:clip(row.source.text),recognized:row.recognized,diagnosticCodes:[...new Set(row.diagnostics.map(d=>d.code))]})),64),
    diagnostics:bounded(result.diagnostics.map(d=>({code:d.code,severity:d.severity,row:d.row,message:clip(d.message)}))),errors:bounded(result.errors.map(clip)),warnings:bounded(result.warnings.map(clip))};
   if(couples!==undefined){
    if(!result.dance)item.compilation={status:'not-run',reason:'Import has no executable dance.'};
    else try{
     const {compileChoreography}=await import('../src/choreography.ts');
     const program=compileChoreography(result.dance,couples);
     const periods={};for(const key of['periodRepeats','periodRounds','period','periodStart'])if(Number.isFinite(program[key]))periods[key]=program[key];
     const proofs=typeof program.sequenceBoundaries==='function'?program.sequenceBoundaries(0):undefined;
     item.compilation={status:'compiled',couples,totalBeats:program.totalBeats,repeatable:program.repeatable,declaredPeriod:periods,adapters:proofs?bounded([...new Set(proofs.map(p=>p.adapterId))],64):null,adapterScope:proofs?'first-repeat':'not-exposed',verification:'compile-only; no sampled-motion/GPU/audio checks'};
    }catch(error){item.compilation={status:'rejected',couples,message:clip(error.message)};}
   }
   output.push(item);
  }catch(error){output.push({id,status:'inspection-error',message:clip(error.message)});}
 }
 return{schema:'contra-studio/source-inspection',version:1,sources:output};
}

if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 let args;
 try{args=parseArgs(process.argv.slice(2));}
 catch(error){process.stderr.write(clip(error.message)+'\n'+help);process.exitCode=2;}
 if(args?.help)process.stdout.write(help);
 else if(args)try{
  const result=await inspectSources(args.ids,args);process.stdout.write(JSON.stringify(result,null,2)+'\n');if(result.sources.some(source=>source.status==='inspection-error'))process.exitCode=1;
 }catch(error){process.stderr.write(clip(error.message)+'\n');process.exitCode=1;}
}
