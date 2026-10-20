import test from 'node:test';import assert from 'node:assert/strict';
import {createInitialLongWaveState,type InitialLongWaveInput} from './initial-long-wave-state.ts';
import {compileCarriedWaveCirculate} from './carried-wave-circulate.ts';
import {compileCarriedWaveBalance} from './carried-wave-balance.ts';
function initial(swap=false){const actors=Array.from({length:10},(_,id)=>({id,role:(id%2?'robin':'lark') as 'robin'|'lark',couple:Math.floor(id/2)})),poses=actors.map((a,i)=>{const direction=Math.floor(i/2)%2?-1:1;return{id:a.id,position:{x:.64*(a.role==='lark'?direction:-direction),z:Math.floor(i/2)*1.28},yaw:0,stride:0,lean:0,bounce:0,turn:0,activity:'waiting' as const};}),boxes=[[0,1,2,3],[4,5,6,7]];if(swap)actors.forEach(a=>a.role=a.role==='lark'?'robin':'lark');return createInitialLongWaveState({sourceBeat:0,bindingEpoch:3,actors,poses,partner:actors.map(a=>[a.id,a.id%2?a.id-1:a.id+1]),neighbor:boxes.flatMap(([a,b,c,d])=>[[a,d],[d,a],[b,c],[c,b]] as [number,number][]),boxPartitions:boxes,waitingIds:[8,9],inwardRole:swap?'lark':'robin',neighborHand:'right'} as InitialLongWaveInput);}
test('standalone balance after two actual circulations preserves whole wave and both role orders',()=>{
 for(const swap of[false,true])for(const style of['right-left','forward-back'] as const){let state=initial(swap);for(const crossRole of(swap?['lark','robin']:['robin','lark']) as ('lark'|'robin')[])state=compileCarriedWaveCirculate({kind:'balance-box-circulate',beats:8,crossRole,loopRole:crossRole==='lark'?'robin':'lark',loopDirection:'right',phaseBeats:[4,4],balanceStyle:'right-left'},state).exitState;
  const p=compileCarriedWaveBalance({kind:'wave-balance',beats:4,style},state);assert.deepEqual(p.entryState,state);assert.deepEqual(p.exitState,{...state,sourceBeat:20});assert.deepEqual(p.sample(0).poses,p.sample(4).poses);assert.deepEqual(p.sample(0).contacts,state.heldContacts);
  for(let i=0;i<=256;i++){const frame=p.sample(i/64);assert.equal(frame.contacts.length,state.wave.hands.length);assert.ok(frame.contacts.every(c=>c.strength===1));for(const h of state.wave.seamHands)assert.ok(frame.contacts.some(c=>c.a===h.a&&c.b===h.b&&c.handA===h.handA&&c.handB===h.handB));for(const id of[8,9])assert.deepEqual(frame.poses.find(q=>q.id===id),state.poses.find(q=>q.id===id));}
  assert.ok(p.minimumObservedClearance>=.45);assert.ok(p.maximumObservedSpeed<=1.8);
 }
});
test('missing seams, unconsumed semantics, unsupported timing and invalid sampling reject',()=>{
 const state=initial(),spec={kind:'wave-balance' as const,beats:4 as const,style:'right-left' as const};
 assert.throws(()=>compileCarriedWaveBalance(spec,{...state,heldContacts:state.heldContacts.slice(1)}));for(const patch of[{beats:8},{style:'bounce'},{exit:'released'},{amount:1}])assert.throws(()=>compileCarriedWaveBalance({...spec,...patch} as any,state));const p=compileCarriedWaveBalance(spec,state);assert.throws(()=>p.sample(NaN));assert.throws(()=>p.position(99,.5));
 const mutable=structuredClone(state),owned=compileCarriedWaveBalance(spec,mutable),before=owned.sample(1);mutable.poses[0].position.x=100;assert.deepEqual(owned.sample(1),before);
});
