import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {compileChoreography} from './choreography.ts';import {readContraDbSource} from './contradb-source.ts';
import {compileProgressingImproper} from './progressing-improper.ts';import {compileHalfHeyProgressingBecket,compileProgressingHalfHey} from './half-hey-progression.ts';
import {createDancers} from './engine.ts';import {bindActorGroups} from './progression-topology.ts';
import {SIMPLICITY_SWING,PANDORAS_BOX} from '../test-data/progression/fixtures.ts';
import type {CompiledDance,Dance,Pose} from './types.ts';
const caps={progressionEvents:true,archExchanges:true,archRelationChanges:true,partialHeys:true,rightLeftThrough:true},distance=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z),angle=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));
const cached=new Map<string,CompiledDance>(),compile=(dance:Dance,n:number)=>{const key=`${dance.id}:${n}`;if(!cached.has(key))cached.set(key,compileChoreography(dance,n,caps));return cached.get(key)!;};

test('full dance fixtures retain exact source counts, credit, qualifiers and distinct source provenance',()=>{
 for(const[id,dance]of[[175,SIMPLICITY_SWING],[3004,PANDORAS_BOX]] as const){const record=readContraDbSource(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8')).record!;assert.equal(record.title,dance.title);assert.equal(record.author,dance.author);assert.equal(record.rows.reduce((n,r)=>n+(r.beats??0),0),64);assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(dance.progressionEvents![0].source.url,record.sourceUrl);assert.equal(record.publication,'shared everywhere');}
 const record=readContraDbSource(readFileSync(new URL('../test-data/contradb/175.json',import.meta.url),'utf8')).record!;assert.match(record.rows.at(-1)!.text,/next neighbors do si do/);assert.match(record.rows.at(-2)!.text,/star left.*⁋/);
});

for(const dance of[SIMPLICITY_SWING,PANDORAS_BOX])test(`${dance.title}: complete public dispatch repeats odd/even finite lines with a real mid-cycle neighbor epoch`,()=>{
 for(const n of[2,3,6,12]){const c=compile(dance,n),event=dance.formation==='becket'?32:56;assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);const topology=(c as any).topology;assert.equal(topology(event-1e-6).epoch,0);assert.equal(topology(event).epoch,1);assert.notDeepEqual(topology(event-1e-6).neighbors,topology(event).neighbors);assert.equal(c.sample(event).figureIndex,dance.formation==='becket'?5:7);
  for(const round of[0,1,2,2*n,2*n+1,200])for(const beat of[0,event-1e-6,event,63.999]){const f=c.sample(round*64+beat);assert.equal(f.poses.length,n*2);assert.equal(new Set(f.poses.map(p=>p.id)).size,n*2);assert.ok(f.poses.every(p=>[p.position.x,p.position.z,p.yaw].every(Number.isFinite)));assert.equal(topology(round*64+beat).epoch,round+Number(beat>=event));}
 }
});

for(const dance of[SIMPLICITY_SWING,PANDORAS_BOX])test(`${dance.title}: all source joins and repeat boundaries preserve actual presented roots and facing`,()=>{
 for(const n of[2,3,6]){const c=compile(dance,n);for(let round=0;round<2*n+2;round++)for(const boundary of[...c.starts,64]){const beat=round*64+boundary;if(beat===0)continue;const a=c.sample(beat-1e-7),b=c.sample(beat+1e-7);for(let id=0;id<2*n;id++){assert.ok(distance(a.poses[id],b.poses[id])<1e-5,`${dance.title} actor${id} beat${beat} root`);assert.ok(angle(a.poses[id],b.poses[id])<1e-5,`${dance.title} actor${id} beat${beat} yaw`);}}}
});

test('Pandora finishes physical-end exchange in eight beats and waits lark-right; old endpoints never wrap hall ends',()=>{
 const c=compile(PANDORAS_BOX,6),topology=(c as any).topology;
 for(let round=0;round<16;round++){const ids:number[]=topology(round*64+32).waitingIds;for(const id of ids){const start=c.sample(round*64+32).poses[id],end=c.sample(round*64+40).poses[id];assert.ok(distance(start,end)>1.79);for(const beat of[40,48,56,63.99])assert.ok(distance(c.sample(round*64+beat).poses[id],end)<1e-8);assert.ok(Math.abs(start.position.z-end.position.z)<1e-8);if(c.dancers[id].role==='lark'){const top=start.position.z<0;assert.equal(Math.sign(end.position.x),top?-1:1);assert.ok(Math.abs(Math.atan2(Math.sin(end.yaw-(top?0:Math.PI)),Math.cos(end.yaw-(top?0:Math.PI))))<1e-8);}}}
});

test('musical count1 remains beat0: each source balance occupies exactly four beats and immediately hands into its source swing/arch',()=>{
 for(const dance of[SIMPLICITY_SWING,PANDORAS_BOX]){const c=compile(dance,6);for(const[i,f]of dance.figures.entries())if(f.kind==='balance'){assert.equal(f.beats,4);const before=c.sample(c.starts[i]+3.999),after=c.sample(c.starts[i]+4);assert.equal(before.figureIndex,i);assert.equal(after.figureIndex,i+1);assert.ok(['swing','box-the-gnat'].includes(dance.figures[i+1].kind));const active=c.sample(c.starts[i]).poses.filter(p=>p.activity==='balance');assert.ok(active.every(p=>p.balance?.progress===0));}}
});

test('event compilers reject undeclared interpretation, missing capabilities, stale role choices, extra fields and mutable source influence',()=>{
 assert.throws(()=>compileChoreography(SIMPLICITY_SWING,6,{}),/event-aware/);assert.throws(()=>compileChoreography(PANDORAS_BOX,6,{progressionEvents:true}),/separately registered/);
 for(const base of[SIMPLICITY_SWING,PANDORAS_BOX]){const bad=structuredClone(base);bad.progressionEvents!.push(structuredClone(bad.progressionEvents![0]));assert.throws(()=>compileChoreography(bad,6,caps),/Two physical progressions.*explicit reviewed finite-end policy/);const count=structuredClone(base);count.progressionEvents![0].count=2;assert.throws(()=>compileChoreography(count,6,caps),/unsupported/);const extra=structuredClone(base);(extra.progressionEvents![0] as any).teleport=true;assert.throws(()=>compileChoreography(extra,6,caps),/unsupported/);}
 const source=structuredClone(SIMPLICITY_SWING),event=source.progressionEvents![0],owned=compileProgressingImproper(source,3,{...event,count:1,waitingRoleArrangement:'lark-left'}),sample=owned.sample(56);source.title='changed';source.figures[0].beats=100;source.progressionEvents![0].source.clause='changed';assert.equal(owned.dance.title,'Simplicity Swing');assert.deepEqual(owned.sample(56),sample);assert.ok(Object.isFrozen(owned)&&Object.isFrozen(owned.dancers)&&Object.isFrozen(owned.dance.figures));
 const ordered=SIMPLICITY_SWING.progressionEvents![0],e=ordered.source;assert.equal(compileProgressingImproper(SIMPLICITY_SWING,2,{...ordered,count:1,waitingRoleArrangement:'lark-left',source:{basis:e.basis,clause:e.clause,url:e.url,sourceId:e.sourceId}}).repeatable,true);
 const wrong=structuredClone(PANDORAS_BOX);wrong.figures[4].exit='opposite-neighbor-balance';assert.throws(()=>compileHalfHeyProgressingBecket(wrong,3,{...wrong.progressionEvents![0],count:1,waitingRoleArrangement:'lark-right'}),/four-pass contract/);
});


test('star event composition accepts a checked multi-figure tail and rejects a tail that changes final logical slots',()=>{
 // Synthetic composition test, not an additional source-dance claim. The source
 // fixture remains unchanged; its reviewed star boundary supplies the seam.
 const extended=structuredClone(SIMPLICITY_SWING);extended.id='synthetic-star-tail';extended.title='Synthetic multi-figure tail';extended.figures.push({id:'tail-lines',kind:'long-lines',beats:8,label:'Synthetic long lines',who:'all'},{id:'tail-dosido',kind:'do-si-do',beats:8,label:'Synthetic do-si-do',who:'neighbor',direction:'right',amount:1});
 for(const n of[2,3,6]){const c=compileChoreography(extended,n,caps);assert.equal(c.totalBeats,80);assert.equal(c.repeatable,true);for(const b of[56,64,72,128,144,1000])assert.equal(c.sample(b).poses.length,n*2);}
 const short=structuredClone(SIMPLICITY_SWING);short.figures.at(-1)!.beats=4;assert.throws(()=>compileChoreography(short,6,caps),/eight-beat end-turn/);
 const changed=structuredClone(SIMPLICITY_SWING);changed.figures.at(-1)!.kind='swing';assert.throws(()=>compileChoreography(changed,6,caps),/logical slots|modifier|does not consume/);
 const unregistered=structuredClone(SIMPLICITY_SWING);unregistered.figures.push({id:'unregistered',kind:'hey',beats:8,label:'Unregistered tail',who:'all'});assert.throws(()=>compileChoreography(unregistered,6,caps),/registered primitive/);
});
