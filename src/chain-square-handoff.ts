/** Conventional chain followed by an explicitly named square-through. The
 * producer owns any declared partner right-hand offer inside its eight counts;
 * the successor consumes exactly the measured endpoint without a pose reset. */
import type {Figure,HandContact,Pose} from './types.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {compileChainFigure} from './chain.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {captureSequenceBoundary,assertSequenceHandoff,ownSequenceBoundary,advanceSequenceBeat,type SequenceBoundary} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import {assertSquareThroughStepFigure} from './square-through-step.ts';
import {ease,turn} from './ring-twirl-contract.ts';

export function compileChainSquareHandoff(input:Figure,context:FigureContext,incoming:SequenceBoundary):MotionPlan&{readonly entryState:SequenceBoundary;readonly exitState:SequenceBoundary} {
 incoming=ownSequenceBoundary(incoming);
 const f=capturePlainData(input),next=context.next;
 if(!['ladies-chain','robins-chain'].includes(f.kind)||f.beats!==8||f.progression===true||!next)throw new Error('A chain-to-square boundary requires an eight-count nonprogressing chain and its immediate square successor.');
 assertSquareThroughStepFigure(next);
 const handed=f.exit==='partners-facing-across'&&f.hands==='right';
 if((f.exit!==undefined||f.hands!==undefined)&&!handed)throw new Error('The chain-to-square adapter only consumes an explicit partner-facing right-hand offer.');
 const {exit:_exit,hands:_hands,...ordinary}=f;
 const base=compileChainFigure(ordinary,context),partner=new Map(resolveBoundFigureRelation(context,'partner')),ids=[...context.ids],entryYaw=new Map(ids.map(id=>[id,context.start[id].yaw]));
 const center=ids.reduce((n,id)=>n+context.start[id].position.x,0)/4;
 const position=(id:number,t:number)=>{const p=base.position(id,t);return handed?{x:p.x+(center+Math.sign(p.x-center)*.55-p.x)*ease((t-.9)/.1),z:p.z}:p;};
 const facing=(id:number,t:number)=>t>=.12?base.facing(id,t):entryYaw.get(id)!+turn(base.facing(id,t),entryYaw.get(id)!)*ease(t/.12);
 const contacts=(t:number,poses:Pose[]):HandContact[]=>{
  const prior=base.contacts(t,poses);if(!handed||t<=.9)return prior;
  const points=new Map(poses.map(p=>[p.id,p]));
  return ids.filter(id=>id<partner.get(id)!).flatMap(a=>{const b=partner.get(a)!,A=points.get(a)!,B=points.get(b)!,point={x:(A.position.x+B.position.x)/2,y:1.18,z:(A.position.z+B.position.z)/2},reach=(p:Pose)=>Math.hypot(point.x-p.position.x+.235*Math.cos(p.yaw),point.y-1.355,point.z-p.position.z-.235*Math.sin(p.yaw)),strength=ease((t-.9)/.1)*ease((.64-Math.max(reach(A),reach(B)))/.016);return strength>0?[{a,b,handA:'right' as const,handB:'right' as const,point,strength,kind:'joined' as const}]:[];});
 };
 const plan:MotionPlan={...base,position,facing,contacts};
 const first=sampleFormationEndpoint(context,plan,0),last=sampleFormationEndpoint(context,plan,1);
 const sourceBeat=incoming.sourceBeat;
 advanceSequenceBeat(sourceBeat,8);
 const entryState=captureSequenceBoundary({...context,start:first},sourceBeat,contacts(0,first)),exitState=captureSequenceBoundary({...context,start:last},sourceBeat+8,contacts(1,last));
 assertSequenceHandoff(incoming,entryState);
 // The named endpoint requirement comes from the immediate square declaration.
 // The sequencer will compile that successor from this measured state itself.
 for(const id of ids){const a=last[id],b=last[partner.get(id)!];if(Math.abs(a.position.z-b.position.z)>1e-7||Math.abs(a.position.x+b.position.x-2*center)>1e-7||Math.abs(Math.abs(a.position.x-center)-(handed?.55:.9))>1e-7||Math.abs(turn(a.yaw,Math.atan2(b.position.x-a.position.x,b.position.z-a.position.z)))>1e-7)throw new Error('The declared chain receiver does not deliver actual across-partner square entry.');}
 return Object.freeze({...plan,entryState,exitState});
}
