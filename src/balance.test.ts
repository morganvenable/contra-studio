import test from 'node:test';import assert from 'node:assert/strict';
import {DANCES} from './catalog.ts';import {compileChoreography} from './choreography.ts';
import {figureContinuity,compilePrimitiveFigure,createDancers,makeBalanceCue} from './engine.ts';
import type {Figure,Pose} from './types.ts';
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const balance:Figure={id:'b',kind:'balance',beats:4,label:'Partner balance',who:'partner'};
const swing:Figure={id:'s',kind:'swing',beats:12,label:'Partner swing',who:'partner'};
test('balance handoff applies only to an immediately following swing with the same relation',()=>{
 assert.deepEqual(figureContinuity([balance,swing],0),{balanceExit:'same-person-swing'});
 assert.deepEqual(figureContinuity([balance,swing],1),{swingEntry:'two-hand-balance'});
 assert.deepEqual(figureContinuity([balance,{...swing,who:'neighbor'}],0),{});
 assert.deepEqual(figureContinuity([balance,{...swing,kind:'do-si-do'}],0),{});
 const dancers=createDancers(2),poses:Pose[]=[[.9,.9],[.9,-.9],[-.9,-.9],[-.9,.9]].map(([x,z],id)=>({id,position:{x,z},yaw:0,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
 const plain=compilePrimitiveFigure(balance,[0,1,2,3],poses,dancers,[1,-1]),held=compilePrimitiveFigure(balance,[0,1,2,3],poses,dancers,[1,-1],{balanceExit:'same-person-swing'});
 for(const id of [0,1,2,3])assert.ok(distance(plain.position(id,1),poses[id].position)<1e-12);
 assert.ok(Math.abs(distance(held.position(0,1),held.position(1,1))-.62)<1e-12);
 for(let t=.51;t<.745;t+=.01)assert.ok(distance(held.position(0,t),held.position(1,t))<distance(held.position(0,t+.005),held.position(1,t+.005)));
 for(let t=.01;t<.49;t+=.01)assert.ok(distance(held.position(0,t),held.position(1,t))>distance(held.position(0,t+.005),held.position(1,t+.005)));
 assert.ok(Math.abs(distance(held.position(0,.5),held.position(1,.5))-.92)<1e-12);
 assert.ok(Math.abs(distance(held.position(0,.75),held.position(1,.75))-1.18)<1e-12);
 for(let t=.82;t<.995;t+=.01)assert.ok(distance(held.position(0,t),held.position(1,t))>distance(held.position(0,t+.005),held.position(1,t+.005)));
});
test('balance styling cues are C1 at their boundaries and never leak into other figures',()=>{
 const dancers=createDancers(2);for(const t of [0,1]){const cue=makeBalanceCue(balance,0,[0,1,2,3],dancers,t)!;assert.equal(cue.otherId,1);assert.equal(cue.forwardWeight,0);assert.equal(cue.counterWeight,0);}
 for(const boundary of [.04,.76,.50,1]){const a=makeBalanceCue(balance,0,[0,1,2,3],dancers,boundary-1e-6)!,b=makeBalanceCue(balance,0,[0,1,2,3],dancers,boundary+1e-6)!;const key=boundary===.04||boundary===.76?'forwardWeight':'counterWeight';assert.ok(Math.abs(b[key]-a[key])<1e-9);}
 assert.equal(makeBalanceCue(swing,0,[0,1,2,3],dancers,.5),undefined);
});
test('all reviewed dances retain connected balance-to-swing hands and continuous contact targets',()=>{
 for(const dance of DANCES){const c=compileChoreography(dance);for(let repeat=0;repeat<2;repeat++)for(let index=0;index<dance.figures.length;index++){
  if(!figureContinuity(dance.figures,index).balanceExit)continue;
  const start=repeat*64+c.starts[index],duration=dance.figures[index].beats,end=start+duration;
  const active=c.sample(start+duration*.5).poses.filter(p=>p.activity==='balance');
  for(let t=.5;t<=1;t+=.01){const frame=c.sample(start+duration*t);for(const p of active){const hands=frame.contacts.filter(h=>h.strength>=.8&&(h.a===p.id||((!h.target||h.target==='hands')&&h.b===p.id)));assert.ok(hands.length>=2,`${dance.title} dancer ${p.id} balance phase ${t}`);}}
  const a=c.sample(end-1e-7),b=c.sample(end+1e-7);
  for(const p of active){assert.ok(distance(a.poses[p.id].position,b.poses[p.id].position)<1e-5);assert.equal(b.poses[p.id].balance,undefined);
   for(const hand of ['left','right']){const point=(f:typeof a)=>f.contacts.find(h=>h.a===p.id&&h.handA===hand||(!h.target||h.target==='hands')&&h.b===p.id&&h.handB===hand)?.point;const x=point(a),y=point(b);assert.ok(x&&y,`${dance.title} missing ${p.id} ${hand}`);assert.ok(Math.hypot(x.x-y.x,x.y-y.y,x.z-y.z)<1e-4);}
  }
 }}
});
test('reviewed swing frame retains both supporting hands and its leading joined pair',()=>{
 for(const dance of DANCES){const c=compileChoreography(dance);for(let r=0;r<2;r++)for(let index=0;index<dance.figures.length;index++){
  const figure=dance.figures[index];if(figure.kind!=='swing')continue;const start=r*64+c.starts[index],balanced=figureContinuity(dance.figures,index).swingEntry;
  for(let t=balanced?0:.22;t<.79;t+=.01){const frame=c.sample(start+t*figure.beats),active=frame.poses.filter(p=>p.activity==='swing');
   for(const pose of active){const supports=frame.contacts.filter(h=>h.a===pose.id&&(h.target==='back'||h.target==='upper-arm')&&h.strength>=.9);assert.equal(supports.length,1,`${dance.title} dancer ${pose.id} phase ${t}`);assert.equal(supports[0].target,c.dancers[pose.id].role==='lark'?'back':'upper-arm');const leading=frame.contacts.filter(h=>h.target==='hands'&&h.strength>=.9&&(h.a===pose.id||h.b===pose.id));assert.equal(leading.length,1);}
  }
 }}
});

test('every reviewed swing is already closed on count one and turns during its first half count',()=>{
 for(const dance of DANCES){const c=compileChoreography(dance);for(let r=0;r<2;r++)for(const[i,f]of dance.figures.entries()){
  if(f.kind!=='swing')continue;const start=r*64+c.starts[i],frame=c.sample(start),moving=c.sample(start+.5);
  for(const p of frame.poses.filter(p=>p.activity==='swing'&&c.dancers[p.id].role==='lark')){
   const hold=frame.contacts.find(h=>h.a===p.id&&h.target==='hands');assert.ok(hold,`${dance.title} missing initial frame`);assert.ok(hold.strength>.99);
   const q=frame.poses[hold.b],gap=distance(p.position,q.position);assert.ok(Math.abs(gap-.62)<1e-8,`${dance.title} gathers after swing start: ${gap}`);
   const a={x:p.position.x-q.position.x,z:p.position.z-q.position.z},b={x:moving.poses[p.id].position.x-moving.poses[q.id].position.x,z:moving.poses[p.id].position.z-moving.poses[q.id].position.z};
   assert.ok(Math.abs(Math.atan2(a.x*b.z-a.z*b.x,a.x*b.x+a.z*b.z))>.3,`${dance.title} waits instead of swinging on count one`);
  }
 }}
});
