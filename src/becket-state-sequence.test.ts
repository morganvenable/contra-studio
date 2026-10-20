import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import type {CompiledBecketStateSequence} from './becket-state-sequence.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const source=(id:number)=>{const p=prepareContraDbReview(raw(id),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;};
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

test('actual Becket sources share midcycle slice rebinding and close representative finite periods',()=>{
 for(const id of[3181,2996]){
  const dance=source(id);assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(dance.progressionEvents!.length,1);assert.equal(dance.progressionEvents![0].afterFigureId,dance.figures[1].id);
  if(id===3181)assert.deepEqual(dance.figures.filter(f=>f.kind==='star').map(f=>[f.direction,f.amount,f.beats]),[['right',1,8],['right',1,8]]);
  for(const couples of[2,3,4]){
   const c=compileChoreography(dance,couples,caps) as CompiledBecketStateSequence;assert.equal(c.eventBeat,16);assert.ok(c.repeatable);let minimum=Infinity,rootJoin=0,yawJoin=0,strict=0;
   const repeats=c.periodStart+c.period;
   for(let repeat=0;repeat<repeats;repeat++){
    const base=repeat*64;assert.equal(c.topology(base+16-1e-7).epoch,repeat);assert.equal(c.topology(base+16).epoch,repeat+1);assert.equal(c.topology(base+64).epoch,repeat+1);
    const entry=c.formationSample!(base+8),apex=c.formationSample!(base+12),end=c.formationSample!(base+16);
    for(const p of entry.poses){const A=apex.poses[p.id],B=end.poses[p.id];assert.ok(Math.abs(Math.abs(A.position.x-p.position.x)-.52)<1e-7);assert.ok(Math.abs(B.position.x-p.position.x)<1e-7);assert.ok(Math.abs(B.position.z-A.position.z)<1e-7);assert.ok(Math.abs(Math.abs(B.position.z-p.position.z)-1.8)<1e-7);}
    for(const p of c.sequenceBoundaries(repeat).filter(p=>p.contactPolicy==='strict-carried')){strict++;assertSequenceHandoff(p.incoming,p.entry);assert.equal(p.entry.relationshipEpoch,repeat+1);assert.deepEqual(p.entry.partner,p.exit.partner);assert.deepEqual(p.entry.neighbor,p.exit.neighbor);}
    for(const local of c.starts.concat(64)){if(base+local===0)continue;const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const p of b.poses){rootJoin=Math.max(rootJoin,gap(p.position,a.poses[p.id].position));yawJoin=Math.max(yawJoin,turn(p.yaw,a.poses[p.id].yaw));}}
    for(let local=0;local<64;local+=.5){const frame=c.sample(base+local);for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minimum=Math.min(minimum,gap(frame.poses[a].position,frame.poses[b].position));}
   }
   if(id===2996)assert.ok(strict>0);assert.ok(minimum>=.45-1e-7,`centers ${minimum}`);assert.ok(rootJoin<1e-5,`root joins ${rootJoin}`);assert.ok(yawJoin<1e-5,`yaw joins ${yawJoin}`);
   const a=c.sample(c.periodStart*64),b=c.sample((c.periodStart+c.period)*64);for(const p of a.poses){assert.ok(gap(p.position,b.poses[p.id].position)<1e-7);assert.ok(turn(p.yaw,b.poses[p.id].yaw)<1e-7);}
   console.log(JSON.stringify({id,couples,periodStart:c.periodStart,period:c.period,minimum,rootJoin,yawJoin}));
  }
 }
});

test('the same public Becket route accepts a different producer and event clock without a complete-table signature',()=>{
 const dance=structuredClone(source(2996));dance.id='synthetic-differently-placed-slice';dance.title='An independent sequence';dance.figures.splice(1,0,{id:'extra-lines',kind:'long-lines',who:'all',beats:8,label:'Another whole-set return'});
 const c=compileChoreography(dance,3,caps) as CompiledBecketStateSequence;assert.equal(c.totalBeats,72);assert.equal(c.eventBeat,24);assert.equal(c.topology(24-1e-7).epoch,0);assert.equal(c.topology(24).epoch,1);assert.equal(c.topology(72).epoch,1);
 for(const change of[(d:typeof dance)=>{delete d.progressionEvents;},(d:typeof dance)=>{d.progressionEvents![0].afterFigureId=d.figures.at(-1)!.id;},(d:typeof dance)=>{d.progressionEvents![0].count=2;},(d:typeof dance)=>{delete d.endPolicy;}]){const d=structuredClone(dance);change(d);assert.throws(()=>compileChoreography(d,3,caps));}
 assert.throws(()=>compileChoreography(dance,3,{...caps,stateCarryingBecketSlices:false}),/registered/);
});
