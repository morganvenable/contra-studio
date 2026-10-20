import test from'node:test';
import assert from'node:assert/strict';
import {readFileSync}from'node:fs';
import {compileChoreography}from'./choreography.ts';
import {prepareContraDbReview}from'./source-review.ts';
import {readContraDbImport}from'./contradb-import.ts';
import {REGISTERED_MOTION_CAPABILITIES}from'./capabilities.ts';
import {distance,turn}from'./ring-twirl-contract.ts';
import {reviewedTerminalPullBy,TERMINAL_PULL_BY_CAPABILITIES as caps}from'../test-data/terminal-pull-by/fixture.ts';
import {reviewedNamedPullBy}from'../test-data/named-pull-by/fixture.ts';
const near=(a:number,b:number)=>Math.abs(a-b)<1e-6;

test('actual2355 retains the complete source star, named hand/count and source-marked terminal passage in its archive',()=>{
 const{raw,review,dance}=reviewedTerminalPullBy();
 assert.deepEqual(dance.sourceRows.map(r=>[r.beats,r.text]),[[16,'neighbors balance & swing'],[8,'long lines forward & back'],[8,'ladles allemande right 1½'],[16,'partners balance & swing'],[8,'right left through'],[6,'star left 3 places'],[2,'neighbors pull by left ⁋']]);
 assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(dance.figures.filter(f=>f.progression).length,1);
 const last=dance.figures.at(-1)!;assert.deepEqual([last.kind,last.who,last.hands,last.beats,last.exit,last.progression],['pull-by','neighbor','left',2,'progressed-neighbors',true]);assert.deepEqual([dance.figures.at(-2)!.kind,dance.figures.at(-2)!.direction,dance.figures.at(-2)!.amount,dance.figures.at(-2)!.beats],['star','left',.75,6]);
 assert.deepEqual(review.interpretation.rows?.['contradb:2355:row:4']?.rightLeftThrough,{hand:'right',courtesyReceiver:'partner',courtesyLeader:'lark',crossingRelation:'neighbor'});
 const replay=readContraDbImport(dance.sourceText,{capabilities:caps});assert.ok(replay.dance,replay.errors.join('; '));assert.deepEqual(replay.dance.figures,dance.figures);assert.deepEqual(replay.interpretation,review.interpretation);assert.equal(replay.record?.original,review.result.record?.original);
 for(const capabilities of[{...caps,terminalNamedPullBys:false},{...caps,namedPullBys:false}]){assert.equal(readContraDbImport(raw,{interpretation:review.interpretation,capabilities}).dance,undefined);assert.equal(readContraDbImport(dance.sourceText,{capabilities}).dance,undefined);assert.throws(()=>compileChoreography(dance,2,capabilities));}
 const forged={...JSON.parse(dance.sourceText),capabilities:{terminalNamedPullBys:true}};assert.equal(readContraDbImport(JSON.stringify(forged),{capabilities:{...caps,terminalNamedPullBys:false}}).dance,undefined);
 const renamed=structuredClone(dance);renamed.id='different';renamed.title='Unrelated title';renamed.author='Different author';assert.equal(compileChoreography(renamed,2,caps).repeatable,true);
});

test('actual2355 executes full left-star winding and two-count named passage through every2–12couple finite period',t=>{
 const{dance}=reviewedTerminalPullBy();let minimum=Infinity,maxRootJump=0,maxYawJump=0,maxSampleStep=0;
 for(let count=2;count<=12;count++){
  const c=compileChoreography(dance,count,caps),slots=Array.from({length:count},(_,couple)=>({couple,rank:couple,direction:couple%2?-1:1})),initial=c.sample(0),encounters=Array.from({length:count},()=>new Set<number>());assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);assert.deepEqual(c.starts,[0,4,16,24,32,36,48,56,62]);
  for(let round=0;round<2*count;round++){
   const sorted=[...slots].sort((a,b)=>a.rank-b.rank),groups:Array<[typeof slots[number],typeof slots[number]]>=[],waiting:typeof slots=[];
   for(let i=0;i<sorted.length;){const a=sorted[i],b=sorted[i+1];if(b&&a.direction===1&&b.direction===-1){groups.push([a,b]);i+=2;}else{waiting.push(a);i++;}}
   for(const[a,b]of groups){encounters[a.couple].add(b.couple);encounters[b.couple].add(a.couple);const ids=[a.couple*2,a.couple*2+1,b.couple*2,b.couple*2+1],center=((a.rank+b.rank)/2-(count-1)/2)*1.8;
    for(const[local,corners]of[[56,[[-1,-1],[-1,1],[1,1],[1,-1]]],[62,[[1,-1],[-1,-1],[-1,1],[1,1]]],[64-1e-7,[[1,1],[-1,1],[-1,-1],[1,-1]]]]as const){const frame=c.formationSample!(round*64+local);for(let k=0;k<4;k++){const p=frame.poses[ids[k]];assert.ok(near(p.position.x,corners[k][0]*.9)&&near(p.position.z,center+corners[k][1]*.9),`literal star/pull corner ${count}/${round}/${local}/${p.id}`);}}
    for(const id of ids){let total=0,previous=c.sample(round*64+56).poses[id].position,theta=Math.atan2(previous.z-center,previous.x);for(let step=1;step<=96;step++){const p=c.sample(round*64+56+step/16).poses[id].position,next=Math.atan2(p.z-center,p.x);total+=turn(next,theta);theta=next;assert.ok(Math.hypot(p.x,p.z-center)>.80,'Star retains a nonzero radial path');}assert.ok(Math.abs(total+3*Math.PI/2)<1e-6,'Complete literal left-star three-quarter winding, no shortened path');}
    const oldNeighbor=new Map([[ids[0],ids[3]],[ids[3],ids[0]],[ids[1],ids[2]],[ids[2],ids[1]]]);
    for(const local of[62.55,62.75,63,63.25,63.49]){const frame=c.sample(round*64+local);assert.equal(frame.repeat,round);assert.equal(frame.figureIndex,c.starts.length-1);for(const h of frame.contacts.filter(h=>ids.includes(h.a)||ids.includes(h.b))){assert.equal(oldNeighbor.get(h.a),h.b,'Every passage contact retains the old current-neighbor binding until release');assert.equal(h.handA,'left');assert.equal(h.handB,'left');}}
    const gate=c.sample(round*64+63),before=c.sample(round*64+63-.001),after=c.sample(round*64+63+.001);
    for(const[A,B]of[[ids[0],ids[3]],[ids[1],ids[2]]]){const p=gate.poses[A],q=gate.poses[B],delta={x:q.position.x-p.position.x,z:q.position.z-p.position.z};assert.ok(Math.abs(delta.z)<1e-7);assert.ok(-(-Math.cos(p.yaw)*delta.x+Math.sin(p.yaw)*delta.z)>.69999,'Current-neighbor left-hand crossing gate');assert.ok((before.poses[A].position.z-before.poses[B].position.z)*(after.poses[A].position.z-after.poses[B].position.z)<0,'Physical along-set passage');const hand=gate.contacts.find(h=>(h.a===A&&h.b===B)||(h.a===B&&h.b===A));assert.ok(hand);assert.equal(hand.handA,'left');assert.equal(hand.handB,'left');assert.ok(hand.strength>.99);}
   }
   for(const slot of waiting){assert.ok(slot.rank===0||slot.rank===count-1);for(const id of[slot.couple*2,slot.couple*2+1]){const before=c.sample(round*64+13).poses[id],after=c.sample(round*64+63.5).poses[id];assert.equal(before.activity,'waiting');assert.equal(after.activity,'waiting');assert.ok(distance(before.position,after.position)<1e-8,'After same-end exchange, wait without terminal travel');assert.ok(near(before.position.z,(slot.rank-(count-1)/2)*1.8));}slot.direction*=-1;}
   for(const[a,b]of groups)[a.rank,b.rank]=[b.rank,a.rank];
   for(const local of[62,63,63.5,63.9,64-1e-7]){const frame=c.sample(round*64+local);assert.equal(frame.repeat,round,'No public repeat/relationship epoch advance before source count64');assert.equal(frame.figureIndex,c.starts.length-1);assert.ok(frame.localBeat<64);}assert.equal(c.sample((round+1)*64).repeat,round+1);
   // Independent next-round topology determines the ordinary reachable-balance
   // preparation: active rows gather .31 along-set in the last .5 source count.
   // The primitive/formation slots remain the complete named exchange.
   const nextActive=new Set<number>(),nextSorted=[...slots].sort((a,b)=>a.rank-b.rank);for(let i=0;i<nextSorted.length;){const a=nextSorted[i],b=nextSorted[i+1];if(b&&a.direction===1&&b.direction===-1){nextActive.add(a.couple);nextActive.add(b.couple);i+=2;}else i++;}
   const end=c.sample((round+1)*64-1e-7),formationEnd=c.formationSample!((round+1)*64-1e-7);for(const slot of slots)for(const[id,role]of[[slot.couple*2,1],[slot.couple*2+1,-1]]){const p=end.poses[id],logical=formationEnd.poses[id],z=(slot.rank-(count-1)/2)*1.8,offset=nextActive.has(slot.couple)?.31*slot.direction:0;assert.ok(near(logical.position.x,.9*role*slot.direction)&&near(logical.position.z,z),`Exact completed single-progression slot ${count}/${round}/${id}`);assert.ok(near(p.position.x,.9*role*slot.direction)&&near(p.position.z,z+offset),`Named next-balance physical preparation ${count}/${round}/${id}`);assert.ok(Math.abs(turn(p.yaw,slot.direction===1?0:Math.PI))<1e-6,'Onward repeat-facing');}
   for(const local of[...c.starts,64]){const beat=round*64+local;if(!beat)continue;const a=c.sample(beat-1e-6),b=c.sample(beat);for(const p of a.poses){const root=distance(p.position,b.poses[p.id].position),yaw=Math.abs(turn(p.yaw,b.poses[p.id].yaw));maxRootJump=Math.max(maxRootJump,root);maxYawJump=Math.max(maxYawJump,yaw);assert.ok(root<1e-5);assert.ok(yaw<1e-5);}}
   let previous=c.sample(round*64);for(let tick=0;tick<=256;tick++){const frame=c.sample(round*64+tick/4);for(let a=0;a<frame.poses.length;a++){maxSampleStep=Math.max(maxSampleStep,distance(frame.poses[a].position,previous.poses[a].position));for(let b=a+1;b<frame.poses.length;b++)minimum=Math.min(minimum,distance(frame.poses[a].position,frame.poses[b].position));}previous=frame;}
  }
  for(let couple=0;couple<count;couple++){assert.equal(encounters[couple].size,count-1);assert.deepEqual(slots[couple],{couple,rank:couple,direction:couple%2?-1:1});}
  const physicalEnd=c.sample(2*count*64-1e-7);for(const p of initial.poses){assert.ok(distance(p.position,physicalEnd.poses[p.id].position)<1e-5);assert.ok(Math.abs(turn(p.yaw,physicalEnd.poses[p.id].yaw))<1e-5);}
 }
 assert.ok(minimum>=.61999);t.diagnostic(JSON.stringify({source:2355,minimum,maxRootJump,maxYawJump,maxSampleStep}));
});

test('2355 source edits cannot waive glyph, named hand, complete preceding star or source counts; actual1926 remains blocked',()=>{
 const{raw,review,dance}=reviewedTerminalPullBy(),source=JSON.parse(raw),clause='neighbors pull by left ⁋';assert.ok(source.html.includes(clause));
 for(const replacement of['neighbors pull by left','neighbors pull by right ⁋','partners pull by left ⁋','neighbors pull by left ⁋ ⁋','neighbors ⁋ pull by left','neighbors pull by left then clap ⁋']){const changed={...source,html:source.html.replace(clause,replacement)};assert.equal(prepareContraDbReview(JSON.stringify(changed),[],caps).result.dance,undefined,replacement);}
 const missing={...source,html:source.html.replace(clause,'neighbors pull by left')};assert.equal(readContraDbImport(JSON.stringify(missing),{interpretation:{...review.interpretation,progression:'end-of-cycle'},capabilities:caps}).dance,undefined,'Reviewed generic endpoint inference cannot masquerade as a source-marked terminal contract');
 for(const replacement of['star left 4 places','star left 2 places','star right 3 places','circle left 3 places']){const changed={...source,html:source.html.replace('star left 3 places',replacement)};assert.equal(prepareContraDbReview(JSON.stringify(changed),[],caps).result.dance,undefined,replacement);}
 for(const change of[{beats:4},{who:'partner'},{hands:'right'},{progression:false},{exit:undefined}]){const bad=structuredClone(dance);Object.assign(bad.figures.at(-1)!,change);assert.throws(()=>compileChoreography(bad,2,caps));}
 const archive=JSON.parse(dance.sourceText);archive.snapshot.html=archive.snapshot.html.replace(clause,'neighbors pull by right ⁋');assert.ok(readContraDbImport(JSON.stringify(archive),{capabilities:caps}).diagnostics.some(d=>d.code==='snapshot-binding'));
 const actual1926=readFileSync(new URL('../test-data/contradb/1926.json',import.meta.url),'utf8'),r=prepareContraDbReview(actual1926,[],caps);assert.equal(r.result.record?.rows.at(-1)?.text,'neighbors pull by right');assert.equal(r.result.record?.rows.at(-1)?.progression,false);assert.equal(r.result.dance,undefined);
});

test('staged terminal capability preserves1495/2457 and established-family trajectories exactly',()=>{
 for(const id of[1495,2457,24,410,1450,2964]){const dance=id===1495||id===2457?reviewedNamedPullBy(id).dance:prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8')).result.dance;assert.ok(dance);
  for(const count of[2,3,6,12]){const a=compileChoreography(dance,count,{...REGISTERED_MOTION_CAPABILITIES,terminalNamedPullBys:false}),b=compileChoreography(dance,count,caps);for(let cycle=0;cycle<2*count;cycle++)for(const local of[0,.25,3.75,16,20,31.99,46,47,48,56,62,63.999999])assert.deepEqual(a.sample(cycle*64+local),b.sample(cycle*64+local));}
 }
});
