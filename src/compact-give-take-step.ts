/** Four source counts: compact approach, named take, and prepared swing turn.
 * This has its own measured envelope; it does not retime the eight-count core. */
import {compilePrimitiveFigure} from './engine.ts';
import {ownSequenceBoundary,captureSequenceBoundary,assertSequenceHandoff,sampleSequenceBoundary,advanceSequenceBeat,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import type {Figure,Pose,HandContact} from './types.ts';
const EPS=1e-7;
const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
export function compileCompactGiveTakeStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan {
 const figure=structuredClone(input),boundary=ownSequenceBoundary(incoming);
 if(Object.keys(figure).some(k=>!['id','label','kind','beats','who','takeRole','phaseBeats','hands','confidence'].includes(k))||figure.kind!=='give-and-take'||figure.beats!==4||!['partner','neighbor'].includes(figure.who??'')||!['lark','robin'].includes(figure.takeRole??'')||figure.hands!=='both'||JSON.stringify(figure.phaseBeats)!=='[1.5,1,1.5]'||figure.confidence==='unsupported'||!figure.id?.trim()||!figure.label?.trim())throw Error('Compact give/take needs four counts, explicit named receiver/taking role, both hands, and 1.5/1/1.5 counted phases.');
 if(context.next?.kind!=='swing'||context.next.who!==figure.who||![8,12].includes(context.next.beats))throw Error('Compact give/take requires the immediate same-person eight- or twelve-count swing.');
 if(boundary.heldContacts.length)throw Error('Compact give/take needs the preceding swing frame actually released.');
 assertSequenceHandoff(boundary,captureSequenceBoundary(context,boundary.sourceBeat,[]));
 const ids=boundary.actors.map(a=>a.id),dancers=structuredClone(context.dancers),start=structuredClone(context.start),relation=new Map(figure.who==='partner'?boundary.partner:boundary.neighbor),otherRelation=new Map(figure.who==='partner'?boundary.neighbor:boundary.partner),center={x:ids.reduce((n,id)=>n+start[id].position.x/4,0),z:ids.reduce((n,id)=>n+start[id].position.z/4,0)},takeRole=figure.takeRole!;
 const pairs=ids.filter(id=>dancers[id].role===takeRole).map(a=>({a,b:relation.get(a)!})),data=new Map<number,{side:number;lane:number;sign:number}>();
 for(const{a,b}of pairs){const A=start[a],B=start[b],side=Math.sign(A.position.x-center.x),lane=A.position.z-center.z;if(!side||Math.abs(Math.abs(A.position.x-center.x)-.64)>EPS||Math.abs(A.position.x+B.position.x-2*center.x)>EPS||Math.abs(A.position.z-B.position.z)>EPS||Math.abs(Math.abs(lane)-.64)>EPS||Math.sign(lane)!==(takeRole==='lark'?side:-side))throw Error('Received pairs must occupy actual opposite compact side stations in the taking role lanes.');for(const[id,sign]of[[a,1],[b,-1]]){if(Math.abs(wrap(start[id].yaw+Math.sign(start[id].position.x-center.x)*Math.PI/2))>EPS)throw Error('Compact give/take must inherit across-facing actors.');data.set(id,{side,lane,sign});}}
 if(pairs.length!==2||data.size!==4||new Set(pairs.map(p=>data.get(p.a)!.side)).size!==2)throw Error('Compact take requires two distinct bound pairs on opposite sides.');
 const sidePairs=[-1,1].map(side=>{const a=ids.find(id=>dancers[id].role==='lark'&&Math.sign(start[id].position.x-center.x)===side)!,b=otherRelation.get(a)!;if(!ids.includes(b)||Math.sign(start[b].position.x-center.x)!==side)throw Error('Approach must preserve the existing opposite-relation side couple.');return{a,b};});
 const time=(t:number)=>{if(!Number.isFinite(t))throw Error('Invalid compact give/take clock.');return Math.max(0,Math.min(1,t))*4;};
 const position=(id:number,t:number)=>{const beat=time(t),d=data.get(id);if(!d)throw Error('Actor is outside the compact take.');const p=start[id].position;if(beat<=1.5){const u=smooth(beat/1.5);return{x:p.x+Math.sign(p.x-center.x)*(.30-.64)*u,z:p.z};}const pull=smooth(beat-1.5),q=smooth((beat-2.5)/1.5),angle=(takeRole==='lark'?1:-1)*Math.PI/2*q,r=.30+.01*q;return{x:center.x+d.side*.64*pull+d.side*d.sign*r*Math.cos(angle),z:center.z+d.lane*(1-q)+d.side*d.sign*r*Math.sin(angle)};};
 const facing=(id:number,t:number)=>{if(!data.has(id))throw Error('Actor is outside the compact take.');const q=smooth((time(t)-2.5)/1.5),turn=(takeRole==='lark'?1:-1)*Math.PI/2;return start[id].yaw+(-turn+Math.PI/3)*q;};
 const terminal=start.map(p=>({...p,position:ids.includes(p.id)?position(p.id,1):{...p.position},yaw:ids.includes(p.id)?facing(p.id,1):p.yaw})),swing=compilePrimitiveFigure(context.next!,ids,terminal,dancers,[],{swingEntry:'prepared-circle',geometry:{halfWidth:.64,rowGap:1.28}});
 const contacts=(t:number,poses:Pose[]):HandContact[]=>{const beat=time(t),inside=smooth(beat/.25)*(1-smooth((beat-1)/.25)),taken=smooth((beat-1.25)/.25)*(1-smooth((beat-3)/.35)),closed=smooth((beat-3.35)/.65),held:HandContact[]=[];
  if(inside)for(const{a,b}of sidePairs){const A=poses[a],B=poses[b];held.push({a,b,handA:'right',handB:'left',kind:'joined',strength:inside,point:{x:(A.position.x+B.position.x)/2+Math.sin(A.yaw)*.15,y:1.16,z:(A.position.z+B.position.z)/2+Math.cos(A.yaw)*.15}});}
  if(taken)for(const{a,b}of pairs){const A=poses[a],B=poses[b],yaw=Math.atan2(B.position.x-A.position.x,B.position.z-A.position.z);for(const hand of['left','right']as const){const s=hand==='left'?1:-1;held.push({a,b,handA:hand,handB:hand==='left'?'right':'left',kind:'joined',strength:taken,point:{x:(A.position.x+B.position.x)/2+s*.22*Math.cos(yaw),y:1.20,z:(A.position.z+B.position.z)/2-s*.22*Math.sin(yaw)}});}}
  if(closed)held.push(...swing.contacts(0,poses).map(h=>({...h,strength:h.strength*closed})));
  return held.map(h=>{const reach=(id:number,hand:string)=>{const p=poses[id],s=hand==='left'?1:-1;return Math.hypot(h.point.x-p.position.x-s*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+s*.235*Math.sin(p.yaw));};return{...h,strength:h.strength*smooth((.64-Math.max(reach(h.a,h.handA),!h.target||h.target==='hands'?reach(h.b,h.handB):0))/.01)};}).filter(h=>h.strength>1e-9);
 };
 const plan:MotionPlan={position,facing,contacts},entryState=sampleSequenceBoundary(context,plan,boundary.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(boundary.sourceBeat,4),1);assertSequenceHandoff(boundary,entryState);
 return Object.freeze({...plan,entryState,exitState});
}
