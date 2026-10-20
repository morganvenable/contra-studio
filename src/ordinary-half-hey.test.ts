import test from 'node:test';
import assert from 'node:assert/strict';
import {compileChoreography} from './choreography.ts';
import {compileOrdinaryHalfHeyFigure} from './ordinary-half-hey.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {HAY_IN_THE_BARN as dance} from '../test-data/ordinary-half-hey/fixtures.ts';
import type {FigureContext} from './extended-figures.ts';
const caps={...REGISTERED_MOTION_CAPABILITIES,ordinaryHalfHeys:true};
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const corner=(p:ReturnType<ReturnType<typeof compileChoreography>['sample']>['poses'])=>{const center=p.slice(0,4).reduce((s,p)=>s+p.position.z,0)/4;return[[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,z])=>p.slice(0,4).find(p=>Math.sign(p.position.x)===x&&Math.sign(p.position.z-center)===z)!.id);};
function context():FigureContext{const c=compileChoreography(dance,2,caps);return{ids:[0,1,2,3],start:c.formationSample!(24).poses,dancers:c.dancers,relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0,next:dance.figures[4]};}
test('ordinary half-heys compose both explicit Hay side-pair exits with one real progression',()=>{
 const c=compileChoreography(dance,6,caps),expected=new Map([[0,[1,0,3,2]],[16,[2,3,0,1]],[24,[2,1,0,3]],[32,[0,3,2,1]],[48,[0,3,2,1]],[56,[0,1,2,3]],[64,[2,3,0,1]]]);
 assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);for(const[t,ids]of expected)assert.deepEqual(corner(c.formationSample!(t).poses),ids,`literal corner identities at${t}`);
 for(const t of[26,27.75,29.5,31.25,58.25,59.75,61.25,62.75])assert.equal(c.sample(t).contacts.length,0,'every declared pass gate remains unjoined');
 assert.deepEqual(c.sample(32).contacts.map(h=>[h.a,h.b]),[[0,1],[0,1],[2,3],[2,3],[4,5],[4,5],[6,7],[6,7],[8,9],[8,9],[10,11],[10,11]]);
});
test('ordinary half-hey finite line identities, boundaries, hand occupancy and cache closure hold for2–12couples',()=>{
 for(let count=2;count<=12;count++){const c=compileChoreography(dance,count,caps),period=count*128,initial=c.sample(0);for(let t=0;t<=period;t+=.5){const f=c.sample(t),occupied=new Set<string>();assert.deepEqual(f.poses.map(p=>p.id),c.dancers.map(d=>d.id));for(let a=0;a<f.poses.length;a++){assert.ok([f.poses[a].position.x,f.poses[a].position.z,f.poses[a].yaw].every(Number.isFinite));for(let b=a+1;b<f.poses.length;b++)assert.ok(gap(f.poses[a].position,f.poses[b].position)>.48,`${count}/${t}/${a}/${b}`);}for(const h of f.contacts){for(const hand of[h.a+':'+h.handA,...(!h.target||h.target==='hands'?[h.b+':'+h.handB]:[])]){assert.ok(!occupied.has(hand));occupied.add(hand);}}}
 for(let r=0;r<=count*2;r++)for(const local of c.starts){const beat=r*64+local;if(!beat)continue;const a=c.sample(beat-1e-6),b=c.sample(beat+1e-6);for(let id=0;id<count*2;id++){assert.ok(gap(a.poses[id].position,b.poses[id].position)<1e-4,`position${count}/${beat}/${id}`);assert.ok(turn(a.poses[id].yaw,b.poses[id].yaw)<1e-4,`yaw${count}/${beat}/${id}`);}}
 const final=c.sample(period);for(let id=0;id<count*2;id++)assert.ok(gap(initial.poses[id].position,final.poses[id].position)<1e-6);const saved=c.sample(30.25);c.sample(Number.MAX_SAFE_INTEGER);assert.deepEqual(c.sample(30.25),saved);
 }
});
test('ordinary half-hey source contract is gated and rejects dropped or contradictory semantics',()=>{
 assert.doesNotThrow(()=>compileChoreography(dance,2));assert.throws(()=>compileChoreography(dance,2,{ordinaryHalfHeys:false}),/separately registered/);const f=dance.figures[3],ctx=context();for(const bad of[{confidence:'unsupported'},{progression:true},{centerShoulder:'left'},{endShoulder:'right'},{heyStartRole:'lark'},{amount:1},{notation:'(8) Hey 1/2 (WR;NL;MR;PL)'},{hands:'right'},{underRole:'robin'},{direction:'right'},{beats:4},{exit:'progressed-neighbors'}])assert.throws(()=>compileOrdinaryHalfHeyFigure({...f,...bad} as any,ctx),JSON.stringify(bad));
 assert.throws(()=>compileOrdinaryHalfHeyFigure(f,{...ctx,next:{...ctx.next!,who:'neighbor'}}),/same-pair/);assert.throws(()=>compileOrdinaryHalfHeyFigure(f,{...ctx,bindingEpoch:1}),/stale/);
});
test('standalone ordinary half-hey owns all inputs and exposes no mutable identity closure',()=>{
 const f=structuredClone(dance.figures[3]),ctx=context(),p=compileOrdinaryHalfHeyFigure(f,ctx),expected=p.position(0,.5),yaw=p.facing(0,.5,[]);f.beats=1;ctx.ids[0]=99;ctx.start[0].position.x=999;(ctx.relations.partner as Map<number,number>).set(0,3);assert.deepEqual(p.position(0,.5),expected);assert.equal(p.facing(0,.5,[]),yaw);const result=p.position(0,.5);result.x=999;assert.deepEqual(p.position(0,.5),expected);assert.throws(()=>p.position(99,.5),/outside/);
});

test('Hay half-hey actual gait stays on the musical beat with fixed limbs and a bounded progression-exit limit',async t=>{
 const {Avatar}=await import('./scene.ts');
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 for(const count of[2,6]){const c=compileChoreography(dance,count,caps),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false} as import('./types.ts').StudioState;let terminalMaximum=0,terminalCorrections=0;
  for(const [from,to]of[[22,34],[54,64]])for(let i=from*120;i<to*120;i++){const beat=i/120,frame=c.sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,state,b=>c.sample(b));const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}
   if(frame.figureIndex===7){terminalMaximum=Math.max(terminalMaximum,gait.maxClampDistance);terminalCorrections+=gait.reachClamps;assert.ok(gait.maxClampDistance<.07,`progression hey gait exceeded its disclosed limit at${count}/${beat}/${a.dancer.id}`);}else assert.equal(gait.reachClamps,0,`held half-hey and adjoining figures ${count}/${beat}/${a.dancer.id}`);
  }}
  t.diagnostic(`${count} couples: terminal progression hey has ${terminalCorrections} sampled leg corrections, maximum ${(1000*terminalMaximum).toFixed(2)}mm; held half hey has none. This is schematic gait, not measured human motion.`);avatars.forEach(a=>a.dispose());
 }
});
