/** A named balance opens measured compact sideline centers within its four
 * counts. Incoming ring hands release before the named two-hand acquisition;
 * the following swing consumes the physically reached ordinary closed frame. */
import {compilePrimitiveFigure} from './engine.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Figure,Pose} from './types.ts';
const EPS=1e-7,smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
export function needsCompactPairBalance(f:Figure,c:FigureContext,b:SequenceBoundary):boolean{
 if(f.kind!=='balance'||f.beats!==4||!['partner','neighbor'].includes(f.who??'')||f.hands!==undefined||f.progression||c.next?.kind!=='swing'||c.next.who!==f.who||c.next.beats<8||c.next.entry!==undefined||c.next.exit!==undefined||b.poses.length!==4)return false;
 const pairs=new Map(f.who==='partner'?b.partner:b.neighbor),poses=new Map(b.poses.map(p=>[p.id,p])),cx=b.poses.reduce((n,p)=>n+p.position.x/4,0),cz=b.poses.reduce((n,p)=>n+p.position.z/4,0);
 return b.poses.every(p=>{const q=poses.get(pairs.get(p.id)!);return q&&Math.abs(Math.abs(p.position.x-cx)-.55)<EPS&&Math.abs(Math.abs(p.position.z-cz)-.55)<EPS&&Math.abs(p.position.x-q.position.x)<EPS&&Math.abs(p.position.z-q.position.z)>1.1-EPS;});
}
export function compileCompactPairBalanceStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan&{ownsEntryFacing:true}{
 const f=capturePlainData(input),boundary=ownSequenceBoundary(incoming);assertFigureArgumentsConsumed(f);
 context={...context,ids:[...context.ids],start:structuredClone(context.start),dancers:structuredClone(context.dancers),next:context.next?structuredClone(context.next):undefined,relations:{epoch:context.relations.epoch,partner:new Map(context.relations.partner),neighbor:new Map(context.relations.neighbor)}};
 if(!needsCompactPairBalance(f,context,boundary)||f.confidence==='unsupported'||Object.keys(f).some(k=>!['id','label','kind','who','beats','notes','confidence','progression'].includes(k)))throw Error('Compact paired balance needs four counts, measured 1.10-square sideline pairs and the same named following swing.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,boundary.heldContacts));
 const start=new Map(boundary.poses.map(p=>[p.id,p])),cx=boundary.poses.reduce((n,p)=>n+p.position.x/4,0);
 if(boundary.heldContacts.some(h=>h.kind!=='joined'||h.target!==undefined&&h.target!=='hands'))throw Error('Compact balance can release only actual joined ring hands.');
 if(boundary.heldContacts.length&&(boundary.heldContacts.length!==4||boundary.poses.some(p=>boundary.heldContacts.filter(h=>h.a===p.id||h.b===p.id).length!==2)||boundary.heldContacts.some(h=>{const a=start.get(h.a)!.position,b=start.get(h.b)!.position;return Math.abs(Math.hypot(a.x-b.x,a.z-b.z)-1.1)>EPS||h.handA===h.handB;})))throw Error('Compact balance requires a complete adjacent four-hand ring or released hands.');
 // The ordinary transfer remembers its initial two-hand orientation. Supply
 // that internal paired orientation; the actual incoming ring yaw is retained
 // separately and turns continuously during the first source count below.
 const pairs=new Map(f.who==='partner'?boundary.partner:boundary.neighbor),pairedStart=structuredClone(context.start);
 for(const id of context.ids){const a=pairedStart[id].position,b=pairedStart[pairs.get(id)!].position;pairedStart[id].yaw=Math.atan2(b.x-a.x,b.z-a.z);}
 const base=compilePrimitiveFigure(f,context.ids,pairedStart,context.dancers,context.dancers.filter(d=>d.role==='lark').map(d=>d.direction),{balanceExit:'same-person-swing'});
 const time=(t:number)=>{if(!Number.isFinite(t))throw Error('Compact paired balance time must be finite.');return Math.max(0,Math.min(1,t));};
 const position=(id:number,t:number)=>{if(!start.has(id))throw Error('Actor outside compact balance.');t=time(t);const p=base.position(id,t);return{x:p.x+Math.sign(start.get(id)!.position.x-cx)*.35*smooth(t),z:p.z};};
 const facing=(id:number,t:number,poses:Pose[])=>{if(!start.has(id))throw Error('Actor outside compact balance.');t=time(t);return base.facing(id,t,poses)+wrap(start.get(id)!.yaw-base.facing(id,0,poses))*(1-smooth(t*4));};
 const plan={...base,ownsEntryFacing:true as const,position,facing,contacts(t:number,poses:Pose[]){
  t=time(t);const release=1-smooth(t*8),acquire=smooth((t*4-.5)/.5),offset=(id:number)=>Math.sign(start.get(id)!.position.x-cx)*.35*smooth(t);
  const old=boundary.heldContacts.map(h=>{const a=position(h.a,t),b=position(h.b,t),A=start.get(h.a)!.position,B=start.get(h.b)!.position;return{...h,point:{...h.point,x:h.point.x+(a.x-A.x+b.x-B.x)/2,z:h.point.z+(a.z-A.z+b.z-B.z)/2},strength:h.strength*release};});
  // Evaluate the ordinary paired transfer in its untranslated local frame,
  // including its remembered two-hand offer, then move every target with the
  // actual pair center. Its internal remembered points must not stay behind.
  const local=poses.map(p=>start.has(p.id)?{...p,position:{...p.position,x:p.position.x-offset(p.id)}}:p);
  const acquired=base.contacts(t,local).map(h=>{
   const point={...h.point,x:h.point.x+offset(h.a)};
   const owners:readonly (readonly[number,'left'|'right'])[]=h.target&&h.target!=='hands'?[[h.a,h.handA]]:[[h.a,h.handA],[h.b,h.handB]];
   const reach=Math.max(...owners.map(([id,hand])=>{const p=poses[id],side=hand==='left'?1:-1;return Math.hypot(point.x-p.position.x-side*.235*Math.cos(p.yaw),point.y-1.355,point.z-p.position.z+side*.235*Math.sin(p.yaw));}));
   // Gate new two-hand acquisition while facing changes. The later closed-frame transfer retains the existing swing contact contract.
   return{...h,point,strength:h.strength*acquire*(t<.8125?smooth((.68-reach)/.06):1)};
  });
  return[...old,...acquired].filter(h=>h.strength>0);
 }};
 const entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0);assertSequenceHandoff(boundary,entryState);
 const exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(boundary.sourceBeat,4),1);
 return Object.freeze({...plan,entryState,exitState});
}



