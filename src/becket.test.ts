import test from 'node:test';import assert from 'node:assert/strict';
import {createBecketState,compileBecketShift,becketPoses} from './becket.ts';
const dist=(a:any,b:any)=>Math.hypot(a.x-b.x,a.z-b.z);
test('invalid geometry and stale or contradictory bindings fail before any motion',()=>{
  for(const dimension of [NaN,Infinity,0,-1]) {
    assert.throws(()=>createBecketState(6,{rowGap:dimension}),/finite|positive/);
    assert.throws(()=>createBecketState(6,{halfWidth:dimension}),/finite|positive/);
  }
  for(const duration of [NaN,Infinity,0,-1]) assert.throws(()=>compileBecketShift(createBecketState(6),{shiftBeats:duration}),/bounded/);
  const stale=createBecketState(6);stale.groups[0].epoch++;
  assert.throws(()=>compileBecketShift(stale),/stale|contradict/);
  const duplicate=createBecketState(6);duplicate.couples[2].centerZ=duplicate.couples[0].centerZ;
  assert.throws(()=>compileBecketShift(duplicate),/stale|contradict|two minor/);
});
test('clockwise shift binds new neighbors at beat two, never by nearest current dancer',()=>{const state=createBecketState(6),p=compileBecketShift(state);assert.equal(p.afterShift.epoch,1);assert.deepEqual(p.waitingCouples,[1,4]);assert.equal(p.afterShift.groups.length,2);assert.deepEqual(p.events.filter(e=>e.kind==='rebind-neighbors').map(e=>e.beat),[2]);for(const c of state.couples){const after=p.afterShift.couples[c.id];assert.ok(Math.abs(after.centerZ-c.centerZ-(c.side==='east'?1.8:-1.8))<1e-8);}});
test('finite end effects cross the same end and preserve partner/role identities',()=>{for(let n=2;n<=12;n++){let s=createBecketState(n);const initial=becketPoses(s),sideVisits=new Map(s.couples.map(c=>[c.id,new Set([c.side])]));let worst=Infinity;for(let cycle=0;cycle<2*n;cycle++){const p=compileBecketShift(s),end=p.sample(64),target=becketPoses(p.nextRound);assert.equal(p.waitingCouples.length,n%2?1:cycle%2?0:2);for(const id of p.waitingCouples){assert.equal(p.nextRound.couples[id].centerZ,p.afterShift.couples[id].centerZ);assert.notEqual(p.nextRound.couples[id].side,p.afterShift.couples[id].side);}for(let i=0;i<end.length;i++)assert.ok(dist(end[i].position,target[i].position)<1e-8);for(let b=0;b<=64;b+=.25){const f=p.sample(b);assert.equal(new Set(f.map(d=>d.id)).size,n*2);for(let i=0;i<f.length;i++)for(let j=i+1;j<f.length;j++)worst=Math.min(worst,dist(f[i].position,f[j].position));}s=p.nextRound;for(const c of s.couples)sideVisits.get(c.id)!.add(c.side);}assert.ok(worst>.5,`${n} couples, clearance ${worst}`);for(const set of sideVisits.values())assert.equal(set.size,2);for(let i=0;i<initial.length;i++)assert.ok(dist(becketPoses(s)[i].position,initial[i].position)<1e-8,`${n} couples must return after a full finite circulation`);}});
test('shift and end turns have continuous positions and facing',()=>{for(const n of [3,4,6,8]){let state=createBecketState(n);for(let round=0;round<2*n;round++){const p=compileBecketShift(state);for(const b of [2,6,60]){const a=p.sample(b-1e-5),c=p.sample(b+1e-5);for(let i=0;i<a.length;i++)assert.ok(dist(a[i].position,c[i].position)<1e-4);}const a=p.sample(64),b=compileBecketShift(p.nextRound).sample(0);for(let i=0;i<a.length;i++){assert.ok(dist(a[i].position,b[i].position)<1e-8);assert.ok(Math.abs(Math.atan2(Math.sin(a[i].yaw-b[i].yaw),Math.cos(a[i].yaw-b[i].yaw)))<1e-8);}state=p.nextRound;}}});
