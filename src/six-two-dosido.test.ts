import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {compileSixTwoImproper,type SixTwoSourceDance} from './six-two-source-sequence.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {distance,turn} from './ring-twirl-contract.ts';
const raw=readFileSync(new URL('../test-data/contradb/443.json',import.meta.url),'utf8');
const dance=()=>{const p=prepareContraDbReview(raw);assert.ok(p.result.dance,JSON.stringify(p.result.errors));return p.result.dance;};
const corners=(poses:ReturnType<ReturnType<typeof compileChoreography>['sample']>['poses'])=>[...poses].sort((a,b)=>{const slot=(p:typeof a)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);
test('443 retains both complete do-si-dos and its literal circle/pass corner sequence',()=>{
 const d=dance(),c=compileChoreography(d,2),sample=c.formationSample??c.sample;
 assert.deepEqual(d.figures.map(f=>f.beats),[8,8,8,8,8,8,8,6,2]);
 for(const [beat,ids]of [[0,[1,0,3,2]],[8,[1,0,3,2]],[16,[2,3,0,1]],[24,[2,3,0,1]],[32,[3,0,1,2]],[40,[3,0,1,2]],[48,[2,1,0,3]],[56,[2,1,0,3]],[61.25,[1,0,3,2]],[64,[2,3,0,1]]]as const)assert.deepEqual(corners(sample(beat).poses),ids,`named corners at ${beat}`);
 assert.throws(()=>compileChoreography(d,6,{...REGISTERED_MOTION_CAPABILITIES,sixTwoPasses:false}));
 const missingEvent=structuredClone(d);delete missingEvent.progressionEvents;assert.throws(()=>compileSixTwoImproper(missingEvent as SixTwoSourceDance,6),/explicit retained terminal progression event/);
 for(const alter of[(x:typeof d)=>{x.figures[1].exit='face-down-line';},(x:typeof d)=>{x.ovalPolicy={} as NonNullable<typeof x.ovalPolicy>;},(x:typeof d)=>{x.figures[0].amount=.5;},(x:typeof d)=>{x.figures[0].who='partner';},(x:typeof d)=>{x.figures[0].beats=6;x.figures[1].beats=10;}]){const changed=structuredClone(d);alter(changed);assert.throws(()=>compileChoreography(changed));assert.throws(()=>compileSixTwoImproper(changed as SixTwoSourceDance,6));}
});
test('443 complete 2–12-couple periods preserve finite ends, encounters and continuous source boundaries',()=>{
 const d=dance();for(let n=2;n<=12;n++){
  const c=compileChoreography(d,n) as ReturnType<typeof compileChoreography>&{period:number;topology(b:number):{neighbors:number[][];waitingIds:number[];epoch:number}};const seen=new Set<string>();
  assert.equal(c.totalBeats,64);assert.equal(c.period,2*n);
  for(let r=0;r<c.period;r++){
   const top=c.topology(r*64);for(const[a,b]of top.neighbors)seen.add([c.dancers[a].couple,c.dancers[b].couple].sort((x,y)=>x-y).join(':'));
   for(const local of[...c.starts,61.25,64]){const b=r*64+local;if(!b)continue;const before=c.sample(b-1e-7),after=c.sample(b);for(const p of after.poses){assert.ok(distance(p.position,before.poses[p.id].position)<2e-5,`root ${n}/${b}/${p.id}`);assert.ok(Math.abs(turn(p.yaw,before.poses[p.id].yaw))<2e-5,`heading ${n}/${b}/${p.id}`);}}
   for(let local=0;local<64;local+=.5){const f=c.sample(r*64+local);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)assert.ok(distance(f.poses[a].position,f.poses[b].position)>.38,`body centers ${n}/${r}/${local}/${a}/${b}`);}
   for(const id of top.waitingIds){const p=(c.formationSample??c.sample)(r*64+16).poses[id];assert.ok(Math.abs(Math.abs(p.position.z)-(n-1)*1.44/2)<1e-7);}
  }
  assert.equal(seen.size,n*(n-1)/2);for(const b of[0,8,16,32,40,48,61.5,63.9]){const a=c.sample(b),next=c.sample(c.period*64+b);for(const p of a.poses){assert.ok(distance(p.position,next.poses[p.id].position)<1e-8);assert.ok(Math.abs(turn(p.yaw,next.poses[p.id].yaw))<1e-8);}}
 }
});
