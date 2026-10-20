/** A standalone, source-counted box-the-gnat from actual paired sidelines.
 * The first count closes and acquires; the established three-count arch then
 * exchanges the original slots. Neither an earlier balance nor a dance title
 * is part of this admission contract. */
import type {Figure,HandContact,Vec2} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {compileArchExchange} from './arch-exchange.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';

const EPS=1e-7;
const distance=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>Math.hypot(a.x-b.x,a.z-b.z);
const heading=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>Math.atan2(b.x-a.x,b.z-a.z);
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const time=(t:number)=>{if(!Number.isFinite(t))throw new Error('A bare-arch sample time must be finite.');return Math.max(0,Math.min(1,t));};

export function assertBareArchFigure(input:Figure):Figure {
 const f=capturePlainData(input);assertFigureArgumentsConsumed(f);
 if(f.kind!=='box-the-gnat'||f.beats!==4||!['partner','neighbor'].includes(f.who??'')||f.hands!=='right'||f.underRole!=='robin'||f.entry!=='paired-sidelines'||f.exit!=='paired-sidelines'||f.progression===true||f.confidence==='unsupported')throw new Error('A bare arch needs four source counts, explicit current partners or neighbors, right hands, robin-under, and paired-sidelines entry and exit.');
 return f;
}

export function assertRolePullByFigure(input:Figure):Figure {
 const f=capturePlainData(input);assertFigureArgumentsConsumed(f);
 if(f.kind!=='pull-by'||!['larks','robins'].includes(f.who??'')||f.hands!=='left'||![2,4].includes(f.beats)||f.entry!==undefined||f.exit!==undefined||f.progression===true||f.confidence==='unsupported')throw new Error('A same-role passage needs explicit larks or robins, left hands, two or four source counts, and no undeclared exit or progression.');
 return f;
}

/** Check measured longways corners without replacing the actual roots. */
export function assertBareArchCorners(boundary:SequenceBoundary):Readonly<Vec2> {
 const center={x:boundary.poses.reduce((sum,p)=>sum+p.position.x,0)/4,z:boundary.poses.reduce((sum,p)=>sum+p.position.z,0)/4};
 if(boundary.poses.some(p=>Math.abs(Math.abs(p.position.x-center.x)-.9)>EPS||Math.abs(Math.abs(p.position.z-center.z)-.9)>EPS)||new Set(boundary.poses.map(p=>`${Math.sign(p.position.x-center.x)},${Math.sign(p.position.z-center.z)}`)).size!==4)throw new Error('This carried arch/pull handoff needs four actual standard longways corner slots.');
 return Object.freeze(center);
}

export function compileBareArchStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan&{readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;readonly maximumObservedYawRate:number} {
 const f=assertBareArchFigure(input),boundary=ownSequenceBoundary(incoming);
 if(!context.next)throw new Error('This bare arch requires an immediate declared same-role left pull-by.');
 assertRolePullByFigure(context.next);
 if(boundary.heldContacts.length)throw new Error('A bare arch requires released incoming hands; it cannot discard an existing hold.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const endBeat=advanceSequenceBeat(boundary.sourceBeat,4),center=assertBareArchCorners(boundary),byId=new Map(boundary.poses.map(p=>[p.id,p])),relation=new Map(boundary[f.who as 'partner'|'neighbor']);
 const paths=boundary.actors.filter(a=>a.role==='lark').map(over=>{
  const under=relation.get(over.id)!,A=byId.get(over.id)!,B=byId.get(under)!,pairCenter={x:(A.position.x+B.position.x)/2,z:(A.position.z+B.position.z)/2};
  if(Math.abs(A.position.x-B.position.x)>EPS||Math.abs(pairCenter.z-center.z)>EPS||Math.abs(distance(A.position,B.position)-1.8)>EPS)throw new Error('The declared bare-arch partners must already occupy the same actual sideline.');
  const entry=[A,B].map(p=>({id:String(p.id),position:{x:pairCenter.x+(p.position.x-pairCenter.x)*1.1/1.8,z:pairCenter.z+(p.position.z-pairCenter.z)*1.1/1.8},yaw:heading(p.position,pairCenter)}));
  const exit=[A,B].map(p=>({id:String(p.id),position:{...(p.id===A.id?B:A).position},yaw:heading((p.id===A.id?B:A).position,pairCenter)}));
  const arch=compileArchExchange({entry,exit,overId:String(over.id),underId:String(under),hand:'right',beats:3});
  return{over:over.id,under,arch,entry:new Map(entry.map(p=>[Number(p.id),p])),initialContact:arch.sample(0).contacts[0]};
 });
 const forActor=(id:number)=>{const found=paths.find(p=>p.over===id||p.under===id);if(!found)throw new Error('The sampled actor is outside the carried bare arch.');return found;};
 const actor=(id:number,t:number)=>{
  const beat=time(t)*4,path=forActor(id);
  if(beat>=1)return path.arch.sample(beat-1).poses.find(p=>Number(p.id)===id)!;
  const initial=byId.get(id)!,target=path.entry.get(id)!,u=smooth(beat);
  return{id:String(id),position:{x:initial.position.x+(target.position.x-initial.position.x)*u,z:initial.position.z+(target.position.z-initial.position.z)*u},yaw:initial.yaw+turn(target.yaw,initial.yaw)*u,archProgress:0,kneeLowering:0};
 };
 const contacts=(t:number):HandContact[]=>{
  const beat=time(t)*4;
  if(beat>=1)return paths.flatMap(p=>p.arch.sample(beat-1).contacts.map(c=>({...c,a:Number(c.a),b:Number(c.b),underId:Number(c.underId)})));
  return paths.flatMap(path=>{
   const c=path.initialContact,A=actor(path.over,t),B=actor(path.under,t),reach=(p:typeof A)=>Math.hypot(c.point.x-p.position.x+.235*Math.cos(p.yaw),c.point.y-1.355,c.point.z-p.position.z-.235*Math.sin(p.yaw));
   const strength=smooth((beat-.55)/.45)*smooth((.64-Math.max(reach(A),reach(B)))/.025);
   return strength>0?[{...c,point:{...c.point},a:path.over,b:path.under,underId:path.under,strength}]:[];
  });
 };
 const plan:MotionPlan={position:(id,t)=>actor(id,t).position,facing:(id,t)=>actor(id,t).yaw,contacts,
  arch:(id,t)=>{const p=actor(id,t);return{underId:forActor(id).under,progress:p.archProgress,kneeLowering:p.kneeLowering,releaseRouting:'wide-exit'};}};
 // These are local sampled budgets, not a change to any established primitive.
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let n=0;n<=640;n++){
  const t=n/640,h=1e-5,lo=Math.max(0,t-h),hi=Math.min(1,t+h),poses=boundary.poses.map(p=>actor(p.id,t));
  for(const p of poses){const a=actor(Number(p.id),lo),b=actor(Number(p.id),hi),dt=(hi-lo)*4;maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(a.position,b.position)/dt);maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(turn(b.yaw,a.yaw))/dt);}
  for(let a=0;a<poses.length;a++)for(let b=a+1;b<poses.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(poses[a].position,poses[b].position));
 }
 if(minimumObservedClearance<.5-EPS||maximumObservedSpeed>1.5+EPS||maximumObservedYawRate>6+EPS)throw new Error(`Bare-arch ingress exceeds sampled motion budgets: clearance ${minimumObservedClearance}, speed ${maximumObservedSpeed}, yaw ${maximumObservedYawRate}.`);
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,endBeat,1);
 assertSequenceHandoff(boundary,entryState);
 return Object.freeze({...plan,entryState,exitState,minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate});
}
