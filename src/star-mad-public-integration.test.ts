import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {compileDance} from './engine.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {compileStarWhirlImproper} from './star-promenade-whirl-sequence.ts';
import {compileMadRobinImproper} from './mad-robin-sequence.ts';
import type {CompiledDance,MotionCapabilities} from './types.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const configs=[{id:2531,kind:'star',minimum:.5,starts:[0,4,16,24,28,32,40,48,52,56,60],gates:['starPromenadeWhirls','gyres','ringBalances','petronellas','californiaTwirls','ringPairHandoffs','progressionEvents']},{id:2693,kind:'mad',minimum:.60,starts:[0,8,16,20,32,38,48,56],gates:['madRobins','progressionEvents']}]as const;
function source(id:number){const raw=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),p=prepareContraDbReview(raw,[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;}
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
type Program=CompiledDance&{periodRepeats:number;topology(beat:number):{epoch:number;neighbors:readonly(readonly[number,number])[];partners:readonly(readonly[number,number])[];waitingIds:readonly number[]}};
for(const config of configs)test(`${config.id} actual public import closes every 2–12-couple period with its original counts and named bindings`,()=>{
 const d=source(config.id);assert.equal(d.figures.reduce((s,f)=>s+f.beats,0),64);
 for(let n=2;n<=12;n++){
  const c=compileChoreography(d,n,caps)as Program,total=n*2*64,initial=c.sample(0),partners=c.topology(0).partners;assert.equal(c.periodRepeats,2*n);assert.equal(c.totalBeats,64);assert.deepEqual(c.starts,config.starts);
  for(let beat=0;beat<=total;beat+=.5){const frame=c.sample(beat),top=c.topology(beat);assert.equal(top.epoch,Math.floor(beat/64));assert.deepEqual(top.partners,partners);assert.deepEqual(frame.poses.map(p=>p.id),c.dancers.map(p=>p.id));const hands=new Set<string>();for(const h of frame.contacts.filter(h=>h.strength>1e-9)){for(const key of[`${h.a}:${h.handA}`,...(!h.target||h.target==='hands'?[`${h.b}:${h.handB}`]:[])]){assert.ok(!hands.has(key),`${config.id}/${n}/${beat} double held hand ${key}`);hands.add(key);}assert.ok(!top.waitingIds.includes(h.a)&&!top.waitingIds.includes(h.b));}
   for(let i=0;i<frame.poses.length;i++){const p=frame.poses[i];assert.ok([p.position.x,p.position.z,p.yaw].every(Number.isFinite));for(let j=i+1;j<frame.poses.length;j++)assert.ok(distance(p.position,frame.poses[j].position)>=config.minimum-1e-7,`${config.id}/${n}/${beat} gross root collision`);}
  }
  for(let round=0;round<c.periodRepeats;round++)for(const local of[...config.starts,64]){const beat=round*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat+1e-7);for(const p of a.poses){assert.ok(distance(p.position,b.poses[p.id].position)<1e-5,`${config.id}/${n}/${beat} root join`);assert.ok(angle(p.yaw,b.poses[p.id].yaw)<1e-5,`${config.id}/${n}/${beat} facing join`);}}
  assert.deepEqual(c.sample(total).poses,initial.poses);assert.deepEqual(c.topology(total).neighbors,c.topology(0).neighbors);
 }
});
for(const config of configs)test(`${config.id} public/direct contracts retain capabilities, provenance and caller-owned frames`,()=>{
 const d=source(config.id),direct=config.kind==='star'?compileStarWhirlImproper:compileMadRobinImproper;
 for(const gate of config.gates)assert.throws(()=>compileChoreography(d,3,{...caps,[gate]:false} as MotionCapabilities),gate);
 assert.throws(()=>compileDance(d,3,caps));
 for(const mutate of[(x:any)=>x.title=42,(x:any)=>x.figures[1].id=42,(x:any)=>x.figures[1].label=42,(x:any)=>x.figures[1].confidence='imagined',(x:any)=>x.sourceRecord.snapshotId+=':changed',(x:any)=>x.sourceRecord.sourceUrl+='?changed',(x:any)=>x.progressionEvents[0].count=2,(x:any)=>x.ovalPolicy={},(x:any)=>x.figures[1].exit='face-down-line']){const changed=structuredClone(d);mutate(changed);assert.throws(()=>compileChoreography(changed,2,caps));assert.throws(()=>direct(changed as any,2));}
 const owned=structuredClone(d),c=compileChoreography(owned,3,caps)as Program,before=c.sample(29.375);owned.figures[0].beats=1;owned.sourceRecord.title='changed';const frame=c.sample(29.375);frame.poses[0].position.x=100;frame.contacts.splice(0);assert.deepEqual(c.sample(29.375),before);c.sample(129);assert.deepEqual(c.sample(29.375),before);const topology=c.topology(0),snapshot=structuredClone(topology);(topology.neighbors as any).splice(0);assert.deepEqual(c.topology(0),snapshot);
});
