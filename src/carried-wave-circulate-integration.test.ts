import test from 'node:test';
import assert from 'node:assert/strict';
import {compileCarriedWaveCirculate,type CarriedWaveState} from './carried-wave-circulate.ts';
import {compileLongWaveImproper} from './long-wave-source-sequence.ts';
import {BOB_THE_SURFER} from '../test-data/long-wave/bob-fixture.ts';
import {fullLongWaveContacts} from './full-long-wave.ts';
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const figure=(crossRole:'lark'|'robin')=>({kind:'balance-box-circulate' as const,beats:8 as const,crossRole,loopRole:crossRole==='lark'?'robin' as const:'lark' as const,loopDirection:'right' as const,phaseBeats:[4,4] as const,balanceStyle:'right-left' as const});
for(const couples of [2,3,4])test(`source 1591 carried circulation preserves people, full-wave seams and waiting exclusion with ${couples} couples`,()=>{
 const legacy=compileLongWaveImproper(BOB_THE_SURFER,couples,BOB_THE_SURFER.progressionEvents![0] as any);
 for(const repeat of [0,1]){
  const start=repeat*64+48,topology=legacy.topology(start),wave=topology.wave!;
  if(!wave.actorIds.length)continue;
  const oldEntry=legacy.sample(start),active=new Set(wave.actorIds);
  const neighbor=topology.neighbors.flatMap(([a,b])=>[[a,b],[b,a]] as [number,number][]).filter(([a])=>active.has(a));
  const partitions:number[][]=[];
  for(let i=0;i<wave.lines[0].order.length;i+=2)partitions.push([wave.lines[0].order[i],wave.lines[1].order[i],wave.lines[1].order[i+1],wave.lines[0].order[i+1]]);
  const incoming:CarriedWaveState={
   sourceBeat:start,bindingEpoch:topology.epoch,
   actors:legacy.dancers.map(({id,role,couple})=>({id,role,couple})),
   poses:oldEntry.poses,partner:legacy.dancers.map(({id})=>[id,id^1]),
   neighbor,boxPartitions:partitions,wave,heldContacts:oldEntry.contacts,waitingIds:topology.waitingIds,
  };
  const first=compileCarriedWaveCirculate(figure('lark'),incoming),second=compileCarriedWaveCirculate(figure('robin'),first.exitState);
  assert.deepEqual(first.entryState.heldContacts,incoming.heldContacts);
  assert.deepEqual(first.sample(0).contacts,incoming.heldContacts);
  assert.deepEqual(first.exitState.heldContacts,second.entryState.heldContacts);
  for(const [plan,elapsed]of [[first,8],[second,16]] as const){
   assert.equal(plan.exitState.sourceBeat,start+elapsed);
   assert.equal(plan.exitState.bindingEpoch,topology.epoch);
   assert.deepEqual(plan.exitState.partner,incoming.partner);
   assert.deepEqual(plan.exitState.neighbor,incoming.neighbor);
   assert.deepEqual(plan.exitState.actors,incoming.actors);
   assert.deepEqual(plan.sample(8).contacts,fullLongWaveContacts(plan.exitState.wave,plan.exitState.poses));
   assert.equal(plan.exitState.wave.seamHands.length,wave.seamHands.length);
   for(const id of topology.waitingIds){
    assert.deepEqual(plan.exitState.poses.find(p=>p.id===id),incoming.poses.find(p=>p.id===id));
    assert.ok(!plan.exitState.wave.actorIds.includes(id));
    assert.ok(plan.sample(8).contacts.every(c=>c.a!==id&&c.b!==id));
   }
  }
  // Independent station oracle: clockwise four-cycle, then its square.
  const initial=new Map(incoming.poses.map(p=>[p.id,p]));
  const one=new Map(first.exitState.poses.map(p=>[p.id,p])),two=new Map(second.exitState.poses.map(p=>[p.id,p]));
  for(const box of partitions)for(let i=0;i<4;i++){
   assert.ok(distance(one.get(box[i])!.position,initial.get(box[(i+1)%4])!.position)<1e-7);
   assert.ok(distance(two.get(box[i])!.position,initial.get(box[(i+2)%4])!.position)<1e-7);
  }
  const oldMiddle=legacy.sample(start+8),oldEnd=legacy.sample(start+16-1e-8);
  for(const p of first.exitState.poses){
   assert.ok(distance(p.position,oldMiddle.poses[p.id].position)<1e-7);
   assert.ok(angle(p.yaw,oldMiddle.poses[p.id].yaw)<1e-7);
  }
  for(const p of second.exitState.poses)assert.ok(distance(p.position,oldEnd.poses[p.id].position)<1e-7);
  // The old wrapper owns terminal release, end-facing and progression. The
  // shared second circulation deliberately still has complete wave contacts.
  assert.ok(second.sample(8).contacts.length>0);
  assert.equal(legacy.topology(start+16).epoch,topology.epoch+1);
  if(couples===4&&repeat===0){
   const id=(n:number)=>100+n*7,point=<T extends {x:number;z:number}>(p:T):T=>({...p,x:p.x+2.75,z:p.z-4.5});
   const edge=<T extends {a:number;b:number}>(h:T):T=>({...h,a:id(h.a),b:id(h.b)});
   const changed:CarriedWaveState={...incoming,
    actors:incoming.actors.map(a=>({...a,id:id(a.id),couple:a.couple+41})),
    poses:incoming.poses.map(p=>({...p,id:id(p.id),position:point(p.position)})),
    partner:incoming.partner.map(([a,b])=>[id(a),id(b)]),neighbor:incoming.neighbor.map(([a,b])=>[id(a),id(b)]),
    waitingIds:incoming.waitingIds?.map(id),boxPartitions:incoming.boxPartitions.map(box=>box.map(id)),
    wave:{...wave,actorIds:wave.actorIds.map(id),lines:wave.lines.map(line=>({...line,order:line.order.map(id)})),hands:wave.hands.map(edge),seamHands:wave.seamHands.map(edge)},
    heldContacts:incoming.heldContacts.map(h=>({...edge(h),point:point(h.point)})),
   };
   const moved=compileCarriedWaveCirculate(figure('lark'),changed);
   for(const count of [0,2,4,6,8]){
    const reference=first.sample(count),actual=new Map(moved.sample(count).poses.map(p=>[p.id,p]));
    for(const p of reference.poses){
     assert.ok(distance(actual.get(id(p.id))!.position,point(p.position))<1e-7);
     assert.ok(angle(actual.get(id(p.id))!.yaw,p.yaw)<1e-7);
    }
   }
  }
 }
});
