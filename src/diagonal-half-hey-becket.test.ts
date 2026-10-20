/** Overall source paths, identities and named shoulder passages. Detailed footwork is schematic. */
import test from 'node:test';import assert from 'node:assert/strict';import{Vector3}from'three';
import{compileDiagonalHalfHeyBecket,type DiagonalHeyCompiled}from'./diagonal-half-hey-becket.ts';import{compileChoreography}from'./choreography.ts';import{readFileSync}from'node:fs';import{prepareContraDbReview}from'./source-review.ts';import{REGISTERED_MOTION_CAPABILITIES}from'./capabilities.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const fixture=()=>{const p=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/1461.json',import.meta.url),'utf8'),[],caps);assert.ok(p.result.dance,JSON.stringify(p.result.errors));return structuredClone(p.result.dance);};
const compileSourceExperimental=(count:number)=>compileChoreography(fixture(),count,caps) as DiagonalHeyCompiled;import{Avatar}from'./scene.ts';import{diagonalHeyTopologyKey}from'./diagonal-hey-topology.ts';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
const map=(x:ReadonlyMap<number,number>)=>[...x].sort(([a],[b])=>a-b),dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
test('all2–12 complete physical source periods preserve explicit finite waits, partners and public40 ledger',t=>{
 for(let count=2;count<=12;count++){
  const c=compileSourceExperimental(count),initial=c.sample(0),period=c.sample(count*64);assert.deepEqual(period.poses,initial.poses);
  assert.equal(diagonalHeyTopologyKey(c.rounds.at(-1)!.s2),diagonalHeyTopologyKey(c.rounds[0].state));
  for(let repeat=0;repeat<count;repeat++){
   const round=c.rounds[repeat],base=repeat*64;
   for(const at of[0,31.99999,32,39.99999]){const b=c.bindingAt(base+at);assert.equal(b.epoch,repeat);assert.deepEqual(map(b.relations.neighbor),map(round.b0.relations.neighbor));}
   for(const at of[40,47.99999,48,63.99999]){const b=c.bindingAt(base+at);assert.equal(b.epoch,repeat+1);assert.deepEqual(map(b.relations.neighbor),map(round.ba.relations.neighbor));}
   assert.deepEqual(map(c.bindingAt(base+64).relations.neighbor),map(round.ba.relations.neighbor));
   for(const d of c.dancers)assert.equal(c.bindingAt(base+40).relations.partner.get(d.id),d.id%2?d.id-1:d.id+1);
   for(const id of round.bd.waitingIds)for(const b of[32,33,36,39.9999])assert.ok(dist(c.sample(base+b).poses[id].position,c.sample(base+32).poses[id].position)<1e-10);
   for(const id of round.ba.waitingIds)for(const b of[40,42,45.9999])assert.ok(dist(c.sample(base+b).poses[id].position,c.sample(base+40).poses[id].position)<1e-10);
   for(const boundary of[8,16,24,32,40,48,52,64]){const a=c.sample(base+boundary-1e-7),b=c.sample(base+boundary+1e-7);for(const p of a.poses){assert.ok(dist(p.position,b.poses[p.id].position)<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-b.poses[p.id].yaw),Math.cos(p.yaw-b.poses[p.id].yaw)))<1e-5);}}
   for(const section of[round.prefix,round.diag,round.across,round.partner])assert.ok(section.totalBeats>0);
   assert.deepEqual([round.prefix.totalBeats,round.diag.totalBeats,round.across.totalBeats,round.partner.totalBeats],[32,8,8,16]);
  }
  if(count===2)assert.equal(c.rounds[0].bd.groups.length,0);
  t.diagnostic(JSON.stringify({couples:count,physicalRepeats:count,sourceCounts:count*64,publicCommits:count}));
 }
});
test('independent named diagonal gate oracle uses each actual Avatar shoulder and signed travel crossing',()=>{
 const c=compileSourceExperimental(4),round=c.rounds[0],plan=round.plans[0],path=plan.trajectory;
 assert.deepEqual(path.gates.map((g:any)=>[g.shoulder,g.pairs]),[['right',[['7','1']]],['left',[['6','1'],['7','0']]],['right',[['6','0']]],['left',[['1','0'],['6','7']]]]);
 const avatars=c.dancers.map(d=>new Avatar(d));
 for(const gate of path.gates){const frame=c.sample(32+gate.beat);assert.deepEqual(frame.contacts,[]);for(const avatar of avatars){avatar.update(frame.poses[avatar.dancer.id],frame,{dance:c.dance,showLabels:false}as any,c.sample);avatar.root.updateMatrixWorld(true);}
  for(const ids of gate.pairs){for(let k=0;k<2;k++){const id=Number(ids[k]),other=Number(ids[1-k]),avatar=avatars[id],origin=avatar.body.localToWorld(new Vector3(0,1.355,0)),right=avatar.body.localToWorld(new Vector3(-.235,1.355,0)).sub(origin).normalize(),d=new Vector3(frame.poses[other].position.x-frame.poses[id].position.x,0,frame.poses[other].position.z-frame.poses[id].position.z),actualShoulder=right.dot(d);assert.ok(gate.shoulder==='right'?actualShoulder>.65:actualShoulder<-.65,'actual articulated body right/left shoulder matches the declared named pass');
   const facing={x:Math.sin(frame.poses[id].yaw),z:Math.cos(frame.poses[id].yaw)},relative=(beat:number)=>{const poses=path.sample(beat).poses,a=poses.find((p:any)=>Number(p.id)===id),b=poses.find((p:any)=>Number(p.id)===other);return(b.position.x-a.position.x)*facing.x+(b.position.z-a.position.z)*facing.z;};assert.ok(relative(gate.beat-.01)>0&&relative(gate.beat+.01)<0,'named dancers exchange signed longitudinal order once through this gate');
  }}
 }
 avatars.forEach(a=>a.dispose());
 assert.deepEqual(map(c.bindingAt(32).relations.neighbor),[[0,3],[1,2],[2,1],[3,0],[4,7],[5,6],[6,5],[7,4]]);assert.deepEqual(map(c.bindingAt(40).relations.neighbor),[[0,5],[1,4],[2,7],[3,6],[4,1],[5,0],[6,3],[7,2]]);assert.deepEqual(map(c.bindingAt(48).relations.neighbor),map(c.bindingAt(40).relations.neighbor));
});

test('source compiler owns metadata, frames, evidence, policies and rejects unconsumed declarations',()=>{
 const raw=fixture(),c=compileDiagonalHalfHeyBecket(raw,2),before=c.sample(25.7);raw.title='mutated';raw.figures[4].centerShoulder='left';raw.diagonalHeyPolicy!.source.clause='mutated';assert.notEqual(c.dance.title,raw.title);assert.equal(c.dance.figures[4].centerShoulder,'right');assert.deepEqual(c.sample(25.7),before);const frame=c.sample(25.7);frame.poses[0].position.x=99;frame.contacts[0].point.x=99;if(frame.poses[0].chainCourtesyPreparation)frame.poses[0].chainCourtesyPreparation.leaderId=999;assert.deepEqual(c.sample(25.7),before);assert.ok(Object.isFrozen(c.dance.figures[4]));assert.ok(Object.isFrozen(c.rounds[0].plans[0].trajectory));assert.throws(()=>c.sample(NaN));assert.deepEqual(c.sample(-1),c.sample(0));assert.ok(c.warnings.some(w=>w.startsWith('Schematic footwork;')));
 const mutate=[(d:any)=>delete d.diagonalHeyPolicy,(d:any)=>d.diagonalHeyPolicy.extra=1,(d:any)=>d.diagonalHeyPolicy.preparationBeats=4,(d:any)=>d.diagonalHeyPolicy.source.basis='source-explicit',(d:any)=>d.progressionEvents[0].count=1,(d:any)=>d.progressionEvents[0].waitingRoleArrangement='lark-right',(d:any)=>d.progressionEvents[0].afterFigureId=d.figures[5].id,(d:any)=>d.progressionEvents[0].initialBinding='retain-starting-neighbors',(d:any)=>d.sourceRecord.snapshotId='forged',(d:any)=>d.sourceRecord.sourceUrl='https://example.com/other',(d:any)=>d.circulation='cw',(d:any)=>d.figures[4].heyAxis='right-diagonal',(d:any)=>d.figures[4].centerShoulder='left',(d:any)=>d.figures[0].exit='partner-swing',(d:any)=>d.figures[2].crossingRelation='neighbor',(d:any)=>d.figures[3].who='neighbor',(d:any)=>d.figures[5].progression=true,(d:any)=>d.figures[6].hands='both'];
 for(const change of mutate){const d=fixture();change(d);assert.throws(()=>compileDiagonalHalfHeyBecket(d,2));}
 const renamed=fixture();renamed.id='independent-id';renamed.title='Independent title';renamed.author='Independent author';renamed.figures.forEach((f,i)=>f.id=`figure-${i}`);renamed.progressionEvents![0].afterFigureId='figure-4';assert.ok(compileDiagonalHalfHeyBecket(renamed,2).repeatable);
});

test('public dispatch retains independent capability gates and cached programs cannot share mutable frames',()=>{
 assert.equal(REGISTERED_MOTION_CAPABILITIES.diagonalHalfHeys,true);const d=fixture();for(const gate of ['diagonalHalfHeys','progressionEvents','rightLeftThrough','ordinaryHalfHeys'] as const)assert.throws(()=>compileChoreography(d,2,{...caps,[gate]:false}),/Diagonal half-hey/);
 const a=compileChoreography(d,2,caps) as DiagonalHeyCompiled,b=compileChoreography(structuredClone(d),2,caps) as DiagonalHeyCompiled;assert.notEqual(a,b);assert.deepEqual(a.dance,b.dance);assert.equal(typeof(a.rounds[0].b0.relations.neighbor as any).set,'undefined');assert.throws(()=>{(a.rounds[0].b0.relations.neighbor as any).set(0,999);});const before=b.sample(49);a.sample(49).poses[0].position.x=99;assert.deepEqual(b.sample(49),before);const bad=structuredClone(d);bad.diagonalHeyPolicy!.source.sourceId='changed';assert.throws(()=>compileChoreography(bad,2,caps));
});

test('bounded cache eviction preserves the entire source program and hidden modifiers fail closed',()=>{
 const d=fixture(),first=compileChoreography(d,2,caps),frame=first.sample(38.25);for(let i=0;i<7;i++){const variant=structuredClone(d);variant.title=`Metadata cache variant ${i}`;compileChoreography(variant,2,caps);}const again=compileChoreography(d,2,caps);assert.notEqual(again,first);assert.deepEqual(again.sample(38.25),frame);assert.deepEqual(again.dance,first.dance);
 for(const target of ['figure','policy','event'] as const){const bad=structuredClone(d),object=target==='figure'?bad.figures[4]:target==='policy'?bad.diagonalHeyPolicy!:bad.progressionEvents![0];Object.defineProperty(object,'extraTurn',{value:1,enumerable:false});assert.throws(()=>compileChoreography(bad,2,caps));}
});
