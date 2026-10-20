/** Bounded public proof for the reusable square family: representative odd/even
 * motion periods, plus cheap finite topology across the supported size range. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {bindDirectedCoupleSlots} from './progression-topology.ts';
import {distance,turn} from './ring-twirl-contract.ts';
import type {Dancer} from './types.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const source=(id:number,capabilities=caps)=>{const r=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),[],capabilities);assert.ok(r.result.dance,`${id}: ${r.result.errors.join('; ')}`);return r.result.dance;};
const slots=(count:number)=>Array.from({length:count},(_,coupleId)=>({coupleId,rank:coupleId,direction:(coupleId%2?-1:1) as 1|-1}));
function advance(state:ReturnType<typeof slots>){const ordered=[...state].sort((a,b)=>a.rank-b.rank),groups:number[][]=[],waiting:number[]=[];for(let i=0;i<ordered.length;){const a=ordered[i],b=ordered[i+1];if(b&&a.direction===1&&b.direction===-1){groups.push([a.coupleId,b.coupleId]);i+=2;}else{waiting.push(a.coupleId);i++;}}return{groups,waiting,apply(){for(const[a,b]of groups)[state[a].rank,state[b].rank]=[state[b].rank,state[a].rank];for(const c of waiting)state[c].direction=state[c].direction===1?-1:1;}};}

test('actual896/146/2364 retain source intervals and named square gates through representative odd/even periods',t=>{
 const results=[];
 for(const id of[896,146,2364])for(const count of[3,4]){
  const dance=source(id),c=compileChoreography(dance,count,caps),state=slots(count),first=c.sample(0);let jump=0,yawJump=0,minimum=Infinity;
  assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);
  const squareStarts=dance.figures.flatMap((f,i)=>f.kind==='square-through'?[c.starts[i]]:[]);assert.deepEqual(squareStarts,id===2364?[56]:[48,56]);
  assert.equal(dance.figures.filter(f=>f.progression===true).length,1);assert.equal(dance.figures.at(-1)!.progression,true);
  for(let round=0;round<2*count;round++){
   const step=advance(state);
   for(const[a,b]of step.groups){const actors=[a*2,a*2+1,b*2,b*2+1],center=((state[a].rank+state[b].rank)/2-(count-1)/2)*1.8;
    const entryOrder=id===2364?[0,3,1,2]:[2,1,3,0],entryWidth=id===146?.55:.9,frame=c.formationSample!(round*64+squareStarts[0]);
    for(const[k,[x,z]]of[[-entryWidth,-.9],[-entryWidth,.9],[entryWidth,-.9],[entryWidth,.9]].entries()){const p=frame.poses[actors[entryOrder[k]]];assert.ok(distance(p.position,{x,z:center+z})<1e-6,`Actual incoming square station ${id}/${count}/${round}/${k}`);}
    if(id===146){const f=c.sample(round*64+48);for(const[A,B]of[[actors[0],actors[1]],[actors[2],actors[3]]])assert.ok(f.contacts.some(h=>(h.a===A&&h.b===B||h.a===B&&h.b===A)&&h.handA==='right'&&h.handB==='right'&&h.strength>.99),'Source146 chain really hands partner right into the first balance');}
    for(const start of squareStarts)for(const[offset,pairs,axis,hand]of[[5,[[actors[0],actors[1]],[actors[2],actors[3]]],'x','right'],[7,[[actors[0],actors[3]],[actors[1],actors[2]]],'z','left']]as const){
     const beat=round*64+start+offset,f=c.sample(beat),before=c.sample(beat-.001),after=c.sample(beat+.001);
     for(const[A,B]of pairs){assert.ok((before.poses[A].position[axis]-before.poses[B].position[axis])*(after.poses[A].position[axis]-after.poses[B].position[axis])<0,'Actual named exchange crosses its gate');assert.ok(f.contacts.some(h=>(h.a===A&&h.b===B||h.a===B&&h.b===A)&&h.handA===hand&&h.handB===hand&&h.strength>.99),`${id}/${count}/${round}: ordered ${hand} gate`);}
    }
   }
   for(const a of step.waiting)for(const actor of[a*2,a*2+1]){const p=c.sample(round*64+13).poses[actor],q=c.sample(round*64+63).poses[actor];assert.equal(p.activity,'waiting');assert.equal(q.activity,'waiting');assert.ok(distance(p.position,q.position)<1e-7);}
   for(const local of new Set([...c.starts,48,52,53,54,55,56,60,61,62,63,63.25,63.5,64])){const beat=round*64+local;if(!beat)continue;const a=c.sample(beat-1e-6),b=c.sample(beat);for(const p of a.poses){jump=Math.max(jump,distance(p.position,b.poses[p.id].position));yawJump=Math.max(yawJump,Math.abs(turn(p.yaw,b.poses[p.id].yaw)));}}
   // Changed-boundary envelope only; established prefix geometry is not swept.
   for(let tick=0;tick<=64;tick++){const local=48+tick/4,f=c.sample(round*64+local),hands=new Set<string>();for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minimum=Math.min(minimum,distance(f.poses[a].position,f.poses[b].position));for(const h of f.contacts)for(const key of[`${h.a}:${h.handA}`,...(!h.target||h.target==='hands'?[`${h.b}:${h.handB}`]:[])]){assert.ok(!hands.has(key),'No simultaneous conflicting hand ownership');hands.add(key);}}
   step.apply();
   const logical=c.formationSample!((round+1)*64-1e-7);for(const s of state)for(const[actor,role]of[[s.coupleId*2,1],[s.coupleId*2+1,-1]])assert.ok(distance(logical.poses[actor].position,{x:.9*role*s.direction,z:(s.rank-(count-1)/2)*1.8})<1e-6,'Complete source-marked terminal progression');
  }
  const end=c.sample(count*128-1e-7);for(const p of first.poses){assert.ok(distance(p.position,end.poses[p.id].position)<1e-5);assert.ok(Math.abs(turn(p.yaw,end.poses[p.id].yaw))<1e-5);}
  assert.deepEqual(state,slots(count));assert.ok(jump<1e-5);assert.ok(yawJump<1e-5);assert.ok(minimum>=.49);results.push({id,count,jump,yawJump,minimum});
 }
 t.diagnostic(JSON.stringify(results));
});

test('the unchanged finite slot binder covers2–12couple waits, reentry and all neighbor encounters cheaply',()=>{
 for(let count=2;count<=12;count++){
  const dancers:Dancer[]=Array.from({length:count*2},(_,id)=>({id,name:'Actor',role:id%2?'robin':'lark',couple:id>>1,direction:id%4<2?1:-1,color:'#438b86'})),state=slots(count),seen=Array.from({length:count},()=>new Set<number>());
  for(let epoch=0;epoch<2*count;epoch++){const b=bindDirectedCoupleSlots(dancers,epoch,state),step=advance(state);assert.equal(b.epoch,epoch);for(const[a,c]of step.groups){seen[a].add(c);seen[c].add(a);}for(const a of step.waiting)assert.ok(state[a].rank===0||state[a].rank===count-1);step.apply();}
  assert.deepEqual(state,slots(count));for(const people of seen)assert.equal(people.size,count-1);
 }
});

test('state-carrying square steps preserve3496 at representative samples',()=>{
 const dance=source(3496),legacyCaps={...caps,stateCarryingSequences:false},legacy=source(3496,legacyCaps);
 for(const count of[3,4]){const old=compileChoreography(legacy,count,legacyCaps),next=compileChoreography(dance,count,caps);for(let round=0;round<2*count;round++)for(const beat of[0,4,8,16,32,48,56,59.999999,60,61,62,63,63.25,63.5,63.999999])assert.deepEqual(next.sample(round*64+beat),old.sample(round*64+beat),`3496 parity ${count}/${round}/${beat}`);}
});
