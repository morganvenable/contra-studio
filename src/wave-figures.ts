/** Explicit short waves, wave balances and right-loop box circulation.
 *
 * A wave is an ordered hand graph, not a proximity search. Passing to a wave,
 * balancing in it, Rory-style sliding/spinning, and circulating are different
 * operations. This module deliberately does not implement or alias Rory slides.
 * Long-wave segments name only their internal hands; a full-set caller must
 * supply the between-minor-set connections separately. Source time is never added.
 */
import type {Hand,HandContact,Pose,Vec2} from './types.ts';
export interface WaveConstraint {position:Vec2;yaw:number;velocity:Vec2;yawRate:number;}
export interface WavePose extends WaveConstraint {id:number;acceleration:Vec2;yawAcceleration:number;}
export interface WaveHand {a:number;b:number;handA:Hand;handB:Hand;}
export interface WaveLine {order:readonly number[];axis:Vec2;}
export interface WaveGraph {lines:readonly WaveLine[];hands:readonly WaveHand[];}
export interface WaveSource {url:string;snapshotId:string;rowId:string;text:string;beats:number;}
export interface WaveFrame {beat:number;phase:'pass'|'form-wave'|'balance'|'circulate'|'allemande';poses:WavePose[];contacts:HandContact[];}
export interface WavePlan {
 readonly beats:number;readonly actorIds:readonly number[];readonly entry:ReadonlyMap<number,Readonly<WaveConstraint>>;readonly exit:ReadonlyMap<number,Readonly<WaveConstraint>>;
 readonly entryWave?:WaveGraph;readonly exitWave:WaveGraph;readonly source?:WaveSource;readonly phaseBoundaries:readonly number[];
 readonly minimumObservedClearance:number;readonly maximumObservedSpeed:number;readonly maximumObservedYawRate:number;
 sample(beat:number):WaveFrame;position(id:number,t:number):Vec2;facing(id:number,t:number,poses?:readonly Pose[]):number;contacts(t:number,poses?:readonly Pose[]):HandContact[];
}
interface Common {actorIds:readonly number[];entry:ReadonlyMap<number,WaveConstraint>;exit:ReadonlyMap<number,WaveConstraint>;minimumClearance?:number;maximumSpeed?:number;maximumYawRate?:number;source?:WaveSource;}
export interface PassToWaveOptions extends Common {
 beats:4;passingShoulder:'right';frame:{origin:Vec2;across:Vec2};
 /** Each side lists the incoming dancer on their own left, then their own right.
  * The right-side dancer becomes a center, regardless of role name. */
 sidePairs:readonly [{side:-1;leftId:number;rightId:number},{side:1;leftId:number;rightId:number}];
 crossingPairs:readonly (readonly [number,number])[];
 waveOrder:readonly [number,number,number,number];waveHands:readonly WaveHand[];
 acrossWidth:number;sideSpacing:number;waveSpacing:number;passClearance:number;crossingBeats:number;
}
export interface WaveBalanceOptions extends Common {beats:4;wave:WaveGraph;style:'right-left'|'forward-back';amplitude:number;}
export interface CirculateAssignment {id:number;destinationId:number;mode:'cross'|'loop-right';}
export interface BoxCirculateOptions extends Common {beats:4;frame:{origin:Vec2;across:Vec2};entryWave:WaveGraph;exitWave:WaveGraph;mapping:readonly CirculateAssignment[];}
const EPS=1e-7;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const finite=(p:Vec2)=>!!p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
const norm=(p:Vec2)=>Math.hypot(p.x,p.z);
const gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z);
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
const ease=(x:number)=>{const t=clamp(x);return t*t*t*(10+t*(-15+6*t));};
const easeD=(x:number)=>x<=0||x>=1?0:30*x*x*(1-x)*(1-x);
const easeDD=(x:number)=>x<=0||x>=1?0:60*x*(1-x)*(1-2*x);
/** C2 ramps with constant-speed walking in the middle. */
function progress(x:number,r=.18):[number,number,number]{const t=clamp(x),n=1-r;if(t>1-r){const[q,d,dd]=progress(1-t,r);return[1-q,d,-dd];}if(t<r){const u=t/r;return[r*(u*u*u-.5*u*u*u*u)/n,(3*u*u-2*u*u*u)/n,(6*u-6*u*u)/(r*n)];}return[(t-r/2)/n,1/n,0];}
function freeze<T>(x:T):T{if(x&&typeof x==='object'){for(const v of Object.values(x))freeze(v);Object.freeze(x);}return x;}
function readonlyMap<K,V>(map:Map<K,V>):ReadonlyMap<K,V>{const view:ReadonlyMap<K,V>=Object.freeze({get size(){return map.size;},get:(k:K)=>map.get(k),has:(k:K)=>map.has(k),entries:()=>map.entries(),keys:()=>map.keys(),values:()=>map.values(),[Symbol.iterator]:()=>map[Symbol.iterator](),forEach:(fn:(v:V,k:K,m:ReadonlyMap<K,V>)=>void,thisArg?:unknown)=>map.forEach((v,k)=>fn.call(thisArg,v,k,view))});return view;}
function own(options:Common,beats:number){
 const ids=[...options.actorIds];if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>!Number.isSafeInteger(id)||id<0))throw new Error('A wave operation requires four unique explicit stable actor IDs.');
 const copy=(m:ReadonlyMap<number,WaveConstraint>)=>{if(m.size!==4||ids.some(id=>!m.has(id)))throw new Error('Wave endpoints must contain exactly the four named actors.');return new Map(ids.map(id=>{const p=m.get(id)!;if(!p||!finite(p.position)||!finite(p.velocity)||![p.yaw,p.yawRate].every(Number.isFinite)||Math.abs(p.yaw)>1e6||Math.max(Math.abs(p.position.x),Math.abs(p.position.z))>1e6)throw new Error('Finite explicit wave endpoint positions, headings and derivatives are required.');if(norm(p.velocity)>EPS||Math.abs(p.yawRate)>EPS)throw new Error('The wave adapter requires stationary endpoint derivatives, rather than discarding incoming motion.');return[id,freeze({position:{...p.position},yaw:p.yaw,velocity:{...p.velocity},yawRate:p.yawRate})];}));};
 const source=options.source?freeze(structuredClone(options.source)):undefined;if(source&&(!source.url||!source.snapshotId||!source.rowId||!source.text||source.beats!==beats))throw new Error('Source provenance must retain its row identity and exact beat budget.');
 return{ids,entry:copy(options.entry),exit:copy(options.exit),source};
}
function frame(origin:Vec2,across:Vec2){
 origin={...origin};across={...across};if(!finite(origin)||!finite(across)||Math.abs(norm(across)-1)>EPS)throw new Error('A finite origin and unit across axis are required.');const along={x:-across.z,z:across.x},yaw=Math.atan2(across.x,across.z);
 return{origin,across,along,yaw,local:(p:Vec2)=>({x:(p.x-origin.x)*across.x+(p.z-origin.z)*across.z,z:(p.x-origin.x)*along.x+(p.z-origin.z)*along.z}),world:(p:Vec2)=>({x:origin.x+p.x*across.x+p.z*along.x,z:origin.z+p.x*across.z+p.z*along.z}),vector:(p:Vec2)=>({x:p.x*across.x+p.z*along.x,z:p.x*across.z+p.z*along.z})};
}
/** Validate topology, exact adjacency, facing and owned hand identity together. */
export function validateWaveGraph(raw:WaveGraph,poses:ReadonlyMap<number,WaveConstraint>,ids:readonly number[]):WaveGraph{
 const graph=freeze(structuredClone(raw)),seen:number[]=[],expected=new Set<string>(),hands=new Set<string>();
 if(!Array.isArray(graph.lines)||![1,2].includes(graph.lines.length)||!Array.isArray(graph.hands))throw new Error('A short wave or two explicit long-wave segments are required.');
 for(const line of graph.lines){if(!Array.isArray(line.order)||(graph.lines.length===1?line.order.length!==4:line.order.length!==2)||!finite(line.axis)||Math.abs(norm(line.axis)-1)>EPS)throw new Error('Wave lines need explicit ordered actors and a unit line axis.');
  for(let i=0;i<line.order.length;i++){const id=line.order[i],p=poses.get(id);if(!p||!ids.includes(id))throw new Error('A wave line references an unbound actor.');seen.push(id);if(Math.abs(Math.sin(p.yaw)*line.axis.x+Math.cos(p.yaw)*line.axis.z)>EPS)throw new Error('Wave actors must face perpendicular to their line.');
   if(i){const previous=line.order[i-1],a=poses.get(previous)!,dx=p.position.x-a.position.x,dz=p.position.z-a.position.z;if(dx*line.axis.x+dz*line.axis.z<.65||Math.abs(dx*line.axis.z-dz*line.axis.x)>EPS||Math.abs(Math.abs(wrap(p.yaw-a.yaw))-Math.PI)>EPS)throw new Error('Wave order must be collinear, separated, and alternating-facing.');expected.add(`${Math.min(id,previous)}:${Math.max(id,previous)}`);}}
 }
 if(seen.length!==ids.length||new Set(seen).size!==ids.length||graph.hands.length!==expected.size)throw new Error('Every actor and each adjacent wave handhold must be named exactly once.');
 for(const h of graph.hands){const pair=`${Math.min(h.a,h.b)}:${Math.max(h.a,h.b)}`;if(!expected.delete(pair)||h.a===h.b||!['left','right'].includes(h.handA)||!['left','right'].includes(h.handB))throw new Error('Wave hands must connect exactly adjacent named actors.');for(const[id,hand,other]of[[h.a,h.handA,h.b],[h.b,h.handB,h.a]] as const){const key=`${id}:${hand}`;if(hands.has(key))throw new Error('An actor hand cannot belong to two contacts.');hands.add(key);const p=poses.get(id)!,q=poses.get(other)!,toward=(q.position.x-p.position.x)*Math.cos(p.yaw)-(q.position.z-p.position.z)*Math.sin(p.yaw);if((hand==='left'?1:-1)*toward<=0)throw new Error('The named wave hand points away from its receiver.');}}
 return graph;
}
function contactsFor(graph:WaveGraph,poses:readonly Pick<Pose,'id'|'position'|'yaw'>[],strength=1):HandContact[]{
 const byId=new Map(poses.map(p=>[p.id,p]));if(byId.size!==poses.length||poses.some(p=>!finite(p.position)||!Number.isFinite(p.yaw)))throw new Error('Wave contacts need unique finite supplied poses.');if(strength<=0)return[];
 return graph.hands.map(h=>{const A=byId.get(h.a),B=byId.get(h.b);if(!A||!B)throw new Error('Wave contacts require every named actor.');const point={x:(A.position.x+B.position.x)/2,y:1.28,z:(A.position.z+B.position.z)/2};for(const[p,hand]of[[A,h.handA],[B,h.handB]] as const){const side=hand==='left'?1:-1,shoulder={x:p.position.x+side*.235*Math.cos(p.yaw),z:p.position.z-side*.235*Math.sin(p.yaw)};if(Math.hypot(gap(shoulder,point),point.y-1.355)>.62+EPS)throw new Error('A named wave contact is beyond fixed adult arm reach.');}return{...h,point,strength,kind:'joined' as const};});
}
function makePlan(options:Common,owned:ReturnType<typeof own>,beats:number,bounds:number[],exitWave:WaveGraph,root:(id:number,beat:number)=>WavePose,phase:(beat:number)=>WaveFrame['phase'],held:(beat:number,poses:readonly Pick<Pose,'id'|'position'|'yaw'>[])=>HandContact[],entryWave?:WaveGraph):WavePlan{
 const time=(beat:number)=>{if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');return Math.max(0,Math.min(beats,beat));},sample=(beat:number):WaveFrame=>{beat=time(beat);const poses=owned.ids.map(id=>root(id,beat));return{beat,phase:phase(beat),poses,contacts:held(beat,poses)};};
 const minimum=options.minimumClearance??.6,maximum=options.maximumSpeed??1.25,maxYaw=options.maximumYawRate??2.5;if(![minimum,maximum,maxYaw].every(v=>Number.isFinite(v)&&v>0))throw new Error('Wave clearance, speed and yaw budgets must be finite and positive.');
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0,maximumObservedYawRate=0;
 for(let i=0;i<=800;i++){const f=sample(beats*i/800);for(const p of f.poses){maximumObservedSpeed=Math.max(maximumObservedSpeed,norm(p.velocity));maximumObservedYawRate=Math.max(maximumObservedYawRate,Math.abs(p.yawRate));}for(let a=0;a<4;a++)for(let b=a+1;b<4;b++)minimumObservedClearance=Math.min(minimumObservedClearance,gap(f.poses[a].position,f.poses[b].position));}
 if(minimumObservedClearance<minimum-EPS)throw new Error(`Wave root clearance ${minimumObservedClearance} is below ${minimum}.`);if(maximumObservedSpeed>maximum+EPS)throw new Error(`Wave speed ${maximumObservedSpeed} exceeds ${maximum}.`);if(maximumObservedYawRate>maxYaw+EPS)throw new Error(`Wave yaw rate ${maximumObservedYawRate} exceeds ${maxYaw}.`);
 for(const[beat,expected]of[[0,owned.entry],[beats,owned.exit]] as const)for(const p of sample(beat).poses){const e=expected.get(p.id)!;if(gap(p.position,e.position)>EPS||Math.abs(wrap(p.yaw-e.yaw))>EPS||norm(p.velocity)>EPS||Math.abs(p.yawRate)>EPS)throw new Error('Wave motion contradicts the explicit endpoint mapping.');}
 return Object.freeze({beats,actorIds:freeze(owned.ids),entry:readonlyMap(owned.entry),exit:readonlyMap(owned.exit),entryWave,exitWave,source:owned.source,phaseBoundaries:freeze(bounds),minimumObservedClearance,maximumObservedSpeed,maximumObservedYawRate,sample,position:(id:number,t:number)=>{if(!owned.entry.has(id))throw new Error('Actor is outside this bound wave.');return root(id,time(t*beats)).position;},facing:(id:number,t:number)=>{if(!owned.entry.has(id))throw new Error('Actor is outside this bound wave.');return root(id,time(t*beats)).yaw;},contacts:(t:number,poses?:readonly Pose[])=>{const beat=time(t*beats);return held(beat,poses??owned.ids.map(id=>root(id,beat)));}});
}
/** Four musical beats: right-shoulder crossing, then the incoming right-side
 * dancers fold left to centers and the incoming left-side dancers turn right to
 * ends. Incoming roles do not determine those positions. */
export function compilePassToWave(options:PassToWaveOptions):WavePlan{
 if(options.beats!==4||options.passingShoulder!=='right')throw new Error('Pass-to-wave requires an explicit four-beat right-shoulder pass.');
 const owned=own(options,4),{ids,entry,exit}=owned,F=frame(options.frame.origin,options.frame.across),w=options.acrossWidth/2,d=options.sideSpacing/2,s=options.waveSpacing,cross=options.crossingBeats,turn=4-cross,clear=options.passClearance;
 if(![w,d,s,cross,clear].every(Number.isFinite)||w<.6||w>1.1||d<.35||d>1||s<.7||s>1.05||cross<2||cross>3||clear<.6||clear>.8)throw new Error('Pass-to-wave geometry and its within-four-beat allocation are outside the reviewed envelope.');
 const pairs=structuredClone(options.sidePairs);if(pairs.length!==2||pairs[0].side!==-1||pairs[1].side!==1||new Set(pairs.flatMap(p=>[p.leftId,p.rightId])).size!==4||pairs.flatMap(p=>[p.leftId,p.rightId]).some(id=>!ids.includes(id)))throw new Error('Name both incoming left/right side pairs explicitly.');
 const actor=new Map<number,{side:number;center:boolean;start:Vec2;target:Vec2;endYaw:number}>();
 for(const p of pairs)for(const[id,center]of[[p.leftId,false],[p.rightId,true]] as const){const a=entry.get(id)!,start=F.local(a.position),expected={x:p.side*w,z:(center?-p.side:p.side)*d},yaw=F.yaw+(p.side===1?Math.PI:0),target={x:-p.side*s*(center?.5:1.5),z:0},endYaw=yaw+(center?Math.PI/2:-Math.PI/2);if(gap(start,expected)>EPS||Math.abs(wrap(a.yaw-yaw))>EPS)throw new Error('Incoming side-pair slots must face across, with their own left/right positions explicit.');if(gap(exit.get(id)!.position,F.world(target))>EPS||Math.abs(wrap(exit.get(id)!.yaw-endYaw))>EPS)throw new Error('Pass-to-wave exits must preserve centers, ends and the named quarter-turns.');actor.set(id,{side:p.side,center,start,target,endYaw:a.yaw+wrap(endYaw-a.yaw)});}
 const expectedOrder=[pairs[1].leftId,pairs[1].rightId,pairs[0].rightId,pairs[0].leftId];if(options.waveOrder.length!==4||options.waveOrder.some((id,i)=>id!==expectedOrder[i]))throw new Error('The explicit wave order contradicts the right-shoulder pass permutation.');
 const crossingPairs=options.crossingPairs.map(p=>[...p]);if(crossingPairs.length!==2||new Set(crossingPairs.flat()).size!==4||crossingPairs.some(([a,b])=>!actor.has(a)||!actor.has(b)||actor.get(a)!.side===actor.get(b)!.side||Math.abs(actor.get(a)!.start.z-actor.get(b)!.start.z)>EPS))throw new Error('Explicit crossing pairs must name the two opposite actors in each incoming lane.');
 const wave=validateWaveGraph({lines:[{order:[...options.waveOrder],axis:F.across}],hands:options.waveHands},exit,ids);
 // Use the outer dancer's actual arc length as a shared clock. This keeps the
 // four-beat walk steady through the curved approach rather than accelerating
 // the outer actors sharply while the centers finish. The shared clock retains
 // the complete collision-checked four-actor geometry and shoulder ordering.
 const outerDx=w+1.5*s,metric=(q:number)=>{const u=(q-.25)/.75,zD=d*easeD(u)/.75-clear/2*Math.PI*Math.sin(2*Math.PI*q),zDD=d*easeDD(u)/(.75*.75)-clear*Math.PI**2*Math.cos(2*Math.PI*q),m=Math.hypot(outerDx,zD);return[m,zD*zDD/m] as const;},N=2048,cumulative=[0];
 for(let i=0;i<N;i++){const a=i/N,b=(i+1)/N;cumulative.push(cumulative[i]+(metric(a)[0]+4*metric((a+b)/2)[0]+metric(b)[0])/(6*N));}
 const length=cumulative[N],clock=(beat:number):[number,number,number]=>{const[p,v,a]=progress(beat/4,.08),wanted=p*length;if(p===0||p===1)return[p,0,0];let lo=0,hi=N;while(hi-lo>1){const mid=(lo+hi)>>1;if(cumulative[mid]<wanted)lo=mid;else hi=mid;}const base=lo/N,end=(lo+1)/N;let q=base+(end-base)*(wanted-cumulative[lo])/(cumulative[lo+1]-cumulative[lo]);for(let j=0;j<3;j++){const integral=(q-base)*(metric(base)[0]+4*metric((base+q)/2)[0]+metric(q)[0])/6;q=Math.max(base,Math.min(end,q-(cumulative[lo]+integral-wanted)/metric(q)[0]));}const[m,derivative]=metric(q),dq=length*v/(4*m),ddq=length*a/(16*m)-derivative*dq*dq/m;return[q,dq,ddq];};
 const root=(id:number,beat:number):WavePose=>{const a=entry.get(id)!,v=actor.get(id)!,[q,dq,ddq]=clock(beat),dx=v.target.x-v.start.x,offset=v.side*clear/2,phase=Math.PI*q,bump=Math.sin(phase)**2,bd=Math.PI*Math.sin(2*phase),bdd=2*Math.PI**2*Math.cos(2*phase),u=(q-.25)/.75,base=1-ease(u),baseD=-easeD(u)/.75,baseDD=-easeDD(u)/(.75*.75),advance=v.center?.24:0,xq=q+advance*Math.sin(phase),xd=1+advance*Math.PI*Math.cos(phase),xdd=-advance*Math.PI**2*Math.sin(phase),p={x:v.start.x+dx*xq,z:v.start.z*base+offset*bump},velocity={x:dx*xd*dq,z:(v.start.z*baseD+offset*bd)*dq},acceleration={x:dx*(xdd*dq*dq+xd*ddq),z:((v.start.z*baseDD+offset*bdd)*dq*dq+(v.start.z*baseD+offset*bd)*ddq)},turnProgress=(beat-cross)/turn,dyaw=v.endYaw-a.yaw;
  return{id,position:F.world(p),velocity:F.vector(velocity),acceleration:F.vector(acceleration),yaw:a.yaw+dyaw*ease(turnProgress),yawRate:dyaw*easeD(turnProgress)/turn,yawAcceleration:dyaw*easeDD(turnProgress)/(turn*turn)};};
 return makePlan(options,owned,4,[0,cross,4],wave,root,b=>b<cross?'pass':'form-wave',(beat,poses)=>beat<3.8?[]:contactsFor(wave,poses,ease((beat-3.8)/.2)));
}
/** A named wave balance retains its hand graph; no permutation or progression. */
export function compileWaveBalance(options:WaveBalanceOptions):WavePlan{
 if(options.beats!==4||!['right-left','forward-back'].includes(options.style)||!Number.isFinite(options.amplitude)||options.amplitude<=0||options.amplitude>.14)throw new Error('Wave balance needs four beats, an explicit balance style and amplitude in (0,.14].');
 const owned=own(options,4),{ids,entry,exit}=owned,wave=validateWaveGraph(options.wave,entry,ids);validateWaveGraph(wave,exit,ids);for(const id of ids)if(gap(entry.get(id)!.position,exit.get(id)!.position)>EPS||Math.abs(wrap(entry.get(id)!.yaw-exit.get(id)!.yaw))>EPS)throw new Error('A wave balance cannot silently change slots or facing.');
 const amplitude=options.amplitude,style=options.style;
 const root=(id:number,beat:number):WavePose=>{const a=entry.get(id)!,i=Math.min(3,Math.floor(beat)),u=beat-i,values=[0,1,0,-1,0],delta=values[i+1]-values[i],q=(values[i]+delta*ease(u))*amplitude,v=delta*easeD(u)*amplitude,acc=delta*easeDD(u)*amplitude,axis=style==='right-left'?{x:-Math.cos(a.yaw),z:Math.sin(a.yaw)}:{x:Math.sin(a.yaw),z:Math.cos(a.yaw)};return{id,position:{x:a.position.x+axis.x*q,z:a.position.z+axis.z*q},yaw:a.yaw,velocity:{x:axis.x*v,z:axis.z*v},acceleration:{x:axis.x*acc,z:axis.z*acc},yawRate:0,yawAcceleration:0};};
 return makePlan(options,owned,4,[0,1,2,3,4],wave,root,()=> 'balance',(_beat,poses)=>contactsFor(wave,poses),wave);
}
/** Four-slot box circulate: inward facers cross straight; outward facers loop
 * right into the next same-side slot. Actor-to-vacated-slot mapping is mandatory.
 * No partner/neighbor identity is rebound by this permutation. */
export function compileBoxCirculate(options:BoxCirculateOptions):WavePlan{
 if(options.beats!==4)throw new Error('Box circulate uses exactly four source beats.');const owned=own(options,4),{ids,entry,exit}=owned,F=frame(options.frame.origin,options.frame.across),entryWave=validateWaveGraph(options.entryWave,entry,ids),exitWave=validateWaveGraph(options.exitWave,exit,ids);
 if(entryWave.lines.length!==2||exitWave.lines.length!==2)throw new Error('This box circulate requires two explicitly ordered long-wave segments.');
 const local=new Map(ids.map(id=>[id,F.local(entry.get(id)!.position)])),width=Math.abs(local.get(ids[0])!.x),depth=Math.abs(local.get(ids[0])!.z);
 if(width<.6||width>1.1||depth<.35||depth>.65||ids.some(id=>Math.abs(Math.abs(local.get(id)!.x)-width)>EPS||Math.abs(Math.abs(local.get(id)!.z)-depth)>EPS)||new Set([...local.values()].map(p=>`${Math.sign(p.x)}:${Math.sign(p.z)}`)).size!==4)throw new Error('Box circulate requires four distinct rectangular corner slots with reachable side-wave spacing.');
 const mapping=structuredClone(options.mapping);if(mapping.length!==4||new Set(mapping.map(m=>m.id)).size!==4||new Set(mapping.map(m=>m.destinationId)).size!==4||mapping.some(m=>!ids.includes(m.id)||!ids.includes(m.destinationId)||m.id===m.destinationId||!['cross','loop-right'].includes(m.mode))||mapping.filter(m=>m.mode==='cross').length!==2)throw new Error('Name a complete one-to-one circulate permutation with two crossers and two right-loopers.');
 const byId=new Map(mapping.map(m=>[m.id,m]));
 for(const m of mapping){const p=local.get(m.id)!,side=Math.sign(p.x),out=m.mode==='loop-right',expected=out?{x:p.x,z:-p.z}:{x:-p.x,z:p.z},heading=F.yaw+(out?(side===1?0:Math.PI):(side===1?Math.PI:0)),a=entry.get(m.id)!,b=exit.get(m.id)!;
  if(Math.abs(wrap(a.yaw-heading))>EPS||out&&Math.sign(p.z)!==-side)throw new Error('Crossers must face in and right-loopers must face out toward their next same-box right slot.');
  if(gap(local.get(m.destinationId)!,expected)>EPS||gap(b.position,F.world(expected))>EPS||Math.abs(wrap(b.yaw-a.yaw+(out?Math.PI:0)))>EPS)throw new Error('The explicit circulate mapping or exit heading contradicts the named cross/right-loop action.');
 }
 const root=(id:number,beat:number):WavePose=>{const a=entry.get(id)!,p=local.get(id)!,m=byId.get(id)!,side=Math.sign(p.x),[q,d,dd]=progress(beat/4);let position:Vec2,velocity:Vec2,acceleration:Vec2,yaw=a.yaw,yawRate=0,yawAcceleration=0;
  if(m.mode==='cross'){position={x:p.x*(1-2*q),z:p.z};velocity={x:-2*p.x*d/4,z:0};acceleration={x:-2*p.x*dd/16,z:0};}
  else{const theta=Math.PI*q,omega=Math.PI*d/4,alpha=Math.PI*dd/16;position={x:p.x+side*depth*Math.sin(theta),z:p.z*Math.cos(theta)};velocity={x:side*depth*Math.cos(theta)*omega,z:-p.z*Math.sin(theta)*omega};acceleration={x:side*depth*(-Math.sin(theta)*omega**2+Math.cos(theta)*alpha),z:-p.z*(Math.cos(theta)*omega**2+Math.sin(theta)*alpha)};yaw-=theta;yawRate=-omega;yawAcceleration=-alpha;}
  return{id,position:F.world(position),velocity:F.vector(velocity),acceleration:F.vector(acceleration),yaw,yawRate,yawAcceleration};};
 return makePlan(options,owned,4,[0,4],exitWave,root,()=> 'circulate',(beat,poses)=>beat<.15?contactsFor(entryWave,poses,1-ease(beat/.15)):beat>3.85?contactsFor(exitWave,poses,ease((beat-3.85)/.15)):[],entryWave);
}

export interface WaveAllemandeOptions extends Common {
 beats:2;mode:'paired-right-half'|'centers-left-half';
 entryWave:WaveGraph;exitWave:WaveGraph;
 /** Exactly the named active hand pairs, without selecting by actor ID order. */
 pairs:readonly (readonly [number,number])[];
}
/** Exact half-allemandes inside a short wave. They finish the literal swapped
 * slots and never hide a swing-layout reset in these two musical counts. */
export function compileWaveAllemande(options:WaveAllemandeOptions):WavePlan{
 if(options.beats!==2||!['paired-right-half','centers-left-half'].includes(options.mode))throw new Error('This wave allemande requires an explicit two-count paired-right or centers-left half-turn.');
 const owned=own(options,2),{ids,entry,exit}=owned,entryWave=validateWaveGraph(options.entryWave,entry,ids),exitWave=validateWaveGraph(options.exitWave,exit,ids);if(entryWave.lines.length!==1||exitWave.lines.length!==1)throw new Error('The half-allemande requires one explicit short wave.');
 const order=entryWave.lines[0].order,paired=options.mode==='paired-right-half',wanted=paired?[[order[0],order[1]],[order[2],order[3]]]:[[order[1],order[2]]],pairs=structuredClone(options.pairs),sign=paired?1:-1,hand:Hand=paired?'right':'left',active=new Set(pairs.flat());
 if(pairs.length!==wanted.length||new Set(pairs.flat()).size!==pairs.length*2||pairs.some(pair=>pair.length!==2||!wanted.some(p=>p.includes(pair[0])&&p.includes(pair[1]))))throw new Error('Active half-allemande pairs must match the explicitly named adjacent wave hands.');
 const byId=new Map<number,{other:number;center:Vec2;radial:Vec2}>();for(const[a,b]of pairs){const A=entry.get(a)!,B=entry.get(b)!,center={x:(A.position.x+B.position.x)/2,z:(A.position.z+B.position.z)/2};for(const[id,other]of[[a,b],[b,a]])byId.set(id,{other,center,radial:{x:entry.get(id)!.position.x-center.x,z:entry.get(id)!.position.z-center.z}});if(!entryWave.hands.some(h=>(h.a===a&&h.b===b||h.a===b&&h.b===a)&&h.handA===hand&&h.handB===hand))throw new Error('The named half-allemande lacks its correct incoming joined hands.');}
 for(const id of ids){const a=entry.get(id)!,b=exit.get(id)!,other=byId.get(id)?.other,wanted=other===undefined?a.position:entry.get(other)!.position;if(gap(b.position,wanted)>EPS||Math.abs(wrap(b.yaw-a.yaw+(other===undefined?0:sign*Math.PI)))>EPS)throw new Error('A two-count half-allemande must actually exchange the named slots and reverse active facing.');}
 const root=(id:number,beat:number):WavePose=>{const a=entry.get(id)!,v=byId.get(id);if(!v)return{id,position:{...a.position},yaw:a.yaw,velocity:{x:0,z:0},acceleration:{x:0,z:0},yawRate:0,yawAcceleration:0};const[q,d,dd]=progress(beat/2,.08),theta=sign*Math.PI*q,omega=sign*Math.PI*d/2,alpha=sign*Math.PI*dd/4,c=Math.cos(theta),s=Math.sin(theta),r={x:v.radial.x*c-v.radial.z*s,z:v.radial.x*s+v.radial.z*c};return{id,position:{x:v.center.x+r.x,z:v.center.z+r.z},velocity:{x:-r.z*omega,z:r.x*omega},acceleration:{x:-r.x*omega*omega-r.z*alpha,z:-r.z*omega*omega+r.x*alpha},yaw:a.yaw-theta,yawRate:-omega,yawAcceleration:-alpha};};
 const activeHands=entryWave.hands.filter(h=>active.has(h.a)&&active.has(h.b)&&pairs.some(p=>p.includes(h.a)&&p.includes(h.b))),withoutActive=(graph:WaveGraph)=>graph.hands.filter(h=>!activeHands.some(a=>(a.a===h.a&&a.b===h.b||a.a===h.b&&a.b===h.a)&&a.handA===h.handA&&a.handB===h.handB));
 return makePlan(options,owned,2,[0,2],exitWave,root,()=> 'allemande',(beat,poses)=>[...contactsFor({...entryWave,hands:activeHands},poses),...(beat<.15?contactsFor({...entryWave,hands:withoutActive(entryWave)},poses,1-ease(beat/.15)):[]),...(beat>1.85?contactsFor({...exitWave,hands:withoutActive(exitWave)},poses,ease((beat-1.85)/.15)):[])],entryWave);
}
