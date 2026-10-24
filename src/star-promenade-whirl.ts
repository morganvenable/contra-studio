/** Isolated, source-counted partner pickup → half star promenade → butterfly.
 * This is deliberately not a public figure registration. It carries two named
 * couples, never an all-four star, and never changes a relationship epoch.
 */
import {capturePlainData} from './owned-program-cache.ts';
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import {captureFormationState,assertSuccessorEntry,sampleFormationEndpoint,type FormationState,type FormationActor,type FormationSlot} from './formation-handoff.ts';
import {compileGyre} from './gyre.ts';
import {assertFigureArgumentsConsumed} from './figure-semantics.ts';
import {ease,progress,heading,turn,distance} from './ring-twirl-contract.ts';
import type {Figure,HandContact,Pose,Vec2} from './types.ts';

export type StarPromenadeFigure=Omit<Figure,'kind'|'entry'|'exit'|'amount'|'hands'|'who'|'direction'|'centerRole'|'approachHold'>&{
 kind:'star-promenade';beats:4;who:'partner';centerRole:'lark'|'robin';hands:'left'|'right';direction:'left'|'right';amount:.5;
 approachHold:'half-shoulder-waist';entry:'radial-partner-pairs';exit:'radial-partner-pairs';
};
export type ButterflyWhirlFigure=Omit<Figure,'kind'|'entry'|'exit'|'amount'|'who'|'direction'|'centerRole'|'approachHold'>&{
 kind:'butterfly-whirl';beats:4;who:'partner';centerRole:'lark'|'robin';direction:'left'|'right';amount:1.375;
 approachHold:'half-shoulder-waist';entry:'radial-partner-pairs';exit:'paired-sidelines';
};
export interface CarriedPair {readonly carrierId:number;readonly carriedId:number;readonly relationship:'partner';readonly carriedSide:'right'|'left';}
/** A radial state is intentionally distinct from FormationState's sidelines. */
export interface CarriedFormationState {
 readonly sourceBeat:number;readonly relationshipEpoch:number;readonly actors:readonly FormationActor[];
 readonly partner:readonly (readonly[number,number])[];readonly neighbor:readonly (readonly[number,number])[];
 readonly orderedSlots:readonly FormationSlot[];readonly heldContacts:readonly HandContact[];
 readonly geometry:{readonly kind:'radial-partner-pairs';readonly origin:Readonly<Vec2>;readonly innerRadius:.34;readonly pairGap:.62;readonly centerRole:'lark'|'robin';readonly centerHand:'left'|'right';};
 readonly pairs:readonly CarriedPair[];
}
export interface StarWhirlMeasures {readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;readonly maximumObservedYawRate:number;}
export interface PickupPlan extends MotionPlan,StarWhirlMeasures {readonly entryState:FormationState;readonly exitState:CarriedFormationState;}
export interface StarPromenadePlan extends MotionPlan,StarWhirlMeasures {readonly entryState:CarriedFormationState;readonly exitState:CarriedFormationState;}
export interface ButterflyWhirlPlan extends MotionPlan,StarWhirlMeasures {readonly entryState:CarriedFormationState;readonly exitState:FormationState;}
const TAU=2*Math.PI,INNER=.34,GAP=.62,OUTER=INNER+GAP,EPS=1e-7;
const freeze=<T>(v:T):T=>{if(v&&typeof v==='object'){for(const c of Object.values(v))freeze(c);Object.freeze(v);}return v;};
const mix=(a:Vec2,b:Vec2,t:number)=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t});
const radial=(c:Vec2,r:number,a:number)=>({x:c.x+r*Math.cos(a),z:c.z+r*Math.sin(a)});
const time=(t:number)=>{if(!Number.isFinite(t))throw new Error('Star/whirl sample time must be finite.');return Math.max(0,Math.min(1,t));};
function sourceClockEnd(start:number,beats:number):number {
 const end=start+beats;if(!Number.isFinite(start)||start<0||!Number.isFinite(end)||end-start!==beats)throw new Error('A carried figure requires an exactly representable source-count interval.');return end;
}
function plain(value:unknown,allowed:readonly string[],label:string):void {
 if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`${label} must be a plain data record.`);
 for(const k of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,k)!;if(typeof k!=='string'||!allowed.includes(k)||!d.enumerable||!('value'in d))throw new Error(`${label} cannot ignore extra, hidden or accessor declarations.`);}
}
const meta=['id','kind','beats','label','notes','confidence','progression'];
export function assertStarPromenadeFigure(f:StarPromenadeFigure):void {
 f=capturePlainData(f);
 plain(f,[...meta,'who','centerRole','hands','direction','amount','approachHold','entry','exit'],'Star promenade');
 if(f.kind!=='star-promenade'||f.beats!==4||f.who!=='partner'||!(f.centerRole==='lark'&&f.hands==='left'&&f.direction==='left'||f.centerRole==='robin'&&f.hands==='right'&&f.direction==='right')||f.amount!==.5||f.approachHold!=='half-shoulder-waist'||f.entry!=='radial-partner-pairs'||f.exit!=='radial-partner-pairs'||f.progression||f.confidence==='unsupported')throw new Error('This star promenade requires four counts and a coherent Lark-left/right-carried or Robin-right/left-carried partner half-turn.');
 metadata(f);
}
export function assertButterflyWhirlFigure(f:ButterflyWhirlFigure):void {
 f=capturePlainData(f);
 plain(f,[...meta,'who','centerRole','direction','amount','approachHold','entry','exit'],'Butterfly whirl');
 if(f.kind!=='butterfly-whirl'||f.beats!==4||f.who!=='partner'||!(f.centerRole==='lark'&&f.direction==='left'||f.centerRole==='robin'&&f.direction==='right')||f.amount!==1.375||f.approachHold!=='half-shoulder-waist'||f.entry!=='radial-partner-pairs'||f.exit!=='paired-sidelines'||f.progression||f.confidence==='unsupported')throw new Error('This diagonal-entry butterfly requires its reviewed four-count one-and-three-eighths partner whirl with its coherent carrier/hand profile and actual inward exit.');
 metadata(f);
}
function metadata(f:{id:string;label:string;notes?:string;confidence?:string;progression?:boolean}){if(typeof f.id!=='string'||!f.id.trim()||typeof f.label!=='string'||!f.label.trim()||f.notes!==undefined&&typeof f.notes!=='string'||f.confidence!==undefined&&!['verified','approximate','unsupported'].includes(f.confidence)||f.progression!==undefined&&typeof f.progression!=='boolean')throw new Error('Star/whirl metadata must be explicit immutable data.');}
function owned(incoming:FigureContext):FigureContext {
 // Context relation maps are compiler protocols, not imported plain data.
 // Capture each outer descriptor once; all data subtrees use the shared audited
 // owner before any validation or cloning can read them a second time.
 const fields:Record<string,unknown>={};let relationValue:unknown;
 for(const key of Reflect.ownKeys(incoming)){const d=Object.getOwnPropertyDescriptor(incoming,key)!;if(typeof key!=='string'||!['ids','start','dancers','relations','bindingEpoch','next','allowRelationChangingArchExit','allowArchToCourtesyExit'].includes(key)||!d.enumerable||!('value'in d))throw new Error('A carried context requires ordinary owned data declarations.');if(key==='relations')relationValue=d.value;else fields[key]=d.value;}
 const data=capturePlainData(fields),rd=Object.getOwnPropertyDescriptors(relationValue as object);
 if(Reflect.ownKeys(rd).length!==3||['epoch','partner','neighbor'].some(k=>!rd[k]?.enumerable||!('value'in rd[k])))throw new Error('A carried context needs explicit epoch, partner and neighbor maps.');
 const copyMap=(value:unknown):Map<number,number>=>{
  let entries:Iterable<readonly[number,number]>;
  if(value instanceof Map){if(Object.getPrototypeOf(value)!==Map.prototype||Reflect.ownKeys(value).length)throw new Error('A native relationship map cannot carry extra declarations.');entries=Map.prototype.entries.call(value);}
  else {const iterator=value!==null&&typeof value==='object'?Object.getOwnPropertyDescriptor(value,Symbol.iterator):undefined;if(!value||!Object.isFrozen(value)||!iterator||!('value'in iterator)||typeof iterator.value!=='function')throw new Error('A relation needs a native map or the frozen topology map protocol.');entries=iterator.value.call(value);}
  const result=new Map<number,number>();let size=0;for(const pair of entries){const owned=capturePlainData(pair);if(!Array.isArray(owned)||owned.length!==2||owned.some(v=>!Number.isSafeInteger(v)||v<0)||++size>256||result.has(owned[0]))throw new Error('A relationship table needs bounded unique integer actor pairs.');result.set(owned[0],owned[1]);}return result;
 };
 const relations={epoch:capturePlainData(rd.epoch.value),partner:copyMap(rd.partner.value),neighbor:copyMap(rd.neighbor.value)},context={...data,relations}as unknown as FigureContext;
 resolveBoundFigureRelation(context,'partner');resolveBoundFigureRelation(context,'neighbor');return context;
}
function pairData(c:FigureContext,role:'lark'|'robin'='lark'):CarriedPair[]{return c.ids.filter(id=>c.dancers[id].role===role).map(carrierId=>({carrierId,carriedId:c.relations.partner.get(carrierId)!,relationship:'partner',carriedSide:role==='lark'?'right':'left'}));}
function center(c:FigureContext):Vec2{return{x:c.ids.reduce((s,id)=>s+c.start[id].position.x,0)/4,z:c.ids.reduce((s,id)=>s+c.start[id].position.z,0)/4};}
const bodyPoint=(p:Pick<Pose,'position'|'yaw'>,v:{x:number;y:number;z:number})=>({x:p.position.x+v.x*Math.cos(p.yaw)+v.z*Math.sin(p.yaw),y:v.y,z:p.position.z-v.x*Math.sin(p.yaw)+v.z*Math.cos(p.yaw)});
function heldContacts(pairs:readonly CarriedPair[],poses:readonly Pose[],origin:Vec2,central:number,held:number):HandContact[]{
 const result:HandContact[]=[];
 for(const id of pairs.flatMap(p=>[p.carrierId,p.carriedId])){const p=poses[id];if(!p||p.id!==id||![p.position.x,p.position.z,p.yaw].every(Number.isFinite))throw new Error('Carried contacts require keyed finite poses for each bound actor.');}
 for(const pair of pairs){const a=poses[pair.carrierId],b=poses[pair.carriedId];
  if(held>0){const sign=pair.carriedSide==='right'?1:-1,waist={x:sign*.13,y:1.18,z:-.13},shoulder={x:-sign*.23,y:1.33,z:0};
   result.push({a:a.id,b:b.id,handA:pair.carriedSide,handB:pair.carriedSide==='right'?'left':'right',kind:'courtesy',target:'waist',point:bodyPoint(b,waist),bodyPoint:waist,strength:held});
   result.push({a:b.id,b:a.id,handA:pair.carriedSide==='right'?'left':'right',handB:pair.carriedSide,kind:'courtesy',target:'upper-arm',point:bodyPoint(a,shoulder),bodyPoint:shoulder,strength:held});
  }
 }
 if(central>0)result.push({a:pairs[0].carrierId,b:pairs[1].carrierId,handA:pairs[0].carriedSide==='right'?'left':'right',handB:pairs[0].carriedSide==='right'?'left':'right',kind:'joined',target:'hands',point:{...origin,y:1.2},strength:central});
 return result;
}
function radialState(context:FigureContext,plan:MotionPlan,t:number,sourceBeat:number,role:'lark'|'robin'='lark'):CarriedFormationState {
 sourceClockEnd(sourceBeat,4);
 const poses=sampleFormationEndpoint(context,plan,t),origin=center(context),pairs=pairData(context,role),ids=context.ids;
 for(const pair of pairs){const a=poses[pair.carrierId],b=poses[pair.carriedId],theta=Math.atan2(a.position.z-origin.z,a.position.x-origin.x),tangent=(role==='lark'?Math.PI:0)-theta;
  if(Math.abs(distance(a.position,origin)-INNER)>EPS||Math.abs(distance(b.position,origin)-OUTER)>EPS||distance(radial(origin,OUTER,theta),b.position)>EPS||Math.abs(turn(a.yaw,tangent))>EPS||Math.abs(turn(b.yaw,tangent))>EPS)throw new Error('Radial handoff must retain the named inner carrier, outer held-side partner and common forward tangential facing.');
 }
 return freeze({sourceBeat,relationshipEpoch:context.bindingEpoch,actors:ids.map(id=>({id,role:context.dancers[id].role,couple:context.dancers[id].couple})),partner:ids.map(id=>[id,context.relations.partner.get(id)!]as const),neighbor:ids.map(id=>[id,context.relations.neighbor.get(id)!]as const),orderedSlots:ids.map(id=>({id,position:{...poses[id].position},facing:poses[id].yaw})),heldContacts:plan.contacts(t,poses),geometry:{kind:'radial-partner-pairs',origin,innerRadius:INNER,pairGap:GAP,centerRole:role,centerHand:role==='lark'?'left':'right'},pairs});
}
/** Both records are captured from independently owned plans, so changing an
 * epoch, pair, clock, target, direction or point cannot be hidden at a seam. */
function assertCarriedState(state:CarriedFormationState):void {
 const fail=()=>{throw new Error('A carried state requires complete reciprocal integer actor relations, named partner pairs and their directed radial contact ownership.');};
 const integer=(n:unknown)=>typeof n==='number'&&Number.isSafeInteger(n)&&n>=0;
 const vector=(v:unknown,dimensions:readonly string[])=>{plain(v,dimensions,'Carried coordinate');if(dimensions.some(k=>typeof (v as Record<string,unknown>)[k]!=='number'||!Number.isFinite((v as Record<string,number>)[k])))fail();};
 plain(state,['sourceBeat','relationshipEpoch','actors','partner','neighbor','orderedSlots','heldContacts','geometry','pairs'],'Carried state');
 sourceClockEnd(state.sourceBeat,4);
 if(!integer(state.relationshipEpoch)||!Array.isArray(state.actors)||state.actors.length!==4)fail();
 const actors=new Map<number,FormationActor>();
 for(const actor of state.actors){plain(actor,['id','role','couple'],'Carried actor');if(!integer(actor.id)||!integer(actor.couple)||!['lark','robin'].includes(actor.role)||actors.has(actor.id))fail();actors.set(actor.id,actor);}
 if([...actors.values()].filter(a=>a.role==='lark').length!==2)fail();
 const relations=new Map<string,Map<number,number>>();
 for(const name of ['partner','neighbor']as const){
  const rows=state[name],relation=new Map<number,number>();if(!Array.isArray(rows)||rows.length!==4)fail();
  for(const row of rows){if(!Array.isArray(row)||row.length!==2||row.some(id=>!integer(id)||!actors.has(id))||row[0]===row[1]||relation.has(row[0]))fail();relation.set(row[0],row[1]);}
  for(const[id,other]of relation){const a=actors.get(id)!,b=actors.get(other)!;if(relation.get(other)!==id||a.role===b.role||(a.couple===b.couple)!==(name==='partner'))fail();}
  relations.set(name,relation);
 }
 if(!Array.isArray(state.orderedSlots)||state.orderedSlots.length!==4)fail();
 const slots=new Map<number,FormationSlot>();
 for(const slot of state.orderedSlots){plain(slot,['id','position','facing'],'Carried slot');if(!integer(slot.id)||!actors.has(slot.id)||slots.has(slot.id)||!Number.isFinite(slot.facing))fail();vector(slot.position,['x','z']);slots.set(slot.id,slot);}
 const g=state.geometry;plain(g,['kind','origin','innerRadius','pairGap','centerRole','centerHand'],'Carried geometry');vector(g.origin,['x','z']);
 if(g.kind!=='radial-partner-pairs'||g.innerRadius!==INNER||g.pairGap!==GAP||!(g.centerRole==='lark'&&g.centerHand==='left'||g.centerRole==='robin'&&g.centerHand==='right')||!Array.isArray(state.pairs)||state.pairs.length!==2)fail();
 const paired=new Set<number>(),expectedContacts=new Set<string>();
 for(const pair of state.pairs){
  plain(pair,['carrierId','carriedId','relationship','carriedSide'],'Carried pair');const a=actors.get(pair.carrierId),b=actors.get(pair.carriedId);
  if(!integer(pair.carrierId)||!integer(pair.carriedId)||!a||!b||a.role!==g.centerRole||b.role===g.centerRole||paired.has(a.id)||paired.has(b.id)||relations.get('partner')!.get(a.id)!==b.id||pair.relationship!=='partner'||pair.carriedSide!==(g.centerRole==='lark'?'right':'left'))fail();
  paired.add(pair.carrierId);paired.add(pair.carriedId);
  const inner=slots.get(pair.carrierId)!,outer=slots.get(pair.carriedId)!,theta=Math.atan2(inner.position.z-g.origin.z,inner.position.x-g.origin.x);
  if(Math.abs(distance(inner.position,g.origin)-INNER)>EPS||distance(radial(g.origin,OUTER,theta),outer.position)>EPS||Math.abs(turn(inner.facing,(g.centerRole==='lark'?Math.PI:0)-theta))>EPS||Math.abs(turn(outer.facing,(g.centerRole==='lark'?Math.PI:0)-theta))>EPS)fail();
  expectedContacts.add(`${pair.carrierId}:${pair.carriedId}:${pair.carriedSide}:${pair.carriedSide==='right'?'left':'right'}:courtesy:waist`);expectedContacts.add(`${pair.carriedId}:${pair.carrierId}:${pair.carriedSide==='right'?'left':'right'}:${pair.carriedSide}:courtesy:upper-arm`);
 }
 const [a,b]=state.pairs.map(p=>slots.get(p.carrierId)!);if(Math.hypot(a.position.x+b.position.x-2*g.origin.x,a.position.z+b.position.z-2*g.origin.z)>EPS)fail();
 expectedContacts.add(`${state.pairs[0].carrierId}:${state.pairs[1].carrierId}:${g.centerHand}:${g.centerHand}:joined:hands`);
 if(!Array.isArray(state.heldContacts)||state.heldContacts.length!==expectedContacts.size)fail();
 for(const contact of state.heldContacts){
  // underId belongs to an arch. It is not an optional reinterpretation of this
  // radial support contract, even if its actor happens to be in the group.
  plain(contact,['a','b','handA','handB','point','strength','kind','target','bodyPoint','bodyBlend'],'Carried contact');
  if(!integer(contact.a)||!integer(contact.b)||!actors.has(contact.a)||!actors.has(contact.b)||!expectedContacts.delete(`${contact.a}:${contact.b}:${contact.handA}:${contact.handB}:${contact.kind}:${contact.target}`)||!Number.isFinite(contact.strength)||contact.strength<=0||contact.strength>1)fail();
  vector(contact.point,['x','y','z']);if(contact.target!=='hands')vector(contact.bodyPoint,['x','y','z']);else if(contact.bodyPoint!==undefined)fail();
  if(contact.bodyBlend!==undefined&&(!Number.isFinite(contact.bodyBlend)||contact.bodyBlend<0||contact.bodyBlend>1))fail();
 }
}
export function assertCarriedFormationHandoff(expected:CarriedFormationState,actual:CarriedFormationState):void {
 expected=capturePlainData(expected);actual=capturePlainData(actual);
 assertCarriedState(expected);assertCarriedState(actual);
 const equal=(a:unknown,b:unknown,path=''):boolean=>{
  // IDs can occur inside relation tuples as well as named fields. Default to
  // exact comparison for every discrete declaration; only these actual measured
  // coordinates, headings and contact strengths have numerical tolerance.
  if(typeof a==='number'&&typeof b==='number'){
   if(!Number.isFinite(a)||!Number.isFinite(b))return false;
   if(/^orderedSlots\.\d+\.facing$/.test(path))return Math.abs(turn(a,b))<=EPS;
   const measured=/^(?:orderedSlots\.\d+\.position\.(?:x|z)|geometry\.origin\.(?:x|z)|heldContacts\.\d+\.(?:(?:point|bodyPoint)\.(?:x|y|z)|strength|bodyBlend))$/.test(path);
   return measured?Math.abs(a-b)<=EPS:a===b;
  }
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return a===b;
  const array=Array.isArray(a);if(array!==Array.isArray(b)||Object.getPrototypeOf(a)!==(array?Array.prototype:Object.prototype))return false;
  const keys=Reflect.ownKeys(a),other=Reflect.ownKeys(b);if(keys.length!==other.length||keys.some(k=>typeof k!=='string'||!other.includes(k)))return false;
  return keys.every(k=>{if(k==='length'&&array)return (a as unknown[]).length===(b as unknown[]).length;const d=Object.getOwnPropertyDescriptor(a,k)!,e=Object.getOwnPropertyDescriptor(b,k)!;return d.enumerable&&'value'in d&&'value'in e&&equal(d.value,e.value,path?`${path}.${String(k)}`:String(k));});
 };
 if(!equal(expected,actual))throw new Error('A carried handoff cannot change source counts, bound identities, held side, geometry, root, facing or contact targets.');
}
function certify(c:FigureContext,p:MotionPlan,beats:number):StarWhirlMeasures {
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0,previous=sampleFormationEndpoint(c,p,0);
 for(let i=0;i<=beats*120;i++){const poses=sampleFormationEndpoint(c,p,i/(beats*120));
  for(let a=0;a<c.ids.length;a++){const id=c.ids[a],q=poses[id];if(![q.position.x,q.position.z,q.yaw].every(Number.isFinite))throw new Error('A carried path is nonfinite.');if(i){maximumObservedSpeed=Math.max(maximumObservedSpeed,distance(q.position,previous[id].position)*120);maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(turn(q.yaw,previous[id].yaw))*120);}for(let b=a+1;b<c.ids.length;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(q.position,poses[c.ids[b]].position));}
  const hands=new Set<string>();for(const h of p.contacts(i/(beats*120),poses)){for(const key of[`${h.a}:${h.handA}`,...(h.target==='hands'||!h.target?[`${h.b}:${h.handB}`]:[])]){if(hands.has(key))throw new Error('A carried path assigns one hand twice.');hands.add(key);}}previous=poses;
 }
 if(minimumObservedClearance<.5-EPS||maximumObservedSpeed>1.8+EPS||maximumObservedYawRate>4+EPS)throw new Error(`Carried path exceeds its gross motion budget: clearance=${minimumObservedClearance}, speed=${maximumObservedSpeed}, yaw=${maximumObservedYawRate}.`);
 return freeze({minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate});
}
/** All 1½ allemande revolutions are preserved. Robins prepare outside the
 * central orbit in the final 2½ counts, and partner support acquires at pickup. */
export function compileAllemandeStarPickup(input:Figure,incoming:FigureContext,sourceBeat:number,options?:{halfWidth:.64}):PickupPlan {
 if(options!==undefined){options=capturePlainData(options);if(!options||Object.keys(options).length!==1||options.halfWidth!==.64)throw Error('Compact pickup requires its explicit measured square.');}
 const halfWidth=options?.halfWidth??.9;
 const endBeat=sourceClockEnd(sourceBeat,8);
 input=capturePlainData(input);assertFigureArgumentsConsumed(input);plain(input,[...meta,'who','direction','amount'],'Allemande pickup');metadata(input);
 if(input.kind!=='allemande'||!(input.who==='larks'&&input.direction==='left'||input.who==='robins'&&input.direction==='right')||input.amount!==1.5||input.beats!==8||input.progression||input.confidence==='unsupported')throw new Error('The pickup owns the complete eight-count Lark-left or Robin-right one-and-a-half allemande.');
 const role=input.who==='larks'?'lark':'robin',sign=input.direction==='left'?1:-1,c=owned(incoming),origin=center(c),pairs=pairData(c,role),initialAngles=new Map<number,number>();
 const orderedIds=[...c.ids].sort((a,b)=>c.start[a].position.x-c.start[b].position.x||c.start[a].position.z-c.start[b].position.z);
 const entryState=captureFormationState(c,{sourceBeat,orderedIds,geometry:{kind:'paired-sidelines',sidePair:'neighbor',origin,halfWidth,pairGap:halfWidth*2}});
 for(const pair of pairs){const a=c.start[pair.carrierId],b=c.start[pair.carriedId];if(Math.abs(a.position.z-b.position.z)>EPS||Math.abs(Math.abs(a.position.z-origin.z)-halfWidth)>EPS)throw new Error('The source pickup starts with persistent partners across and current neighbors on the sides.');initialAngles.set(pair.carrierId,Math.atan2(a.position.z-origin.z,a.position.x-origin.x));}
 const raw=(id:number,t:number)=>{t=time(t);const pair=pairs.find(p=>p.carrierId===id||p.carriedId===id);if(!pair)throw new Error('Unknown carried actor.');const theta0=initialAngles.get(pair.carrierId)!,theta=theta0-sign*3*Math.PI*progress(t),endTheta=theta0-sign*3*Math.PI,start=c.start[id],beat=t*8;
  if(id===pair.carrierId){const r0=distance(start.position,origin),r=INNER+(r0-INNER)*(1-ease(beat/1.4)),position=radial(origin,r,theta),natural=-theta-Math.PI/2,yaw=natural+turn(start.yaw,-theta0-Math.PI/2)*(1-ease(beat/1.2))+(-sign*Math.PI/2)*ease((beat-6.5)/1.5);return{position,yaw};}
  const destination=radial(origin,OUTER,endTheta),q=ease((beat-5.5)/2.5),position=mix(start.position,destination,q);position.x+=Math.sign(start.position.x-origin.x)*.2*Math.sin(Math.PI*q);const yaw=start.yaw+turn((role==='lark'?Math.PI:0)-endTheta,start.yaw)*q;return{position,yaw};
 };
 const plan:MotionPlan={position:(id,t)=>raw(id,t).position,facing:(id,t)=>raw(id,t).yaw,contacts:(t,poses)=>heldContacts(pairs,poses,origin,ease(time(t)*8/1.4),ease((time(t)*8-7.5)/.5)).map(h=>{if(!options)return h;let reach=0;for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])]as[number,'left'|'right'][]){const p=poses.find(p=>p.id===id)!,side=hand==='left'?1:-1;reach=Math.max(reach,Math.hypot(h.point.x-p.position.x-side*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+side*.235*Math.sin(p.yaw)));}return{...h,strength:h.strength*ease((.64-reach)/.02)};}).filter(h=>!options||h.strength>1e-9)};
 const exitState=radialState(c,plan,1,endBeat,role);assertSuccessorEntry(entryState,c,plan);
 return Object.freeze({...plan,entryState,exitState,...certify(c,plan,8)});
}
export function compileStarPromenadeFigure(input:StarPromenadeFigure,incoming:FigureContext,entry:CarriedFormationState,sourceBeat:number):StarPromenadePlan {
 const endBeat=sourceClockEnd(sourceBeat,4);
 input=capturePlainData(input);entry=capturePlainData(entry);assertStarPromenadeFigure(input);const sign=input.direction==='left'?1:-1,c=owned(incoming),origin=center(c),pairs=pairData(c,input.centerRole);
 const plan:MotionPlan={position(id,t){t=time(t);const p=c.start[id];if(!c.ids.includes(id))throw new Error('Unknown star actor.');const a=Math.atan2(p.position.z-origin.z,p.position.x-origin.x)-sign*Math.PI*progress(t);return radial(origin,distance(p.position,origin),a);},facing(id,t){if(!c.ids.includes(id))throw new Error('Unknown star actor.');return c.start[id].yaw+sign*Math.PI*progress(time(t));},contacts:(t,poses)=>{time(t);return heldContacts(pairs,poses,origin,1,1);}};
 const entryState=radialState(c,plan,0,sourceBeat,input.centerRole);assertCarriedFormationHandoff(entry,entryState);const exitState=radialState(c,plan,1,endBeat,input.centerRole);
 return Object.freeze({...plan,entryState,exitState,...certify(c,plan,4)});
}
export function compileButterflyWhirlFigure(input:ButterflyWhirlFigure,incoming:FigureContext,entry:CarriedFormationState,sourceBeat:number,options?:{halfWidth:.64;pairGap:1.28}):ButterflyWhirlPlan {
 if(options!==undefined){options=capturePlainData(options);if(!options||Object.keys(options).some(k=>!['halfWidth','pairGap'].includes(k))||options.halfWidth!==.64||options.pairGap!==1.28)throw Error('Compact whirl requires an explicit released hey station exit.');}
 const halfWidth=options?.halfWidth??.9,pairGap=options?.pairGap??GAP;
 const endBeat=sourceClockEnd(sourceBeat,4);
 input=capturePlainData(input);entry=capturePlainData(entry);assertButterflyWhirlFigure(input);const sign=input.direction==='left'?1:-1,c=owned(incoming),origin=center(c),pairs=pairData(c,input.centerRole);
 for(const pair of pairs){const a=c.start[pair.carrierId],theta=Math.atan2(a.position.z-origin.z,a.position.x-origin.x),side=Math.sign(a.position.x-origin.x);if(Math.abs(Math.abs(a.position.x-origin.x)-INNER/Math.SQRT2)>EPS||Math.sign(a.position.z-origin.z)!==sign*side)throw new Error('This reviewed whirl requires the actual diagonal half-star exit.');const natural=c.start[pair.carrierId].yaw+sign*TAU*input.amount;if(Math.abs(turn(natural,side>0?-Math.PI/2:Math.PI/2))>EPS)throw new Error('The declared whirl amount does not naturally face inward.');void theta;}
 const raw=(id:number,t:number)=>{t=time(t);const pair=pairs.find(p=>p.carrierId===id||p.carriedId===id);if(!pair)throw new Error('Unknown whirl actor.');const a=c.start[pair.carrierId],b=c.start[pair.carriedId],mid={x:(a.position.x+b.position.x)/2,z:(a.position.z+b.position.z)/2},side=Math.sign(mid.x-origin.x),target={x:origin.x+side*halfWidth,z:origin.z},moving=mix(mid,target,ease(t)),p=c.start[id].position,theta=Math.atan2(p.z-mid.z,p.x-mid.x)-sign*TAU*input.amount*progress(t);return{position:radial(moving,(GAP+(pairGap-GAP)*ease((t*4-3.5)/.5))/2,theta),yaw:c.start[id].yaw+sign*TAU*input.amount*progress(t)};};
 const plan:MotionPlan={position:(id,t)=>raw(id,t).position,facing:(id,t)=>raw(id,t).yaw,contacts:(t,poses)=>heldContacts(pairs,poses,origin,1-ease(time(t)*4/.5),1-ease((time(t)*4-(options?3:3.5))/.5))};
 const entryState=radialState(c,plan,0,sourceBeat,input.centerRole);assertCarriedFormationHandoff(entry,entryState);const end=sampleFormationEndpoint(c,plan,1),orderedIds=[...c.ids].sort((a,b)=>end[a].position.x-end[b].position.x||end[a].position.z-end[b].position.z);
 const exitState=captureFormationState({...c,start:end},{sourceBeat:endBeat,orderedIds,geometry:{kind:'paired-sidelines',sidePair:'partner',origin,halfWidth,pairGap},heldContacts:plan.contacts(1,end)});
 return Object.freeze({...plan,entryState,exitState,...certify(c,plan,4)});
}
/** A full robin gyre returns to the same partners. Its full eight-count orbit
 * owns the outgoing partner-facing preparation without any added turn or reset. */
export function compileWhirlRobinGyre(input:Figure,incoming:FigureContext,entry:FormationState,sourceBeat:number):MotionPlan&StarWhirlMeasures {
 sourceClockEnd(sourceBeat,8);
 input=capturePlainData(input);entry=capturePlainData(entry);if(!Number.isFinite(sourceBeat)||sourceBeat<0||entry.sourceBeat!==sourceBeat)throw new Error('The robin gyre must consume the exact outgoing whirl source clock.');assertFigureArgumentsConsumed(input);const c=owned(incoming),f=input,next=c.next;
 if(f.kind!=='gyre'||f.who!=='robins'||f.passingShoulder!=='right'||f.amount!==1||f.beats!==8||f.progression||f.confidence==='unsupported'||next?.kind!=='swing'||next.who!=='partner'||next.beats!==8)throw new Error('The whirl exit requires the complete eight-count robin right gyre followed by its named eight-count partner swing.');
 const endpoints=new Map(c.ids.map(id=>[id,{position:{...c.start[id].position},yaw:c.start[id].yaw,velocity:{x:0,z:0},yawRate:0}]));const robins=c.ids.filter(id=>c.dancers[id].role==='robin'),origin=center(c),exit=new Map([...endpoints].map(([id,p])=>[id,structuredClone(p)]));
 for(const id of robins)exit.get(id)!.yaw=heading(exit.get(id)!.position,exit.get(c.relations.partner.get(id)!)!.position)+Math.PI/3;
 const base=compileGyre({actors:c.ids.map(id=>c.dancers[id]),entry:endpoints,exit,relations:c.relations,bindingEpoch:c.bindingEpoch,pairs:[{a:robins[0],b:robins[1],relationship:'robins'}],passingShoulder:'right',amount:1,beats:8,orbitRadius:.34,minimumClearance:.5,maximumSpeed:1.8,maximumYawRate:4});
 const plan:MotionPlan={position:(id,t)=>base.position(id,time(t)),facing(id,t){t=time(t);const natural=base.facing(id,t);if(robins.includes(id))return natural;const position=base.position(id,1),other=base.position(c.relations.partner.get(id)!,1),target=heading(position,other)+Math.PI/3;return natural+turn(target,natural)*ease((t*8-6.75)/1.25);},contacts:()=>[]};
 assertSuccessorEntry(entry,c,plan);return Object.freeze({...plan,...certify(c,plan,8)});
}
