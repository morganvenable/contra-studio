import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCarriedWaveCirculate,type CarriedWaveState,type CarriedWaveCirculateSpec} from './carried-wave-circulate.ts';
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
