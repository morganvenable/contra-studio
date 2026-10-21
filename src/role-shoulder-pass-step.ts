/** Released same-role shoulder passage into the persistent partner swing.
 * The two named actors exchange measured opposite stations; the other roots
 * remain fixed. Body-facing preparation shares the stated passage counts. */
import type {Figure,Vec2} from './types.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import {capturePlainData} from './owned-program-cache.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {advanceSequenceBeat,assertSequenceHandoff,captureSequenceBoundary,ownSequenceBoundary,sampleSequenceBoundary,type SequenceBoundary,type SequencedMotionPlan} from './sequence-boundary.ts';
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const heading=(a:Readonly<Vec2>,b:Readonly<Vec2>)=>Math.atan2(b.x-a.x,b.z-a.z);
const ease=(q:number)=>q*q*q*(10+q*(-15+6*q));
const RAMP=.12;
const time=(t:number)=>{if(!Number.isFinite(t)||t<0||t>1)throw Error('Role passage sample must be within its finite source interval.');return t;};
const paced=(t:number):number=>{if(t<RAMP){const u=t/RAMP;return RAMP*(u*u*u-.5*u*u*u*u)/(1-RAMP);}if(t>1-RAMP)return 1-paced(1-t);return(t-RAMP/2)/(1-RAMP);};
export function compileRoleShoulderPassStep(input:Figure,context:FigureContext,incoming:SequenceBoundary):SequencedMotionPlan{
 const f=capturePlainData(input) as Figure,b=ownSequenceBoundary(incoming);if(!f||typeof f!=='object'||Array.isArray(f))throw Error('Role passage needs an explicit figure.');assertFigureArgumentsConsumed(f);
 if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate'].includes(f.confidence))throw Error('Role passage needs text identity and supported confidence.');
 if(f.kind!=='pass-through'||!['larks','robins'].includes(f.who??'')||![2,4].includes(f.beats)||!['left','right'].includes(f.passingShoulder??'')||f.entry!==undefined||f.exit!==undefined||f.progression||context.next?.kind!=='swing'||context.next.who!=='partner'||context.next.beats<4)throw Error('Role passage requires two or four source counts, an explicit shoulder and role, and the immediate persistent-partner swing.');
 if(b.heldContacts.length)throw Error('The role shoulder passage cannot discard incoming held contacts.');assertSequenceHandoff(b,captureSequenceBoundary(context,b.sourceBeat,[]));
 const poses=new Map(b.poses.map(p=>[p.id,p])),active=b.actors.filter(a=>a.role===(f.who==='larks'?'lark':'robin')).map(a=>a.id),partner=new Map(b.partner);if(active.length!==2)throw Error('The named role must select exactly two actors.');
 const A=poses.get(active[0])!.position,B=poses.get(active[1])!.position,center={x:(A.x+B.x)/2,z:(A.z+B.z)/2},halfSpan=Math.hypot(A.x-B.x,A.z-B.z)/2;
 if(halfSpan<.9||halfSpan>1.6)throw Error('Role passage exceeds its measured pair-span envelope.');
 const exit=new Map(b.poses.map(p=>[p.id,{...p.position}]));exit.set(active[0],{...B});exit.set(active[1],{...A});
 const orbit=new Map(active.map((id,i)=>{const p=poses.get(id)!,q=poses.get(active[1-i])!,yaw=heading(p.position,q.position);return[id,{radial:{x:(p.position.x-center.x)/halfSpan,z:(p.position.z-center.z)/halfSpan},left:{x:Math.cos(yaw),z:-Math.sin(yaw)},yaw:p.yaw+turn(yaw,p.yaw)}];}));
 const finalYaw=new Map(b.poses.map(p=>[p.id,heading(exit.get(p.id)!,exit.get(partner.get(p.id)!)!)]));
 for(const p of b.poses){const o=orbit.get(p.id);if(o&&Math.abs(turn(o.yaw,p.yaw))>Math.PI/4+1e-7)throw Error('Role passage entry facing must be within a quarter diagonal of the crossing.');const delta=turn(finalYaw.get(p.id)!,o?.yaw??p.yaw),rate=o?Math.abs(delta)/(f.beats*.5*(1-RAMP)):Math.abs(delta)*1.875/f.beats;if(rate>3.2)throw Error('Role passage partner-facing preparation exceeds its source-count yaw budget.');}
 const arcSteps=256,step=Math.PI/arcSteps,arc=[0],speed=(a:number)=>Math.hypot(halfSpan*Math.sin(a),.34*Math.cos(a));
 for(let n=1;n<=arcSteps;n++){const a=(n-1)*step,z=n*step;arc.push(arc[n-1]+step*(speed(a)+4*speed((a+z)/2)+speed(z))/6);}
 const arcLength=arc.at(-1)!,angleAt=(t:number)=>{if(t===0)return 0;if(t===1)return Math.PI;const target=paced(t)*arcLength;let lo=0,hi=arcSteps;while(hi-lo>1){const mid=(lo+hi)>>1;if(arc[mid]<target)lo=mid;else hi=mid;}return(lo+(target-arc[lo])/(arc[hi]-arc[lo]))*step;};
 const position=(id:number,t:number):Vec2=>{time(t);const p=poses.get(id);if(!p)throw Error('Actor is outside role passage.');const o=orbit.get(id);if(!o)return{...p.position};if(t===0)return{...p.position};if(t===1)return{...exit.get(id)!};const angle=angleAt(t),side=f.passingShoulder==='left'?-1:1;return{x:center.x+o.radial.x*halfSpan*Math.cos(angle)+side*o.left.x*.34*Math.sin(angle),z:center.z+o.radial.z*halfSpan*Math.cos(angle)+side*o.left.z*.34*Math.sin(angle)};};
 const facing=(id:number,t:number)=>{time(t);const p=poses.get(id);if(!p)throw Error('Actor is outside role passage.');const o=orbit.get(id);if(!o)return p.yaw+turn(finalYaw.get(id)!,p.yaw)*ease(t);if(t<.25)return p.yaw+turn(o.yaw,p.yaw)*ease(t/.25);if(t<=.5)return o.yaw;return o.yaw+turn(finalYaw.get(id)!,o.yaw)*paced((t-.5)*2);};
 // Check all body-root pairs and the explicit shoulder gate without changing
 // any geometry to pass. The conservative per-step speed margin covers gaps.
 const interpolationBound=Math.max(...arc.slice(1).map((end,i)=>Math.max(speed(i*step),speed((i+1)*step))*step/(end-arc[i]))),maximumSpeedBound=arcLength/(f.beats*(1-RAMP))*interpolationBound,sampleCount=512;let minimum=Infinity;
 for(let k=0;k<=sampleCount;k++){const points=b.poses.map(p=>position(p.id,k/sampleCount));for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)minimum=Math.min(minimum,Math.hypot(points[i].x-points[j].x,points[i].z-points[j].z));}
 if(minimum-maximumSpeedBound*f.beats/sampleCount<.6||maximumSpeedBound>2)throw Error('Role passage violates its measured four-body clearance or source-count speed envelope.');
 for(const id of active){const other=active.find(a=>a!==id)!,p=position(id,.5),q=position(other,.5),yaw=facing(id,.5),left=(q.x-p.x)*Math.cos(yaw)-(q.z-p.z)*Math.sin(yaw);if((f.passingShoulder==='left'?left:-left)<.68-1e-7)throw Error('The actual role passage misses its named anatomical shoulder gate.');}
 const plan:MotionPlan={position,facing,contacts:t=>{time(t);return[];}},entryState=sampleSequenceBoundary(context,plan,b.sourceBeat,0),exitState=sampleSequenceBoundary(context,plan,advanceSequenceBeat(b.sourceBeat,f.beats),1);assertSequenceHandoff(b,entryState);return Object.freeze({...plan,entryState,exitState});
}
