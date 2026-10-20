/** Eight source beats: four forward, then four back with the directed rollaway
 * inside that return. No extra counts, guessed actor, or topology transaction. */
import type {Dancer,HandContact,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import {compileRollaway} from './rollaway.ts';
import {ownActors,ownConstraints,ownRelations,immutableMap,distance,turn,ease,smooth,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';
export interface LongLinesRollawayPair {rollingId:number;sashayingId:number;relationship:'partner'|'neighbor';}
export interface LongLinesRollawayOptions {
 actors:readonly Dancer[];entry:ReadonlyMap<number,TurnConstraint>;exit:ReadonlyMap<number,TurnConstraint>;
 relations:BoundRelationships;bindingEpoch:number;pairs:readonly LongLinesRollawayPair[];
 direction:'left-to-right'|'right-to-left';halfSashay:true;beats:8;phaseBeats:readonly [4,4];rollPhase:'return';
}
const center=(ps:Vec2[])=>({x:ps.reduce((n,p)=>n+p.x,0)/ps.length,z:ps.reduce((n,p)=>n+p.z,0)/ps.length});
export function compileLongLinesRollaway(options:LongLinesRollawayOptions){
 const{actors,ids,byId}=ownActors(options.actors,4),entry=ownConstraints(options.entry,ids),exit=ownConstraints(options.exit,ids),relations=ownRelations(options.relations,options.bindingEpoch,actors),pairs=options.pairs.map(p=>Object.freeze({...p})),direction=options.direction;
 if(options.beats!==8||options.rollPhase!=='return'||options.halfSashay!==true||options.phaseBeats.length!==2||options.phaseBeats.some(b=>b!==4)||!['left-to-right','right-to-left'].includes(direction))throw new Error('Long-lines rollaway requires exactly four forward and four return beats with a directed half-sashay roll on the return.');
 if(pairs.length!==2||new Set(pairs.flatMap(p=>[p.rollingId,p.sashayingId])).size!==4||pairs.some(p=>!ids.includes(p.rollingId)||!ids.includes(p.sashayingId)||!['partner','neighbor'].includes(p.relationship)||relations[p.relationship].get(p.rollingId)!==p.sashayingId))throw new Error('The two explicit rollaway pairs must partition the current bound group.');
 const origin=center([...entry.values()].map(p=>p.position)),midpoint=new Map<number,TurnConstraint>(),pairById=new Map<number,LongLinesRollawayPair>();
 for(const pair of pairs){const A=entry.get(pair.rollingId)!,B=entry.get(pair.sashayingId)!,c=center([A.position,B.position]),gap=distance(A.position,B.position),forward={x:Math.sin(A.yaw),z:Math.cos(A.yaw)},toward={x:origin.x-c.x,z:origin.z-c.z},depth=Math.hypot(toward.x,toward.z);
  if(Math.abs(gap-1.8)>1e-6||depth<.85||depth>1.05||Math.abs(turn(B.yaw,A.yaw))>1e-7||Math.abs(toward.x*forward.z-toward.z*forward.x)>1e-7||toward.x*forward.x+toward.z*forward.z<depth-1e-7)throw new Error('Long-lines rollaway needs explicit same-facing inward sideline pairs in the reviewed 1.8-unit slots.');
  for(const id of[pair.rollingId,pair.sashayingId]){pairById.set(id,pair);const p=entry.get(id)!,other=entry.get(id===pair.rollingId?pair.sashayingId:pair.rollingId)!;if(distance(exit.get(id)!.position,other.position)>1e-7||Math.abs(turn(exit.get(id)!.yaw,p.yaw))>1e-7)throw new Error('Long-lines rollaway must exchange the named pair’s original slots without changing identity or final facing.');midpoint.set(id,{position:{x:c.x+(p.position.x-c.x)*1.64/gap+forward.x*.40,z:c.z+(p.position.z-c.z)*1.64/gap+forward.z*.40},yaw:p.yaw,velocity:{x:0,z:0},yawRate:0});}
 }
 const paths=pairs.map(p=>compileRollaway({actors:[byId.get(p.rollingId)!,byId.get(p.sashayingId)!],entry:new Map([p.rollingId,p.sashayingId].map(id=>[id,midpoint.get(id)!])),exit:new Map([p.rollingId,p.sashayingId].map(id=>[id,exit.get(id)!])),relations,bindingEpoch:options.bindingEpoch,relationship:p.relationship,rollingId:p.rollingId,sashayingId:p.sashayingId,direction,halfSashay:true,beats:4}));
 const sample=(rawBeat:number)=>{const beat=sampleTime(rawBeat,8);if(beat>=4){const frames=paths.map(p=>p.sample(beat-4));return{beat,poses:frames.flatMap(f=>f.poses).sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id)),contacts:frames.flatMap(f=>f.contacts)};}
  const q=ease(beat/4),dq=30*(beat/4)**2*(1-beat/4)**2/4,poses=ids.map(id=>{const a=entry.get(id)!,b=midpoint.get(id)!,pair=pairById.get(id)!;return{id,position:{x:a.position.x+(b.position.x-a.position.x)*q,z:a.position.z+(b.position.z-a.position.z)*q},yaw:a.yaw,velocity:{x:(b.position.x-a.position.x)*dq,z:(b.position.z-a.position.z)*dq},yawRate:0,rolling:id===pair.rollingId,rollProgress:0};});
  const contacts:HandContact[]=paths.flatMap(path=>{const ids=[path.rollingId,path.sashayingId],ps=ids.map(id=>poses.find(p=>p.id===id)!),hs=[path.initialHands.rolling,path.initialHands.sashaying],ss=ps.map((p,i)=>{const s=hs[i]==='left'?1:-1;return{x:p.position.x+s*.235*Math.cos(p.yaw),z:p.position.z-s*.235*Math.sin(p.yaw)};}),point={...center(ss),y:1.19},reach=Math.max(...ss.map(s=>Math.hypot(distance(s,point),1.355-point.y))),strength=smooth(beat/.75)*smooth((.645-reach)/.035);return strength>.001?[{a:ids[0],b:ids[1],handA:hs[0],handB:hs[1],point,strength,kind:'joined' as const}]:[];});return{beat,poses,contacts};
 };
 let minimumObservedClearance=Infinity;for(let i=0;i<=800;i++){const f=sample(i/100);for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));}if(minimumObservedClearance<.6-1e-7)throw new Error('The opposed long-lines rollaways violate their four-person torso-clearance budget.');
 const actor=(id:number,t:number)=>{if(!ids.includes(id))throw new Error('Actor is outside this long-lines rollaway.');return sample(t*8).poses.find(p=>p.id===id)!;};
 return Object.freeze({beats:8 as const,phaseBeats:Object.freeze([4,4] as const),epoch:relations.epoch,pairs:Object.freeze(pairs),entry:immutableMap(entry),exit:immutableMap(exit),minimumObservedClearance,sample,position:(id:number,t:number)=>actor(id,t).position,facing:(id:number,t:number)=>actor(id,t).yaw,contacts:(t:number)=>sample(t*8).contacts});
}
