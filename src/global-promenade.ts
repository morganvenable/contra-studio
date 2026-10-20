/** Identity-bound, same-physical-end oval promenade. This is a global figure
 * contract, not a finite-set progression policy or a no-wait switch. */
import type {Dancer,HandContact,Pose,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import type {ProgressionEvidence} from './progression-topology.ts';
export interface OvalPreparationCue {route:'whole-set-oval';hold:'inside-hand';strength:number;}
export const makeOvalPreparation=(strength:number):OvalPreparationCue=>({route:'whole-set-oval',hold:'inside-hand',strength});
export interface OvalTrack {halfWidth:number;north:number;south:number;}
export interface OvalPair {larkId:number;robinId:number;relationship:'neighbor'|'partner';entryDistance:number;}
export interface GlobalPromenadeOptions {dancers:readonly Dancer[];entry:readonly Pose[];relations:BoundRelationships;bindingEpoch:number;pairs:readonly OvalPair[];track:OvalTrack;phaseBeats:readonly[6,4,6];distance:number;hold:'inside-hand';returnFacing:'active-across-waiting-tangent';returnPreparationBeats:1;evidence:ProgressionEvidence;}
const tau=Math.PI*2,EPS=1e-7,clamp=(x:number)=>Math.max(0,Math.min(1,x)),ease=(x:number)=>{x=clamp(x);return x*x*x*(10+x*(-15+6*x));};
const angle=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const freeze=<T>(x:T):T=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
/** Compact C2 speed ramps, rather than an entire-leg smoothstep speed surge. */
export function promenadeTravel(t:number):number{t=clamp(t);const r=.125,n=1-r;if(t<r){const u=t/r;return r*(u*u*u-.5*u*u*u*u)/n;}if(t>1-r)return 1-promenadeTravel(1-t);return(t-r/2)/n;}
export function ovalLength(track:OvalTrack){return 2*(track.south-track.north)+tau*track.halfWidth;}
/** Clockwise arclength starts on the east sideline at the north cap. It joins
 * only adjacent sideline/cap endpoints. Modulo parameterization is continuous
 * at the *same physical top end*, never a top-to-bottom coordinate teleport. */
export function sampleOval(track:OvalTrack,distance:number):{position:Vec2;yaw:number;end?:'top'|'bottom'}{
 const r=track.halfWidth,h=track.south-track.north,L=ovalLength(track);let s=((distance%L)+L)%L;
 if(s<h)return{position:{x:r,z:track.north+s},yaw:0};s-=h;
 if(s<Math.PI*r){const a=s/r;return{position:{x:r*Math.cos(a),z:track.south+r*Math.sin(a)},yaw:-a,end:'bottom'};}s-=Math.PI*r;
 if(s<h)return{position:{x:-r,z:track.south-s},yaw:-Math.PI};s-=h;
 const a=s/r;return{position:{x:-r*Math.cos(a),z:track.north-r*Math.sin(a)},yaw:-Math.PI-a,end:'top'};
}
export function ovalPairPoses(pair:OvalPair,track:OvalTrack,distance=pair.entryDistance,turn=0):Pose[]{
 const c=sampleOval(track,distance),yaw=c.yaw+turn;
 return[pair.larkId,pair.robinId].map((id,i)=>({id,position:{x:c.position.x+(i===0?1:-1)*.34*Math.cos(yaw),z:c.position.z-(i===0?1:-1)*.34*Math.sin(yaw)},yaw,stride:0,lean:0,bounce:0,turn:0,activity:'promenade'}));
}
export function compileGlobalPromenade(raw:GlobalPromenadeOptions){
 const o=freeze(structuredClone({...raw,relations:undefined})),relations={epoch:raw.relations.epoch,partner:new Map(raw.relations.partner),neighbor:new Map(raw.relations.neighbor)},ids=o.dancers.map(d=>d.id),actors=new Map(o.dancers.map(d=>[d.id,d])),entry=new Map(o.entry.map(p=>[p.id,p]));
 if(Object.keys(raw).some(k=>!['dancers','entry','relations','bindingEpoch','pairs','track','phaseBeats','distance','hold','returnFacing','returnPreparationBeats','evidence'].includes(k))||Object.keys(o.track).some(k=>!['halfWidth','north','south'].includes(k)))throw new Error('Every global-promenade argument must be consumed explicitly.');
 if(ids.length<4||ids.length>24||new Set(ids).size!==ids.length||entry.size!==ids.length||o.entry.length!==ids.length||o.entry.some(p=>!actors.has(p.id)||![p.position.x,p.position.z,p.yaw].every(Number.isFinite))||o.dancers.some(d=>!Number.isSafeInteger(d.id)||d.id<0||!['lark','robin'].includes(d.role)))throw new Error('An oval promenade requires one finite keyed pose per stable actor, 2–12 couples.');
 if(!Number.isSafeInteger(o.bindingEpoch)||o.bindingEpoch<0||relations.epoch!==o.bindingEpoch)throw new Error('The global promenade cannot consume a stale relationship epoch.');
 if(!o.evidence||!o.evidence.sourceId?.trim()||!o.evidence.url?.trim()||!o.evidence.clause?.trim()||!['source-explicit','reviewed-interpretation'].includes(o.evidence.basis)||Object.keys(o.evidence).some(k=>!['sourceId','url','clause','basis'].includes(k)))throw new Error('A global route needs retained source evidence or an explicitly selected interpretation.');
 if(o.returnFacing!=='active-across-waiting-tangent'||o.returnPreparationBeats!==1||o.hold!=='inside-hand'||JSON.stringify(o.phaseBeats)!=='[6,4,6]'||![o.track.halfWidth,o.track.north,o.track.south,o.distance].every(Number.isFinite)||o.track.halfWidth<1.2||o.track.halfWidth>2||o.track.north>o.track.south||o.distance<=0||o.distance>4.5)throw new Error('This contract requires an explicit 6+4+6 clockwise out, left couple turn, return; a bounded physical oval and distance.');
 const couples=new Map<number,number[]>();for(const d of o.dancers){if(!Number.isSafeInteger(d.couple)||d.couple<0)throw new Error('Persistent couple identities must be nonnegative integers.');couples.set(d.couple,[...(couples.get(d.couple)??[]),d.id]);}
 if([...couples.values()].some(pair=>pair.length!==2||actors.get(pair[0])!.role===actors.get(pair[1])!.role||relations.partner.get(pair[0])!==pair[1]||relations.partner.get(pair[1])!==pair[0]))throw new Error('The immutable partner map must name every persistent opposite-role couple exactly.');
 for(const map of [relations.partner,relations.neighbor])for(const [a,b] of map)if(!actors.has(a)||!actors.has(b)||a===b||map.get(b)!==a||actors.get(a)!.role===actors.get(b)!.role)throw new Error('Every bound relation must name reciprocal roster actors of opposite roles.');
 for(const [a,b] of relations.neighbor)if(actors.get(a)!.couple===actors.get(b)!.couple)throw new Error('Persistent partners cannot be rebound as neighbors, including unused waiting relations.');
 const used=new Set<number>();for(const pair of o.pairs){if(Object.keys(pair).some(k=>!['larkId','robinId','relationship','entryDistance'].includes(k))||actors.get(pair.larkId)?.role!=='lark'||actors.get(pair.robinId)?.role!=='robin'||used.has(pair.larkId)||used.has(pair.robinId)||!Number.isFinite(pair.entryDistance)||!['neighbor','partner'].includes(pair.relationship))throw new Error('Every oval pair needs distinct named opposite-role actors and one track entry.');
  const relation=relations[pair.relationship];if(relation.get(pair.larkId)!==pair.robinId||relation.get(pair.robinId)!==pair.larkId||(actors.get(pair.larkId)!.couple===actors.get(pair.robinId)!.couple)!==(pair.relationship==='partner'))throw new Error('A promenade pair must use its explicit reciprocal relationship; waiting partners are never renamed neighbors.');
  used.add(pair.larkId);used.add(pair.robinId);for(const q of ovalPairPoses(pair,o.track)){const p=entry.get(q.id)!;if(!p||Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)>EPS||Math.abs(angle(p.yaw,q.yaw))>EPS)throw new Error('The preceding figure must physically reach its named oval slot and tangent; no reset was invented.');}
 }
 if(used.size!==ids.length)throw new Error('Oval pair declarations must partition the entire roster, including explicitly participating end partners.');
 const roots=(beat:number):Pose[]=>o.pairs.flatMap(pair=>{const outbound=beat<=6,turning=beat>6&&beat<10,amount=outbound?o.distance*promenadeTravel(beat/6):turning?o.distance:o.distance*(1-promenadeTravel((beat-10)/6)),turn=beat<=6?0:beat<10?Math.PI*promenadeTravel((beat-6)/4):Math.PI;return ovalPairPoses(pair,o.track,pair.entryDistance+amount,turn).map(p=>{const yaw=p.yaw+tau*Math.round((entry.get(p.id)!.yaw-p.yaw)/tau),target=entry.get(p.id)!.position.x>0?-Math.PI/2:Math.PI/2;return{...p,ovalPreparation:makeOvalPreparation(pair.relationship==='neighbor'?ease(16-beat):1),yaw:yaw+(pair.relationship==='neighbor'?angle(target,yaw)*ease((beat-15)/1):0)};});}).sort((a,b)=>a.id-b.id);
 const sample=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Oval sampling requires a finite source count.');beat=Math.max(0,Math.min(16,beat));const poses=roots(beat),before=roots(Math.max(0,beat-.0001)),after=roots(Math.min(16,beat+.0001)),byId=new Map(poses.map(p=>[p.id,p])),window=ease(beat/.5)*ease((15-beat)/.5),contacts:HandContact[]=o.pairs.flatMap(pair=>{if(!window)return[];const a=byId.get(pair.larkId)!,b=byId.get(pair.robinId)!,yaw=a.yaw;return[{a:a.id,b:b.id,handA:'right',handB:'left',point:{x:(a.position.x+b.position.x)/2+Math.sin(yaw)*.08,y:1.12,z:(a.position.z+b.position.z)/2+Math.cos(yaw)*.08},strength:window,kind:'joined'}];});for(let i=0;i<poses.length;i++)poses[i].stride=Math.min(1,Math.hypot(after[i].position.x-before[i].position.x,after[i].position.z-before[i].position.z)/.0002*2.5);return{beat,poses,contacts};};
 let minimum=Infinity,speed=0;let prev=sample(0);for(let i=1;i<=16*120;i++){const f=sample(i/120);for(let a=0;a<f.poses.length;a++){speed=Math.max(speed,Math.hypot(f.poses[a].position.x-prev.poses[a].position.x,f.poses[a].position.z-prev.poses[a].position.z)*120);for(let b=a+1;b<f.poses.length;b++)minimum=Math.min(minimum,Math.hypot(f.poses[a].position.x-f.poses[b].position.x,f.poses[a].position.z-f.poses[b].position.z));}prev=f;}
 if(minimum<.55-EPS||speed>1.2+EPS)throw new Error(`Global oval clearance/speed failed: clearance ${minimum}, speed ${speed}.`);
 return Object.freeze({pairs:o.pairs,track:o.track,totalBeats:16,entry:freeze(sample(0)),exit:freeze(sample(16)),minimumObservedClearance:minimum,maximumObservedSpeed:speed,sample});
}
