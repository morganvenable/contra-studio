/** The common internal handoff between figure adapters. Geometry is actual
 * keyed pose data, rather than a whole-dance name or a required formation tag.
 * Public inputs are captured once before a sequence is compiled; this module
 * owns and checks the resulting boundary values at the shared seam. */
import {capturePlainData} from './owned-program-cache.ts';
import type {FormationActor} from './formation-handoff.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import type {HandContact,Vec2,FigureExitPreparationWindow} from './types.ts';

export interface SequenceBoundaryPose {readonly id:number;readonly position:Readonly<Vec2>;readonly yaw:number;}
export interface SequenceBoundary {
 readonly sourceBeat:number;
 readonly relationshipEpoch:number;
 readonly actors:readonly FormationActor[];
 readonly partner:readonly (readonly [number,number])[];
 readonly neighbor:readonly (readonly [number,number])[];
 readonly poses:readonly SequenceBoundaryPose[];
 readonly heldContacts:readonly HandContact[];
}
export type SequencedMotionPlan=MotionPlan&{readonly entryState:SequenceBoundary;readonly exitState:SequenceBoundary;readonly exitPreparationWindow?:FigureExitPreparationWindow;};
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){for(const child of Object.values(x))freeze(child);Object.freeze(x);}return x;};
const exactKeys=(x:object,keys:readonly string[],label:string)=>{if(Object.keys(x).some(k=>!keys.includes(k)))throw new Error(`${label} contains an unconsumed field.`);};
const integer=(x:unknown)=>Number.isSafeInteger(x)&&Number(x)>=0;
const vector=(v:unknown,keys:readonly string[])=>{
 if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('A boundary vector must be a plain record.');
 exactKeys(v,keys,'Boundary vector');if(keys.some(k=>typeof (v as any)[k]!=='number'||!Number.isFinite((v as any)[k])))throw new Error('Boundary coordinates must be finite.');
};
const contactKey=(c:HandContact)=>[c.a,c.b,c.handA,c.handB,c.kind,c.target??'hands',c.underId??null].join(':');

/** One audited plain-data capture handles programmable external values. Once
 * captured, all figure adapters consume the same immutable representation. */
export function ownSequenceBoundary(raw:unknown):SequenceBoundary {
 const b=capturePlainData(raw) as SequenceBoundary;
 if(!b||typeof b!=='object'||Array.isArray(b))throw new Error('A sequence boundary must be a plain record.');
 exactKeys(b,['sourceBeat','relationshipEpoch','actors','partner','neighbor','poses','heldContacts'],'Sequence boundary');
 if(!Number.isFinite(b.sourceBeat)||b.sourceBeat<0||!integer(b.relationshipEpoch))throw new Error('Sequence clocks and epochs must be finite and nonnegative.');
 if(!Array.isArray(b.actors)||b.actors.length!==4||!Array.isArray(b.poses)||b.poses.length!==4||!Array.isArray(b.heldContacts))throw new Error('A minor-set boundary needs four actors, four actual poses and explicit held contacts.');
 const ids=new Set<number>(),actors=new Map<number,FormationActor>();
 for(const a of b.actors){if(!a||typeof a!=='object')throw new Error('Boundary actor must be explicit.');exactKeys(a,['id','role','couple'],'Boundary actor');if(!integer(a.id)||!integer(a.couple)||!['lark','robin'].includes(a.role)||ids.has(a.id))throw new Error('Boundary actors need unique integer identities, roles and persistent couples.');ids.add(a.id);actors.set(a.id,a);}
 for(const name of ['partner','neighbor'] as const){const pairs=b[name];if(!Array.isArray(pairs)||pairs.length!==4||pairs.some(p=>!Array.isArray(p)||p.length!==2||!ids.has(p[0])||!ids.has(p[1])))throw new Error('Boundary relations must cover the actual actor group.');const map=new Map<number,number>(pairs as readonly (readonly [number,number])[]);if(map.size!==4||[...ids].some(id=>{const other=map.get(id)!;return other===id||map.get(other)!==id||actors.get(id)!.role===actors.get(other)!.role||(actors.get(id)!.couple===actors.get(other)!.couple)!==(name==='partner');}))throw new Error('Boundary relations must be reciprocal and preserve persistent partners.');}
 const poseIds=new Set<number>();for(const p of b.poses){if(!p||typeof p!=='object')throw new Error('Boundary poses must be explicit.');exactKeys(p,['id','position','yaw'],'Boundary pose');if(!ids.has(p.id)||poseIds.has(p.id)||!Number.isFinite(p.yaw))throw new Error('Boundary poses must retain every actor with finite facing.');vector(p.position,['x','z']);poseIds.add(p.id);}
 const occupied=new Set<string>(),keys=new Set<string>();
 for(const c of b.heldContacts){if(!c||typeof c!=='object')throw new Error('Boundary contacts must be explicit.');exactKeys(c,['a','b','handA','handB','point','strength','kind','target','underId','bodyPoint','bodyBlend'],'Boundary contact');vector(c.point,['x','y','z']);if(c.bodyPoint!==undefined)vector(c.bodyPoint,['x','y','z']);if(!ids.has(c.a)||!ids.has(c.b)||c.a===c.b||!['left','right'].includes(c.handA)||!['left','right'].includes(c.handB)||!['joined','swing-frame','courtesy','arch'].includes(c.kind)||c.target!==undefined&&!['hands','back','waist','upper-arm','wrist'].includes(c.target)||!Number.isFinite(c.strength)||c.strength<0||c.strength>1||c.underId!==undefined&&!ids.has(c.underId)||c.bodyBlend!==undefined&&(!Number.isFinite(c.bodyBlend)||c.bodyBlend<0||c.bodyBlend>1))throw new Error('Boundary contacts must retain their named actors, hands and finite targets.');if(c.strength<=1e-9)continue;const key=contactKey(c);if(keys.has(key))throw new Error('Boundary contact is duplicated.');keys.add(key);for(const hand of [`${c.a}:${c.handA}`,...(!c.target||c.target==='hands'?[`${c.b}:${c.handB}`]:[])]){if(occupied.has(hand))throw new Error('A boundary hand cannot own two simultaneous targets.');occupied.add(hand);}}
 return freeze({...b,actors:[...b.actors].sort((a,b)=>a.id-b.id),partner:[...b.partner].sort((a,b)=>a[0]-b[0]),neighbor:[...b.neighbor].sort((a,b)=>a[0]-b[0]),poses:[...b.poses].sort((a,b)=>a.id-b.id),heldContacts:b.heldContacts.filter(c=>c.strength>1e-9).sort((a,b)=>contactKey(a).localeCompare(contactKey(b)))});
}

/** context is the already-owned internal figure context. Cross-group contacts
 * must be passed here, not silently filtered out by a caller. */
export function captureSequenceBoundary(context:FigureContext,sourceBeat:number,rawContacts:readonly HandContact[]):SequenceBoundary {
 const {ids,dancers,start,relations,bindingEpoch}=context;
 if(relations.epoch!==bindingEpoch)throw new Error('A sequence boundary cannot capture a stale relationship epoch.');
 return ownSequenceBoundary({sourceBeat,relationshipEpoch:bindingEpoch,actors:ids.map(id=>({id,role:dancers[id].role,couple:dancers[id].couple})),partner:ids.map(id=>[id,relations.partner.get(id)]),neighbor:ids.map(id=>[id,relations.neighbor.get(id)]),poses:ids.map(id=>({id,position:start[id].position,yaw:start[id].yaw})),heldContacts:rawContacts});
}

export function advanceSequenceBeat(sourceBeat:number,beats:number):number {
 const end=sourceBeat+beats;
 if(!Number.isFinite(sourceBeat)||sourceBeat<0||!Number.isFinite(beats)||beats<=0||!Number.isFinite(end)||end-sourceBeat!==beats)throw new Error('A sequence step must retain its exact source-count interval.');
 return end;
}

export function assertSequenceHandoff(expected:SequenceBoundary,actual:SequenceBoundary):void {
 const a=ownSequenceBoundary(expected),b=ownSequenceBoundary(actual),epsilon=1e-7;
 for(const key of ['sourceBeat','relationshipEpoch','actors','partner','neighbor'] as const)if(JSON.stringify(a[key])!==JSON.stringify(b[key]))throw new Error(`Sequence handoff changed ${key}; identity and source clocks cannot be repaired by geometry.`);
 for(let i=0;i<a.poses.length;i++){const p=a.poses[i],q=b.poses[i];if(Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)>epsilon||Math.abs(Math.atan2(Math.sin(p.yaw-q.yaw),Math.cos(p.yaw-q.yaw)))>epsilon)throw new Error('Sequence handoff has a discontinuous root or facing.');}
 if(a.heldContacts.length!==b.heldContacts.length)throw new Error('Sequence handoff cannot discard or invent an incoming held contact.');
 for(let i=0;i<a.heldContacts.length;i++){const p=a.heldContacts[i],q=b.heldContacts[i];if(contactKey(p)!==contactKey(q)||Math.abs(p.strength-q.strength)>epsilon||Math.hypot(p.point.x-q.point.x,p.point.y-q.point.y,p.point.z-q.point.z)>epsilon||(p.bodyBlend===undefined)!==(q.bodyBlend===undefined)||p.bodyBlend!==undefined&&Math.abs(p.bodyBlend-q.bodyBlend!)>epsilon||(p.bodyPoint===undefined)!==(q.bodyPoint===undefined)||p.bodyPoint&&q.bodyPoint&&Math.hypot(p.bodyPoint.x-q.bodyPoint.x,p.bodyPoint.y-q.bodyPoint.y,p.bodyPoint.z-q.bodyPoint.z)>epsilon)throw new Error('Sequence handoff changed a held contact target or strength.');}
}

export function sampleSequenceBoundary(context:FigureContext,plan:MotionPlan,sourceBeat:number,t:0|1):SequenceBoundary {
 const poses=context.start.map(p=>({...p,position:{...p.position}}));
 for(const id of context.ids)poses[id].position={...plan.position(id,t)};
 for(const id of context.ids)poses[id].yaw=plan.facing(id,t,poses);
 return captureSequenceBoundary({...context,start:poses},sourceBeat,plan.contacts(t,poses));
}
