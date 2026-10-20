import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {makeContraDbSnapshot} from './contradb-source.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {compileChoreography} from './choreography.ts';
const raw=readFileSync(new URL('../test-data/contradb/3496.json',import.meta.url),'utf8');
const caps=REGISTERED_MOTION_CAPABILITIES;
const rowId='contradb:3496:row:6';
function prepared(){const p=prepareContraDbReview(raw,[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return p;}
function changed(from:string,to:string){const snapshot=JSON.parse(raw);assert.ok(snapshot.html.includes(from),from);snapshot.html=snapshot.html.replace(from,to);return JSON.stringify(snapshot);}
test('3496 exact source and snapshot-bound square-through interpretation replay all source counts',()=>{
 const p=prepared(),r=p.result,d=r.dance!,record=r.record!,archive=JSON.parse(d.sourceText);
 assert.equal(record.title,'Fair and Square');assert.equal(record.author,'John Coffman');assert.equal(record.snapshotId,'contradb:3496:960660f055da3fb2');assert.equal(record.rows.length,7);assert.equal(record.rows.reduce((n,r)=>n+r.beats!,0),64);assert.equal(d.figures.length,9);assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);
 assert.equal(record.rows[6].text,'square through two - partners balance & pull by right, then neighbors pull by left ⁋');assert.deepEqual(record.rows.filter(r=>r.progression).map(r=>r.index),[6]);
 assert.deepEqual(p.interpretation.rows,{ 'contradb:3496:row:0':{balanceBeats:4},'contradb:3496:row:2':{balanceBeats:4},[rowId]:{squareThrough:{phaseBeats:[4,2,2]}}});
 const f=d.figures.at(-1)!;assert.deepEqual([f.kind,f.beats,f.who,f.amount,f.hands,f.entry,f.exit,f.phaseBeats,f.progression],['square-through',8,'all',2,'right-left','partners-facing-across','progressed-neighbors',[4,2,2],true]);assert.equal(d.figures.filter(f=>f.progression).length,1);
 assert.deepEqual(archive.snapshot,makeContraDbSnapshot(record));assert.equal(archive.sourceSnapshotId,record.snapshotId);assert.equal(archive.snapshot.retrievedAt,'2026-10-18T20:51:49.819855+00:00');
 const replay=readContraDbImport(d.sourceText,{capabilities:caps});assert.deepEqual(replay.dance,d);assert.equal(replay.record!.original,record.original);assert.deepEqual(replay.interpretation,p.interpretation);
 const c=compileChoreography(d,2,caps);assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);for(const beat of[0,56,60,61,62,63,63.5,64,65,128])assert.ok(c.sample(beat).poses.every(p=>Number.isFinite(p.position.x+p.position.z+p.yaw)));
 assert.match(r.rows[6].interpretations.join(' '),/omits the internal split/);assert.match(r.rows[6].interpretations.join(' '),/final three-quarter count after the left-hand gate/);
});
test('square-through timing, prefix choices and caller-owned capabilities remain removable',()=>{
 const p=prepared();
 for(const id of['contradb:3496:row:0','contradb:3496:row:2',rowId]){const i=structuredClone(p.interpretation);delete i.rows![id];assert.equal(readContraDbImport(raw,{interpretation:i,capabilities:caps}).dance,undefined,id);}
 for(const choice of[undefined,{phaseBeats:[2,3,3]},{phaseBeats:[4,2,2,0]},{phaseBeats:[4,2,2],extraTurn:1},{phaseBeats:'4,2,2'},null]){const i=structuredClone(p.interpretation)as any;i.rows[rowId].squareThrough=choice;assert.equal(readContraDbImport(raw,{interpretation:i,capabilities:caps}).dance,undefined);}
 const misplaced=structuredClone(p.interpretation);misplaced.rows!['contradb:3496:row:5']={squareThrough:{phaseBeats:[4,2,2]}};assert.equal(readContraDbImport(raw,{interpretation:misplaced,capabilities:caps}).dance,undefined);
 for(const gate of['squareThroughs','namedPullBys'])assert.equal(readContraDbImport(p.result.dance!.sourceText,{capabilities:{...caps,[gate]:false}}).dance,undefined,gate);
 const forged=JSON.parse(p.result.dance!.sourceText);forged.interpretation.capabilities={squareThroughs:true};assert.equal(readContraDbImport(JSON.stringify(forged),{capabilities:{...caps,squareThroughs:false}}).dance,undefined);
});
test('fresh source changes and stale square-through archives cannot waive ordered hands, markers or source context',()=>{
 const p=prepared(),base=JSON.parse(raw),clause='square through two - partners balance &amp;  pull by right, then neighbors pull by left';
 const cases:[string,string][]=[[clause,clause.replace('two','four')],[clause,clause.replace('partners balance','neighbors balance')],[clause,clause.replace('pull by right','pull by left')],[clause,clause.replace('then neighbors','then partners')],[clause,clause+' then clap'],[clause,clause+' if active'],[clause+' ⁋',clause],[clause+' ⁋',clause+' ⁋ ⁋'],[clause+' ⁋',clause.replace(' - ',' ⁋ - ')],[clause+' ⁋',clause+' then turn around ⁋'],['neighbors right hand balance &amp;  box the gnat','neighbors swing'],['long lines forward &amp; back','long lines forward &amp; back then turn around'],['neighbors swing','neighbors swing ⁋'],['formation: improper','formation: becket'],['class=dance-show-beats>8</td>\n             <td><div class="show-figure">'+clause,'class=dance-show-beats>6</td>\n             <td><div class="show-figure">'+clause]];
 for(const[from,to]of cases){const input=changed(from,to),fresh=prepareContraDbReview(input,[],caps),stale=readContraDbImport(input,{interpretation:p.interpretation,capabilities:caps});assert.equal(fresh.result.dance,undefined,to);assert.equal(stale.dance,undefined,to);assert.notEqual(stale.record?.snapshotId,p.result.record!.snapshotId);const archive=JSON.parse(p.result.dance!.sourceText);archive.snapshot=JSON.parse(input);assert.ok(readContraDbImport(JSON.stringify(archive),{capabilities:caps}).diagnostics.some(d=>d.code==='snapshot-binding'));}
 const moved=structuredClone(base);moved.html=moved.html.replace(clause+' ⁋',clause).replace('long lines forward &amp; back','long lines forward &amp; back ⁋');assert.equal(readContraDbImport(JSON.stringify(moved),{interpretation:p.interpretation,capabilities:caps}).dance,undefined);
 const renamed=structuredClone(base);renamed.html=renamed.html.replaceAll('Fair and Square','Unrelated title').replaceAll('John Coffman','Another author');renamed.metadata.title='Unrelated title';renamed.metadata.choreographer_name='Another author';assert.ok(prepareContraDbReview(JSON.stringify(renamed),[],caps).result.dance);
});
test('caller interpretation ownership rejects descriptor tricks before reading them and preserves exact replay',()=>{
 const p=prepared();
 for(const target of['options','interpretation','rows','row','squareThrough','phaseBeats','arrayEntry']){let reads=0;const i=structuredClone(p.interpretation)as any,options:any={interpretation:i,capabilities:caps};const parent=target==='options'?options:target==='interpretation'?i:target==='rows'?i.rows:target==='row'?i.rows[rowId]:target==='squareThrough'?i.rows[rowId].squareThrough:target==='phaseBeats'?i.rows[rowId].squareThrough.phaseBeats:i.rows[rowId].squareThrough.phaseBeats;const key=target==='options'?'interpretation':target==='interpretation'?'rows':target==='rows'?rowId:target==='row'?'squareThrough':target==='squareThrough'?'phaseBeats':target==='phaseBeats'?'0':'1';const good=parent[key];Object.defineProperty(parent,key,{enumerable:true,get(){reads++;return reads<4?good:[2,3,3];}});const r=readContraDbImport(raw,options);assert.equal(r.dance,undefined,target);assert.equal(reads,0,target);assert.ok(r.diagnostics.some(d=>d.code==='interpretation-data'));}
 for(const target of['top','rows','row','squareThrough','array'])for(const kind of['hidden','symbol']){const i=structuredClone(p.interpretation)as any,parent=target==='top'?i:target==='rows'?i.rows:target==='row'?i.rows[rowId]:target==='squareThrough'?i.rows[rowId].squareThrough:i.rows[rowId].squareThrough.phaseBeats;if(kind==='hidden')Object.defineProperty(parent,'extraTurn',{value:1});else parent[Symbol('extraTurn')]=1;assert.equal(readContraDbImport(raw,{interpretation:i,capabilities:caps}).dance,undefined,`${target}/${kind}`);}
 for(const target of['top','rows','row','squareThrough']){const i=structuredClone(p.interpretation)as any;if(target==='top')Object.setPrototypeOf(i,null);else Object.setPrototypeOf(target==='rows'?i.rows:target==='row'?i.rows[rowId]:i.rows[rowId].squareThrough,null);assert.equal(readContraDbImport(raw,{interpretation:i,capabilities:caps}).dance,undefined,`null prototype ${target}`);}
 const optional=structuredClone(p.interpretation);optional.rows![rowId].balanceBeats=undefined;const allowed=readContraDbImport(raw,{interpretation:optional,capabilities:caps});assert.ok(allowed.dance);assert.deepEqual(readContraDbImport(allowed.dance.sourceText,{capabilities:caps}).dance,allowed.dance);
 const polluted=JSON.parse(JSON.stringify(p.interpretation));Object.defineProperty(polluted,'__proto__',{value:{squareThroughs:true},enumerable:true});assert.equal(readContraDbImport(raw,{interpretation:polluted,capabilities:caps}).dance,undefined);assert.equal(({}as any).squareThroughs,undefined);
 const i=structuredClone(p.interpretation),r=readContraDbImport(raw,{interpretation:i,capabilities:caps});assert.ok(r.dance);i.rows![rowId].squareThrough!.phaseBeats=[4,2,2];(i.rows![rowId].squareThrough as any).phaseBeats[0]=2;assert.deepEqual(r.dance.figures.at(-1)!.phaseBeats,[4,2,2]);assert.deepEqual(readContraDbImport(r.dance.sourceText,{capabilities:caps}).dance,r.dance);
});
