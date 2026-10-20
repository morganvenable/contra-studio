import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const source=(id:number)=>{const p=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return p.result.dance;};
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

test('actual3241 composes the released half-hey gyre exit and mirrored tail through odd/even finite sets',()=>{
 const dance=source(3241);assert.deepEqual(dance.figures.map(f=>f.beats),[8,8,4,12,8,8,8,6,2]);assert.equal(dance.figures[1].exit,'opposite-paired-gyre');assert.equal(dance.figures.at(-2)!.direction,'right');assert.equal(dance.figures.at(-1)!.passingShoulder,'left');
 for(const couples of[3,4]){
  const c=compileChoreography(dance,couples,caps) as CompiledStateSequence;assert.equal(c.totalBeats,64);let minimum=Infinity,rootJoin=0,yawJoin=0,gates=0;
  const encounters=new Set<string>();
  for(let repeat=0;repeat<c.periodRepeats;repeat++){
   const base=repeat*64,top=c.topology(base);for(const[a,b]of top.neighbors)encounters.add([c.dancers[a].couple,c.dancers[b].couple].sort((x,y)=>x-y).join(':'));assert.deepEqual(c.topology(base+64-1e-7),top);assert.equal(c.topology(base+64).epoch,repeat+1);
   for(const p of c.sequenceBoundaries(repeat).filter(p=>p.adapterId.startsWith('mirrored-'))){assert.equal(p.contactPolicy,'strict-carried');assertSequenceHandoff(p.incoming,p.entry);assert.equal(p.entry.relationshipEpoch,repeat);assert.deepEqual(p.entry.partner,p.exit.partner);assert.deepEqual(p.entry.neighbor,p.exit.neighbor);
    if(p.adapterId==='mirrored-circle-six'){
     const ids=p.entry.actors.map(a=>a.id),center={x:p.entry.poses.reduce((n,q)=>n+q.position.x,0)/4,z:p.entry.poses.reduce((n,q)=>n+q.position.z,0)/4};
     for(const id of ids){const start=p.entry.poses.find(q=>q.id===id)!.position;let angle=Math.atan2(start.z-center.z,start.x-center.x),winding=0;for(let n=1;n<=105;n++){const q=(c.formationSample??c.sample)(base+56+n*.05).poses[id].position,next=Math.atan2(q.z-center.z,q.x-center.x);winding+=turn(next,angle);angle=next;}assert.ok(Math.abs(winding+1.5*Math.PI)<1e-7);}
    }else{
     const pairs=new Map(p.entry.neighbor);for(const[a,b]of pairs){if(a>b)continue;let lo=62,hi=64;const first=c.sample(base+lo).poses[a].position.z-c.sample(base+lo).poses[b].position.z;for(let n=0;n<45;n++){const mid=(lo+hi)/2,f=c.sample(base+mid),d=f.poses[a].position.z-f.poses[b].position.z;if(d*first>0)lo=mid;else hi=mid;}const f=c.sample(base+(lo+hi)/2),A=f.poses[a],B=f.poses[b],left={x:Math.cos(A.yaw),z:-Math.sin(A.yaw)};assert.ok((B.position.x-A.position.x)*left.x+(B.position.z-A.position.z)*left.z>.65);gates++;}
    }
   }
   for(const local of c.starts.concat(64)){if(base+local===0)continue;const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const p of b.poses){rootJoin=Math.max(rootJoin,distance(p.position,a.poses[p.id].position));yawJoin=Math.max(yawJoin,Math.abs(turn(p.yaw,a.poses[p.id].yaw)));}}
   for(let local=0;local<64;local+=.5){const f=c.sample(base+local);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minimum=Math.min(minimum,distance(f.poses[a].position,f.poses[b].position));}
  }
  assert.ok(gates>0);assert.equal(encounters.size,couples*(couples-1)/2);assert.ok(minimum>=.38);assert.ok(rootJoin<1e-5);assert.ok(yawJoin<1e-5);for(const p of c.sample(0).poses){const q=c.sample(c.periodRepeats*64).poses[p.id];assert.ok(distance(p.position,q.position)<1e-8);assert.ok(Math.abs(turn(p.yaw,q.yaw))<1e-8);}console.log(JSON.stringify({source:3241,couples,gates,minimum,rootJoin,yawJoin}));
 }
});

test('existing measured left-circle sources retain exact public frames when mirrored support is enabled',()=>{
 for(const id of[443,682]){const text=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),old=prepareContraDbReview(text,[],{...caps,stateCarryingMirroredSixTwoPasses:false,ordinaryHalfHeyGyreExits:false}),next=prepareContraDbReview(text,[],caps);assert.ok(old.result.dance,old.result.errors.join('; '));assert.deepEqual(next.result.dance,old.result.dance);const a=compileChoreography(old.result.dance,3,{...caps,stateCarryingMirroredSixTwoPasses:false,ordinaryHalfHeyGyreExits:false}),b=compileChoreography(next.result.dance!,3,caps);for(let beat=0;beat<=384;beat++){assert.deepEqual(b.sample(beat),a.sample(beat));if(a.formationSample)assert.deepEqual(b.formationSample!(beat),a.formationSample(beat));}}
});
