import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCarriedWaveCirculate,type CarriedWaveState,type CarriedWaveCirculateSpec,type CarriedWaveBalanceExitSpec} from './carried-wave-circulate.ts';
import {joinLongWaveSegments,fullLongWaveContacts} from './full-long-wave.ts';
import type {Pose,Role} from './types.ts';
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function fixture():CarriedWaveState{
 const actors=Array.from({length:10},(_,id)=>({id,role:(id%2?'robin':'lark')as Role,couple:Math.floor(id/2)}));
 const poses:Pose[]=actors.map(({id})=>{const slot=id%4,offset=Math.floor(id/4)*2.56;return{id,position:{x:[-.64,.64,.64,-.64][slot],z:[-.64,-.64,.64,.64][slot]+offset},yaw:[Math.PI/2,Math.PI/2,-Math.PI/2,-Math.PI/2][slot],stride:0,lean:0,bounce:0,turn:0,activity:'waiting'};});
 const boxes=[[0,1,2,3],[4,5,6,7]],segments=boxes.map(([a,b,c,d])=>({lines:[{order:[a,d],axis:{x:0,z:1}},{order:[b,c],axis:{x:0,z:1}}],hands:[{a,b:d,handA:'right'as const,handB:'right'as const},{a:b,b:c,handA:'right'as const,handB:'right'as const}]}));
 const wave=joinLongWaveSegments(segments,poses,boxes.flat(),9);
 return{sourceBeat:24,bindingEpoch:9,actors,poses,partner:actors.map(a=>[a.id,a.id%2?a.id-1:a.id+1]),neighbor:boxes.flatMap(([a,b,c,d])=>[[a,d],[d,a],[b,c],[c,b]]as[number,number][]),boxPartitions:boxes,wave,heldContacts:fullLongWaveContacts(wave,poses),waitingIds:[8,9]};
}
const spec=(crossRole:Role,balance=true):CarriedWaveCirculateSpec=>({kind:balance?'balance-box-circulate':'box-circulate',beats:balance?8:4,crossRole,loopRole:crossRole==='lark'?'robin':'lark',loopDirection:'right',...(balance?{phaseBeats:[4,4]as const,balanceStyle:'right-left'as const}:{})});

test('one, two and three calls retain full wave graph; four restore explicit station occupancy',()=>{
 const start=fixture();let state=start;
 for(let count=1;count<=4;count++){
  const plan=compileCarriedWaveCirculate(spec(count%2?'lark':'robin'),state);
  assert.deepEqual(plan.entryState,state);state=plan.exitState;
  assert.equal(state.sourceBeat,24+count*8);assert.equal(state.bindingEpoch,9);
  assert.deepEqual(state.partner,start.partner);assert.deepEqual(state.neighbor,start.neighbor);
  assert.equal(state.wave.seamHands.length,2);assert.equal(state.heldContacts.length,6);
  assert.ok(plan.maximumObservedSpeed<=1.8);assert.ok(plan.minimumObservedClearance>=.45);
  for(const box of start.boxPartitions)for(let slot=0;slot<4;slot++){
   const id=box[slot],destination=box[(slot+count)%4],actual=state.poses.find(p=>p.id===id)!,expected=start.poses.find(p=>p.id===destination)!;
   assert.ok(Math.hypot(actual.position.x-expected.position.x,actual.position.z-expected.position.z)<1e-7);
   assert.ok(turn(actual.yaw,expected.yaw)<1e-7);
  }
  for(const id of[8,9]){assert.deepEqual(state.poses.find(p=>p.id===id),start.poses.find(p=>p.id===id));for(const t of[0,2,4,6,8])assert.deepEqual(plan.sample(t).poses.find(p=>p.id===id),start.poses.find(p=>p.id===id));}
  assert.deepEqual(plan.sample(8).contacts,state.heldContacts);
 }
});

test('seam hands balance, release and reacquire with local hands without hidden count changes',()=>{
 const state=fixture(),plan=compileCarriedWaveCirculate(spec('lark'),state),plain=compileCarriedWaveCirculate(spec('lark',false),state);
 assert.equal(plan.beats,8);assert.equal(plain.beats,4);assert.equal(plain.exitState.sourceBeat,28);
 assert.deepEqual(plan.sample(0).contacts,state.heldContacts);
 assert.deepEqual(plan.sample(4).contacts,state.heldContacts);
 assert.equal(plan.sample(4.075).contacts.length,6);
 assert.ok(plan.sample(4.075).contacts.every(h=>Math.abs(h.strength-.5)<1e-7));
 assert.deepEqual(plan.sample(6).contacts,[]);
 assert.equal(plan.sample(7.925).contacts.length,6);
 assert.ok(plan.sample(7.925).contacts.every(h=>Math.abs(h.strength-.5)<1e-7));
 for(const count of[0,.25,1,2,3,4])assert.deepEqual(plan.sample(count+4),plain.sample(count));
});

test('missing seams, incorrect actual hold, epochs, boxes and source budgets reject',()=>{
 const state=fixture(),f=spec('lark');
 for(const change of[
  (s:CarriedWaveState)=>({...s,heldContacts:s.heldContacts.slice(1)}),
  (s:CarriedWaveState)=>({...s,heldContacts:s.heldContacts.map((h,i)=>i? h:{...h,strength:.5})}),
  (s:CarriedWaveState)=>({...s,bindingEpoch:10}),
  (s:CarriedWaveState)=>({...s,boxPartitions:[s.boxPartitions[1],s.boxPartitions[0]]}),
  (s:CarriedWaveState)=>({...s,waitingIds:[]}),
  (s:CarriedWaveState)=>({...s,neighbor:s.neighbor.slice(1)}),
 ])assert.throws(()=>compileCarriedWaveCirculate(f,change(state)));
 for(const patch of[{beats:7},{phaseBeats:[2,6]},{loopDirection:'left'},{crossRole:'robin'},{extra:'ignored'}])assert.throws(()=>compileCarriedWaveCirculate({...f,...patch} as CarriedWaveCirculateSpec,state));
 assert.throws(()=>compileCarriedWaveCirculate(f,{...state,poses:state.poses.map(p=>p.id===8?{...p,position:{x:0,z:-.64}}:p)}),/clearance/);
});

test('compiled wave owns inputs and rejects non-finite sampling',()=>{
 const state=structuredClone(fixture()),f=spec('lark'),plan=compileCarriedWaveCirculate(f,state),before=plan.sample(2);
 state.poses[0].position.x=100;state.heldContacts[0].point.x=100;f.crossRole='robin';
 assert.deepEqual(plan.sample(2),before);
 const returned=plan.sample(2);returned.poses[0].position.x=-100;returned.contacts[0].point.x=-100;
 assert.deepEqual(plan.sample(2),before);assert.throws(()=>plan.sample(NaN));assert.throws(()=>plan.position(99,.5));
});

const pairedSpec=():CarriedWaveBalanceExitSpec=>({...spec('robin'),exit:{kind:'neighbor-balance',preparationBeats:2,pairSpacing:1.18,handAcquisitionBeats:.25}});
test('explicit paired exit releases every seam before acquiring current-neighbor balance hands within existing counts',()=>{
 const incoming=compileCarriedWaveCirculate(spec('lark'),fixture()).exitState;
 const baseline=compileCarriedWaveCirculate(spec('robin'),incoming),plan=compileCarriedWaveCirculate(pairedSpec(),incoming),end=plan.exitState;
 assert.equal(end.sourceBeat,incoming.sourceBeat+8);assert.equal(end.bindingEpoch,incoming.bindingEpoch);
 assert.deepEqual(end.partner,incoming.partner);assert.deepEqual(end.neighbor,incoming.neighbor);
 assert.deepEqual(end.boxPartitions,incoming.boxPartitions);assert.deepEqual(end.actors,incoming.actors);
 assert.ok(!('wave'in end));assert.deepEqual(end.exit,{kind:'neighbor-balance',pairSpacing:1.18});
 for(const count of[0,2,4,4.075,5,6])assert.deepEqual(plan.sample(count),baseline.sample(count));
 assert.equal(plan.sample(4.075).contacts.length,incoming.wave.hands.length);
 for(const count of[4.15,6,7.5,7.75])assert.deepEqual(plan.sample(count).contacts,[]);
 assert.equal(plan.sample(7.875).contacts.length,8);assert.ok(plan.sample(7.875).contacts.every(h=>Math.abs(h.strength-.5)<1e-7));
 const neighbors=new Map(incoming.neighbor),poses=new Map(end.poses.map(p=>[p.id,p]));
 assert.equal(end.heldContacts.length,8);
 for(const h of end.heldContacts){assert.equal(neighbors.get(h.a),h.b);assert.equal(h.kind,'joined');assert.equal(h.strength,1);assert.notEqual(h.handA,h.handB);}
 for(const id of incoming.wave.actorIds){
  const p=poses.get(id)!,q=poses.get(neighbors.get(id)!)!,slot=baseline.exitState.poses.find(p=>p.id===id)!;
  assert.ok(Math.abs(Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)-1.18)<1e-7);
  assert.ok(turn(p.yaw,Math.atan2(q.position.x-p.position.x,q.position.z-p.position.z))<1e-7);
  assert.ok(Math.abs(Math.hypot(p.position.x-slot.position.x,p.position.z-slot.position.z)-.05)<1e-7);
 }
 for(const id of incoming.waitingIds!)assert.deepEqual(poses.get(id),incoming.poses.find(p=>p.id===id));
 assert.ok(plan.maximumObservedYawRate<=2.5);assert.ok(plan.maximumObservedSpeed<=1.8);assert.ok(plan.minimumObservedClearance>=.45);
 assert.throws(()=>compileCarriedWaveCirculate(spec('lark'),end as unknown as CarriedWaveState),/field|wave/i);
});

test('paired preparation depends on actual geometry and neighbors under renumbering and translation',()=>{
 const source=compileCarriedWaveCirculate(spec('lark'),fixture()).exitState,id=(n:number)=>101+7*n,shift=<T extends{x:number;z:number}>(p:T):T=>({...p,x:p.x+3,z:p.z-2}),edge=<T extends{a:number;b:number}>(h:T):T=>({...h,a:id(h.a),b:id(h.b)});
 const changed:CarriedWaveState={...source,actors:source.actors.map(a=>({...a,id:id(a.id),couple:a.couple+20})),poses:source.poses.map(p=>({...p,id:id(p.id),position:shift(p.position)})),partner:source.partner.map(([a,b])=>[id(a),id(b)]),neighbor:source.neighbor.map(([a,b])=>[id(a),id(b)]),waitingIds:source.waitingIds!.map(id),boxPartitions:source.boxPartitions.map(box=>box.map(id)),wave:{...source.wave,actorIds:source.wave.actorIds.map(id),lines:source.wave.lines.map(l=>({...l,order:l.order.map(id)})),hands:source.wave.hands.map(edge),seamHands:source.wave.seamHands.map(edge)},heldContacts:source.heldContacts.map(h=>({...edge(h),point:shift(h.point)}))};
 const a=compileCarriedWaveCirculate(pairedSpec(),source),b=compileCarriedWaveCirculate(pairedSpec(),changed);
 for(const count of[0,4,6,7,7.875,8]){
  const A=a.sample(count),B=new Map(b.sample(count).poses.map(p=>[p.id,p]));
  for(const p of A.poses){const q=B.get(id(p.id))!,want=shift(p.position);assert.ok(Math.hypot(q.position.x-want.x,q.position.z-want.z)<1e-7);assert.ok(turn(p.yaw,q.yaw)<1e-7);}
 }
});

test('paired exit rejects unsupported endpoint options and incompatible actual neighbor stations',()=>{
 const incoming=compileCarriedWaveCirculate(spec('lark'),fixture()).exitState,f=pairedSpec();
 for(const patch of[{preparationBeats:1},{pairSpacing:1.28},{handAcquisitionBeats:.5},{kind:'partner-balance'},{ignored:true}])assert.throws(()=>compileCarriedWaveCirculate({...f,exit:{...f.exit,...patch}} as CarriedWaveBalanceExitSpec,incoming));
 // After only one circulation, these neighbors are no longer same-side pairs.
 assert.throws(()=>compileCarriedWaveCirculate({...pairedSpec(),crossRole:'lark',loopRole:'robin'},fixture()),/sideline|neighbor/);
 const foreign:CarriedWaveState={...incoming,neighbor:incoming.neighbor.map(([a,b])=>[a,b<4?b+4:b-4])};
 assert.throws(()=>compileCarriedWaveCirculate(f,foreign),/box/);
 // Explicit standalone four-count call preserves its count, with the same
 // final-two-count preparation rather than inventing a preceding balance.
 const plain=compileCarriedWaveCirculate({...spec('robin',false),exit:f.exit},incoming),combined=compileCarriedWaveCirculate(f,incoming);
 for(const t of[0,1,2,3,4])assert.deepEqual(plain.sample(t),combined.sample(t+4));
});

for(const couples of[3,4])test(`left-loop full waves retain actual hands and waiting actors through four calls in a ${couples}-couple set`,()=>{
 const raw=fixture(),actors=raw.actors.slice(0,couples*2),ids=new Set(actors.map(a=>a.id));
 const boxes=raw.boxPartitions.slice(0,Math.floor(couples/2)),active=new Set(boxes.flat());
 const poses=raw.poses.filter(p=>ids.has(p.id)).map(p=>({...p,position:{x:-p.position.x,z:p.position.z},yaw:-p.yaw}));
 const segments=boxes.map(box=>({lines:raw.wave.lines.map(l=>({...l,order:l.order.filter(id=>box.includes(id))})).reverse(),hands:raw.wave.hands.filter(h=>box.includes(h.a)&&box.includes(h.b)).map(h=>({...h,handA:'left' as const,handB:'left' as const}))}));
 const wave=joinLongWaveSegments(segments,poses,boxes.flat(),raw.bindingEpoch);
 const start:CarriedWaveState={...raw,actors,poses,boxPartitions:boxes,partner:raw.partner.filter(([id])=>ids.has(id)),neighbor:raw.neighbor.filter(([id])=>active.has(id)),waitingIds:actors.filter(a=>!active.has(a.id)).map(a=>a.id),wave,heldContacts:fullLongWaveContacts(wave,poses)};
 let state=start;
 for(let call=0;call<4;call++){
  const plan=compileCarriedWaveCirculate({...spec(call%2?'robin':'lark',false),loopDirection:'left'},state);
  assert.deepEqual(plan.sample(0).contacts,state.heldContacts);assert.equal(plan.exitState.sourceBeat,start.sourceBeat+4*(call+1));
  for(let beat=0;beat<=4;beat+=1/64){const frame=plan.sample(beat),used=new Set<string>();for(const id of start.waitingIds!)assert.deepEqual(frame.poses.find(p=>p.id===id),start.poses.find(p=>p.id===id));for(const h of frame.contacts)for(const [id,hand]of[[h.a,h.handA],[h.b,h.handB]]){const key=`${id}:${hand}`;assert.ok(!used.has(key));used.add(key);}}
  state=plan.exitState;assert.deepEqual(state.partner,start.partner);assert.deepEqual(state.neighbor,start.neighbor);assert.equal(state.bindingEpoch,start.bindingEpoch);
  assert.ok(state.wave.hands.filter(h=>!state.wave.seamHands.includes(h)).every(h=>h.handA==='left'));
  assert.ok(state.wave.seamHands.every(h=>h.handA==='right'));
  assert.ok(plan.maximumObservedSpeed<=1.8);assert.ok(plan.minimumObservedClearance>=.45);
 }
 for(const p of state.poses){const q=start.poses.find(q=>q.id===p.id)!;assert.ok(Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)<1e-7);assert.ok(turn(p.yaw,q.yaw)<1e-7);}
 assert.deepEqual(state.wave,start.wave);for(const [i,h]of state.heldContacts.entries()){const q=start.heldContacts[i];assert.deepEqual({...h,point:q.point},q);assert.ok(Math.hypot(h.point.x-q.point.x,h.point.y-q.point.y,h.point.z-q.point.z)<1e-7);}
});
