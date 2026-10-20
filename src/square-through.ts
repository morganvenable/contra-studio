/** Bounded balanced square-through-two composition. Source order is partner
 * right, then current neighbor left; the current epoch is retained throughout.
 * Four balance counts plus two for each passage is an explicit interpretation.
 * The balance gathers a reachable right hand. The last passage opens both
 * sidelines continuously while the named pull-by kernel exchanges the slots.
 * This is a root/contact model, not anatomical or teaching-safety validation. */
import {capturePlainData} from './owned-program-cache.ts';
import type {BalanceCue,Dancer,HandContact,Pose,Vec2} from './types.ts';
import type {BoundRelationships} from './chain.ts';
import {compileNamedPullBy} from './named-pull-by.ts';
import {ownActors,ownConstraints,ownRelations,immutableMap,distance,heading,turn,ease,progress,sampleTime,type TurnConstraint} from './ring-twirl-contract.ts';

export interface SquareThroughOptions {
 actors:readonly Dancer[];
 entry:ReadonlyMap<number,TurnConstraint>;
 exit:ReadonlyMap<number,TurnConstraint>;
 relations:BoundRelationships;
 bindingEpoch:number;
 frame:{origin:Vec2;axis:Vec2};
 beats:8;
 phaseBeats:readonly [4,2,2];
 passages:readonly [{relation:'partner';hand:'right'},{relation:'neighbor';hand:'left'}];
 /** Declared incoming spacing and immediate successor facing. Defaults preserve
  * the original standard-width terminal passage exactly. */
 entryHalfWidth?:.55|.9;
 exitFacing?:'onward'|'partner';
 minimumClearance?:number;
 maximumSpeed?:number;
 maximumYawRate?:number;
}
type Root=Pick<Pose,'id'|'position'|'yaw'>;
const EPS=1e-7;
function references(value:unknown,keys:readonly string[],label:string):Record<string,unknown>{
 if(!value||typeof value!=='object'||![Object.prototype,null].includes(Object.getPrototypeOf(value)))throw new Error(`${label} must be a plain record.`);
 const copy:Record<string,unknown>={};
 for(const key of Reflect.ownKeys(value)){const d=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!keys.includes(key)||!d||!d.enumerable||!('value'in d))throw new Error(`${label} contains an unconsumed, hidden or accessor declaration.`);Object.defineProperty(copy,key,{value:d.value,enumerable:true});}
 return copy;
}
function record(value:unknown,keys:readonly string[],label:string):asserts value is Record<string,unknown>{references(value,keys,label);}
/** Maps are the only non-plain inputs. Read native entries without invoking
 * caller methods, then use the same audited descriptor capture as compilation.
 * Native maps may be frozen, but subclasses and own overrides are not a
 * supported declaration protocol for this bounded primitive. */
function mapEntries(value:unknown,label:string):unknown[][] {
 if(!value||typeof value!=='object'||Object.getPrototypeOf(value)!==Map.prototype||Reflect.ownKeys(value).length)throw new Error(`${label} requires an ordinary native map without extra declarations.`);
 try{return [...Map.prototype.entries.call(value)];}catch{throw new Error(`${label} requires a genuine native map.`);}
}
function ownOptions(input:SquareThroughOptions):SquareThroughOptions {
 const raw=references(input,['actors','entry','exit','relations','bindingEpoch','frame','beats','phaseBeats','passages','entryHalfWidth','exitFacing','minimumClearance','maximumSpeed','maximumYawRate'],'Square-through options');
 const relations=references(raw.relations,['epoch','partner','neighbor'],'Square-through relations');
 const {entry,exit,...plain}=raw;
 const owned=capturePlainData({...plain,entry:mapEntries(entry,'Square-through entry'),exit:mapEntries(exit,'Square-through exit'),relations:{epoch:relations.epoch,partner:mapEntries(relations.partner,'Square-through partners'),neighbor:mapEntries(relations.neighbor,'Square-through neighbors')}}) as any;
 array(owned.actors,4,'Square-through actors');
 for(const a of owned.actors){record(a,['id','name','role','couple','direction','color'],'Square-through actor');if(a.name!==undefined&&typeof a.name!=='string'||a.color!==undefined&&typeof a.color!=='string'||a.direction!==undefined&&a.direction!==1&&a.direction!==-1)throw new Error('Square-through actor display metadata and direction must retain their declared types.');}
 for(const name of ['entry','exit'])for(const pair of owned[name]){array(pair,2,'Square-through endpoint entry');const p=pair[1];record(p,['position','yaw','velocity','yawRate'],'Square-through endpoint');record(p.position,['x','z'],'Square-through position');record(p.velocity,['x','z'],'Square-through velocity');}
 const ids=new Set(owned.actors.map((a:Dancer)=>a.id));
 for(const name of ['partner','neighbor'])if(owned.relations[name].length!==ids.size||owned.relations[name].some(([a,b]:number[])=>!ids.has(a)||!ids.has(b)))throw new Error('Square-through relations must contain exactly the named actor group.');
 return {...owned,entry:new Map(owned.entry),exit:new Map(owned.exit),relations:{epoch:owned.relations.epoch,partner:new Map(owned.relations.partner),neighbor:new Map(owned.relations.neighbor)}};
}
function array(value:unknown,length:number,label:string):asserts value is readonly unknown[]{
 if(!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype||value.length!==length)throw new Error(`${label} requires exactly ${length} explicit entries.`);
 for(const key of Reflect.ownKeys(value)){if(key==='length')continue;const d=Object.getOwnPropertyDescriptor(value,key)!;if(typeof key!=='string'||!/^\d+$/.test(key)||String(Number(key))!==key||Number(key)>=length||!d.enumerable||!('value'in d))throw new Error(`${label} contains an unconsumed declaration.`);}
 for(let i=0;i<length;i++)if(!Object.hasOwn(value,i))throw new Error(`${label} cannot omit entries.`);
}
export function assertSquareThroughTiming(value:unknown):asserts value is readonly [4,2,2]{
 array(value,3,'Square-through timing');if(value[0]!==4||value[1]!==2||value[2]!==2)throw new Error('This square-through requires the explicitly reviewed four-plus-two-plus-two allocation.');
}
export function assertSquareThroughPassages(value:unknown):asserts value is SquareThroughOptions['passages']{
 array(value,2,'Square-through passages');for(const p of value)record(p,['relation','hand'],'Square-through passage');
 const p=value as SquareThroughOptions['passages'];if(p[0].relation!=='partner'||p[0].hand!=='right'||p[1].relation!=='neighbor'||p[1].hand!=='left')throw new Error('Square-through-two requires the ordered partner-right then current-neighbor-left passages.');
}
export function compileSquareThrough(input:SquareThroughOptions){
 const options=ownOptions(input);
 record(options,['actors','entry','exit','relations','bindingEpoch','frame','beats','phaseBeats','passages','entryHalfWidth','exitFacing','minimumClearance','maximumSpeed','maximumYawRate'],'Square-through options');
 record(options.frame,['origin','axis'],'Square-through frame');for(const p of[options.frame.origin,options.frame.axis])record(p,['x','z'],'Square-through frame vector');
 assertSquareThroughTiming(options.phaseBeats);assertSquareThroughPassages(options.passages);
 const{actors,ids,byId}=ownActors(options.actors,4),relations=ownRelations(options.relations,options.bindingEpoch,actors),entry=ownConstraints(options.entry,ids),exit=ownConstraints(options.exit,ids);
 const origin=Object.freeze({...options.frame.origin}),axis=Object.freeze({...options.frame.axis}),across={x:axis.z,z:-axis.x};
 if(options.beats!==8||![origin.x,origin.z,axis.x,axis.z].every(Number.isFinite)||Math.abs(Math.hypot(axis.x,axis.z)-1)>EPS)throw new Error('Balanced square-through-two requires eight counts and an explicit finite unit hall frame.');
 const local=(p:Vec2)=>({x:(p.x-origin.x)*across.x+(p.z-origin.z)*across.z,z:(p.x-origin.x)*axis.x+(p.z-origin.z)*axis.z});
 const world=(p:Vec2)=>({x:origin.x+p.x*across.x+p.z*axis.x,z:origin.z+p.x*across.z+p.z*axis.z});
 const entryWidth=options.entryHalfWidth??.9,partnerExit=options.exitFacing==='partner';
 if(![.55,.9].includes(entryWidth)||options.exitFacing!==undefined&&!['onward','partner'].includes(options.exitFacing))throw new Error('Square-through requires declared standard or handed compact entry and a proved onward or partner-facing exit.');
 const starts=new Map(ids.map(id=>[id,local(entry.get(id)!.position)]));
 if(new Set([...starts.values()].map(p=>`${Math.sign(p.x)},${Math.sign(p.z)}`)).size!==4)throw new Error('Square-through entry requires four distinct longways corner slots.');
 const balanceEnd=new Map<number,TurnConstraint>(),firstPassEnd=new Map<number,TurnConstraint>(),compactExit=new Map<number,TurnConstraint>();
 const constraint=(position:Vec2,yaw:number):TurnConstraint=>Object.freeze({position:Object.freeze(position),yaw,velocity:Object.freeze({x:0,z:0}),yawRate:0});
 for(const id of ids){
  const a=starts.get(id)!,p=starts.get(relations.partner.get(id)!)!,n=starts.get(relations.neighbor.get(id)!)!,X=exit.get(id)!,role=byId.get(id)!.role==='lark'?1:-1;
  if(Math.abs(Math.abs(a.x)-entryWidth)>EPS||Math.abs(Math.abs(a.z)-.9)>EPS||Math.abs(a.x+p.x)>EPS||Math.abs(a.z-p.z)>EPS||Math.abs(a.x-n.x)>EPS||Math.abs(a.z+n.z)>EPS)throw new Error('Square-through requires persistent partners across their exact row and current neighbors on the same standard sideline.');
  if(Math.abs(a.x-entryWidth*Math.sign(a.z)*role)>EPS)throw new Error('The square-through role order must preserve conventional lark-left corner slots.');
  const facing=heading(entry.get(id)!.position,entry.get(relations.partner.get(id)!)!.position),onward=heading(world(a),world({x:a.x,z:-a.z}));
  const destination=world({x:-Math.sign(a.x)*.9,z:-a.z}),exitYaw=partnerExit?heading(destination,world({x:Math.sign(a.x)*.9,z:-a.z})):onward;
  if(Math.abs(turn(entry.get(id)!.yaw,facing))>EPS||Math.abs(turn(X.yaw,exitYaw))>EPS||distance(X.position,destination)>EPS)throw new Error('Square-through endpoints must retain across-partner entry facing and the complete diagonally opposite exit with its declared facing.');
  balanceEnd.set(id,constraint(world({x:Math.sign(a.x)*.55,z:a.z}),entry.get(id)!.yaw));
  firstPassEnd.set(id,constraint(world({x:-Math.sign(a.x)*.55,z:a.z}),entry.get(id)!.yaw+turn(onward,entry.get(id)!.yaw)));
  compactExit.set(id,constraint(world({x:-Math.sign(a.x)*.55,z:-a.z}),firstPassEnd.get(id)!.yaw));
 }
 const pairs=(relationship:'partner'|'neighbor')=>ids.filter(id=>id<relations[relationship].get(id)!).map(a=>({a,b:relations[relationship].get(a)!,relationship}));
 const first=compileNamedPullBy({actors,entry:balanceEnd,exit:firstPassEnd,relations,bindingEpoch:relations.epoch,pairs:pairs('partner'),hand:'right',beats:2});
 // This compact scaffold is never sampled as public motion. Simultaneous
 // outward pair translation below supplies the missing inter-sideline space;
 // the completed composition must pass the ordinary .64 clearance budget.
 const second=compileNamedPullBy({actors,entry:firstPassEnd,exit:compactExit,relations,bindingEpoch:relations.epoch,pairs:pairs('neighbor'),hand:'left',beats:2,minimumClearance:.4});
 const balanceRoot=(id:number,beat:number):Root=>{
  const a=starts.get(id)!,A=entry.get(id)!;
  const spacing=beat<=2?entryWidth*2+(.92-entryWidth*2)*ease(beat/2):beat<=3?.92+(1.10-.92)*ease(beat-2):1.10;
  return{id,position:world({x:Math.sign(a.x)*spacing/2,z:a.z}),yaw:A.yaw};
 };
 const secondRoot=(id:number,beat:number):Root=>{const p=second.position(id,beat/2),a=starts.get(id)!,shift=-Math.sign(a.x)*.35*progress(beat/2);return{id,position:{x:p.x+shift*across.x,z:p.z+shift*across.z},yaw:partnerExit?second.facing(id,beat/2)+turn(exit.get(id)!.yaw,second.facing(id,beat/2))*ease((beat-1.25)/.75):second.facing(id,beat/2)};};
 const root=(id:number,beat:number):Root=>{
  if(!entry.has(id))throw new Error('Actor is outside this bound square-through group.');
  return beat<=4?balanceRoot(id,beat):beat<=6?{id,position:first.position(id,(beat-4)/2),yaw:first.facing(id,(beat-4)/2)}:secondRoot(id,beat-6);
 };
 const ownedPoses=(poses:readonly Root[])=>{const map=new Map(poses.map(p=>[p.id,p]));if(map.size!==poses.length||ids.some(id=>!map.has(id))||poses.some(p=>![p.position.x,p.position.z,p.yaw].every(Number.isFinite)))throw new Error('Square-through contacts require unique finite poses for all bound actors.');return map;};
 const rightContacts=(poses:readonly Root[],window:number):HandContact[]=>{
  const byPose=ownedPoses(poses);if(window<=0)return[];
  return pairs('partner').flatMap(({a,b})=>{const A=byPose.get(a)!,B=byPose.get(b)!,point={x:(A.position.x+B.position.x)/2,y:1.18,z:(A.position.z+B.position.z)/2},reach=(p:Root)=>Math.hypot(point.x-p.position.x+.235*Math.cos(p.yaw),point.y-1.355,point.z-p.position.z-.235*Math.sin(p.yaw)),strength=window*ease((.64-Math.max(reach(A),reach(B)))/.016);return strength>0?[{a,b,handA:'right' as const,handB:'right' as const,point,strength,kind:'joined' as const}]:[];});
 };
 const contactsAt=(beat:number,poses:readonly Root[]):HandContact[]=>{
  ownedPoses(poses);
  if(beat<=4)return rightContacts(poses,1);
  if(beat<=6){const t=(beat-4)/2;return t<.37?rightContacts(poses,1):first.contacts(t,poses as readonly Pose[]);}
  // Supply actual, already opened roots to the left-hand kernel. The same
  // pair receives a common translation, so its contact midpoint follows it.
  return second.contacts((beat-6)/2,poses as readonly Pose[]);
 };
 const balance=(id:number,beat:number):BalanceCue|undefined=>{if(!entry.has(id))throw new Error('Actor is outside this bound square-through group.');if(beat>4)return;const t=beat/4,bell=(a:number,b:number)=>t<=a||t>=b?0:Math.sin(Math.PI*(t-a)/(b-a))**2;return{otherId:relations.partner.get(id)!,progress:t,forwardWeight:bell(.04,.76),counterWeight:bell(.5,1),midpointPulse:bell(.44,.56)};};
 const sample=(beat:number)=>{beat=sampleTime(beat,8);const h=1e-5,lo=Math.max(0,beat-h),hi=Math.min(8,beat+h),poses=ids.map(id=>{const p=root(id,beat),a=root(id,lo),b=root(id,hi);return{...p,velocity:{x:(b.position.x-a.position.x)/(hi-lo),z:(b.position.z-a.position.z)/(hi-lo)},yawRate:turn(b.yaw,a.yaw)/(hi-lo),balance:balance(id,beat)};});return{beat,poses,contacts:contactsAt(beat,poses)};};
 const gates=Object.freeze([...first.gates.map(g=>Object.freeze({...g,phase:1 as const,beat:4+g.beat})),...second.gates.map(g=>Object.freeze({...g,phase:2 as const,beat:6+g.beat}))]);
 // Witness both exact named passages after composition, including the opened
 // final pair translation. Neither gate is inferred merely from the endpoint.
 for(const g of gates){const f=sample(g.beat),A=f.poses.find(p=>p.id===g.a)!,B=f.poses.find(p=>p.id===g.b)!,d={x:B.position.x-A.position.x,z:B.position.z-A.position.z},sign=g.hand==='right'?1:-1;if(Math.abs(d.x*Math.sin(A.yaw)+d.z*Math.cos(A.yaw))>EPS||sign*(-d.x*Math.cos(A.yaw)+d.z*Math.sin(A.yaw))<.7-EPS||!f.contacts.some(c=>c.a===g.a&&c.b===g.b&&c.handA===g.hand&&c.handB===g.hand&&c.strength>.99))throw new Error('Composed square-through failed its named same-hand passage gate.');}
 const minimum=options.minimumClearance??.64,maximum=options.maximumSpeed??1.65,angular=options.maximumYawRate??6;
 if(![minimum,maximum,angular].every(x=>Number.isFinite(x)&&x>0))throw new Error('Square-through budgets must be finite and positive.');
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0,maximumObservedHeldReach=0;
 for(let n=0;n<=1280;n++){const f=sample(n/160);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(p.velocity.x,p.velocity.z));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,distance(f.poses[a].position,f.poses[b].position));for(const c of f.contacts)if(c.strength>1-EPS)for(const[id,hand]of[[c.a,c.handA],[c.b,c.handB]]as const){const p=f.poses.find(p=>p.id===id)!,side=hand==='left'?1:-1;maximumObservedHeldReach=Math.max(maximumObservedHeldReach,Math.hypot(c.point.x-p.position.x-side*.235*Math.cos(p.yaw),c.point.y-1.355,c.point.z-p.position.z+side*.235*Math.sin(p.yaw)));}}
 if(minimumObservedClearance<minimum-EPS||maximumObservedSpeed>maximum+EPS||maximumObservedYawRate>angular+EPS||maximumObservedHeldReach>.64+EPS)throw new Error(`Square-through exceeds sampled budgets: clearance ${minimumObservedClearance}, speed ${maximumObservedSpeed}, yaw ${maximumObservedYawRate}, held reach ${maximumObservedHeldReach}.`);
 return Object.freeze({beats:8 as const,phaseBeats:Object.freeze([4,2,2] as const),epoch:relations.epoch,passages:Object.freeze([Object.freeze({relation:'partner' as const,hand:'right' as const}),Object.freeze({relation:'neighbor' as const,hand:'left' as const})]),entry:immutableMap(entry),balanceEnd:immutableMap(balanceEnd),firstPassEnd:immutableMap(firstPassEnd),exit:immutableMap(exit),gates,minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,maximumObservedHeldReach,sample,position:(id:number,t:number)=>root(id,sampleTime(t*8,8)).position,facing:(id:number,t:number)=>root(id,sampleTime(t*8,8)).yaw,contacts:(t:number,poses?:readonly Pose[])=>{const beat=sampleTime(t*8,8);return contactsAt(beat,poses??ids.map(id=>root(id,beat)));},balance:(id:number,t:number)=>balance(id,sampleTime(t*8,8))});
}
