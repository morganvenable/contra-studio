/** A retained full partner frame continues for fourteen counts, with the same
 * reach-aware release used by the released fourteen-count swing contract. */
import {compilePrimitiveFigure} from './engine.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,advanceSequenceBeat,type SequenceBoundary} from './sequence-boundary.ts';
import type {Figure} from './types.ts';import type {FigureContext,MotionPlan} from './extended-figures.ts';
const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
export function acceptsPreparedFourteenSwing(f:Figure,c:FigureContext,b:SequenceBoundary){
 if(f.kind!=='swing'||f.who!=='partner'||f.beats!==14||c.next?.kind!=='circle'||b.heldContacts.length!==6||b.heldContacts.some(h=>h.kind!=='swing-frame'||h.strength<1-1e-7))return false;
 const partner=new Map(b.partner),center={x:b.poses.reduce((s,p)=>s+p.position.x,0)/4,z:b.poses.reduce((s,p)=>s+p.position.z,0)/4};return b.poses.length===4&&b.poses.every(p=>{const q=b.poses.find(q=>q.id===partner.get(p.id));return q&&Math.abs(p.position.x-q.position.x)<1e-7&&Math.abs(Math.abs(p.position.x-center.x)-.9)<1e-7&&Math.abs(Math.abs(p.position.z-center.z)-.31)<1e-7;});
}
export function compilePreparedFourteenSwing(input:Figure,context:FigureContext,incoming:SequenceBoundary){
 const f=capturePlainData(input),b=ownSequenceBoundary(incoming);if(!acceptsPreparedFourteenSwing(f,context,b)||Object.keys(f).some(k=>!['id','label','kind','beats','who','confidence','progression'].includes(k))||f.progression||typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw Error('Prepared fourteen-count partner swing requires its actual full frame and reached standard sideline centers.');
 assertSequenceHandoff(b,captureSequenceBoundary(context,b.sourceBeat,b.heldContacts));
 const owned=structuredClone({start:context.start,dancers:context.dancers,ids:context.ids}),base=compilePrimitiveFigure(f,owned.ids,owned.start,owned.dancers,[],{swingEntry:'prepared-circle',geometry:{halfWidth:.9,rowGap:1.8}});
 const plan:MotionPlan={...base,contacts(t,poses){return base.contacts(t,poses).map(h=>{const reach=(id:number,hand:string)=>{const p=poses[id],s=hand==='left'?1:-1;return Math.hypot(h.point.x-p.position.x-s*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+s*.235*Math.sin(p.yaw));};return{...h,strength:h.strength*smooth((.64-Math.max(reach(h.a,h.handA),!h.target||h.target==='hands'?reach(h.b,h.handB):0))/.014)};}).filter(h=>h.strength>1e-9);}};
 const entryState=sampleSequenceBoundary(context,plan,b.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(b.sourceBeat,14),1);assertSequenceHandoff(b,entryState);return Object.freeze({...plan,entryState,exitState});
}
