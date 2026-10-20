/** Four-in-line down the hall, an explicit half-turn, return, and bend the line.
 *
 * Source rows supply two eight-beat budgets, not a license to add steps. The
 * caller chooses their internal allocation, actor order, turn groups and hands.
 * Alone means each actor pivots in their own slot. Couples means a rigid pair
 * rotates around its midpoint, exchanging its two slots. These are never aliases.
 * Coordinates use a supplied down-hall unit vector. `lineOrder` is dancers' left
 * to right while facing down, and +yaw is Three.js's positive Y-axis rotation.
 * This module is intentionally independent of source interpretation/playback.
 */
import type {Hand,HandContact,Pose,Vec2} from './types.ts';

export interface TravelConstraint {position:Vec2;yaw:number;velocity:Vec2;yawRate:number;}
export interface TravelContact {a:number;b:number;handA:Hand;handB:Hand;}
export interface TravelCouple {leftId:number;rightId:number;halfTurn:1|-1;}
export type TravelTurn =
 | {mode:'couples';pairs:readonly TravelCouple[]}
 | {mode:'alone';actors:readonly {id:number;halfTurn:1|-1}[]};
export interface TravelSource {
 url:string;snapshotId:string;
 rows:readonly [{id:string;text:string;beats:8},{id:string;text:string;beats:8}];
}
export interface HallTravelOptions {
 actorIds:readonly number[];
 /** From dancers' left to right facing down; never selected by proximity. */
 lineOrder:readonly [number,number,number,number];
 entry:ReadonlyMap<number,TravelConstraint>;exit:ReadonlyMap<number,TravelConstraint>;
 frame:{origin:Vec2;down:Vec2};
 turn:TravelTurn;
 /** Explicit hand ownership for outgoing and returned lines and the ring close. */
 downHands:readonly TravelContact[];returnHands:readonly TravelContact[];closingHands:TravelContact;
 beats:16;sourceBeatBudget:readonly [8,8];
 /** Walk/assemble, half-turn, walk back, bend. Each source row stays eight beats. */
 phaseBeats:readonly [number,number,number,number];
 lineSpacing:number;travelDistance:number;ringWidth:number;ringDepth:number;
 minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;
 source?:TravelSource;
}
export interface TravelPose extends TravelConstraint {id:number;acceleration:Vec2;yawAcceleration:number;}
export interface TravelFrame {beat:number;phase:'down'|'turn'|'return'|'bend';poses:TravelPose[];contacts:HandContact[];}
export interface HallTravelPlan {
 readonly beats:16;readonly sourceBeatBudget:readonly [8,8];readonly phaseBeats:readonly [number,number,number,number];
 readonly phaseBoundaries:readonly number[];readonly actorIds:readonly number[];readonly lineOrder:readonly number[];readonly returnOrder:readonly number[];
 readonly turn:TravelTurn;readonly entry:ReadonlyMap<number,Readonly<TravelConstraint>>;readonly exit:ReadonlyMap<number,Readonly<TravelConstraint>>;
 readonly source?:TravelSource;readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;readonly maximumObservedYawRate:number;
 sample(beat:number):TravelFrame;
 position(id:number,t:number):Vec2;facing(id:number,t:number,poses?:readonly Pose[]):number;
 contacts(t:number,poses?:readonly Pose[]):HandContact[];
}
const EPS=1e-7;
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const finite=(p:Vec2)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const norm=(p:Vec2)=>Math.hypot(p.x,p.z);
const gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};
/** C2 onset/offset, with a long constant-speed walking section. */
function progress(x:number):[number,number,number]{
 const t=clamp(x),r=.18,n=1-r;
 if(t>1-r){const[q,v,a]=progress(1-t);return[1-q,v,-a];}
 if(t<r){const u=t/r;return[r*(u*u*u-.5*u*u*u*u)/n,(3*u*u-2*u*u*u)/n,(6*u-6*u*u)/(r*n)];}
 return[(t-r/2)/n,1/n,0];
}
function freeze<T>(x:T):T {if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;}
function readonlyMap<K,V>(m:Map<K,V>):ReadonlyMap<K,V>{
 const view:ReadonlyMap<K,V>=Object.freeze({get size(){return m.size;},get:(k:K)=>m.get(k),has:(k:K)=>m.has(k),entries:()=>m.entries(),keys:()=>m.keys(),values:()=>m.values(),[Symbol.iterator]:()=>m[Symbol.iterator](),forEach:(fn:(v:V,k:K,m:ReadonlyMap<K,V>)=>void,thisArg?:unknown)=>m.forEach((v,k)=>fn.call(thisArg,v,k,view))});return view;
}
export function compileHallTravel(options:HallTravelOptions):HallTravelPlan {
 const ids=[...options.actorIds],order=[...options.lineOrder],origin={...options.frame.origin},down={...options.frame.down},left={x:down.z,z:-down.x};
 if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>!Number.isSafeInteger(id)||id<0)||order.length!==4||new Set(order).size!==4||order.some(id=>!ids.includes(id)))throw new Error('Four unique stable actor IDs and an explicit permutation of line slots are required.');
 if(!finite(origin)||!finite(down)||Math.abs(norm(down)-1)>EPS||Math.max(Math.abs(origin.x),Math.abs(origin.z))>1e6)throw new Error('The hall frame needs a finite origin and a unit down-hall axis.');
 const yaw0=Math.atan2(down.x,down.z),world=(p:Vec2)=>({x:origin.x+p.x*left.x+p.z*down.x,z:origin.z+p.x*left.z+p.z*down.z}),vector=(p:Vec2)=>({x:p.x*left.x+p.z*down.x,z:p.x*left.z+p.z*down.z}),local=(p:Vec2)=>({x:(p.x-origin.x)*left.x+(p.z-origin.z)*left.z,z:(p.x-origin.x)*down.x+(p.z-origin.z)*down.z});
 const snapshot=(m:ReadonlyMap<number,TravelConstraint>)=>{
  if(m.size!==4||ids.some(id=>!m.has(id)))throw new Error('Entry and exit must be keyed by exactly the four stable actor IDs.');
  return new Map(ids.map(id=>{const p=m.get(id)!;if(!p||!finite(p.position)||!finite(p.velocity)||![p.yaw,p.yawRate].every(Number.isFinite)||Math.abs(p.yaw)>1e6||Math.max(Math.abs(p.position.x),Math.abs(p.position.z))>1e6)throw new Error('Finite explicit endpoint positions, headings and derivatives are required.');if(norm(p.velocity)>EPS||Math.abs(p.yawRate)>EPS)throw new Error('This adapter requires stationary endpoint derivatives; incoming motion cannot be silently discarded.');return[id,freeze({position:{...p.position},yaw:p.yaw,velocity:{...p.velocity},yawRate:p.yawRate})];}));
 };
 const entry=snapshot(options.entry),exit=snapshot(options.exit),phaseBeats=[...options.phaseBeats] as [number,number,number,number];
 if(options.beats!==16||options.sourceBeatBudget?.length!==2||options.sourceBeatBudget[0]!==8||options.sourceBeatBudget[1]!==8||phaseBeats.length!==4||phaseBeats.some(b=>!Number.isSafeInteger(b)||b<2)||phaseBeats[0]+phaseBeats[1]!==8||phaseBeats[2]+phaseBeats[3]!==8)throw new Error('The exact source budget is 8+8 beats; four explicit phases must consume it without additional steps.');
 const [walking,turning,returning,bending]=phaseBeats,bounds=[0,walking,8,8+returning,16],spacing=options.lineSpacing,distance=options.travelDistance,width=options.ringWidth,depth=options.ringDepth;
 if(![spacing,distance,width,depth].every(n=>Number.isFinite(n)&&n>0)||spacing<.65||spacing>1.1||distance<.5||distance>3||width<.65||width>1.8||depth<.65||depth>1.8)throw new Error('Travel geometry is limited to reachable .65–1.1 line spacing, .5–3 travel, and .65–1.8 ring sides.');
 const start=new Map(ids.map(id=>[id,local(entry.get(id)!.position)])),line=new Map(order.map((id,i)=>[id,{x:(1.5-i)*spacing,z:distance}])),turnById=new Map<number,{halfTurn:1|-1;center:Vec2}>();
 for(const id of ids)if(Math.abs(wrap(entry.get(id)!.yaw-yaw0))>EPS)throw new Error('Every incoming actor must explicitly face down the hall; preparation facing belongs to the preceding figure.');
 let turn:TravelTurn,returned:number[];
 if(options.turn.mode==='couples'){
  const pairs=options.turn.pairs.map(p=>({...p}));
  if(pairs.length!==2||new Set(pairs.flatMap(p=>[p.leftId,p.rightId])).size!==4||pairs.some(p=>![1,-1].includes(p.halfTurn)||!ids.includes(p.leftId)||!ids.includes(p.rightId)||![[order[0],order[1]],[order[2],order[3]]].some(([a,b])=>a===p.leftId&&b===p.rightId)))throw new Error('Turn-as-couples requires two explicit adjacent left/right pairs and signed half-turns.');
  for(const p of pairs){const a=line.get(p.leftId)!,b=line.get(p.rightId)!,center={x:(a.x+b.x)/2,z:distance};for(const id of[p.leftId,p.rightId])turnById.set(id,{halfTurn:p.halfTurn,center});}
  turn=freeze({mode:'couples',pairs});returned=[order[2],order[3],order[0],order[1]];
 }else if(options.turn.mode==='alone'){
  const actors=options.turn.actors.map(p=>({...p}));if(actors.length!==4||new Set(actors.map(p=>p.id)).size!==4||actors.some(p=>!ids.includes(p.id)||![1,-1].includes(p.halfTurn)))throw new Error('Turn-alone requires an explicit signed half-turn for every named actor.');
  for(const a of actors)turnById.set(a.id,{halfTurn:a.halfTurn,center:line.get(a.id)!});turn=freeze({mode:'alone',actors});returned=[...order].reverse();
 }else throw new Error('Turn-alone and turn-as-couples are distinct explicit modes.');
 const returnIndex=new Map(returned.map((id,i)=>[id,i])),finish=new Map<number,Vec2>(),finalYaw=new Map<number,number>();
 for(const id of ids){const i=returnIndex.get(id)!,side=i<2?-1:1,p={x:side*width/2,z:i===0||i===3?-depth:0},wanted=yaw0+Math.atan2(-p.x,-depth/2-p.z),before=entry.get(id)!.yaw+turnById.get(id)!.halfTurn*Math.PI;finish.set(id,p);finalYaw.set(id,before+wrap(wanted-before));if(gap(exit.get(id)!.position,world(p))>EPS||Math.abs(wrap(exit.get(id)!.yaw-wanted))>EPS)throw new Error('Exit constraints must preserve the named bend-the-line ring order and face its center.');}
 const copyHands=(hands:readonly TravelContact[],expected:readonly number[])=>{
  const result=hands.map(h=>({...h}));if(result.length!==3||result.some((h,i)=>h.a!==expected[i]||h.b!==expected[i+1]||h.handA!=='right'||h.handB!=='left'))throw new Error('Line contacts must explicitly join each ordered actor’s right hand to the next actor’s left hand.');return freeze(result);
 };
 const downHands=copyHands(options.downHands,order),returnHands=copyHands(options.returnHands,returned),closing={...options.closingHands};
 if(closing.a!==returned[3]||closing.b!==returned[0]||closing.handA!=='right'||closing.handB!=='left')throw new Error('The ring closure must explicitly name the two free endpoint hands.');
 const source=options.source?freeze(structuredClone(options.source)):undefined;
 if(source&&(!source.url||!source.snapshotId||!Array.isArray(source.rows)||source.rows.length!==2||source.rows.some(r=>!r.id||!r.text||r.beats!==8)||source.rows[0].id===source.rows[1].id))throw new Error('Source provenance must retain two distinct complete eight-beat rows and their snapshot identity.');
 const time=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');return Math.max(0,Math.min(16,beat));};
 const root=(id:number,beat:number):TravelPose=>{
  const a=entry.get(id);if(!a)throw new Error(`Actor ${id} is outside this bound hall travel.`);
  let p:Vec2,v:Vec2,acc:Vec2,yaw=a.yaw,yawRate=0,yawAcceleration=0;
  if(beat<=walking){const[q,d,dd]=progress(beat/walking),A=start.get(id)!,B=line.get(id)!,delta={x:B.x-A.x,z:B.z-A.z};p={x:A.x+delta.x*q,z:A.z+delta.z*q};v={x:delta.x*d/walking,z:delta.z*d/walking};acc={x:delta.x*dd/walking**2,z:delta.z*dd/walking**2};}
  else if(beat<=8){const[q,d,dd]=progress((beat-walking)/turning),group=turnById.get(id)!,r=line.get(id)!.x-group.center.x,theta=group.halfTurn*Math.PI*q,omega=group.halfTurn*Math.PI*d/turning,alpha=group.halfTurn*Math.PI*dd/turning**2;
   p={x:group.center.x+r*Math.cos(theta),z:distance-r*Math.sin(theta)};v={x:-r*Math.sin(theta)*omega,z:-r*Math.cos(theta)*omega};acc={x:-r*(Math.cos(theta)*omega**2+Math.sin(theta)*alpha),z:r*(Math.sin(theta)*omega**2-Math.cos(theta)*alpha)};yaw+=theta;yawRate=omega;yawAcceleration=alpha;
  }else if(beat<=8+returning){const[q,d,dd]=progress((beat-8)/returning),i=returnIndex.get(id)!;p={x:(i-1.5)*spacing,z:distance*(1-q)};v={x:0,z:-distance*d/returning};acc={x:0,z:-distance*dd/returning**2};yaw+=turnById.get(id)!.halfTurn*Math.PI;
  }else{const[q,d,dd]=progress((beat-8-returning)/bending),i=returnIndex.get(id)!,side=i<2?-1:1,outer=i===0||i===3,theta=Math.PI*q/2,omega=Math.PI*d/(2*bending),alpha=Math.PI*dd/(2*bending**2),base=spacing/2+(width-spacing)*q/2,baseV=(width-spacing)*d/(2*bending),baseA=(width-spacing)*dd/(2*bending**2);
   p={x:side*(base+(outer?spacing*Math.cos(theta):0)),z:outer?-depth*Math.sin(theta):0};v={x:side*(baseV-(outer?spacing*Math.sin(theta)*omega:0)),z:outer?-depth*Math.cos(theta)*omega:0};acc={x:side*(baseA-(outer?spacing*(Math.cos(theta)*omega**2+Math.sin(theta)*alpha):0)),z:outer?depth*(Math.sin(theta)*omega**2-Math.cos(theta)*alpha):0};const before=a.yaw+turnById.get(id)!.halfTurn*Math.PI,delta=finalYaw.get(id)!-before;yaw=before+delta*q;yawRate=delta*d/bending;yawAcceleration=delta*dd/bending**2;
  }
  return{id,position:world(p),velocity:vector(v),acceleration:vector(acc),yaw,yawRate,yawAcceleration};
 };
 const contactAt=(beat:number,poses:readonly Pick<Pose,'id'|'position'|'yaw'>[]):HandContact[]=>{
  const byId=new Map(poses.map(p=>[p.id,p]));if(byId.size!==poses.length||ids.some(id=>!byId.has(id))||poses.some(p=>!finite(p.position)||!Number.isFinite(p.yaw)))throw new Error('Contacts require unique finite poses for every bound actor.');
  const result:HandContact[]=[];
  // A shallow forward offer keeps the unchanged arm solver's forearm outside
  // its own torso. Acquire only after the target clears the lateral silhouette.
  // Fade to the ordinary ring midpoint/y=1.14 by the exact circle handoff.
  const add=(h:TravelContact,strength:number)=>{if(strength<=0)return;const A=byId.get(h.a)!,B=byId.get(h.b)!,shoulder=(p:typeof A,hand:Hand)=>{const side=hand==='left'?1:-1;return{x:p.position.x+side*.235*Math.cos(p.yaw),z:p.position.z-side*.235*Math.sin(p.yaw)};},a=shoulder(A,h.handA),b=shoulder(B,h.handB),offerForward=.25*(1-smooth((beat-8-returning)/bending)),point={x:(A.position.x+B.position.x)/2+offerForward*(Math.sin(A.yaw)+Math.sin(B.yaw))/2,y:1.14,z:(A.position.z+B.position.z)/2+offerForward*(Math.cos(A.yaw)+Math.cos(B.yaw))/2},reach=Math.max(Math.hypot(gap(a,point),.215),Math.hypot(gap(b,point),.215)),lateral=(p:typeof A,hand:Hand)=>(hand==='left'?1:-1)*((point.x-p.position.x)*Math.cos(p.yaw)-(point.z-p.position.z)*Math.sin(p.yaw)),offer=smooth((Math.min(lateral(A,h.handA),lateral(B,h.handB))-.26)/.06),reachable=smooth((.62-reach)/.04)*offer;if(reachable*strength>0)result.push({...h,point,strength:strength*reachable,kind:'joined'});};
  if(beat<=walking){for(const h of downHands){const paired=turn.mode==='couples'&&turn.pairs.some(p=>p.leftId===h.a&&p.rightId===h.b),release=paired?1:smooth((walking-beat)/.5);add(h,release);}}
  else if(beat<8){if(turn.mode==='couples')for(const p of turn.pairs)add({a:p.leftId,b:p.rightId,handA:'right',handB:'left'},1);}
  else {for(const h of returnHands){const retained=turn.mode==='couples'&&turn.pairs.some(p=>p.leftId===h.a&&p.rightId===h.b);add(h,retained?1:smooth((beat-8)/.5));}if(beat>8+returning)add(closing,smooth((beat-15)/1));}
  return result;
 };
 const sample=(beat:number):TravelFrame=>{beat=time(beat);const poses=ids.map(id=>root(id,beat));return{beat,phase:beat<walking?'down':beat<8?'turn':beat<8+returning?'return':'bend',poses,contacts:contactAt(beat,poses)};};
 const finalContacts=sample(16).contacts;
 if(finalContacts.length!==4||finalContacts.some(h=>h.strength<1-EPS))throw new Error('Bend-the-line must finish as a fully joined, reachable ring; oversized endpoint geometry cannot silently drop its hands.');
 const minimum=options.minimumClearance??.6,maximum=options.maximumSpeed??1.2,maxYaw=options.maximumYawRate??2;
 if(![minimum,maximum,maxYaw].every(v=>Number.isFinite(v)&&v>0))throw new Error('Physical clearance, speed and yaw-rate budgets must be finite and positive.');
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let i=0;i<=3200;i++){const f=sample(i/200);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,norm(p.velocity));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,gap(f.poses[a].position,f.poses[b].position));}
 if(minimumObservedClearance<minimum-EPS)throw new Error(`Hall travel root clearance ${minimumObservedClearance} is below ${minimum}.`);
 if(maximumObservedSpeed>maximum+EPS)throw new Error(`Hall travel root speed ${maximumObservedSpeed} exceeds ${maximum}.`);
 if(maximumObservedYawRate>maxYaw+EPS)throw new Error(`Hall travel yaw rate ${maximumObservedYawRate} exceeds ${maxYaw}.`);
 return Object.freeze({beats:16 as const,sourceBeatBudget:freeze([8,8] as const),phaseBeats:freeze(phaseBeats),phaseBoundaries:freeze(bounds),actorIds:freeze(ids),lineOrder:freeze(order),returnOrder:freeze(returned),turn,entry:readonlyMap(entry),exit:readonlyMap(exit),source,minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>root(id,time(t*16)).position,facing:(id:number,t:number)=>root(id,time(t*16)).yaw,contacts:(t:number,poses?:readonly Pose[])=>{const beat=time(t*16);return contactAt(beat,poses??ids.map(id=>root(id,beat)));}});
}
