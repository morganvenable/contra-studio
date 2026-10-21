/** Four counted current-neighbor passages across an actual compact ring into
 * the persistent-partner gyre. No relationship binding changes here. */
import type {Figure} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {compileRingPass} from './ring-pass.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {heading,turn,ease,type TurnConstraint} from './ring-twirl-contract.ts';
import {assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,advanceSequenceBeat,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
export function compileAcrossRingPassStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan{
 const f=capturePlainData(input),b=ownSequenceBoundary(incoming);if(!f||typeof f!=='object'||Array.isArray(f))throw Error('Across-ring passage needs an explicit figure.');assertFigureArgumentsConsumed(f);if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw Error('Across-ring passage requires text identity and supported confidence.');
 if(f.kind!=='pass-through'||f.beats!==4||f.who!=='neighbor'||f.passingShoulder!=='right'||f.entry!=='ring'||f.exit!=='opposite-paired-gyre'||f.progression||context.next?.kind!=='gyre'||context.next.who!=='partner'||context.next.beats<4)throw Error('Across-ring passage requires four unmarked counts, current-neighbor right shoulders and the immediate persistent-partner gyre.');
 assertSequenceHandoff(b,captureSequenceBoundary(context,b.sourceBeat,b.heldContacts));
 const ids=b.actors.map(a=>a.id),poses=new Map(b.poses.map(p=>[p.id,p])),partner=new Map(b.partner),neighbor=new Map(b.neighbor),center={x:b.poses.reduce((s,p)=>s+p.position.x,0)/4,z:b.poses.reduce((s,p)=>s+p.position.z,0)/4},a=poses.get(ids[0])!.position,n=poses.get(neighbor.get(ids[0])!)!.position,length=Math.hypot(n.x-a.x,n.z-a.z),axis={x:(n.x-a.x)/length,z:(n.z-a.z)/length},across={x:axis.z,z:-axis.x};
 const local=(p:{x:number;z:number})=>({x:(p.x-center.x)*across.x+(p.z-center.z)*across.z,z:(p.x-center.x)*axis.x+(p.z-center.z)*axis.z}),world=(p:{x:number;z:number})=>({x:center.x+p.x*across.x+p.z*axis.x,z:center.z+p.x*across.z+p.z*axis.z});
 const entry=new Map(ids.map(id=>[id,{position:{...poses.get(id)!.position},yaw:poses.get(id)!.yaw,velocity:{x:0,z:0},yawRate:0}])),exit=new Map<number,TurnConstraint>();
 for(const id of ids){const p=local(poses.get(id)!.position),position=world({x:Math.sign(p.x)*.9,z:-Math.sign(p.z)*.9}),direction={x:-Math.sign(p.z)*axis.x,z:-Math.sign(p.z)*axis.z};exit.set(id,{position,yaw:heading({x:0,z:0},direction),velocity:{x:0,z:0},yawRate:0});}
 const cyclicIds=[...ids].sort((a,b)=>Math.atan2(poses.get(a)!.position.z-center.z,poses.get(a)!.position.x-center.x)-Math.atan2(poses.get(b)!.position.z-center.z,poses.get(b)!.position.x-center.x))as[number,number,number,number];
 for(const id of ids){const a=local(exit.get(id)!.position),p=local(exit.get(partner.get(id)!)!.position);if(Math.abs(a.z-p.z)>1e-7||Math.abs(a.x+p.x)>1e-7)throw Error('The actual persistent partners must occupy paired stations after the across passage.');}
 const raw=compileRingPass({actors:ids.map(id=>context.dancers[id]),entry,exit,relations:{epoch:b.relationshipEpoch,partner,neighbor},bindingEpoch:b.relationshipEpoch,cyclicIds,frame:{origin:center,axis},beats:4,relation:'neighbor',passingShoulder:'right'}),finalYaw=new Map(ids.map(id=>[id,heading(exit.get(id)!.position,exit.get(partner.get(id)!)!.position)]));
 for(const id of ids)if(Math.abs(turn(finalYaw.get(id)!,exit.get(id)!.yaw))>Math.PI/2+1e-7)throw Error('Across passage cannot acquire the persistent partner within its counted final quarter-turn.');
 const plan:MotionPlan={position:raw.position,facing:(id,t)=>raw.facing(id,t)+turn(finalYaw.get(id)!,exit.get(id)!.yaw)*ease((t*4-2.5)/1.5),contacts:raw.contacts},entryState=sampleSequenceBoundary(context,plan,b.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(b.sourceBeat,4),1);assertSequenceHandoff(b,entryState);return Object.freeze({...plan,entryState,exitState});
}
