/** Four-count, right-travel petronella in an explicit four-person ring.
 * Source meaning: https://www.ibiblio.org/contradance/thecallersbox/Glossary.htm#Petronella_turn
 * Drop the ring, travel to the station at each dancer's right, and spin right.
 * A quarter-ring rightward displacement and a three-quarter clockwise body turn
 * end facing inward. Those are different rotations, so both are explicit.
 * This reviewed variant omits the optional folk-process clap; a source that
 * explicitly requests clapping must not be converted to this contract.
 */
import type {Dancer,HandContact,Pose,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import {compileRingBalance} from './ring-balance.ts';
import {ownActors,ownConstraints,ownRelations,immutableMap,distance,turn,progress,smooth,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';
export type PetronellaConstraint=TurnConstraint;
export interface PetronellaOptions {
 actors:readonly Dancer[];entry:ReadonlyMap<number,TurnConstraint>;exit:ReadonlyMap<number,TurnConstraint>;
 relations:BoundRelationships;bindingEpoch:number;cyclicIds:readonly [number,number,number,number];
 beats:4;direction:'right';amount:.25;spinDirection:'right';spinAmount:.75;clap:'none';
 /** Spatial ring exit is unchanged; a following star does not rejoin ring hands. */
 exitHands:'ring'|'released';
 minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;
}
export interface PetronellaPose extends TurnConstraint {id:number;}
export interface PetronellaFrame {beat:number;poses:PetronellaPose[];contacts:HandContact[];}
const rotate=(v:Vec2,angle:number)=>({x:v.x*Math.cos(angle)-v.z*Math.sin(angle),z:v.x*Math.sin(angle)+v.z*Math.cos(angle)});
export function compilePetronella(options:PetronellaOptions){
 const exitHands=options.exitHands;
 if(exitHands!=='ring'&&exitHands!=='released')throw new Error('Petronella requires an explicit ring or released hand exit.');
 const {actors,ids}=ownActors(options.actors,4),relations=ownRelations(options.relations,options.bindingEpoch,actors),entry=ownConstraints(options.entry,ids),exit=ownConstraints(options.exit,ids),cycle=Object.freeze([...options.cyclicIds]) as readonly [number,number,number,number];
 if(options.beats!==4||options.direction!=='right'||options.amount!==.25||options.spinDirection!=='right'||options.spinAmount!==.75||options.clap!=='none')throw new Error('Petronella requires four counts, one station right, a clockwise three-quarter body turn, and an explicit no-clap choice.');
 // This also checks ring order, inward headings, reciprocal named hand edges,
 // stationary derivatives, physical hand reach, and the actor/epoch binding.
 const ring=compileRingBalance({actors,entry,exit:entry,relations,bindingEpoch:options.bindingEpoch,cyclicIds:cycle,beats:4,hands:'both',exitMode:'same-ring'});
 const center={x:ids.reduce((s,id)=>s+entry.get(id)!.position.x,0)/4,z:ids.reduce((s,id)=>s+entry.get(id)!.position.z,0)/4};
 for(let i=0;i<4;i++){
  const a=entry.get(cycle[i])!,target=entry.get(cycle[(i+3)%4])!,v=rotate({x:a.position.x-center.x,z:a.position.z-center.z},-Math.PI/2),e=exit.get(cycle[i])!;
  if(distance({x:center.x+v.x,z:center.z+v.z},target.position)>1e-7)throw new Error('This quarter-turn petronella requires four equally spaced square-ring stations.');
  if(distance(e.position,target.position)>1e-7||Math.abs(turn(e.yaw,a.yaw-3*Math.PI/2))>1e-7)throw new Error('The petronella exit must be the named right-hand station, facing inward after a clockwise three-quarter spin.');
 }
 const root=(id:number,beat:number):PetronellaPose=>{
  const a=entry.get(id);if(!a)throw new Error('Actor is outside this bound petronella ring.');
  const q=progress(beat/4),v=rotate({x:a.position.x-center.x,z:a.position.z-center.z},-Math.PI/2*q);
  return{id,position:{x:center.x+v.x,z:center.z+v.z},yaw:a.yaw-3*Math.PI/2*q,velocity:{x:0,z:0},yawRate:0};
 };
 const contacts=(beat:number,poses:readonly Pick<Pose,'id'|'position'|'yaw'>[]):HandContact[]=>{
  // Release while the C2 path starts, dance the turn with free hands, and
  // reacquire the same named ring edges only after the inward stance returns.
  const strength=beat<.3?1-smooth(beat/.3):beat>3.7&&exitHands==='ring'?smooth((beat-3.7)/.3):0;
  if(strength<=.001)return[];
  return ring.contacts(0,poses as Pose[]).map(h=>({...h,strength}));
 };
 const sample=(time:number):PetronellaFrame=>{
  const beat=sampleTime(time),h=1e-5,lo=Math.max(0,beat-h),hi=Math.min(4,beat+h),poses=ids.map(id=>{const p=root(id,beat),a=root(id,lo),b=root(id,hi);return{...p,velocity:{x:(b.position.x-a.position.x)/(hi-lo),z:(b.position.z-a.position.z)/(hi-lo)},yawRate:(b.yaw-a.yaw)/(hi-lo)};});
  return{beat,poses,contacts:contacts(beat,poses)};
 };
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let i=0;i<=400;i++){const f=sample(i/100);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(p.velocity,{x:0,z:0}));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}
 const minimum=options.minimumClearance??.7,maximum=options.maximumSpeed??.6,maxYaw=options.maximumYawRate??1.5;
 if(![minimum,maximum,maxYaw].every(v=>Number.isFinite(v)&&v>0))throw new Error('Petronella physical budgets must be finite and positive.');
 if(minimumObservedClearance<minimum-1e-7||maximumObservedSpeed>maximum+1e-7||maximumObservedYawRate>maxYaw+1e-7)throw new Error(`Petronella exceeds physical budgets: clearance ${minimumObservedClearance}, speed ${maximumObservedSpeed}, yaw rate ${maximumObservedYawRate}.`);
 return Object.freeze({beats:4 as const,exitHands,epoch:relations.epoch,cyclicIds:cycle,entry:immutableMap(entry),exit:immutableMap(exit),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>root(id,sampleTime(t*4)).position,facing:(id:number,t:number)=>root(id,sampleTime(t*4)).yaw,contacts:(t:number,poses?:readonly Pose[])=>contacts(sampleTime(t*4),poses??ids.map(id=>root(id,sampleTime(t*4))))});
}
