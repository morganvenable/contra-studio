import test from 'node:test';
import assert from 'node:assert/strict';
import type {Dancer,Figure,Pose} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {compileSquareThroughStep} from './square-through-step.ts';
import {compileChainSquareHandoff} from './chain-square-handoff.ts';
import {captureSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import {compilePrimitiveFigure} from './engine.ts';
import {distance,turn} from './ring-twirl-contract.ts';
const square=(terminal:boolean):Figure=>({id:terminal?'finish':'continue',kind:'square-through',beats:8,label:'Reviewed balanced two-hand unit',amount:2,who:'all',hands:'right-left',phaseBeats:[4,2,2],entry:'partners-facing-across',exit:terminal?'progressed-neighbors':'partners-facing-across',progression:terminal});
const balance:Figure={id:'partner-balance',kind:'balance',beats:4,label:'Partner balance',who:'partner'};
function context():FigureContext {
 const positions=[[-.9,-.9],[-.9,.9],[.9,.9],[.9,-.9]],dancers:Dancer[]=positions.map((_,id)=>({id,name:`Actor${id}`,role:id%2?'robin':'lark',couple:id>>1,direction:id<2?1:-1,color:'#438b86'}));
 const start:Pose[]=positions.map(([x,z],id)=>({id,position:{x,z},yaw:x<0?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'robins-chain'}));
 return{ids:[0,1,2,3],dancers,start,relations:{epoch:7,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:7,next:square(false)};
}
const after=(c:FigureContext,p:MotionPlan,next?:Figure):FigureContext=>({...c,start:sampleFormationEndpoint(c,p,1),next});
test('the same incoming-state adapter composes chain→square→square or partner balance without rebinding',()=>{
 for(const handed of[false,true]){
  const c=context(),chain:Figure={id:'opaque-chain',kind:'robins-chain',beats:8,label:'Chain',who:'neighbor',...(handed?{exit:'partners-facing-across' as const,hands:'right' as const}:{})};
  const p=compileChainSquareHandoff(chain,c,captureSequenceBoundary(c,40,[]));
  assert.equal(p.exitState.sourceBeat,48);assert.equal(p.exitState.heldContacts.length,handed?2:0);
  for(const h of p.exitState.heldContacts){assert.equal(c.relations.partner.get(h.a),h.b);assert.equal(h.handA,'right');assert.equal(h.handB,'right');assert.ok(h.strength>1-1e-12);}
  const firstContext=after(c,p,square(true)),first=compileSquareThroughStep(square(false),firstContext,p.exitState),secondContext=after(firstContext,first),second=compileSquareThroughStep(square(true),secondContext,first.exitState);
  assertSequenceHandoff(p.exitState,first.entryState);assertSequenceHandoff(first.exitState,second.entryState);
  assert.deepEqual([first.entryState.sourceBeat,first.exitState.sourceBeat,second.exitState.sourceBeat],[48,56,64]);
  for(const state of[first.entryState,first.exitState,second.entryState,second.exitState]){assert.equal(state.relationshipEpoch,7);assert.deepEqual(state.partner,p.entryState.partner);assert.deepEqual(state.neighbor,p.entryState.neighbor);}
  for(const gate of[...first.gates,...second.gates])assert.equal(c.relations[gate.relationship as 'partner'|'neighbor'].get(gate.a),gate.b);
  // A different valid immediate successor uses the same measured endpoint.
  const alternate=compileSquareThroughStep(square(false),{...firstContext,next:balance},p.exitState),bc=after(firstContext,alternate);
  const bp=compilePrimitiveFigure(balance,bc.ids,bc.start,bc.dancers,bc.dancers.map(d=>d.direction));
  for(const id of bc.ids){assert.ok(distance(alternate.position(id,1),bp.position(id,0))<1e-8);assert.ok(Math.abs(turn(alternate.facing(id,1,bc.start),bp.facing(id,0,bc.start)))<1e-8);}
 }
});
test('square and explicit chain handoff preserve actual roots, passed hands and measured speed once',t=>{
 const c=context(),chain:Figure={id:'handed-chain',kind:'robins-chain',beats:8,label:'Chain then give partner right hand',who:'neighbor',exit:'partners-facing-across',hands:'right'},p=compileChainSquareHandoff(chain,c,captureSequenceBoundary(c,40,[])),sc=after(c,p,square(true)),s=compileSquareThroughStep(square(false),sc,p.exitState);
 let minimum=Infinity,speed=0,yaw=0;
 for(const [ctx,plan]of[[c,p],[sc,s]]as const)for(let tick=0;tick<=256;tick++){
  const time=tick/256,frame=sampleFormationEndpoint(ctx,plan,time),hands=new Set<string>();
  for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimum=Math.min(minimum,distance(frame[a].position,frame[b].position));
  for(const h of plan.contacts(time,frame))for(const key of[`${h.a}:${h.handA}`,`${h.b}:${h.handB}`]){assert.ok(!hands.has(key));hands.add(key);}
  const lo=Math.max(0,time-1e-5),hi=Math.min(1,time+1e-5);for(const id of ctx.ids){speed=Math.max(speed,distance(plan.position(id,lo),plan.position(id,hi))/((hi-lo)*8));yaw=Math.max(yaw,Math.abs(turn(plan.facing(id,hi,frame),plan.facing(id,lo,frame)))/((hi-lo)*8));}
 }
 assert.ok(minimum>.49);assert.ok(speed<2);assert.ok(yaw<8);t.diagnostic(JSON.stringify({minimum,speed,yaw}));
 const seamBefore=sampleFormationEndpoint(c,p,1-1e-7),seamAfter=sampleFormationEndpoint(sc,s,1e-7);for(const id of c.ids){assert.ok(distance(seamBefore[id].position,seamAfter[id].position)<1e-6);assert.ok(Math.abs(turn(seamBefore[id].yaw,seamAfter[id].yaw))<1e-6);}
 const gate=sampleFormationEndpoint(sc,s,7/8);assert.ok(s.contacts(7/8,gate).every(h=>h.handA==='left'&&c.relations.neighbor.get(h.a)===h.b));
});
test('incompatible incoming states cannot be repaired and unsupported continuation variants reject',()=>{
 const c=context(),p=compileChainSquareHandoff({id:'chain',kind:'robins-chain',label:'Chain',beats:8,who:'neighbor'},c,captureSequenceBoundary(c,40,[])),sc=after(c,p,square(true));
 for(const mutate of[(v:any)=>v.poses[0].position.x+=.1,(v:any)=>v.relationshipEpoch++,(v:any)=>v.heldContacts.push({a:0,b:1,handA:'right',handB:'right',point:{x:0,y:1.18,z:-.9},strength:1,kind:'joined'})]){const bad=structuredClone(p.exitState);mutate(bad);assert.throws(()=>compileSquareThroughStep(square(false),sc,bad));}
 assert.throws(()=>compileSquareThroughStep({...square(false),amount:4},sc,p.exitState));
 assert.throws(()=>compileChainSquareHandoff({id:'wrong',kind:'robins-chain',beats:8,label:'Wrong receiver',who:'partner'},c,captureSequenceBoundary(c,40,[])));
});

test('an endpoint-preserving ordinary figure can separate repeated square units',()=>{
 const c=context(),chain=compileChainSquareHandoff({id:'chain',kind:'robins-chain',label:'Chain',beats:8,who:'neighbor'},c,captureSequenceBoundary(c,32,[]));
 const lines:Figure={id:'lines-between-units',kind:'long-lines',label:'Long lines',beats:8,who:'all'},sc=after(c,chain,lines),first=compileSquareThroughStep(square(false),sc,chain.exitState),lc=after(sc,first,square(true));
 const lp=compilePrimitiveFigure(lines,lc.ids,lc.start,lc.dancers,lc.dancers.map(d=>d.direction));
 const end=after(lc,lp),incoming=captureSequenceBoundary(end,56,lp.contacts(1,end.start)),second=compileSquareThroughStep(square(true),end,incoming);
 for(const id of c.ids){assert.ok(distance(first.position(id,1),lp.position(id,0))<1e-8);assert.ok(distance(lp.position(id,1),second.position(id,0))<1e-8);assert.ok(Math.abs(turn(first.facing(id,1,lc.start),lp.facing(id,0,lc.start)))<1e-8);}
 assert.equal(second.exitState.sourceBeat,64);assert.equal(second.exitState.relationshipEpoch,first.entryState.relationshipEpoch);
});
