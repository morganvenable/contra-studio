import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {compileChoreography} from './choreography.ts';
import {compileAllemandeToNeighborBalance,compileSpaciousNeighborDoSiDo} from './becket-star-figures.ts';
import {compileStarProgressingBecket} from './becket-star-progression.ts';
import {withBalanceStance} from './stance.ts';
import {readContraDbSource} from './contradb-source.ts';
import {reviewedBecketStar} from '../test-data/becket-star/fixture.ts';
import type {Dance,Pose} from './types.ts';
const raw=()=>readFileSync(new URL('../test-data/contradb/2446.json',import.meta.url),'utf8');
const compiled=new Map<number,ReturnType<typeof compileStarProgressingBecket>>();
const make=(count:number)=>{if(!compiled.has(count)){const d=reviewedBecketStar();compiled.set(count,compileChoreography(d,count,{progressionEvents:true,becketStarProgressions:true}) as ReturnType<typeof compileStarProgressingBecket>);}return compiled.get(count)!;};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z),yaw=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));
const corners=(poses:readonly Pose[])=>[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>poses.find(p=>Math.sign(p.position.x)===x&&Math.sign(p.position.z)===z)!.id);

test('actual2446 retains exact source credit, CCW, seven rows,64counts and explicit progression distinct from reviewed ends',()=>{
 const r=readContraDbSource(raw()).record!,d=reviewedBecketStar();assert.equal(r.title,'Reel Time');assert.equal(r.author,'Cary Ravitz');assert.equal(r.formation,'Becket ccw');assert.equal(r.publication,'shared to sketchbook');assert.equal(d.circulation,'ccw');assert.equal(r.rows.length,7);assert.deepEqual(r.rows.map(row=>row.beats),[8,8,16,8,8,8,8]);assert.deepEqual(d.figures.map(f=>f.beats),[8,8,4,12,8,8,8,8]);assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(d.progressionEvents![0].source.basis,'source-explicit');assert.match(d.progressionEvents![0].source.clause,/star left 4 places.*next neighbors do si do once/);assert.equal(d.endPolicy!.source.basis,'reviewed-interpretation');assert.match(d.endPolicy!.source.clause,/source omits end choreography/);
});

test('independent source corner oracle proves CCW moves east partners up and west partners down before the complete star',()=>{
 const c=make(2);assert.deepEqual(corners(c.sample(0).poses),[2,1,0,3]);assert.deepEqual(corners(c.sample(16).poses),[0,1,2,3]);assert.deepEqual(corners(c.sample(32).poses),[0,1,2,3]);
 // The first east-side couple (0,1) is physically at the upper end row;
 // the first west-side couple (2,3) is at the lower. No role mirror is used.
 for(const id of[0,1])assert.ok(Math.abs(c.sample(40).poses[id].position.z+.9)<1e-7);
 for(const id of[2,3])assert.ok(Math.abs(c.sample(40).poses[id].position.z-.9)<1e-7);
 for(const id of[0,1,2,3]){assert.ok(gap(c.sample(32).poses[id],c.sample(40).poses[id])<1e-7);let total=0,last=Math.atan2(c.sample(32).poses[id].position.z,c.sample(32).poses[id].position.x);for(let i=1;i<=1600;i++){const p=c.sample(32+i/200).poses[id],at=Math.atan2(p.position.z,p.position.x);total+=Math.atan2(Math.sin(at-last),Math.cos(at-last));last=at;}assert.ok(Math.abs(total+2*Math.PI)<1e-7,`literal full left star actor${id}:${total}`);}
 assert.equal(c.topology(40-1e-7).epoch,0);assert.equal(c.topology(40).epoch,1);assert.deepEqual(c.topology(40).waitingIds,[0,1,2,3]);
});

test('all2–12couple discovered finite periods prove stable partners, exact neighbors, clear roots, hand occupancy and no reset',()=>{
 for(let count=2;count<=12;count++){const c=make(count),presented=withBalanceStance(c),end=c.period*64;assert.equal(c.periodStart,0);assert.equal(c.period,2*count);assert.equal(c.repeatable,true);assert.deepEqual(c.starts,[0,8,16,20,32,40,48,56]);
  for(let beat=0;beat<=end;beat+=.5){const f=presented.sample(beat),binding=c.topology(beat),waiting=new Set(binding.waitingIds),hands=new Set<string>();assert.deepEqual(f.poses.map(p=>p.id),c.dancers.map(d=>d.id));assert.equal(new Set(binding.neighbors.flat()).size,binding.neighbors.length*2);assert.equal(binding.neighbors.length*2+waiting.size,count*2);
   for(const[a,b]of binding.neighbors){assert.notEqual(c.dancers[a].couple,c.dancers[b].couple);assert.notEqual(c.dancers[a].role,c.dancers[b].role);assert.ok(!waiting.has(a)&&!waiting.has(b));}
   for(let a=0;a<f.poses.length;a++){assert.equal(c.dancers[a].couple,Math.floor(a/2));assert.equal(c.dancers[a].role,a%2?'robin':'lark');assert.ok([f.poses[a].position.x,f.poses[a].position.z,f.poses[a].yaw].every(Number.isFinite));for(let b=a+1;b<f.poses.length;b++)assert.ok(gap(f.poses[a],f.poses[b])>.48,`${count}/${beat}/${a}/${b}`);}
   for(const h of f.contacts){assert.ok(!waiting.has(h.a)&&!waiting.has(h.b));for(const key of[h.a+':'+h.handA,...(!h.target||h.target==='hands'?[h.b+':'+h.handB]:[])]){assert.ok(!hands.has(key));hands.add(key);}}
  }
  for(let round=0;round<c.period;round++)for(const local of[...c.starts,64]){const beat=round*64+local;if(!beat)continue;const before=presented.sample(beat-1e-7),after=presented.sample(beat+1e-7);for(const p of after.poses){assert.ok(gap(p,before.poses[p.id])<1e-5,`root${count}/${beat}/${p.id}`);assert.ok(yaw(p,before.poses[p.id])<1e-5,`yaw${count}/${beat}/${p.id}`);}}
  for(const p of c.sample(0).poses){assert.ok(gap(p,c.sample(end).poses[p.id])<1e-7);assert.ok(yaw(p,c.sample(end).poses[p.id])<1e-7);}const saved=c.sample(37.125);c.sample(Number.MAX_SAFE_INTEGER);assert.deepEqual(c.sample(37.125),saved);
 }
});

test('finite ends physically exchange during40–48, hold still lark-left and reenter only at the next source boundary',()=>{
 for(const count of[2,3,6]){const c=make(count);for(let round=0;round<c.period;round++){const beat=round*64,ids=c.topology(beat+40).waitingIds;for(const id of ids){const start=c.sample(beat+40).poses[id],finish=c.sample(beat+48).poses[id];assert.ok(gap(start,finish)>1.79);assert.ok(Math.abs(start.position.z-finish.position.z)<1e-7);const top=start.position.z<0;if(c.dancers[id].role==='lark')assert.equal(Math.sign(finish.position.x),top?1:-1);for(const local of[48,55,63.999,64,72,103.999]){const p=c.sample(beat+local).poses[id];assert.ok(gap(p,finish)<1e-6);assert.equal(p.stride,0);}assert.ok(!c.topology(beat+104).waitingIds.includes(id));}}}
});

test('unreviewed end policy, CW reversal, role changes, timing edits, wrong stars and stale events fail closed',()=>{
 const base=reviewedBecketStar(),run=(d:Dance)=>compileStarProgressingBecket(d,3,{...d.progressionEvents![0],count:1,waitingRoleArrangement:'lark-left'});
 const edits:Array<(d:Dance)=>void>=[d=>delete d.endPolicy,d=>d.endPolicy!.source.basis='source-explicit',d=>d.endPolicy!.sameEndTurnBeats=4,d=>d.endPolicy!.reentryPreparationBeats=2,d=>d.endPolicy!.source.sourceId='another-source',d=>d.endPolicy!.waitingRoleArrangement='lark-right',d=>d.circulation='cw',d=>d.figures[1].amount=.5,d=>d.figures[1].direction='right',d=>d.figures[1].who='robins',d=>d.figures[4].amount=.75,d=>d.figures[4].direction='right',d=>d.figures[5].who='partner',d=>d.figures[0].beats=7,d=>d.progressionEvents![0].afterFigureId=d.figures[3].id,d=>(d.endPolicy as any).teleport=true];
 for(const edit of edits){const d=structuredClone(base);edit(d);assert.throws(()=>run(d));}
 const renamed=structuredClone(base);renamed.title='Independent title';renamed.id='unrelated';assert.equal(run(renamed).repeatable,true);
 const original=structuredClone(base),c=run(original),saved=c.sample(37);original.figures[4].direction='right';original.endPolicy!.source.clause='changed';assert.deepEqual(c.sample(37),saved);assert.ok(Object.isFrozen(c.dance.endPolicy));
});

test('left-star contact graph and tangential facing use the stated hand while new-neighbor do-si-do passes right shoulders',()=>{
 const c=make(3),starStart=c.sample(32),groups=c.topology(32).neighbors.flat(),active=new Set(groups);
 for(const beat of[34,35,36,37,38]){const f=c.sample(beat);assert.ok(f.contacts.length>0);const handIds=new Set<number>();for(const h of f.contacts){assert.equal(h.handA,'left');assert.equal(h.handB,'left');assert.equal(h.target,'hands');assert.ok(active.has(h.a)&&active.has(h.b));assert.ok(!handIds.has(h.a)&&!handIds.has(h.b));handIds.add(h.a);handIds.add(h.b);assert.notEqual(c.dancers[h.a].couple,c.dancers[h.b].couple);assert.equal(c.dancers[h.a].role,c.dancers[h.b].role);}
  if(beat<=37)for(const id of active){const p=f.poses[id],a=c.sample(beat-1e-5).poses[id],b=c.sample(beat+1e-5).poses[id],direction=Math.atan2(b.position.x-a.position.x,b.position.z-a.position.z);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-direction),Math.cos(p.yaw-direction)))<1e-3);}
 }
 for(const[a,b]of c.topology(40).neighbors){const start=c.sample(40),quarter=c.sample(42),end=c.sample(48),v={x:start.poses[b].position.x-start.poses[a].position.x,z:start.poses[b].position.z-start.poses[a].position.z},lane=quarter.poses[a].position.x-start.poses[a].position.x;assert.equal(Math.sign(lane),Math.sign(v.z));assert.ok(Math.abs(Math.abs(lane)-.45)<1e-7);assert.ok(gap(start.poses[a],end.poses[a])<1e-7);assert.ok(gap(start.poses[b],end.poses[b])<1e-7);assert.equal(quarter.contacts.length,0);}
});


test('direct transition wrappers own incoming poses and reject method replacement',()=>{
 const c=make(3),dance=reviewedBecketStar(),partner=new Map([[0,1],[1,0],[2,3],[3,2],[4,5],[5,4]]);
 for(const index of[1,5]){const beat=index===1?8:40,topology=c.topology(beat),ids=topology.neighbors.flat().sort((a,b)=>a-b),neighbor=new Map(topology.neighbors.flatMap(([a,b])=>[[a,b],[b,a]] as [number,number][])),context={ids,start:structuredClone(c.sample(beat).poses),dancers:structuredClone(c.dancers),relations:{epoch:topology.epoch,partner,neighbor},bindingEpoch:topology.epoch,next:dance.figures[index+1]},f=dance.figures[index],plan=index===1?compileAllemandeToNeighborBalance(f,context,[-1,1,-1],dance.figures,index):compileSpaciousNeighborDoSiDo(f,context,[-1,1,-1],dance.figures,index),id=ids[0],point=plan.position(id,.5);
  assert.ok(Object.isFrozen(plan));assert.throws(()=>{plan.position=()=>({x:0,z:0});},TypeError);context.start[id].position.x+=99;context.ids.reverse();assert.deepEqual(plan.position(id,.5),point);
 }
});
