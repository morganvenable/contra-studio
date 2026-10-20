import test from 'node:test';
import assert from 'node:assert/strict';
import {compileDance}from'./engine.ts';
import {compileChoreography}from'./choreography.ts';
import {readContraDbImport,normalizeContraDbRow}from'./contradb-import.ts';
import {prepareContraDbReview}from'./source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES}from'./capabilities.ts';
import {readFileSync}from'node:fs';
import {reviewedNamedPullBy,NAMED_PULL_BY_CAPABILITIES as caps}from'../test-data/named-pull-by/fixture.ts';
import {distance,turn}from'./ring-twirl-contract.ts';
const near=(a:number,b:number)=>Math.abs(a-b)<1e-6;

test('actual1495 and2457 source normalization preserves named roles, literal hand/count and separate RLT review',()=>{
 for(const id of[1495,2457]as const){const{dance,parsed,interpretation}=reviewedNamedPullBy(id),f=dance.figures.find(f=>f.kind==='pull-by')!;
  assert.equal(f.hands,'left');assert.equal(f.who,id===1495?'larks':'partner');assert.equal(f.beats,id===1495?4:2);assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.ok(parsed.record?.publication.includes('sketchbook'));
  assert.deepEqual(interpretation.rows![`contradb:${id}:row:${id===1495?6:3}`].rightLeftThrough,{hand:'right',courtesyReceiver:id===1495?'neighbor':'partner',courtesyLeader:'lark',crossingRelation:id===1495?'partner':'neighbor'});
  assert.throws(()=>compileDance(dance,2,{...caps,namedPullBys:false}),/pull-by|pull-bys/);
  const renamed=structuredClone(dance);renamed.id='unrelated';renamed.title='Different title';renamed.author='Different author';assert.equal(compileDance(renamed,2).repeatable,true);
 }
});

test('actual named pull-by sources meet independent actor/hand/slot and finite-end oracles for every2–12couple period',t=>{
 const summaries=[];
 for(const id of[1495,2457]as const){const{dance}=reviewedNamedPullBy(id);let minimum=Infinity,maxJump=0,maxYawJump=0;
  for(let count=2;count<=12;count++){
   const c=compileDance(dance,count),slots=Array.from({length:count},(_,couple)=>({couple,rank:couple,direction:couple%2?-1:1})),initial=c.sample(0),encounters=Array.from({length:count},()=>new Set<number>());
   assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);
   for(let round=0;round<2*count;round++){
    const sorted=[...slots].sort((a,b)=>a.rank-b.rank),groups:Array<[typeof slots[number],typeof slots[number]]>=[],waiting:typeof slots=[];
    for(let i=0;i<sorted.length;){const a=sorted[i],b=sorted[i+1];if(b&&a.direction===1&&b.direction===-1){groups.push([a,b]);i+=2;}else{waiting.push(a);i++;}}
    for(const[a,b]of groups){encounters[a.couple].add(b.couple);encounters[b.couple].add(a.couple);const ids=[a.couple*2,a.couple*2+1,b.couple*2,b.couple*2+1],center=((a.rank+b.rank)/2-(count-1)/2)*1.8;
     // Fixed independent source permutations, in persistent actor order.
     const before=id===1495?[[1,1],[-1,1],[-1,-1],[1,-1]]:[[-1,-1],[-1,1],[1,1],[1,-1]],after=id===1495?[[-1,-1],[-1,1],[1,1],[1,-1]]:[[-1,1],[-1,-1],[1,-1],[1,1]],start=id===1495?16:46,duration=id===1495?4:2;
     for(const[local,corners]of[[start,before],[start+duration,after]]as const){const f=c.sample(round*64+local);for(let k=0;k<4;k++){const p=f.poses[ids[k]];assert.ok(near(p.position.x,corners[k][0]*.9)&&near(p.position.z,center+corners[k][1]*.9),`literal corner ${id}/${count}/${round}/${local}/${p.id}`);}}
     const named=id===1495?[[ids[0],ids[2]]]:[[ids[0],ids[1]],[ids[2],ids[3]]],beat=round*64+start+duration/2,gate=c.sample(beat),beforeGate=c.sample(beat-.001),afterGate=c.sample(beat+.001);
     for(const[A,B]of named){const p=gate.poses[A],q=gate.poses[B],delta={x:q.position.x-p.position.x,z:q.position.z-p.position.z};assert.ok(-(-Math.cos(p.yaw)*delta.x+Math.sin(p.yaw)*delta.z)>.69999,'Literal left hand side');assert.ok(Math.abs(Math.sin(p.yaw)*delta.x+Math.cos(p.yaw)*delta.z)<1e-7);
      const longitudinal=(f:typeof gate)=>{const a=f.poses[A].position,b=f.poses[B].position;return(b.x-a.x)*Math.sin(p.yaw)+(b.z-a.z)*Math.cos(p.yaw);};assert.ok(longitudinal(beforeGate)*longitudinal(afterGate)<0,'Actual passage through the named receiver, not near encounter');
      const h=gate.contacts.find(h=>(h.a===A&&h.b===B)||(h.a===B&&h.b===A));assert.ok(h);assert.equal(h.handA,'left');assert.equal(h.handB,'left');assert.ok(h.strength>.99);assert.equal(h.kind,'joined');
     }
    }
    for(const slot of waiting){assert.ok(slot.rank===0||slot.rank===count-1,'No interior waiter');for(const actor of[slot.couple*2,slot.couple*2+1]){const before=c.sample(round*64+13).poses[actor],after=c.sample(round*64+55).poses[actor];assert.equal(before.activity,'waiting');assert.ok(distance(before.position,after.position)<1e-8);assert.ok(near(before.position.z,(slot.rank-(count-1)/2)*1.8));}slot.direction*=-1;}
    for(const[a,b]of groups)[a.rank,b.rank]=[b.rank,a.rank];
    const end=c.sample((round+1)*64-1e-7);for(const slot of slots)for(const[actor,role]of[[slot.couple*2,1],[slot.couple*2+1,-1]]){const p=end.poses[actor];assert.ok(near(p.position.x,.9*role*slot.direction)&&near(p.position.z,(slot.rank-(count-1)/2)*1.8),`physical rank ${id}/${count}/${round}/${actor}`);}
    for(const local of[...c.starts,64]){const beat=round*64+local;if(!beat)continue;const a=c.sample(beat-1e-6),b=c.sample(beat);for(const p of a.poses){const jump=distance(p.position,b.poses[p.id].position),yaw=Math.abs(turn(p.yaw,b.poses[p.id].yaw));maxJump=Math.max(maxJump,jump);maxYawJump=Math.max(maxYawJump,yaw);assert.ok(jump<1e-5);assert.ok(yaw<1e-5);}}
    for(let tick=0;tick<256;tick++){const frame=c.sample(round*64+tick/4);for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minimum=Math.min(minimum,distance(frame.poses[a].position,frame.poses[b].position));}
   }
   for(let couple=0;couple<count;couple++){assert.equal(encounters[couple].size,count-1);assert.deepEqual(slots[couple],{couple,rank:couple,direction:couple%2?-1:1});}
   const physicalEnd=c.sample(2*count*64-1e-7);for(const p of initial.poses){assert.ok(distance(p.position,physicalEnd.poses[p.id].position)<1e-5);assert.ok(Math.abs(turn(p.yaw,physicalEnd.poses[p.id].yaw))<1e-5);}
  }
  assert.ok(minimum>=.61999);summaries.push({source:id,minimum,maxJump,maxYawJump});
 }
 t.diagnostic(JSON.stringify(summaries));
});

test('the named pull-by gate leaves established source families frame-identical when no pull-by is present',()=>{
 for(const id of[24,410,1450,2964]){
  const raw=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),review=prepareContraDbReview(raw,[]);assert.ok(review.result.dance,review.result.errors.join('; '));
  for(const count of[2,3,6,12]){const a=compileChoreography(review.result.dance,count,{...REGISTERED_MOTION_CAPABILITIES,namedPullBys:false}),b=compileChoreography(review.result.dance,count);for(const beat of[0,.125,3.75,16,31.9,48.5,63.999999,64,95.5,127.999999])assert.deepEqual(a.sample(beat),b.sample(beat));}
 }
});

test('actual source archives preserve literal pull-by clauses and reviewed choices; gates and unknown semantics fail closed',()=>{
 for(const id of[1495,2457]as const){
  const{raw,dance,parsed,interpretation}=reviewedNamedPullBy(id),replay=readContraDbImport(dance.sourceText,{capabilities:caps});assert.ok(replay.dance,replay.errors.join('; '));assert.deepEqual(replay.dance.figures,dance.figures);assert.deepEqual(replay.interpretation,interpretation);assert.equal(replay.record?.original,parsed.record?.original);assert.equal(replay.record?.snapshotId,parsed.record?.snapshotId);
  assert.equal(readContraDbImport(raw,{interpretation,capabilities:{...caps,namedPullBys:false}}).dance,undefined);assert.equal(readContraDbImport(dance.sourceText,{capabilities:{...caps,namedPullBys:false}}).dance,undefined);
  const forged={...JSON.parse(dance.sourceText),capabilities:{namedPullBys:true}};assert.equal(readContraDbImport(JSON.stringify(forged),{capabilities:{...caps,namedPullBys:false}}).dance,undefined);
  const row=parsed.record!.rows[id===1495?2:5];for(const text of[row.text+' then clap',row.text.replace('left','left twice'),row.text.replace('left','both'),row.text.replace(/^[^ ]+/,'everyone')])assert.equal(normalizeContraDbRow({...row,text},'duple-improper',{},caps).resolved,false);
  const right=normalizeContraDbRow({...row,text:row.text.replace('left','right')},'duple-improper',{},caps);assert.equal(right.resolved,true);assert.equal(right.figures[0].hands,'right','Literal opposite hand is retained, never silently rewritten to left');
  for(const beats of[0,1,3,6,8])assert.equal(normalizeContraDbRow({...row,beats},'duple-improper',{},caps).resolved,false);
  const archive=JSON.parse(dance.sourceText);archive.snapshot.html=archive.snapshot.html.replace(row.text,row.text.replace('left','right'));assert.ok(readContraDbImport(JSON.stringify(archive),{capabilities:caps}).diagnostics.some(d=>d.code==='snapshot-binding'));
  const wrongReceiver=JSON.parse(raw);wrongReceiver.html=wrongReceiver.html.replace(row.text,row.text.replace(/^[^ ]+/,'neighbors'));assert.equal(prepareContraDbReview(JSON.stringify(wrongReceiver),[],caps).result.dance,undefined);
 }
 const terminal=readFileSync(new URL('../test-data/contradb/2355.json',import.meta.url),'utf8');assert.equal(prepareContraDbReview(terminal,[],{...caps,terminalNamedPullBys:false}).result.dance,undefined,'Marked terminal neighbor pull-by requires its separate endpoint/progression capability');
 const actual1926=readFileSync(new URL('../test-data/contradb/1926.json',import.meta.url),'utf8'),missingGlyph=prepareContraDbReview(actual1926);assert.equal(missingGlyph.result.record?.rows.at(-1)?.text,'neighbors pull by right');assert.equal(missingGlyph.result.record?.rows.at(-1)?.progression,false);assert.equal(missingGlyph.result.dance,undefined,'Actual1926 has no source glyph and no reviewed terminal endpoint contract');
 const noMarker=JSON.parse(terminal);noMarker.html=noMarker.html.replace('neighbors pull by left ⁋','neighbors pull by right');assert.equal(prepareContraDbReview(JSON.stringify(noMarker),[],caps).result.dance,undefined,'A missing glyph cannot silently become an inferred terminal event');
});
