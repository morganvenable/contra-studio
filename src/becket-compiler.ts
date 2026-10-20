import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
/** Experimental section compiler: timed topology changes precede relation-bound figures.
 * This is not a registration of Butter or an arbitrary Becket dance in the live app.
 */
import type {Dancer,Figure,Frame,Pose,HandContact} from './types.ts';
import {compilePrimitiveFigure,createDancers,smooth,figureContinuity,makeBalanceCue} from './engine.ts';
import {compileBecketShift,becketPoses,type BecketState,type BecketPose,type BecketShiftPlan} from './becket.ts';
import {compileChainFigure,type BoundRelationships} from './chain.ts';
import {parseHeyNotation,compileBasicPassEvents} from './hey.ts';
import {compileIntegratedHey} from './hey-transition.ts';
export interface ShiftFigure {id:string;kind:'becket-shift';beats:number;label:string;direction:'left';}
export interface HeyFigure {id:string;kind:'hey';beats:number;label:string;notation:string;entry:'side-couples';exit:'same-slots-partner-balance';}
export interface SectionSpec {figures:Array<ShiftFigure|HeyFigure|Figure>;roundBeats:number;}
export interface CompiledSection {totalBeats:number;dancers:Dancer[];shift:BecketShiftPlan;sample(beat:number):Frame;end:Pose[];bindingEpoch:number;passGates:Array<{beat:number;groupId:string;epoch:number;pairs:[number,number][];shoulder:"left"|"right"}>;}
const toPose=(p:BecketPose):Pose=>({id:p.id,position:{...p.position},yaw:p.yaw,stride:p.activity==='ready'?0:.5,lean:0,bounce:0,turn:0,activity:p.activity==='shift'?'becket-shift':'waiting'});
const copy=(p:Pose)=>({...p,position:{...p.position}});
const angleMix=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
function reachable(contacts:HandContact[],poses:Pose[],retainTiny=false):HandContact[]{return contacts.map(c=>{if(retainTiny)return c;const reach=(id:number,hand:'left'|'right')=>{const p=poses[id],side=hand==='left'?1:-1;return Math.hypot(c.point.x-p.position.x-side*.235*Math.cos(p.yaw),c.point.y-1.355,c.point.z-p.position.z+side*.235*Math.sin(p.yaw));};const distance=Math.max(reach(c.a,c.handA),c.target&&c.target!=='hands'?0:reach(c.b,c.handB));return{...c,strength:c.strength*smooth((.68-distance)/(c.kind==='swing-frame'?.035:.06))};}).filter(c=>c.strength>(retainTiny?0:.01));}
export function compileBecketSection(state:BecketState,spec:SectionSpec):CompiledSection{
 if(Math.abs(state.rowGap-1.8)>1e-9||Math.abs(state.halfWidth-.9)>1e-9)throw new Error('The articulated figure adapters currently require the reviewed 1.8-unit formation spacing.');
 if(!Number.isFinite(spec.roundBeats)||spec.roundBeats<=0||spec.roundBeats>256||!Array.isArray(spec.figures)||!spec.figures.length||spec.figures.length>64||spec.figures.some(f=>!Number.isFinite(f.beats)||f.beats<=0||f.beats>64))throw new Error('Every figure needs finite positive timing within a bounded section.');
 for(const raw of spec.figures){const f=raw as Figure;assertFigureArgumentsConsumed(f);if(f.hands!==undefined||f.underRole!==undefined)throw new Error('This section adapter does not consume handed-balance or under-role modifiers.');}
 const first=spec.figures[0];if(first?.kind!=='becket-shift'||first.direction!=='left')throw new Error('This section compiler requires an explicit opening left shift.');
 if(spec.figures.slice(1).some(f=>f.kind==='becket-shift'))throw new Error('Additional mid-section shifts need another reviewed topology event.');
 const totalBeats=spec.figures.reduce((n,f)=>n+f.beats,0);if(totalBeats>spec.roundBeats)throw new Error('The section exceeds its declared round.');
 const dancers=createDancers(state.couples.length),shift=compileBecketShift(state,{shiftBeats:first.beats,roundBeats:spec.roundBeats}),directions=state.couples.map(c=>c.side==='east'?1:-1);
 const partner=new Map<number,number>(),neighbor=new Map<number,number>();for(const c of state.couples){partner.set(c.larkId,c.robinId);partner.set(c.robinId,c.larkId);}for(const g of shift.afterShift.groups){const[a,b,c,d]=g.dancers;for(const[x,y]of[[a,d],[b,c]]){neighbor.set(x,y);neighbor.set(y,x);}}
 const sampleShift=(beat:number)=>{const poses=shift.sample(beat),before=shift.sample(Math.max(0,beat-.001)),after=shift.sample(Math.min(spec.roundBeats,beat+.001));return poses.map(p=>({...toPose(p),stride:Math.min(1,Math.hypot(after[p.id].position.x-before[p.id].position.x,after[p.id].position.z-before[p.id].position.z)/.002*2.5)}));};
 const passGates:CompiledSection["passGates"]=[];
 const relations:BoundRelationships={epoch:shift.afterShift.epoch,partner,neighbor};
 const segments:Array<{start:number;beats:number;sample:(t:number)=>{poses:Pose[];contacts:HandContact[]}}>=[{start:0,beats:first.beats,sample:t=>({poses:sampleShift(t*first.beats),contacts:[]})}];
 let current=sampleShift(first.beats),start=first.beats;
 for(const [relativeIndex,raw] of spec.figures.slice(1).entries()){if(raw.kind==='becket-shift')throw new Error('Unsupported repeated shift.');const f={...raw,progression:false},continuity=figureContinuity(spec.figures as Figure[],relativeIndex+1),source=current.map(copy),segmentStart=start;
   const plans=shift.afterShift.groups.map(g=>{
     if(f.kind==='hey'){
       if(typeof f.notation!=='string'||f.entry!=='side-couples'||f.exit!=='same-slots-partner-balance')throw new Error('A hey needs explicit reviewed entry and exit constraints.');
       const syntax=parseHeyNotation(f.notation);if(syntax.beats!==f.beats)throw new Error('Hey source count and figure duration disagree.');
       const ids=[...g.dancers],center={x:ids.reduce((n,id)=>n+source[id].position.x,0)/4,z:ids.reduce((n,id)=>n+source[id].position.z,0)/4};
       const side=(id:number)=>Math.sign(source[id].position.x-center.x),west=ids.filter(id=>side(id)<0),east=ids.filter(id=>side(id)>0);
       if(west.length!==2||east.length!==2||west.some(id=>dancers[id].couple!==dancers[west[0]].couple)||east.some(id=>dancers[id].couple!==dancers[east[0]].couple))throw new Error('This hey entry requires partners together on each sideline.');
       const role=(xs:number[],r:'lark'|'robin')=>xs.find(id=>dancers[id].role===r)!;
       const entryOrder=[role(west,'lark'),role(west,'robin'),role(east,'robin'),role(east,'lark')].map(String);
       const events=compileBasicPassEvents(syntax,ids.map(id=>({id:String(id),role:dancers[id].role,couple:String(dancers[id].couple)})),entryOrder);
       const entry=ids.map(id=>({id:String(id),position:{...source[id].position},yaw:source[id].yaw}));
       const exit=ids.map(id=>{const p=source[id].position,q=source[partner.get(id)!].position;return{id:String(id),position:{...p},yaw:Math.atan2(q.x-p.x,q.z-p.z)};});
       const trajectory=compileIntegratedHey(events,{entry,exit,entryBeats:2,exitBeats:2,slotSpacing:1.1,passClearance:.66,origin:center,axis:{x:1,z:0}});
       for(const gate of trajectory.gates)passGates.push({beat:segmentStart+gate.beat,groupId:g.id,epoch:shift.afterShift.epoch,pairs:gate.pairs.map(([a,b])=>[Number(a),Number(b)]),shoulder:gate.shoulder});
       return{position:(id:number,t:number)=>trajectory.sample(t*f.beats).poses.find(p=>p.id===String(id))!.position,facing:(id:number,t:number)=>trajectory.sample(t*f.beats).poses.find(p=>p.id===String(id))!.yaw,contacts:()=>[]};
     }
     if(f.kind==='robins-chain'||f.kind==='ladies-chain')return compileChainFigure(f,{ids:g.dancers,start:source,dancers,relations,bindingEpoch:shift.afterShift.epoch});
     return compilePrimitiveFigure(f as Figure,[...g.dancers],source,dancers,directions,continuity);
   });
   // Check each local figure in normalized time. A tiny duration must not
   // escape validation merely because a global beat sampler skipped over it.
   for(let gi=0;gi<plans.length;gi++){
     const plan=plans[gi],ids=shift.afterShift.groups[gi].dancers,steps=128;
     let previous=ids.map(id=>plan.position(id,0));
     for(let step=1;step<=steps;step++){
       const next=ids.map(id=>plan.position(id,step/steps));
       if(next.some((p,i)=>!Number.isFinite(p.x)||!Number.isFinite(p.z)||Math.hypot(p.x-previous[i].x,p.z-previous[i].z)*steps/f.beats>1.8))throw new Error(`${f.label}: the root path exceeds this adapter's 1.8-unit-per-beat speed limit.`);
       previous=next;
     }
   }
   const sample=(t:number)=>{const poses=source.map(copy);for(let i=0;i<shift.afterShift.groups.length;i++){const plan=plans[i];for(const id of shift.afterShift.groups[i].dancers){const p=plan.position(id,t),a=plan.position(id,Math.max(0,t-.001)),b=plan.position(id,Math.min(1,t+.001)),stride=Math.min(1,Math.hypot(b.x-a.x,b.z-a.z)/(.002*f.beats)*2.5);let yaw=plan.facing(id,t,poses as never);if(t<.12&&f.kind!=='hey'&&!continuity.swingEntry)yaw=angleMix(source[id].yaw,yaw,smooth(t/.12));poses[id]={id,position:p,yaw,stride,lean:0,bounce:0,turn:f.kind==='swing'?1:0,activity:f.kind,chainCourtesyPreparation:'chainCourtesyPreparation' in plan?plan.chainCourtesyPreparation?.(id,t):undefined,balance:makeBalanceCue(f as Figure,id,shift.afterShift.groups[i].dancers,dancers,t)};}}
     const waiting=sampleShift(segmentStart+t*f.beats);for(const couple of shift.waitingCouples)for(const id of[couple*2,couple*2+1])poses[id]=waiting[id];
     return{poses,contacts:reachable(plans.flatMap(plan=>plan.contacts(t,poses)),poses,['robins-chain','ladies-chain'].includes(f.kind))};
   };
   segments.push({start,beats:f.beats,sample});current=sample(1).poses;start+=f.beats;
 }
 if(totalBeats===spec.roundBeats){const expected=becketPoses(shift.nextRound);for(const p of current){const q=expected[p.id],turn=Math.atan2(Math.sin(p.yaw-q.yaw),Math.cos(p.yaw-q.yaw));if(Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)>.05||Math.abs(turn)>.1)throw new Error('This sequence does not close to its actual progressed Becket formation; repeating it would require an invented reset.');}}
 return{totalBeats,dancers,shift,end:current.map(copy),bindingEpoch:shift.afterShift.epoch,passGates,sample(beat:number):Frame{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');beat=Math.max(0,Math.min(totalBeats,beat));let i=segments.findLastIndex(s=>s.start<=beat);if(i<0)i=0;const seg=segments[i],t=Math.min(1,(beat-seg.start)/seg.beats),f=seg.sample(t);return{beat,localBeat:beat,figureIndex:i,figureProgress:t,repeat:0,...f,warnings:[totalBeats<spec.roundBeats?'Experimental partial section; the remaining dance is not included.':'Experimental complete Becket sequence; body and source equivalence review required.']};}};
}
