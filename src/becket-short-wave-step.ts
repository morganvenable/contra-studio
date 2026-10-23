import{compileAcrossPartnerTurnEntry,compilePartnerQuarterWave}from'./across-partner-wave-step.ts';
import{compileShortWaveHalfTurnSwing}from'./short-wave-half-turn-swing-step.ts';
import{compileRoryFigure,type RoryFigure}from'./rory-wave-adapter.ts';
import{sampleSequenceBoundary,assertSequenceHandoff}from'./sequence-boundary.ts';
import type{compileSequenceStep}from'./sequence-registry.ts';
import type{HandContact,Pose}from'./types.ts';
const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
export function reachableShortWaveContacts(contacts:HandContact[],poses:Pose[]):HandContact[]{return contacts.map(h=>{const reach=(id:number,hand:string)=>{const p=poses[id],s=hand==='left'?1:-1;return Math.hypot(h.point.x-p.position.x-s*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+s*.235*Math.sin(p.yaw));};return{...h,strength:Math.max(0,Math.min(1,h.strength))*smooth((.64-Math.max(reach(h.a,h.handA),!h.target||h.target==='hands'?reach(h.b,h.handB):0))/.01)};}).filter(h=>h.strength>1e-9);}
/** A policy-owned local registry. No source identity or full dance is available. */
export const compileBecketShortWaveStep:typeof compileSequenceStep=(f,c,b,established,cap)=>{
 if(!cap?.stateCarryingAcrossPasses||!cap?.shortWaves||!cap.rorySlides||!cap.stateCarryingSequences)throw Error('Short-wave steps require carried wave and Rory capabilities.');
 let plan,adapterId;
 if(f.kind==='pass-through'){plan=compileAcrossPartnerTurnEntry(f,c,b);adapterId='across-partner-turn-entry';}
 else if(f.kind==='allemande'&&f.who==='partner'){plan=compilePartnerQuarterWave(f,c,b);adapterId='partner-quarter-wave';}
 else if(f.kind==='allemande'){plan=compileShortWaveHalfTurnSwing(f,c,b);adapterId='short-wave-half-turn-swing';}
 else if(f.kind==='balance-rory-slide'){
  if(b.heldContacts.length!==3||b.heldContacts.some(h=>h.kind!=='joined'||h.strength<1-1e-7))throw Error('Rory needs the actual fully held wave.');
  const raw=compileRoryFigure(f as RoryFigure,{...c,wave:{lines:[{order:[...b.poses].sort((a,q)=>a.position.x-q.position.x).map(p=>p.id),axis:{x:1,z:0}}],hands:b.heldContacts.map(({a,b,handA,handB})=>({a,b,handA,handB}))}});
  plan={...raw,entryState:sampleSequenceBoundary(c,raw,b.sourceBeat,0),exitState:sampleSequenceBoundary(c,raw,b.sourceBeat+f.beats,1)};assertSequenceHandoff(b,plan.entryState);adapterId='carried-short-wave-rory';
 }else if(f.kind==='swing'||f.kind==='circle'){
  const raw=established(),key=(h:HandContact)=>[h.a,h.b,h.handA,h.handB,h.kind,h.target??'hands'].join(':'),same=b.heldContacts.length>0&&JSON.stringify(b.heldContacts.map(key).sort())===JSON.stringify(raw.contacts(0,c.start).map(key).sort());
  // Retain the reached ingress frame, release it while the ordinary next hold
  // acquires, and suppress targets beyond an adult arm's reach.
  const wrapped={...raw,facing(id:number,t:number,poses:Pose[]){const target=raw.facing(id,t,poses),u=smooth(t*f.beats/Math.min(1,f.beats*.125));return c.start[id].yaw+Math.atan2(Math.sin(target-c.start[id].yaw),Math.cos(target-c.start[id].yaw))*u;},contacts(t:number,poses:Pose[]){if(same)return reachableShortWaveContacts(raw.contacts(t,poses),poses);const beat=t*f.beats,next=raw.contacts(t,poses).map(h=>({...h,strength:h.strength*smooth((beat-.25)/.25)})),old=b.heldContacts.map(h=>({...h,point:{...h.point},strength:h.strength*(1-smooth(beat/.25))}));return reachableShortWaveContacts([...old,...next],poses);}};
  return{adapterId:'short-wave-established-'+f.kind,plan:wrapped,ownsEntryFacing:true};
 }else throw Error('No short-wave policy adapter consumes this figure.');
 return{adapterId,plan,ownsEntryFacing:true,boundaryPlan:plan};
};
