/** A small, identity-explicit boundary between independently compiled figures.
 * This is evidence of the producer's actual endpoint, never a pose repair or a
 * topology transaction. The successor must accept the same people and clock. */
import {resolveBoundFigureRelation,type FigureContext,type MotionPlan} from './extended-figures.ts';
import type {HandContact,Pose,Role,Vec2} from './types.ts';
export interface FormationGeometry {
 readonly kind:'paired-sidelines';
 readonly sidePair:'partner'|'neighbor';
 readonly origin:Readonly<Vec2>;
 readonly halfWidth:number;
 readonly pairGap:number;
}
export interface FormationActor {readonly id:number;readonly role:Role;readonly couple:number;}
export interface FormationSlot {readonly id:number;readonly position:Readonly<Vec2>;readonly facing:number;}
export interface FormationState {
 readonly sourceBeat:number;
 readonly relationshipEpoch:number;
 readonly actors:readonly FormationActor[];
 readonly partner:readonly (readonly [number,number])[];
 readonly neighbor:readonly (readonly [number,number])[];
 /** Physical stations in the pass graph's declared order, including occupant IDs. */
 readonly orderedSlots:readonly FormationSlot[];
 readonly geometry:FormationGeometry;
 readonly heldContacts:readonly HandContact[];
}
const gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const contactKey=(c:HandContact)=>`${c.a}:${c.b}:${c.handA}:${c.handB}:${c.kind}:${c.target??'hands'}`;
function dataRecord(value:unknown,keys:readonly string[],label:string):asserts value is Record<string,unknown>{
 if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`${label} must be a plain data record.`);
 for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key)!;if(typeof key!=='string'||!keys.includes(key)||!d.enumerable||!('value'in d))throw new Error(`${label} contains an unconsumed, hidden or accessor declaration.`);}
}
function dataArray(value:unknown,label:string):asserts value is readonly unknown[]{
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)throw new Error(`${label} must be a plain array.`);
 for(const key of Reflect.ownKeys(value)){if(key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key)!;if(typeof key!=='string'||!/^\d+$/.test(key)||String(Number(key))!==key||Number(key)>=value.length||!d.enumerable||!('value'in d))throw new Error(`${label} contains an unconsumed array declaration.`);}
 for(let i=0;i<value.length;i++)if(!Object.hasOwn(value,i))throw new Error(`${label} cannot contain an omitted element.`);
}
function vector(value:unknown,dimensions:readonly string[],label:string):void{
 dataRecord(value,dimensions,label);if(dimensions.some(k=>typeof value[k]!=='number'||!Number.isFinite(value[k])))throw new Error(`${label} must have finite coordinates.`);
}
function geometryRecord(geometry:FormationGeometry):void{
 dataRecord(geometry,['kind','sidePair','origin','halfWidth','pairGap'],'Formation geometry');vector(geometry.origin,['x','z'],'Formation origin');
 if(geometry.kind!=='paired-sidelines'||!['partner','neighbor'].includes(geometry.sidePair)||![geometry.halfWidth,geometry.pairGap].every(Number.isFinite)||geometry.halfWidth<=0||geometry.pairGap<=0)throw new Error('A formation state needs an explicit finite geometric profile.');
}
function ownContacts(input:readonly HandContact[],ids:readonly number[]):HandContact[]{
 dataArray(input,'Formation contacts');
 const allowed=['a','b','handA','handB','point','strength','kind','underId','target','bodyPoint','bodyBlend'];
 for(const c of input){
  dataRecord(c,allowed,'Held contact');vector(c.point,['x','y','z'],'Held contact point');
  if(!ids.includes(c.a)||!ids.includes(c.b)||c.a===c.b||!['left','right'].includes(c.handA)||!['left','right'].includes(c.handB)||!['joined','swing-frame','courtesy','arch'].includes(c.kind)||c.target!==undefined&&!['hands','back','waist','upper-arm','wrist'].includes(c.target)||!Number.isFinite(c.strength)||c.strength<0||c.strength>1)throw new Error('Formation contacts must name distinct bound actors and finite held targets.');
  if(c.underId!==undefined&&!ids.includes(c.underId)||c.bodyBlend!==undefined&&(!Number.isFinite(c.bodyBlend)||c.bodyBlend<0||c.bodyBlend>1))throw new Error('A held contact has invalid actor or body-target semantics.');
  if(c.bodyPoint!==undefined)vector(c.bodyPoint,['x','y','z'],'Held body point');
 }
 // Validate first: zero-strength contacts may be omitted from the boundary, but
 // negative/nonfinite strength or unknown body semantics cannot disappear here.
 const contacts=structuredClone(input).filter(c=>c.strength>1e-9);
 if(new Set(contacts.map(contactKey)).size!==contacts.length)throw new Error('Formation contacts must be unique.');
 return contacts.sort((a,b)=>contactKey(a).localeCompare(contactKey(b)));
}
function validateState(state:FormationState):void{
 dataRecord(state,['sourceBeat','relationshipEpoch','actors','partner','neighbor','orderedSlots','geometry','heldContacts'],'Formation state');
 if(!Number.isFinite(state.sourceBeat)||state.sourceBeat<0||!Number.isSafeInteger(state.relationshipEpoch)||state.relationshipEpoch<0)throw new Error('Formation clocks and relationship epochs must be finite and valid.');
 dataArray(state.actors,'Formation actors');dataArray(state.orderedSlots,'Formation slots');
 if(state.actors.length!==4||state.orderedSlots.length!==4)throw new Error('Formation state must contain exactly four actors and ordered slots.');
 for(const a of state.actors){dataRecord(a,['id','role','couple'],'Formation actor');if(!Number.isSafeInteger(a.id)||a.id<0||!Number.isSafeInteger(a.couple)||a.couple<0||!['lark','robin'].includes(a.role))throw new Error('Formation actors need stable IDs, roles and couple identities.');}
 const ids=state.actors.map(a=>a.id),actors=new Map(state.actors.map(a=>[a.id,a]));
 if(new Set(ids).size!==4)throw new Error('Formation actors must be unique.');
 const relations={}as Record<'partner'|'neighbor',Map<number,number>>;
 for(const name of['partner','neighbor']as const){const values=state[name];dataArray(values,`Formation ${name} relation`);if(values.length!==4)throw new Error('Formation relations must cover all actors.');for(const pair of values){dataArray(pair,'Formation relation pair');if(pair.length!==2||!ids.includes(pair[0])||!ids.includes(pair[1]))throw new Error('Formation relation pairs must name known actors.');}const map=new Map(values);if(map.size!==4||ids.some(id=>{const other=map.get(id)!;return id===other||map.get(other)!==id||actors.get(id)!.role===actors.get(other)!.role||(actors.get(id)!.couple===actors.get(other)!.couple)!==(name==='partner');}))throw new Error('Formation relationships must be complete, reciprocal and identity-consistent.');relations[name]=map;}
 for(const slot of state.orderedSlots){dataRecord(slot,['id','position','facing'],'Formation slot');vector(slot.position,['x','z'],'Formation root');if(!ids.includes(slot.id)||!Number.isFinite(slot.facing))throw new Error('Formation slots need stable IDs and finite facing.');}
 if(new Set(state.orderedSlots.map(s=>s.id)).size!==4)throw new Error('Formation slots must contain each actor exactly once.');
 geometryRecord(state.geometry);const g=state.geometry,slots=new Map(state.orderedSlots.map(s=>[s.id,s]));
 if(state.orderedSlots.filter(s=>s.position.x<g.origin.x).length!==2||state.orderedSlots.filter(s=>s.position.x>g.origin.x).length!==2)throw new Error('Paired sidelines require one complete pair on each side.');
 for(const s of state.orderedSlots){const p=s.position,q=slots.get(relations[g.sidePair].get(s.id)!)!.position;if(Math.abs(Math.abs(p.x-g.origin.x)-g.halfWidth)>1e-7||Math.abs(p.x-q.x)>1e-7||Math.abs(gap(p,q)-g.pairGap)>1e-7||Math.abs((p.z+q.z)/2-g.origin.z)>1e-7)throw new Error('The actual paired roots do not occupy the declared geometric profile.');}
 ownContacts(state.heldContacts,ids);
}
export function captureFormationState(context:FigureContext,options:{sourceBeat:number;orderedIds:readonly number[];geometry:FormationGeometry;heldContacts?:readonly HandContact[]}):FormationState{
 dataRecord(options,['sourceBeat','orderedIds','geometry','heldContacts'],'Formation capture options');dataArray(options.orderedIds,'Ordered formation IDs');
 const partner=resolveBoundFigureRelation(context,'partner'),neighbor=resolveBoundFigureRelation(context,'neighbor'),{ids,start,dancers}=context,{sourceBeat,orderedIds,geometry}=options;
 if(!Number.isFinite(sourceBeat)||sourceBeat<0||orderedIds.length!==4||new Set(orderedIds).size!==4||orderedIds.some(id=>!ids.includes(id)))throw new Error('A formation state needs one exact source clock and four explicitly ordered stable IDs.');
 geometryRecord(geometry);
 if(ids.filter(id=>start[id].position.x<geometry.origin.x).length!==2||ids.filter(id=>start[id].position.x>geometry.origin.x).length!==2)throw new Error('Paired sidelines require one complete pair on each side.');
 const pairs=geometry.sidePair==='partner'?partner:neighbor;
 for(const id of ids){const p=start[id].position,q=start[pairs.get(id)!].position;if(Math.abs(Math.abs(p.x-geometry.origin.x)-geometry.halfWidth)>1e-7||Math.abs(p.x-q.x)>1e-7||Math.abs(gap(p,q)-geometry.pairGap)>1e-7||Math.abs((p.z+q.z)/2-geometry.origin.z)>1e-7)throw new Error('The actual paired roots do not occupy the declared geometric profile.');}
 return freeze({sourceBeat,relationshipEpoch:context.bindingEpoch,actors:ids.map(id=>({id,role:dancers[id].role,couple:dancers[id].couple})),partner:ids.map(id=>[id,partner.get(id)!] as const),neighbor:ids.map(id=>[id,neighbor.get(id)!] as const),orderedSlots:orderedIds.map(id=>({id,position:{...start[id].position},facing:start[id].yaw})),geometry:structuredClone(geometry),heldContacts:ownContacts(options.heldContacts??[],ids)});
}
/** A successor consumes the producer's clock, geometry and identities verbatim.
 * Relations are compared as relations, not by numeric adjacency or proximity. */
export function assertFormationHandoff(expected:FormationState,actual:FormationState):void{
 validateState(expected);validateState(actual);
 if(expected.sourceBeat!==actual.sourceBeat)throw new Error('A formation handoff cannot add or remove source counts.');
 if(expected.relationshipEpoch!==actual.relationshipEpoch)throw new Error('A formation handoff cannot silently advance the relationship epoch.');
 const canonical=(value:readonly (readonly [number,number])[])=>JSON.stringify([...value].sort((a,b)=>a[0]-b[0]));
 if(JSON.stringify([...expected.actors].sort((a,b)=>a.id-b.id))!==JSON.stringify([...actual.actors].sort((a,b)=>a.id-b.id))||canonical(expected.partner)!==canonical(actual.partner)||canonical(expected.neighbor)!==canonical(actual.neighbor))throw new Error('A formation handoff cannot repair or replace actor, partner or neighbor identities.');
 if(JSON.stringify(expected.geometry)!==JSON.stringify(actual.geometry))throw new Error('A formation handoff cannot silently substitute a geometric profile.');
 if(expected.orderedSlots.length!==actual.orderedSlots.length||expected.orderedSlots.some((slot,i)=>slot.id!==actual.orderedSlots[i].id||gap(slot.position,actual.orderedSlots[i].position)>1e-7||angle(slot.facing,actual.orderedSlots[i].facing)>1e-7))throw new Error('A formation handoff cannot reset ordered slots, root position or facing.');
 const a=ownContacts(expected.heldContacts,expected.actors.map(a=>a.id)),b=ownContacts(actual.heldContacts,actual.actors.map(a=>a.id));
 if(a.length!==b.length||a.some((c,i)=>contactKey(c)!==contactKey(b[i])||Math.hypot(c.point.x-b[i].point.x,c.point.y-b[i].point.y,c.point.z-b[i].point.z)>1e-7||Math.abs(c.strength-b[i].strength)>1e-7||c.underId!==b[i].underId||c.bodyBlend!==b[i].bodyBlend||Boolean(c.bodyPoint)!==Boolean(b[i].bodyPoint)||c.bodyPoint!==undefined&&Math.hypot(c.bodyPoint.x-b[i].bodyPoint!.x,c.bodyPoint.y-b[i].bodyPoint!.y,c.bodyPoint.z-b[i].bodyPoint!.z)>1e-7))throw new Error('A formation handoff cannot drop or acquire a held contact instantaneously.');
}
export function sampleFormationEndpoint(context:FigureContext,plan:MotionPlan,t:number):Pose[]{
 if(!Number.isFinite(t)||t<0||t>1)throw new Error('A formation endpoint needs a bounded figure time.');
 const poses=structuredClone(context.start);
 for(const id of context.ids)poses[id].position={...plan.position(id,t)};
 for(const id of context.ids)poses[id].yaw=plan.facing(id,t,poses);
 return poses;
}
/** Check a compiled successor before it is allowed to own any later source time. */
export function assertSuccessorEntry(state:FormationState,context:FigureContext,plan:MotionPlan):void{
 const start=sampleFormationEndpoint(context,plan,0),actual=captureFormationState({...context,start},{sourceBeat:state.sourceBeat,orderedIds:state.orderedSlots.map(s=>s.id),geometry:state.geometry,heldContacts:plan.contacts(0,start)});
 assertFormationHandoff(state,actual);
}
