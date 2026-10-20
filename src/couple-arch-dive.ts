/** Isolated four-count motion probe, not a registered figure or source admission.
 * Source: https://contradb.com/programs/488 links Everybody Dance to /dances/2299
 * and specifies four counts, twos arch / ones dive, then progression.
 * Width, release timing and duck height below are modeling choices, not source text.
 */
import {ownSequenceBoundary,advanceSequenceBeat,type SequenceBoundary} from './sequence-boundary.ts';
import type {HandContact} from './types.ts';
export interface CoupleArchDiveOptions {
 boundary:SequenceBoundary;
 /** Current directed ranks supplied by the formation owner, never persistent ID parity. */
 slots:readonly {couple:number;rank:number;direction:1|-1}[];
 beats:4;
}
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
/** Basic renderer shoulder convention, without body lean or anatomical clearance. */
const handReach=(state:SequenceBoundary)=>{
 let maximum=0;
 for(const c of state.heldContacts)for(const [id,hand] of [[c.a,c.handA],[c.b,c.handB]] as const){
  const p=state.poses.find(p=>p.id===id)!,side=hand==='left'?.235:-.235;
  maximum=Math.max(maximum,Math.hypot(c.point.x-p.position.x-side*Math.cos(p.yaw),c.point.z-p.position.z+side*Math.sin(p.yaw),c.point.y-1.355));
 }
 return maximum;
};
export function compileCoupleArchDive(options:CoupleArchDiveOptions){
 if(!options||Object.keys(options).some(k=>!['boundary','slots','beats'].includes(k))||options.beats!==4)throw new Error('Couple arch/dive requires exactly four counts and consumed options.');
 if(!Array.isArray(options.slots)||options.slots.some(s=>!s||typeof s!=='object'||Array.isArray(s)))throw new Error('Supply both current directed couple ranks.');
 const entryState=ownSequenceBoundary(options.boundary),slots=[...structuredClone(options.slots)];
 if(handReach(entryState)>.64)throw new Error('Incoming ring hands exceed the basic shoulder-to-hand reach budget.');
 const couples=[...new Set(entryState.actors.map(a=>a.couple))];
 if(!Array.isArray(slots)||slots.length!==2||new Set(slots.map(s=>s.couple)).size!==2||slots.some(s=>Object.keys(s).some(k=>!['couple','rank','direction'].includes(k))||!couples.includes(s.couple)||!Number.isSafeInteger(s.rank)||s.rank<0||![1,-1].includes(s.direction)))throw new Error('Supply both current directed couple ranks.');
 slots.sort((a,b)=>a.rank-b.rank);
 if(slots[1].rank!==slots[0].rank+1||slots[0].direction!==1||slots[1].direction!==-1)throw new Error('Arch/dive requires adjacent active ones/twos directed ranks.');
 const ones=slots[0].couple,twos=slots[1].couple;
 const center={x:entryState.poses.reduce((s,p)=>s+p.position.x,0)/4,z:entryState.poses.reduce((s,p)=>s+p.position.z,0)/4};
 const actors=new Map(entryState.actors.map(a=>[a.id,a]));
 const pose=new Map(entryState.poses.map(p=>[p.id,p]));
 for(const p of entryState.poses){const a=actors.get(p.id)!;if(Math.abs(Math.abs(p.position.x-center.x)-.55)>1e-7||Math.abs(p.position.z-center.z-(a.couple===ones?-.55:.55))>1e-7||Math.abs(turn(p.yaw,Math.atan2(center.x-p.position.x,center.z-p.position.z)))>1e-7)throw new Error('Require actual compact inward-facing ring, ones above twos.');}
 if(new Set(entryState.poses.map(p=>`${p.position.x},${p.position.z}`)).size!==4)throw new Error('Ring roots must occupy distinct corners.');
 const partners=new Map(entryState.partner),neighbors=new Map(entryState.neighbor);
 if(entryState.heldContacts.length!==4||entryState.heldContacts.some(c=>c.kind!=='joined'||c.target!==undefined&&c.target!=='hands'||c.strength!==1||!(partners.get(c.a)===c.b||neighbors.get(c.a)===c.b)))throw new Error('Require four actual full-strength ring hand holds.');
 for(const id of actors.keys()){const edges=entryState.heldContacts.filter(c=>c.a===id||c.b===id);if(edges.length!==2||!edges.some(c=>(c.a===id?c.b:c.a)===partners.get(id))||!edges.some(c=>(c.a===id?c.b:c.a)===neighbors.get(id)))throw new Error('Ring holds must retain partner and current neighbor edges.');}
 for(const c of entryState.heldContacts){const a=pose.get(c.a)!,b=pose.get(c.b)!;if(c.bodyPoint!==undefined||c.bodyBlend!==undefined||c.underId!==undefined||Math.hypot(c.point.x-(a.position.x+b.position.x)/2,c.point.z-(a.position.z+b.position.z)/2)>1e-7||Math.abs(c.point.y-1.25)>1e-7)throw new Error('This probe requires midpoint ring hand targets at height 1.25 without body routing.');}
 const sample=(beat:number)=>{
  if(!Number.isFinite(beat))throw new Error('Sample count must be finite.');
  beat=Math.max(0,Math.min(4,beat));if(beat===0)return entryState;
  const u=smooth(beat/4),bulge=Math.sin(Math.PI*u),release=smooth((4-beat)/.8);
  const poses=entryState.poses.map(p=>{const diving=actors.get(p.id)!.couple===ones,side=Math.sign(p.position.x-center.x),width=.55+.30*u+(diving?-.40:.24*(1-u))*bulge;
   return{id:p.id,position:{x:center.x+side*width,z:center.z+(diving?-1:1)*(.55-1.45*u)},yaw:p.yaw+turn(diving?0:Math.PI,p.yaw)*smooth(beat/1.5)};});
  const now=new Map(poses.map(p=>[p.id,p]));
  const heldContacts:HandContact[]=entryState.heldContacts.map(c=>{
   const a=now.get(c.a)!,b=now.get(c.b)!,partner=partners.get(c.a)===c.b,arching=partner&&actors.get(c.a)!.couple===twos;
   const height=arching?.30*Math.sin(Math.PI*beat/4):0;
   return{...c,point:{x:c.point.x+((a.position.x+b.position.x)/2-(pose.get(c.a)!.position.x+pose.get(c.b)!.position.x)/2),z:c.point.z+((a.position.z+b.position.z)/2-(pose.get(c.a)!.position.z+pose.get(c.b)!.position.z)/2),y:c.point.y+height},strength:partner?release:1-smooth(beat/.8)};
  }).filter(c=>c.strength>1e-9);
  return ownSequenceBoundary({...entryState,sourceBeat:entryState.sourceBeat+beat,poses,heldContacts});
 };
 const exitState=sample(4);advanceSequenceBeat(entryState.sourceBeat,4);
 let minimumClearance=Infinity,maximumSpeed=0,maximumYawRate=0,maximumHandReach=handReach(entryState);let prior=sample(0);
 for(let i=1;i<=480;i++){const next=sample(i/120);maximumHandReach=Math.max(maximumHandReach,handReach(next));for(let j=0;j<4;j++){const p=next.poses[j],q=prior.poses[j];maximumSpeed=Math.max(maximumSpeed,Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)*120);maximumYawRate=Math.max(maximumYawRate,Math.abs(turn(p.yaw,q.yaw))*120);for(let k=j+1;k<4;k++)minimumClearance=Math.min(minimumClearance,Math.hypot(p.position.x-next.poses[k].position.x,p.position.z-next.poses[k].position.z));}prior=next;}
 if(minimumClearance<.5||maximumSpeed>1.5||maximumYawRate>3.2||maximumHandReach>.64)throw new Error(`Arch/dive motion budget: clearance ${minimumClearance}, speed ${maximumSpeed}, yaw ${maximumYawRate}, hand reach ${maximumHandReach}`);
 return Object.freeze({entryState,exitState,sample,onesCouple:ones,twosCouple:twos,certificate:Object.freeze({minimumClearance,maximumSpeed,maximumYawRate,maximumHandReach}),duck:(id:number,beat:number)=>{if(!actors.has(id)||!Number.isFinite(beat))throw new Error('Duck cue needs a known actor and finite count.');return actors.get(id)!.couple===ones?.22*Math.sin(Math.PI*Math.max(0,Math.min(4,beat))/4):0;}});
}
