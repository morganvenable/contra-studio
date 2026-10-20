import test from 'node:test';import assert from 'node:assert/strict';
import {createInitialLongWaveState} from './initial-long-wave-state.ts';
import {compileCarriedWaveCirculate} from './carried-wave-circulate.ts';
import {compileCarriedWaveBalance} from './carried-wave-balance.ts';
import {compileCarriedWaveSwing} from './carried-wave-swing.ts';
function fixture(couples:number,sparse=false){
 const ids=Array.from({length:couples*2},(_,i)=>sparse?500+i*13:i),actors=ids.map((id,i)=>({id,role:i%2?'robin'as const:'lark'as const,couple:Math.floor(i/2)+30})),boxes=Array.from({length:Math.floor(couples/2)},(_,i)=>ids.slice(i*4,i*4+4));
 const poses=actors.map((a,i)=>{const row=Math.floor(i/2),d=row%2?-1:1;return{id:a.id,position:{x:.64*(a.role==='lark'?d:-d)+(sparse?4:0),z:row*1.28+(sparse?-7:0)},yaw:0,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'as const};});
 let state=createInitialLongWaveState({sourceBeat:0,bindingEpoch:3,actors,poses,partner:ids.map((id,i)=>[id,ids[i%2?i-1:i+1]]),neighbor:boxes.flatMap(([a,b,c,d])=>[[a,d],[d,a],[b,c],[c,b]]as[number,number][]),boxPartitions:boxes,waitingIds:ids.slice(boxes.length*4),inwardRole:'robin',neighborHand:'right'});
 for(const crossRole of['robin','lark']as const)state=compileCarriedWaveCirculate({kind:'balance-box-circulate',beats:8,crossRole,loopRole:crossRole==='robin'?'lark':'robin',loopDirection:'right',phaseBeats:[4,4],balanceStyle:'right-left'},state).exitState;
 return compileCarriedWaveBalance({kind:'wave-balance',beats:4,style:'right-left'},state).exitState;
}
const spec={kind:'swing',beats:12,who:'neighbor'}as const;
test('actual complete wave releases into twelve-count neighbor swing across finite sets',()=>{
 for(const n of[3,4]){
  const state=fixture(n),p=compileCarriedWaveSwing(spec,state);
  assert.deepEqual(p.sample(0).poses,state.poses);assert.deepEqual(p.sample(0).contacts,state.heldContacts);assert.equal(p.exitState.sourceBeat,32);assert.equal(p.exitState.bindingEpoch,3);assert.deepEqual(p.exitState.partner,state.partner);assert.deepEqual(p.exitState.neighbor,state.neighbor);assert.ok(!('wave'in p.exitState));assert.deepEqual(p.exitState.heldContacts,[]);
  assert.equal(p.sample(.075).contacts.length,state.heldContacts.length);assert.ok(p.sample(.075).contacts.every(h=>Math.abs(h.strength-.5)<1e-7));assert.deepEqual(p.sample(.15).contacts,[]);assert.ok(p.sample(1.75).contacts.every(h=>h.strength>1-1e-7));assert.deepEqual(p.sample(9.84).contacts,[]);
  assert.ok(p.maximumObservedSpeed<.94);assert.ok(p.maximumObservedYawRate<2.64);assert.ok(p.minimumObservedClearance>.6199);assert.ok(p.maximumObservedReach<.625);
  assert.ok(Math.hypot(p.sample(.25).poses[0].position.x-state.poses[0].position.x,p.sample(.25).poses[0].position.z-state.poses[0].position.z)>.05);
  for(const id of state.waitingIds!)for(const beat of[0,.1,1.75,6,12])assert.deepEqual(p.sample(beat).poses.find(p=>p.id===id),state.poses.find(p=>p.id===id));
  let prior=p.sample(0);for(let tick=1;tick<=12*128;tick++){const current=p.sample(tick/128),keys=new Set<string>();for(const h of current.contacts){for(const k of[`${h.a}:${h.handA}`,...(!h.target||h.target==='hands'?[`${h.b}:${h.handB}`]:[])]){assert.ok(!keys.has(k));keys.add(k);}if(h.kind==='swing-frame'){const old=prior.contacts.find(q=>q.a===h.a&&q.b===h.b&&q.handA===h.handA&&q.handB===h.handB&&q.target===h.target);assert.ok(Math.abs(h.strength-(old?.strength??0))*128<3.01);}}prior=current;}
 }
});
test('sparse identities and translated stations retain equivalent motion',()=>{
 const a=compileCarriedWaveSwing(spec,fixture(4)),b=compileCarriedWaveSwing(spec,fixture(4,true));
 for(const beat of[0,.075,.25,1.75,8.84,9.84,12]){const x=a.sample(beat),y=b.sample(beat);for(let i=0;i<x.poses.length;i++){assert.equal(y.poses[i].id,500+i*13);assert.ok(Math.abs(y.poses[i].position.x-x.poses[i].position.x-4)<1e-7);assert.ok(Math.abs(y.poses[i].position.z-x.poses[i].position.z+7)<1e-7);}assert.deepEqual(y.contacts.map(h=>[h.a,h.b]),x.contacts.map(h=>[500+h.a*13,500+h.b*13]));}
});
test('unconsumed specifications, missing actual hands and incompatible entries reject',()=>{
 const state=fixture(4);assert.throws(()=>compileCarriedWaveSwing({...spec,hidden:true}as any,state));assert.throws(()=>compileCarriedWaveSwing({...spec,beats:16}as any,state));assert.throws(()=>compileCarriedWaveSwing(spec,{...state,heldContacts:state.heldContacts.slice(1)}));assert.throws(()=>compileCarriedWaveSwing(spec,{...state,poses:state.poses.map((p,i)=>i?p:{...p,position:{...p.position,x:p.position.x+.1}})}));
 const plan=compileCarriedWaveSwing(spec,state);assert.throws(()=>plan.sample(NaN));assert.throws(()=>plan.position(99999,0));
});
