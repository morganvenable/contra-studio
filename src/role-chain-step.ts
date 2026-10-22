/** Explicit-role, explicit-hand chain. A reflected coordinate frame is used only
 * after verifying actual source-selected role, hand, receivers and entry order.
 * Identities, cosmetics, couples and epochs are never replaced in carried state.
 * Conventional left-hand Lark chain corroboration:
 * https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm */
import type {FigureContext} from './extended-figures.ts';
import {compileReleasedChainStep} from './released-chain-step.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {ownSequenceBoundary,captureSequenceBoundary,assertSequenceHandoff,sampleSequenceBoundary,advanceSequenceBeat,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import type {Role,Hand,Pose,Vec2,HandContact,Figure} from './types.ts';
export interface RoleChainSpec {beats:8;crossingRole:Role;pullByHand:Hand;receiver:'partner'|'neighbor';courtesy:'left-front-right-waist'|'right-front-left-waist';receiverYield:0|.3;}
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x)),smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
export function compileRoleChainStep(context:FigureContext,input:SequenceBoundary,raw:RoleChainSpec):SequencedMotionPlan{
 const boundary=ownSequenceBoundary(input),spec=capturePlainData(raw);
 if(Object.keys(spec).some(k=>!['beats','crossingRole','pullByHand','receiver','courtesy','receiverYield'].includes(k))||spec.beats!==8||![0,.3].includes(spec.receiverYield)||!['lark','robin'].includes(spec.crossingRole)||!['left','right'].includes(spec.pullByHand)||!['partner','neighbor'].includes(spec.receiver)||spec.courtesy!==(spec.pullByHand==='right'?'left-front-right-waist':'right-front-left-waist'))throw Error('A role chain needs eight counts, actual crossing role, pull-by hand, receiver and matching courtesy handedness.');
 if(boundary.heldContacts.length)throw Error('Role chain consumes released incoming hands.');assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const flip=spec.pullByHand==='left',centerX=boundary.poses.reduce((n,p)=>n+p.position.x/4,0),point=(p:Readonly<Vec2>)=>({x:flip?2*centerX-p.x:p.x,z:p.z}),yaw=(a:number)=>flip?-a:a,hand=(h:Hand):Hand=>flip?(h==='left'?'right':'left'):h;
 const canonical={...context,start:context.start.map(p=>({...p,position:point(p.position),yaw:yaw(p.yaw)})),dancers:context.dancers.map(d=>({...d,role:(d.role===spec.crossingRole?'robin':'lark') as Role})),next:undefined};
 const canonicalBoundary=captureSequenceBoundary(canonical,boundary.sourceBeat,[]),base=compileReleasedChainStep({id:'role-chain',label:'Explicit role chain',kind:'robins-chain',beats:8,who:spec.receiver},canonical,canonicalBoundary,spec.receiverYield===.3?{receiverYield:.3}:undefined),entry=new Map(boundary.poses.map(p=>[p.id,p]));
 const at=(id:number,t:number)=>{if(!entry.has(id)||!Number.isFinite(t))throw Error('Role chain requires a known actor and finite time.');return Math.max(0,Math.min(1,t));};
 const position=(id:number,t:number)=>point(base.position(id,at(id,t)));
 const facing=(id:number,t:number)=>{t=at(id,t);const target=yaw(base.facing(id,t,[])),correction=wrap(entry.get(id)!.yaw-yaw(base.facing(id,0,[])));return target+correction*(1-smooth(t*8/1.25));};
 const posesAt=(t:number):Pose[]=>boundary.poses.map(p=>({id:p.id,position:position(p.id,t),yaw:facing(p.id,t),stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
 const contacts=(t:number):HandContact[]=>{if(!Number.isFinite(t))throw Error('Role chain requires finite time.');t=Math.max(0,Math.min(1,t));const poses=posesAt(t).map(p=>({...p,position:point(p.position),yaw:yaw(p.yaw)}));return base.contacts(t,poses).map(c=>({...c,handA:hand(c.handA),handB:hand(c.handB),point:{...c.point,...point(c.point)}}));};
 if(base.minimumObservedClearance<.45-1e-6)throw Error('Role chain actual carried geometry violates the established root-clearance envelope.');
 const plan={position,facing,contacts,chainCourtesyPreparation:(id:number,t:number)=>{const cue=base.chainCourtesyPreparation?.(id,at(id,t));return cue?{...cue,waistHand:spec.pullByHand}:undefined;}},entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(boundary.sourceBeat,8),1);assertSequenceHandoff(boundary,entryState);
 return Object.freeze({...plan,entryState,exitState});
}

export function compileLarkChainFigure(figure:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan{
 if(Object.keys(figure).some(k=>!['id','label','kind','beats','who','hands','courtesyLeader','notes','confidence','progression'].includes(k))||figure.progression===true||figure.kind!=='larks-chain'||figure.beats!==8||!['partner','neighbor'].includes(figure.who??'')||!['left','right'].includes(figure.hands??'')||figure.courtesyLeader!=='robin')throw Error('Lark chain must retain explicit hand, Robin courtesy leader, receiver and eight counts.');
 return compileRoleChainStep(context,incoming,{beats:8,crossingRole:'lark',pullByHand:figure.hands as Hand,receiver:figure.who as 'partner'|'neighbor',courtesy:figure.hands==='left'?'right-front-left-waist':'left-front-right-waist',receiverYield:0});
}
