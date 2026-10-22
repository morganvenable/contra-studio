/** Actual four-person line entry and a partner swing that reaches that line.
 * Geometry is a reviewed compact convention; IDs come from actual partner pairs. */
import {compileHallTravel,type TravelConstraint} from './travel-figures.ts';
import {compilePrimitiveFigure} from './engine.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';
import type {Figure,Pose,HandContact} from './types.ts';
const EPS=1e-7;
const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
export interface HallLineSlots {order:readonly number[];center:{x:number;z:number};positions:ReadonlyMap<number,{x:number;z:number}>;}
/** Resolve partners in two actual side stations, retaining their side and role. */
export function hallLineSlots(context:FigureContext):HallLineSlots {
 const {ids,start,dancers}=context;if(ids.length!==4)throw Error('Hall line requires four actors.');
 const center={x:ids.reduce((n,id)=>n+start[id].position.x/4,0),z:ids.reduce((n,id)=>n+start[id].position.z/4,0)};
 const relation=context.relations?.partner;if(!relation)throw Error('Hall line requires an explicit partner map.');
 const select=(side:number,role:string)=>{const matches=ids.filter(id=>dancers[id].role===role&&Math.sign(start[id].position.x-center.x)===side);if(matches.length!==1)throw Error('Hall line producer requires one actor of each role on each side.');return matches[0];};
 const order=[select(1,'lark'),select(1,'robin'),select(-1,'lark'),select(-1,'robin')];
 for(const[a,b]of[[order[0],order[1]],[order[2],order[3]]])if(relation.get(a)!==b)throw Error('Hall line side pair is not the actual partner pair.');
 return{order,center,positions:new Map(order.map((id,i)=>[id,{x:center.x+(1.5-i)*.9,z:center.z+.64}]))};
}
export function compileActualLineHall(context:FigureContext,slots:HallLineSlots,turn:'couples'|'alone'='couples'){
 const {ids,start}=context,{order,center}=slots;
 if(order.length!==4||new Set(order).size!==4||order.some(id=>!ids.includes(id)))throw Error('Hall line order must retain all actual actors.');
 for(const id of ids){const p=slots.positions.get(id)!;if(Math.hypot(start[id].position.x-p.x,start[id].position.z-p.z)>EPS||Math.abs(wrap(start[id].yaw))>EPS)throw Error('Hall travel must start in its actual down-facing four-person line.');}
 const returned=turn==='couples'?[order[2],order[3],order[0],order[1]]:[...order].reverse();
 const constraint=(p:{x:number;z:number},yaw:number):TravelConstraint=>({position:p,yaw,velocity:{x:0,z:0},yawRate:0});
 const exit=new Map(returned.map((id,i)=>{const x=(i<2?-1:1)*.64,z=(i===0||i===3?-1:1)*.64;return[id,constraint({x:center.x+x,z:center.z+z},Math.atan2(-x,-z))];}));
 const hands=(a:readonly number[])=>a.slice(0,3).map((id,i)=>({a:id,b:a[i+1],handA:'right' as const,handB:'left' as const}));
 return compileHallTravel({actorIds:ids,lineOrder:order as [number,number,number,number],entry:new Map(ids.map(id=>[id,constraint({...start[id].position},start[id].yaw)])),exit,frame:{origin:{x:center.x,z:center.z+.64},down:{x:0,z:1}},turn:turn==='couples'?{mode:'couples',pairs:[{leftId:order[0],rightId:order[1],halfTurn:1},{leftId:order[2],rightId:order[3],halfTurn:1}]}:{mode:'alone',actors:order.map(id=>({id,halfTurn:1}))},downHands:hands(order),returnHands:hands(returned),closingHands:{a:returned[3],b:returned[0],handA:'right',handB:'left'},beats:16,sourceBeatBudget:[8,8],phaseBeats:[4,4,4,4],lineSpacing:.9,travelDistance:.6,ringWidth:1.28,ringDepth:1.28});
}
export function compileHallLineSwing(figure:Figure,context:FigureContext):MotionPlan {
 if(figure.kind!=='swing'||figure.who!=='partner'||figure.beats!==8||Object.keys(figure).some(k=>!['id','label','kind','who','beats','confidence'].includes(k)))throw Error('Line exit requires an ordinary eight-count partner swing.');
 const slots=hallLineSlots(context),{ids,start,dancers}=context,partner=context.relations!.partner;
 const kernel=compilePrimitiveFigure(figure,ids,start,dancers,[],{swingEntry:'prepared-circle',geometry:{halfWidth:.64,rowGap:1.28}});
 const data=new Map(ids.map(id=>{const other=partner.get(id)!,p=start[id].position,q=start[other].position,c={x:(p.x+q.x)/2,z:(p.z+q.z)/2};if(Math.abs(Math.hypot(p.x-q.x,p.z-q.z)-.62)>EPS)throw Error('Line-exit swing needs a reached closed partner frame.');const theta=Math.atan2(p.z-c.z,p.x-c.x),target=slots.positions.get(id)!,otherTarget=slots.positions.get(other)!,endCenter={x:(target.x+otherTarget.x)/2,z:target.z},endAngle=dancers[id].role==='lark'?0:Math.PI,net=2*Math.PI+((endAngle-theta)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);return[id,{c,theta,net,endCenter}];}));
 const progress=(t:number)=>{const a=.15/8,b=2.4/8,n=1-(a+b)/2;if(t<a){const u=t/a;return a*(u*u*u-.5*u*u*u*u)/n;}if(t>1-b){const u=(1-t)/b;return 1-b*(u*u*u-.5*u*u*u*u)/n;}return(t-a/2)/n;};
 const time=(t:number)=>{if(!Number.isFinite(t))throw Error('Invalid line swing clock.');return Math.max(0,Math.min(1,t));};
 const position=(id:number,raw:number)=>{const t=time(raw),d=data.get(id);if(!d)throw Error('Unknown line swing actor.');const u=smooth((t-.75)/.25),angle=d.theta+d.net*progress(t),r=.31+(.45-.31)*u;return{x:d.c.x+(d.endCenter.x-d.c.x)*u+Math.cos(angle)*r,z:d.c.z+(d.endCenter.z-d.c.z)*u+Math.sin(angle)*r};};
 const facing=(id:number,raw:number)=>{const t=time(raw),d=data.get(id);if(!d)throw Error('Unknown line swing actor.');const body=-d.theta-d.net*progress(t)-Math.PI/2+Math.PI/3,end=-d.theta-d.net-Math.PI/2+Math.PI/3,target=end+wrap(-end);return body+(target-body)*smooth((t-.75)/.25);};
 const terminal=start.map(p=>({...p,position:slots.positions.has(p.id)?{...slots.positions.get(p.id)!}:{...p.position},yaw:ids.includes(p.id)?0:p.yaw})),line=compileActualLineHall({...context,start:terminal},slots);
 const contacts=(raw:number,poses:Pose[]):HandContact[]=>{const t=time(raw);const frame=kernel.contacts(t,poses).map(h=>{const reach=(id:number,hand:string)=>{const p=poses[id],s=hand==='left'?1:-1;return Math.hypot(h.point.x-p.position.x-s*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+s*.235*Math.sin(p.yaw));};return{...h,strength:h.strength*(1-smooth((t-.65)/.10))*smooth((.64-Math.max(reach(h.a,h.handA),h.target==='hands'?reach(h.b,h.handB):0))/.01)};}).filter(h=>h.strength>1e-9);const joined=line.contacts(0,poses).map(h=>({...h,strength:h.strength*smooth((t*8-7.5)/.5)})).filter(h=>h.strength>1e-9);return [...frame,...joined];};
 for(const id of ids)if(Math.hypot(position(id,0).x-start[id].position.x,position(id,0).z-start[id].position.z)>EPS||Math.abs(wrap(facing(id,0)-start[id].yaw))>EPS)throw Error('Line swing must retain its reached incoming frame.');
 return{position,facing,contacts};
}

/** Complete the return before acquiring the following same-neighbor balance. */
export function compileHallNeighborDosido(figure:Figure,context:FigureContext):MotionPlan {
 if(figure.kind!=='do-si-do'||figure.who!=='neighbor'||figure.amount!==1||figure.direction!=='right'||figure.beats!==8||context.next?.kind!=='balance'||context.next.who!=='neighbor'||context.next.beats!==4)throw Error('Hall do-si-do preparation requires its complete eight-count turn and immediate same-neighbor balance.');
 const {ids,start,dancers}=context,neighbors=context.relations!.neighbor,base=compilePrimitiveFigure(figure,ids,start,dancers,[]),prepared=start.map(p=>({...p,position:{...p.position}}));
 for(const id of ids){const q=start[neighbors.get(id)!].position,p=start[id].position,c={x:(p.x+q.x)/2,z:(p.z+q.z)/2},r=Math.hypot(p.x-c.x,p.z-c.z);if(Math.abs(2*r-1.28)>EPS)throw Error('Neighbor balance approach requires actual compact 1.28 stations.');prepared[id].position={x:c.x+(p.x-c.x)*.59/r,z:c.z+(p.z-c.z)*.59/r};}
 const balance=compilePrimitiveFigure(context.next,ids,prepared,dancers,[],{balanceEntry:'held-two-hand',balanceExit:'same-person-swing'});
 const position=(id:number,t:number)=>{const beat=Math.max(0,Math.min(8,t*8));if(beat<=7)return base.position(id,beat/7);const u=smooth(beat-7),p=start[id].position,q=prepared[id].position;return{x:p.x+(q.x-p.x)*u,z:p.z+(q.z-p.z)*u};};
 return{position,facing:(id,t)=>base.facing(id,Math.min(1,t*8/7),start),contacts:(t,poses)=>balance.contacts(0,poses).map(h=>({...h,strength:h.strength*smooth((t*8-7.5)/.5)})).filter(h=>h.strength>0)};
}
