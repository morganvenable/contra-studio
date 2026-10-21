import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
/** Relation-aware right-hand robin chain with an explicit, bound receiving person.
 * Used by reviewed formation compilers; unsupported courtesy variants stay explicit.
 */
import type {Dancer,Pose,HandContact,Vec2,Figure} from './types.ts';
export interface BoundRelationships {epoch:number;partner:ReadonlyMap<number,number>;neighbor:ReadonlyMap<number,number>;}
export interface ChainContext {ids:readonly number[];start:readonly Pose[];dancers:readonly Dancer[];relations:BoundRelationships;bindingEpoch:number;next?:Figure;}
export interface ChainSpec {receiver:'partner'|'neighbor';hand:'right';courtesy:'left-front-right-waist';exitSpacing?:number;exitRing?:boolean;}
export interface ChainPlan {chainCourtesyPreparation(id:number,t:number):Pose['chainCourtesyPreparation'];epoch:number;receivers:ReadonlyMap<number,number>;position(id:number,t:number):Vec2;facing(id:number,t:number):number;contacts(t:number,poses:readonly Pose[]):HandContact[];}
const clamp=(t:number)=>Math.max(0,Math.min(1,t));const smooth=(t:number)=>{t=clamp(t);return t*t*(3-2*t);};
const steady=(time:number):number=>{const t=clamp(time),r=.16,n=1-r;if(t<r){const u=t/r;return r*(u*u*u-.5*u*u*u*u)/n;}if(t>1-r)return 1-steady(1-t);return(t-r/2)/n;};
const add=(a:Vec2,b:Vec2)=>({x:a.x+b.x,z:a.z+b.z});const sub=(a:Vec2,b:Vec2)=>({x:a.x-b.x,z:a.z-b.z});const mul=(a:Vec2,t:number)=>({x:a.x*t,z:a.z*t});const mix=(a:Vec2,b:Vec2,t:number)=>add(mul(a,1-t),mul(b,t));const len=(v:Vec2)=>Math.hypot(v.x,v.z);const rot=(p:Vec2,a:number)=>({x:p.x*Math.cos(a)-p.z*Math.sin(a),z:p.x*Math.sin(a)+p.z*Math.cos(a)});const angle=(a:Vec2,b:Vec2)=>Math.atan2(b.x-a.x,b.z-a.z);const amix=(a:number,b:number,t:number)=>a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;
export function compileChain(context:ChainContext,spec:ChainSpec):ChainPlan{
 if(Object.keys(spec).some(k=>!['receiver','hand','courtesy','exitSpacing','exitRing'].includes(k)))throw new Error('The chain specification contains unconsumed modifiers.');
 if(spec.exitSpacing!==undefined&&(!Number.isFinite(spec.exitSpacing)||spec.exitSpacing<1.10||spec.exitSpacing>1.8))throw new Error('The chain physical exit spacing must be explicitly within1.10–1.80 units.');
 if(spec.exitRing!==undefined&&typeof spec.exitRing!=='boolean'||spec.exitRing&&spec.exitSpacing!==undefined)throw new Error('A compact ring exit cannot also declare pair spacing.');
 const exitSpacing=spec.exitRing?1.10:spec.exitSpacing,exitRing=spec.exitRing===true;
 const ids=Object.freeze([...context.ids]),start=context.start,dancers=context.dancers.map(d=>Object.freeze({...d})),relations=context.relations;
 if(context.bindingEpoch!==relations.epoch)throw new Error(`Relationship epoch ${relations.epoch} is stale for incoming topology ${context.bindingEpoch}.`);
 if(spec.hand!=='right'||spec.courtesy!=='left-front-right-waist'||!['partner','neighbor'].includes(spec.receiver))throw new Error('This adapter supports a right-hand robin chain with conventional courtesy turn only.');
 if(!Number.isInteger(relations.epoch)||relations.epoch<0)throw new Error('The relationship epoch must be a nonnegative integer.');
 if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>!Number.isSafeInteger(id)||id<0))throw new Error('A chain needs four distinct bound actors.');
 if(new Set(dancers.map(d=>d.id)).size!==dancers.length||dancers.some(d=>!['lark','robin'].includes(d.role)))throw new Error('Chain actor identities and roles must be explicit and unique.');
 const actor=new Map(dancers.map(d=>[d.id,d])),pose=new Map(start.map(p=>[p.id,{...p,position:{...p.position}}]));for(const id of ids)if(!actor.has(id)||!pose.has(id))throw new Error(`Missing actor ${id}.`);
 for(const id of ids){const p=pose.get(id)!;if(![p.position.x,p.position.z,p.yaw].every(Number.isFinite))throw new Error('Incoming chain poses must be finite.');for(const kind of ['partner','neighbor'] as const){const other=relations[kind].get(id);if(other===undefined||!ids.includes(other)||relations[kind].get(other)!==id||actor.get(other)!.role===actor.get(id)!.role)throw new Error(`The ${kind} binding must be reciprocal and opposite-role within this group.`);if((actor.get(id)!.couple===actor.get(other)!.couple)!==(kind==='partner'))throw new Error(`The ${kind} binding contradicts persistent couple identity.`);}}
 const robins=ids.filter(id=>actor.get(id)!.role==='robin'),larks=ids.filter(id=>actor.get(id)!.role==='lark');
 if(robins.length!==2||larks.length!==2)throw new Error('This chain needs two robins and two larks.');
 const point=(id:number)=>pose.get(id)!.position,center=mul(ids.map(point).reduce(add,{x:0,z:0}),.25),dest=new Map([[robins[0],point(robins[1])],[robins[1],point(robins[0])]]),receivers=new Map<number,number>();
 const binding=relations[spec.receiver];
 for(const robin of robins){const receiver=binding.get(robin);if(receiver===undefined||!larks.includes(receiver))throw new Error(`No bound ${spec.receiver} lark for robin ${robin}, epoch ${relations.epoch}.`);const target=dest.get(robin)!;
   if(Math.abs(point(receiver).x-target.x)>.08||Math.abs(point(receiver).z-target.z)<.5)throw new Error(`The requested receiving ${spec.receiver} is not in the arrival-side courtesy-turn position.`);
   if(spec.receiver==='partner'&&actor.get(robin)!.couple!==actor.get(receiver)!.couple)throw new Error('Partner binding contradicts persistent couple identity.');
   if(spec.receiver==='neighbor'&&actor.get(robin)!.couple===actor.get(receiver)!.couple)throw new Error('Neighbor binding cannot silently resolve to a partner.');
   const side=Math.sign(point(receiver).x-center.x);if(!side||Math.sign(point(receiver).z-target.z)!==side||Math.sign(point(robin).x-center.x)!==-side)throw new Error('This adapter requires conventional lark-left incoming role order, not an arky or reflected chain.');
   receivers.set(robin,receiver);
 }
 if(new Set(receivers.values()).size!==2)throw new Error('Both robins cannot be received by the same lark.');
 const receiver=(r:number)=>receivers.get(r)!;
 const turnPoint=(id:number,q:number)=>{const r=actor.get(id)!.role==='robin'?id:robins.find(r=>receiver(r)===id)!,l=receiver(r),lp=point(l),rp=dest.get(r)!,c=mix(lp,rp,.5),radial=sub(lp,c),unit=mul(radial,1/len(radial)),turn=smooth(clamp(q/.78)),radius=.34+((exitSpacing===undefined?len(radial):exitSpacing/2)-.34)*smooth((q-.78)/.22);const moved=exitRing?{x:c.x+(center.x+Math.sign(c.x-center.x)*.55-c.x)*smooth((q-.60)/.40),z:c.z}:c;return add(moved,rot(mul(unit,(id===l?1:-1)*radius),Math.PI*(1-turn)));};
 const position=(id:number,t:number)=>{if(!ids.includes(id))throw new Error('Actor is outside this bound group.');t=clamp(t);if(t>=.52)return turnPoint(id,(t-.52)/.48);const p=point(id);
   if(actor.get(id)!.role==='lark'){const q=mix(p,turnPoint(id,0),smooth((t-.12)/.4));q.x+=Math.sign(p.x-center.x)*.25*Math.sin(Math.PI*t/.52)**2;return q;}
   const end=turnPoint(id,0),side=Math.sign(p.x-center.x),entry={x:center.x+side*.45,z:center.z+side*.28},exit={x:center.x-side*.45,z:center.z+side*.28},u=t/.52;
   if(u<.45)return mix(p,entry,steady(u/.45));if(u<.7)return mix(entry,exit,steady((u-.45)/.25));const q=smooth((u-.7)/.3),a={x:exit.x,z:end.z},b={x:end.x,z:end.z};return add(add(mul(exit,(1-q)**3),mul(a,3*(1-q)**2*q)),add(mul(b,3*(1-q)*q*q),mul(end,q**3)));
 };
 const facing=(id:number,t:number)=>{t=clamp(t);const l=actor.get(id)!.role==='lark'?id:receiver(id),side=Math.sign(point(l).x-center.x),exit=side>0?-Math.PI/2:Math.PI/2,entry=exit-Math.PI;
   if(t<.52){if(actor.get(id)!.role==='lark')return amix(angle(point(id),center),entry,smooth((t-.12)/.4));const a=position(id,Math.max(0,t-.035)),b=position(id,Math.min(.52,t+.035));return amix(angle(a,b),entry,smooth((t-.39)/.13));}const yaw=exit-Math.PI*(1-smooth(clamp((t-.52)/(.48*.78))));return exitRing?amix(yaw,angle(position(id,t),center),smooth((t-.90)/.10)):yaw;
 };
 const rawContacts=(t:number,poses:readonly Pose[]):HandContact[]=>{const pm=new Map(poses.map(p=>[p.id,p]));if(exitRing&&t>=.9){const ordered=[...ids].sort((a,b)=>Math.atan2(pm.get(a)!.position.z-center.z,pm.get(a)!.position.x-center.x)-Math.atan2(pm.get(b)!.position.z-center.z,pm.get(b)!.position.x-center.x));return ordered.map((a,i)=>{const b=ordered[(i+1)%4],A=pm.get(a)!,B=pm.get(b)!,sa={x:A.position.x+.235*Math.cos(A.yaw),z:A.position.z-.235*Math.sin(A.yaw)},sb={x:B.position.x-.235*Math.cos(B.yaw),z:B.position.z+.235*Math.sin(B.yaw)};return{a,b,handA:'left' as const,handB:'right' as const,point:{x:(sa.x+sb.x)/2,y:1.14,z:(sa.z+sb.z)/2},strength:smooth((t-.9)/.1),kind:'joined' as const};});}if(t>.1&&t<.4){const[a,b]=robins,p=mix(pm.get(a)!.position,pm.get(b)!.position,.5);return[{a,b,handA:'right',handB:'right',point:{...p,y:1.18},strength:Math.sin((t-.1)/.3*Math.PI),kind:'joined'}];}
   if(t<=.58||t>=.9)return[];const strength=smooth((t-.58)/.06)*smooth((.9-t)/.08);return robins.flatMap(b=>{const a=receiver(b),pa=pm.get(a)!,pb=pm.get(b)!,p=mix(pa.position,pb.position,.5),yaw=pa.yaw;return[
     {a,b,handA:'left' as const,handB:'left' as const,point:{x:p.x+Math.sin(yaw)*.30+Math.cos(yaw)*.12,y:1.16,z:p.z+Math.cos(yaw)*.30-Math.sin(yaw)*.12},strength,kind:'courtesy' as const},
     {a,b,handA:'right' as const,handB:'right' as const,point:{x:pb.position.x-Math.sin(yaw)*.225-Math.cos(yaw)*.075,y:1.14,z:pb.position.z-Math.cos(yaw)*.225+Math.sin(yaw)*.075},strength,kind:'courtesy' as const}
   ];});};
 const contacts=(t:number,poses:readonly Pose[]):HandContact[]=>{const pm=new Map(poses.map(p=>[p.id,p]));return rawContacts(t,poses).map(c=>{const reach=(id:number,hand:'left'|'right')=>{const p=pm.get(id)!,side=hand==='left'?1:-1;return Math.hypot(c.point.x-p.position.x-side*.235*Math.cos(p.yaw),c.point.y-1.355,c.point.z-p.position.z+side*.235*Math.sin(p.yaw));};const distance=Math.max(reach(c.a,c.handA),reach(c.b,c.handB));return{...c,strength:c.strength*smooth((.68-distance)/.06)};}).filter(c=>c.strength>0);};
 const receiverView:ReadonlyMap<number,number>=Object.freeze({get size(){return receivers.size;},get:(key:number)=>receivers.get(key),has:(key:number)=>receivers.has(key),entries:()=>receivers.entries(),keys:()=>receivers.keys(),values:()=>receivers.values(),[Symbol.iterator]:()=>receivers[Symbol.iterator](),forEach:(fn:(value:number,key:number,map:ReadonlyMap<number,number>)=>void,thisArg?:unknown)=>receivers.forEach((value,key)=>fn.call(thisArg,value,key,receiverView))});
 return Object.freeze({epoch:relations.epoch,receivers:receiverView,position,facing,contacts,chainCourtesyPreparation(id:number,t:number){if(!ids.includes(id)||!Number.isFinite(t))throw new Error('Chain courtesy preparation needs a bound actor and finite progress.');const followerId=actor.get(id)!.role==='robin'?id:robins.find(r=>receiver(r)===id)!;return{route:'conventional-chain-courtesy' as const,progress:clamp(t),leaderId:receiver(followerId),followerId};}});
}

/** All semantic modifiers are accounted for before selecting this contact adapter. */
export function compileChainFigure(figure:Figure,context:ChainContext):ChainPlan {
 if(!['robins-chain','ladies-chain'].includes(figure.kind)||!['partner','neighbor'].includes(figure.who??''))throw new Error('A conventional robin chain requires an explicit receiving partner or neighbor.');
 if(!Number.isFinite(figure.beats)||figure.beats<.25||figure.beats>64||figure.confidence==='unsupported')throw new Error('The chain timing or interpretation is unresolved.');
 if(figure.hands!==undefined||figure.underRole!==undefined||figure.direction!==undefined&&figure.direction!=='right'||figure.amount!==undefined||figure.notation!==undefined||figure.entry!==undefined||figure.exit!==undefined)throw new Error('The conventional right-hand chain adapter does not consume additional hand, amount, or entry/exit modifiers.');
 assertFigureArgumentsConsumed(figure);
 // Neutral heys preserve actual stations. Prepared legacy heys and an explicit
 // same-receiver promenade request compact courtesy-turn exits inside the chain
 // counts; the successor consumes those reached roots without resetting them.
 const next=context.next,promenade=figure.beats===8&&!figure.progression&&next?.kind==='promenade'&&next.beats===8&&next.who===figure.who&&next.entry==='side-couples'&&next.courtesyLeader==='lark'&&next.promenadeRoute==='across-set'&&next.promenadeHold==='skaters'&&next.amount===.5&&next.direction==='left'&&next.passingShoulder==='left'&&next.hands==='both'&&!next.progression,compact=promenade||next?.kind==='hey'&&next.heyStartRole!==undefined&&next.entry==='paired-sidelines'&&next.who===figure.who&&!['opposite-slots-facing-across','same-slots-facing-across'].includes(next.exit??'');
 return compileChain(context,{receiver:figure.who as 'partner'|'neighbor',hand:'right',courtesy:'left-front-right-waist',...(next?.kind==='ring-balance'?{exitRing:true}:compact?{exitSpacing:1.10}:{})});
}
