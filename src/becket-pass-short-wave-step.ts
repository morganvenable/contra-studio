import{captureSequenceBoundary}from'./sequence-boundary.ts';import{validateRoryWave}from'./rory-slide.ts';
/** The counted Becket pass reaches the asserted new-neighbor short wave.
 * Neighbor rebinding is a transaction at the reached endpoint, not a pose reset. */
import{compileBecketCirclePassStep,type BecketCirclePassOptions}from'./becket-circle-pass-step.ts';
import{ownBecketSliceBoundary,captureBecketSliceBoundary,type BecketSliceBoundary}from'./becket-slice-step.ts';
import{rebindAtEndpoint,type FiniteBecketState}from'./progression-topology.ts';
import{capturePlainData}from'./owned-program-cache.ts';
import type{Figure,HandContact,Pose}from'./types.ts';
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const smooth=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
export function compileBecketPassShortWaveStep(circle:Figure,input:Figure,incoming:BecketSliceBoundary,state:FiniteBecketState,options:BecketCirclePassOptions){
 const pass=capturePlainData(input),b=ownBecketSliceBoundary(incoming);
 if(pass.exit!=='short-wave'||pass.centerRole!=='robin'||pass.centerHand!=='left'||pass.sideHand!=='right'||pass.sideRelation!=='neighbor')throw Error('Pass-to-wave needs an explicit reached short-wave exit.');
 const{centerRole,centerHand,sideHand,sideRelation,...localPass}=pass;const base=compileBecketCirclePassStep(circle,{...localPass,exit:'progressed-neighbors'},b,state,options),start=b.sourceBeat,end=start+8,canonical=base.sample(end).poses,targets=structuredClone(canonical),groups=base.endBinding.groups;
 for(const g of groups){const z=g.actors.reduce((s,id)=>s+canonical[id].position.z,0)/4;for(const id of g.actors){const sign=Math.sign(canonical[id].position.x-base.origin.x);targets[id].position={x:base.origin.x+sign*(b.actors[id].role==='lark'?1.5:.5),z};}}
 const sample=(beat:number)=>{const f=base.sample(beat),u=smooth((beat-start-6)/2);for(const g of groups)for(const id of g.actors){f.poses[id].position.x+=(targets[id].position.x-canonical[id].position.x)*u;f.poses[id].position.z+=(targets[id].position.z-canonical[id].position.z)*u;}
  const contacts:HandContact[]=[...f.contacts],strength=smooth((beat-end+.25)/.25);if(strength)for(const g of groups){const order=[...g.actors].sort((a,q)=>targets[a].position.x-targets[q].position.x);for(let i=0;i<3;i++){const a=order[i],q=order[i+1],hand=i===1?'left':'right',A=f.poses[a],B=f.poses[q];contacts.push({a,b:q,handA:hand,handB:hand,kind:'joined',strength,point:{x:(A.position.x+B.position.x)/2,y:1.28,z:(A.position.z+B.position.z)/2}});}}
  return{poses:f.poses,contacts};};
 const endpoint=sample(end),dancers=b.actors.map(a=>({...a,name:String(a.id),direction:1 as const,color:''})),endBinding=rebindAtEndpoint(dancers,state.binding,base.change,endpoint.poses,targets),exitState=freeze({...captureBecketSliceBoundary(dancers,endpoint.poses,endBinding,end,[]),heldContacts:structuredClone(endpoint.contacts)});
 const exitStates=freeze(groups.map(g=>{const held=endpoint.contacts.filter(h=>g.actors.includes(h.a)),order=[...g.actors].sort((a,q)=>targets[a].position.x-targets[q].position.x);validateRoryWave({lines:[{order,axis:{x:1,z:0}}],hands:held.map(({a,b,handA,handB})=>({a,b,handA,handB}))},new Map(g.actors.map(id=>[id,{position:endpoint.poses[id].position,yaw:endpoint.poses[id].yaw,velocity:{x:0,z:0},yawRate:0}])),g.actors,'short-wave');return captureSequenceBoundary({ids:[...g.actors],start:endpoint.poses,dancers,bindingEpoch:endBinding.epoch,relations:endBinding.relations},end,held);}));
 for(const[a,q]of b.neighbor.filter(([a,q])=>a<q)){let lo=start+6,hi=end;const first=sample(lo).poses,d0=first[a].position.z-first[q].position.z;for(let n=0;n<48;n++){const mid=(lo+hi)/2,p=sample(mid).poses;if((p[a].position.z-p[q].position.z)*d0>0)lo=mid;else hi=mid;}const p=sample((lo+hi)/2).poses,right={x:-Math.cos(first[a].yaw),z:Math.sin(first[a].yaw)};if(Math.abs(p[a].position.z-p[q].position.z)>1e-6||(p[q].position.x-p[a].position.x)*right.x+(p[q].position.z-p[a].position.z)*right.z<.65)throw Error('New short-wave approach must preserve the actual current-neighbor right-shoulder crossing gate.');}
 return Object.freeze({...base,sample,endBinding,exitState,exitStates,expected:freeze(structuredClone(targets))});
}
