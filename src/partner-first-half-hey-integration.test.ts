import test from 'node:test';import assert from 'node:assert/strict';
import {readContraDbSource} from './contradb-source.ts';
import {partnerFirstSource as partnerFirstPilot,PARTNER_FIRST_CAPABILITIES as caps} from '../test-data/ordinary-hey-composition/partner-first-public-source.ts';
import {compileChoreography} from './choreography.ts';
const compileDance=(dance:Parameters<typeof compileChoreography>[0],count:number)=>compileChoreography(dance,count,caps);
import {compilePartnerFirstHalfHeyHandoff,type PartnerFirstHalfHeyFigure} from './partner-first-half-hey.ts';
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
for(const id of[769,871,894,3454])test(`${id}: complete source counts, named paths, all finite sets and title independence`,t=>{
 const {dance,source}=partnerFirstPilot(id);assert.equal(readContraDbSource(source).record?.title,dance.title);assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);const heyIndex=dance.figures.findIndex(f=>f.kind==='hey'),hey=dance.figures[heyIndex];assert.equal(dance.figures.filter(f=>f.progression).length,1);assert.equal(dance.figures.at(-1)!.progression,true);assert.equal(hey.progression,undefined);
 let minClearance=Infinity,maxSpeed=0,maxBoundaryGap=0,maxBoundaryYaw=0;
 for(let count=2;count<=12;count++){
  const c=compileDance(dance,count),period=2*count*64;assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);
  for(let r=0;r<2*count;r++)for(const local of[...c.starts,64]){const beat=r*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat+1e-7);for(const p of b.poses){assert.equal(p.id,a.poses[p.id].id);maxBoundaryGap=Math.max(maxBoundaryGap,gap(p.position,a.poses[p.id].position));maxBoundaryYaw=Math.max(maxBoundaryYaw,turn(p.yaw,a.poses[p.id].yaw));assert.ok(gap(p.position,a.poses[p.id].position)<2e-5,`root join ${count}/${beat}/${p.id}`);assert.ok(turn(p.yaw,a.poses[p.id].yaw)<2e-5,`facing join ${count}/${beat}/${p.id}`);}}
  for(const beat of[0,.125,8.25,16.5,31.5,32,47.5,63.5]){const a=c.sample(beat),b=c.sample(period+beat);for(const p of a.poses){assert.ok(gap(p.position,b.poses[p.id].position)<1e-8,`period ${count}/${beat}/${p.id}`);assert.ok(turn(p.yaw,b.poses[p.id].yaw)<1e-8);}}
  // Formation endpoints prove the topology. The visible opening balance also
  // has the pre-existing reachable stance, independently predicted below.
  const firstEnd=(c.formationSample??c.sample)(64),visibleEnd=c.sample(64),rows=Array.from({length:count},(_,couple)=>({couple,row:couple%2===0?(couple+1<count?couple+1:couple):couple-1,direction:(couple%2===0?1:-1)*(count%2===1&&couple===count-1?-1:1)})).sort((a,b)=>a.row-b.row),stance=new Map<number,number>();
  const first=dance.figures[0],second=dance.figures[1],openingBalance=first.kind==='balance'&&first.who==='neighbor'&&second.who===first.who&&(second.kind==='swing'||second.kind==='box-the-gnat');
  if(openingBalance)for(let i=0;i<rows.length;){const a=rows[i],b=rows[i+1];if(b&&a.direction===1&&b.direction===-1){const offset=(1.8-(first.hands==='right'?1.10:1.18))/2;stance.set(a.couple,offset);stance.set(b.couple,-offset);i+=2;}else i++;}
  for(const actor of c.dancers){const expected=rows.find(r=>r.couple===actor.couple)!,z=(expected.row-(count-1)/2)*1.8,x=.9*(actor.role==='lark'?expected.direction:-expected.direction),yaw=expected.direction===1?0:Math.PI,p=firstEnd.poses[actor.id],shown=visibleEnd.poses[actor.id];
   assert.ok(Math.abs(p.position.x-x)<1e-7,`formation exit x ${count}/${actor.id}`);assert.ok(Math.abs(p.position.z-z)<1e-7,`formation exit row ${count}/${actor.id}`);assert.ok(turn(p.yaw,yaw)<1e-7,`formation exit facing ${count}/${actor.id}`);
   assert.ok(Math.abs(shown.position.x-x)<1e-7);assert.ok(Math.abs(shown.position.z-z-(stance.get(actor.couple)??0))<1e-7,`visible next-opening stance ${count}/${actor.id}`);assert.ok(turn(shown.yaw,yaw)<1e-7);
  }
  // Dense roots are checked through the complete finite period, including the
  // existing waiting tracks and all neighboring minor sets. No limb claims.
  let previous=c.sample(0);for(let n=1;n<=period*8;n++){const frame=c.sample(n/8);for(const p of frame.poses)maxSpeed=Math.max(maxSpeed,gap(p.position,previous.poses[p.id].position)*8);for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minClearance=Math.min(minClearance,gap(frame.poses[a].position,frame.poses[b].position));previous=frame;}
 }
 const c=compileDance(dance,2),start=c.sample(c.starts[heyIndex]).poses,ctx={ids:[0,1,2,3],start,dancers:c.dancers,relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0,next:dance.figures[heyIndex+1] as import('./types.ts').Figure},p=compilePartnerFirstHalfHeyHandoff(hey as PartnerFirstHalfHeyFigure,ctx,c.starts[heyIndex]);assert.equal(p.heyPlan.events.length,4);assert.equal(p.heyPlan.events.reduce((n,e)=>n+e.pairs.length,0),6);
 const renamed=structuredClone(dance);renamed.id='arbitrary-id';renamed.title='Different title';for(const[i,f]of renamed.figures.entries()){f.id=`figure-${i}`;f.label=`Label ${i}`;}const other=compileDance(renamed,2);for(const beat of[0,.5,15.75,16,20,31.99,32,48,63.5,64,97]){assert.deepEqual(other.sample(beat).poses,c.sample(beat).poses);}
 t.diagnostic(JSON.stringify({id,minClearance,maxSpeed,maxBoundaryGap,maxBoundaryYaw}));assert.ok(minClearance>=.45,`global root clearance ${minClearance}`);assert.ok(maxSpeed<=1.8,`root speed ${maxSpeed}`);
});
