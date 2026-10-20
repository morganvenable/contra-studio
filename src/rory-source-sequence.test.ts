import {compileChoreography} from './choreography.ts';import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import test from 'node:test';import assert from 'node:assert/strict';
import {compileRoryImproper} from './rory-source-sequence.ts';
import {RORY_867} from '../test-data/contradb/rory-867-fixture.ts';
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z),angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
test('actual Sugarbritches variation composes source counts without root or identity resets',()=>{const c=compileChoreography(RORY_867,2);assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);assert.deepEqual(c.starts,[0,2,10,16,24,32,40,48,56]);});
test('independent named-actor and wave-hand oracle covers every 2–12-couple finite period and waiting end',()=>{
 for(let count=2;count<=12;count++){
  const c=compileChoreography(RORY_867,count,{...REGISTERED_MOTION_CAPABILITIES,rorySlides:true}) as ReturnType<typeof compileRoryImproper>,slots=Array.from({length:count},(_,couple)=>({couple,rank:couple,direction:couple%2?-1:1}));assert.equal(c.periodRepeats,2*count);
  for(let repeat=0;repeat<2*count;repeat++){
   const ordered=[...slots].sort((a,b)=>a.rank-b.rank),groups:Array<[number,number,number]>=[],used=new Set<number>();
   for(let i=0;i<count-1;i++)if(ordered[i].direction===1&&ordered[i+1].direction===-1){groups.push([ordered[i].couple,ordered[i+1].couple,(i+.5-(count-1)/2)*1.8]);used.add(ordered[i].couple);used.add(ordered[i+1].couple);i++;}
   const waiting=slots.filter(s=>!used.has(s.couple)),base=repeat*64,topology=c.topology(base);assert.deepEqual([...topology.waitingIds].sort((a,b)=>a-b),waiting.flatMap(s=>[s.couple*2,s.couple*2+1]).sort((a,b)=>a-b));
   for(const s of slots)for(let role=0;role<2;role++){const p=c.sample(base).poses[s.couple*2+role];assert.ok(gap(p.position,{x:.9*(role?-s.direction:s.direction),z:(s.rank-(count-1)/2)*1.8})<1e-7);assert.ok(angle(p.yaw,s.direction===1?0:Math.PI)<1e-7);}
   for(const[top,bottom,z]of groups){const A=top*2,a=A+1,B=bottom*2,b=B+1;
    for(const[beat,order,yaws]of[[2,[B,a,b,A],[Math.PI,0,Math.PI,0]],[10,[a,B,A,b],[0,Math.PI,0,Math.PI]],[16,[B,a,b,A],[0,Math.PI,0,Math.PI]],[22,[B,b,a,A],[0,Math.PI,0,Math.PI]]] as const){const f=c.sample(base+beat);for(let i=0;i<4;i++){assert.ok(gap(f.poses[order[i]].position,{x:i-1.5,z})<1e-7,`station ${count}/${base+beat}/${order[i]}`);assert.ok(angle(f.poses[order[i]].yaw,yaws[i])<1e-7,`facing ${count}/${base+beat}/${order[i]}`);}}
    for(const [beat,pairs]of [[2,[[B,a,'right'],[a,b,'left'],[b,A,'right']]],[10,[[a,B,'left'],[B,A,'right'],[A,b,'left']]],[16,[[B,a,'left'],[a,b,'right'],[b,A,'left']]]] as const){const f=c.sample(base+beat),held=f.contacts.filter(h=>[A,a,B,b].includes(h.a));assert.equal(held.length,3);for(const[x,y,hand]of pairs)assert.ok(held.some(h=>((h.a===x&&h.b===y)||(h.a===y&&h.b===x))&&h.handA===hand&&h.handB===hand),`named hand ${count}/${base+beat}/${x}/${y}`);}
    for(const[beat,rows]of[[32,[[B,-.9,-.9],[b,-.9,.9],[a,.9,-.9],[A,.9,.9]]],[48,[[B,-.9,-.9],[a,-.9,.9],[b,.9,-.9],[A,.9,.9]]],[56,[[B,-.9,-.9],[a,-.9,.9],[b,.9,-.9],[A,.9,.9]]]] as const){const f=c.sample(base+beat);for(const[id,x,dz]of rows)assert.ok(gap(f.poses[id].position,{x,z:z+dz})<1e-7,`named corner ${count}/${base+beat}/${id}`);}
   }
   for(let local=0;local<64;local+=.5){const f=c.sample(base+local),hands=new Set<string>();for(const h of f.contacts){assert.ok(!waiting.some(s=>Math.floor(h.a/2)===s.couple||Math.floor(h.b/2)===s.couple),'waiting hands remain excluded');const owners=[`${h.a}:${h.handA}`];if(!h.target||h.target==='hands')owners.push(`${h.b}:${h.handB}`);for(const k of owners){assert.ok(!hands.has(k),`duplicate ${k} at ${count}/${base+local}`);hands.add(k);}}
    for(let a=0;a<count*2;a++)for(let b=a+1;b<count*2;b++)assert.ok(gap(f.poses[a].position,f.poses[b].position)>.45,`global roots ${count}/${base+local}/${a}/${b}`);
    if(local>=8)for(const s of waiting)for(const id of[s.couple*2,s.couple*2+1])assert.ok(gap(f.poses[id].position,c.sample(base+8).poses[id].position)<1e-7,'end waits after physical exchange');
   }
   for(const beat of c.starts.slice(1)){const before=c.sample(base+beat-1e-6),after=c.sample(base+beat+1e-6);for(let id=0;id<count*2;id++){assert.ok(gap(before.poses[id].position,after.poses[id].position)<1e-4);assert.ok(angle(before.poses[id].yaw,after.poses[id].yaw)<1e-4);}}
   for(const[top,bottom]of groups){const A=slots[top],B=slots[bottom];[A.rank,B.rank]=[B.rank,A.rank];}for(const s of waiting)s.direction*=-1;
  }
  const start=c.sample(0),end=c.sample(2*count*64);for(let id=0;id<count*2;id++){assert.ok(gap(start.poses[id].position,end.poses[id].position)<1e-7);assert.ok(angle(start.poses[id].yaw,end.poses[id].yaw)<1e-7);}const saved=c.sample(19.2);c.sample(128*count-1);assert.deepEqual(c.sample(19.2),saved);
 }
});
test('registered Rory snapshots its public contract and rejects missing review or silently ignored modifiers',()=>{
 const cap={...REGISTERED_MOTION_CAPABILITIES,rorySlides:true},dance=structuredClone(RORY_867),c=compileChoreography(dance,2,cap),saved=c.sample(6);dance.figures[1].direction='left';assert.deepEqual(c.sample(6),saved);assert.ok(Object.isFrozen(c)&&Object.isFrozen(c.starts)&&Object.isFrozen(c.dance)&&Object.isFrozen(c.dance.figures));assert.throws(()=>compileChoreography(RORY_867,2,{...cap,rorySlides:false}));
 for(const mutate of[(d:any)=>{delete d.endPolicy;},(d:any)=>{d.endPolicy.source.basis='source-explicit';},(d:any)=>{d.endPolicy.source.clause=[];},(d:any)=>{d.endPolicy.source.extra=true;},(d:any)=>{d.endPolicy.source.sourceId='other';},(d:any)=>{d.figures[4].exit='face-down-line';},(d:any)=>{d.figures[6].phaseBeats=[1,7];},(d:any)=>{d.figures[4].progression=true;},(d:any)=>{d.figures[0].centerHand='right';},(d:any)=>{d.figures[1].spinAmount=.75;},(d:any)=>{d.figures[3].phaseBeats=[7,1];}]){const bad=structuredClone(RORY_867);mutate(bad);assert.throws(()=>compileChoreography(bad,2,cap));}
});
test('both source swings have named complete frames and immediate orbit, including every finite reentry',()=>{
 for(let couples=2;couples<=12;couples++){const c=compileChoreography(RORY_867,couples,{...REGISTERED_MOTION_CAPABILITIES,rorySlides:true})as ReturnType<typeof compileRoryImproper>;
  for(let repeat=0;repeat<c.periodRepeats;repeat++)for(const local of[24,40]){const beat=64*repeat+local,f=c.sample(beat),next=c.sample(beat+.05),waiting=new Set(c.topology(beat).waitingIds);for(const p of f.poses){if(waiting.has(p.id))continue;const frame=f.contacts.filter(h=>h.a===p.id||h.b===p.id);assert.equal(frame.length,3,`full frame ${couples}/${beat}/${p.id}`);assert.ok(frame.every(h=>h.strength===1));assert.ok(gap(p.position,next.poses[p.id].position)>.001,`immediate orbit ${couples}/${beat}/${p.id}`);}}
 }
});
test('exact turn-to-frame boundary has no zero-strength contact edges',()=>{const c=compileChoreography(RORY_867,2,{...REGISTERED_MOTION_CAPABILITIES,rorySlides:true});assert.deepEqual(c.sample(22).contacts,[]);for(const beat of[22-1e-5,22,22+1e-5,23,24])assert.ok(c.sample(beat).contacts.every(h=>h.strength>0));});
