import test from 'node:test';import assert from 'node:assert/strict';
import {readContraDbSource} from './contradb-source.ts';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
function fullHeyPilot(id:number){const source=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),p=prepareContraDbReview(source,[],caps);assert.ok(p.result.dance,p.result.errors.join('; '));return{dance:p.result.dance,source};}
import {compileChoreography} from './choreography.ts';
const compileDance=(dance:Parameters<typeof compileChoreography>[0],count:number)=>compileChoreography(dance,count,caps);
import {compileOrdinaryFullHeyHandoff} from './ordinary-hey-handoff.ts';
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
for(const id of[1093,354,2684])test(`${id}: complete source counts, named paths, all finite sets and title independence`,t=>{
 const {dance,source}=fullHeyPilot(id);assert.equal(readContraDbSource(source).record?.title,dance.title);assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);const heyIndex=dance.figures.findIndex(f=>f.kind==='hey'),hey=dance.figures[heyIndex];assert.equal(dance.figures.filter(f=>f.progression).length,id===1093?0:1);assert.equal(dance.figures.at(-1)!.progression,id===1093?undefined:true);assert.equal(hey.progression,undefined);
 let minClearance=Infinity,maxSpeed=0,maxBoundaryGap=0,maxBoundaryYaw=0;
 for(let count=2;count<=12;count++){
  const c=compileDance(dance,count),period=2*count*64;assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);
  for(let r=0;r<2*count;r++)for(const local of[...c.starts,64]){const beat=r*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat+1e-7);for(const p of b.poses){assert.equal(p.id,a.poses[p.id].id);maxBoundaryGap=Math.max(maxBoundaryGap,gap(p.position,a.poses[p.id].position));maxBoundaryYaw=Math.max(maxBoundaryYaw,turn(p.yaw,a.poses[p.id].yaw));assert.ok(gap(p.position,a.poses[p.id].position)<2e-5,`root join ${count}/${beat}/${p.id}`);assert.ok(turn(p.yaw,a.poses[p.id].yaw)<2e-5,`facing join ${count}/${beat}/${p.id}`);}}
  for(const beat of[0,.125,8.25,16.5,31.5,32,47.5,63.5]){const a=c.sample(beat),b=c.sample(period+beat);for(const p of a.poses){assert.ok(gap(p.position,b.poses[p.id].position)<1e-8,`period ${count}/${beat}/${p.id}`);assert.ok(turn(p.yaw,b.poses[p.id].yaw)<1e-8);}}
  const firstEnd=c.sample(64);for(let couple=0;couple<count;couple++){const a=firstEnd.poses[couple*2],b=firstEnd.poses[couple*2+1],row=couple%2===0?(couple+1<count?couple+1:couple):couple-1;assert.ok(Math.abs(a.position.z-b.position.z)<1e-7);assert.ok(Math.abs(a.position.z-(row-(count-1)/2)*1.8)<1e-7);}
  // Dense roots are checked through the complete finite period, including the
  // existing waiting tracks and all neighboring minor sets. No limb claims.
  let previous=c.sample(0);for(let n=1;n<=period*8;n++){const frame=c.sample(n/8);for(const p of frame.poses)maxSpeed=Math.max(maxSpeed,gap(p.position,previous.poses[p.id].position)*8);for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minClearance=Math.min(minClearance,gap(frame.poses[a].position,frame.poses[b].position));previous=frame;}
 }
 const c=compileDance(dance,2),start=c.sample(c.starts[heyIndex]).poses,ctx={ids:[0,1,2,3],start,dancers:c.dancers,relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0,next:dance.figures[heyIndex+1]},p=compileOrdinaryFullHeyHandoff(hey,ctx,c.starts[heyIndex]);assert.equal(p.heyPlan.events.length,8);assert.equal(p.heyPlan.events.reduce((n,e)=>n+e.pairs.length,0),12);
 const renamed=structuredClone(dance);renamed.id='arbitrary-id';renamed.title='Different title';for(const[i,f]of renamed.figures.entries()){f.id=`figure-${i}`;f.label=`Label ${i}`;}const other=compileDance(renamed,2);for(const beat of[0,.5,15.75,16,20,31.99,32,48,63.5,64,97]){assert.deepEqual(other.sample(beat).poses,c.sample(beat).poses);}
 t.diagnostic(JSON.stringify({id,minClearance,maxSpeed,maxBoundaryGap,maxBoundaryYaw}));assert.ok(minClearance>=.45,`global root clearance ${minClearance}`);assert.ok(maxSpeed<=1.8,`root speed ${maxSpeed}`);
});
