import test from 'node:test';
import assert from 'node:assert/strict';
import {createDancers,compilePrimitiveFigure} from './engine.ts';
import {bindDirectedCoupleSlots} from './progression-topology.ts';
import {createInitialLongWaveState} from './initial-long-wave-state.ts';
import {compileCarriedWaveCirculate} from './carried-wave-circulate.ts';
import {captureSequenceBoundary,sampleSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import {compileHeldPairBalanceStep} from './held-pair-balance-step.ts';
import type {Figure,Pose} from './types.ts';
const call=(crossRole:'lark'|'robin')=>({
 kind:'balance-box-circulate' as const,beats:8 as const,phaseBeats:[4,4] as const,
 balanceStyle:'right-left' as const,crossRole,
 loopRole:crossRole==='lark'?'robin' as const:'lark' as const,loopDirection:'right' as const,
});
for(const couples of [2,3,4,5,6])test(`initial wave carries two circulations into neighbor balance and swing with ${couples} couples`,()=>{
 const dancers=createDancers(couples),directions=dancers.filter(d=>d.role==='lark').map(d=>d.direction);
 const binding=bindDirectedCoupleSlots(dancers,0,dancers.filter(d=>d.role==='lark').map(d=>({coupleId:d.couple,rank:d.couple,direction:d.direction})));
 const poses:Pose[]=dancers.map(d=>({id:d.id,position:{x:.64*(d.role==='lark'?d.direction:-d.direction),z:(d.couple-(couples-1)/2)*1.28},yaw:d.direction===1?0:Math.PI,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
 const initial=createInitialLongWaveState({
  sourceBeat:0,bindingEpoch:0,actors:dancers.map(({id,role,couple})=>({id,role,couple})),
  poses,partner:[...binding.relations.partner],neighbor:[...binding.relations.neighbor],
  boxPartitions:binding.groups.map(g=>[...g.actors]),waitingIds:binding.waitingIds,
  inwardRole:'robin',neighborHand:'right',
 });
 const first=compileCarriedWaveCirculate(call('robin'),initial);
 const second=compileCarriedWaveCirculate({...call('lark'),exit:{kind:'neighbor-balance',preparationBeats:2,pairSpacing:1.18,handAcquisitionBeats:.25}},first.exitState);
 const end=second.exitState;
 assert.equal(end.sourceBeat,16);assert.equal(end.bindingEpoch,0);
 assert.deepEqual(end.partner,initial.partner);assert.deepEqual(end.neighbor,initial.neighbor);
 const balance:Figure={id:'balance',label:'Neighbors balance',kind:'balance',who:'neighbor',beats:4};
 const swing:Figure={id:'swing',label:'Neighbors swing',kind:'swing',who:'neighbor',beats:12};
 for(const box of end.boxPartitions){
  const ids=[...box],members=new Set(ids);
  // Reject any crossing edge before projecting the now-local holds.
  for(const h of end.heldContacts)assert.equal(members.has(h.a),members.has(h.b),'A full-wave seam cannot silently disappear at the local boundary.');
  const contacts=end.heldContacts.filter(h=>members.has(h.a));
  const start=end.poses.map(p=>({...p,position:{...p.position}}));
  const context={ids,start,dancers,relations:binding.relations,bindingEpoch:end.bindingEpoch,next:swing};
  const carried=captureSequenceBoundary(context,16,contacts);
  const plan=compileHeldPairBalanceStep(balance,context,carried);
  assert.throws(()=>compileHeldPairBalanceStep(balance,context,{...carried,heldContacts:[]}));
  assert.throws(()=>compileHeldPairBalanceStep(balance,context,{...carried,heldContacts:carried.heldContacts.slice(1)}));
  assertSequenceHandoff(carried,sampleSequenceBoundary(context,plan,16,0));
  const balanceExit=sampleSequenceBoundary(context,plan,20,1);
  for(const p of balanceExit.poses)start[p.id]={...start[p.id],position:{...p.position},yaw:p.yaw};
  const swingContext={...context,start};
  const swingPlan=compilePrimitiveFigure(swing,ids,start,dancers,directions,{swingEntry:'two-hand-balance',geometry:{halfWidth:.64,rowGap:1.28},canonicalSwingLayout:true});
  assertSequenceHandoff(balanceExit,sampleSequenceBoundary(swingContext,swingPlan,20,0));
  assert.equal(sampleSequenceBoundary(swingContext,swingPlan,32,1).sourceBeat,32);
 }
 for(const id of binding.waitingIds)assert.deepEqual(end.poses.find(p=>p.id===id),initial.poses.find(p=>p.id===id));
});
