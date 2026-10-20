/** Explicit under-an-arch place exchange. Reviewed root/hand foundation for the explicitly registered conventional
 * box-the-gnat adapter; other underarm interpretations require their own review.
 * Primary descriptions: Caller’s Box Glossary, Box the gnat; Paul Balliet’s
 * Twirling Dervish Returns glossary. Actor identities and over/under choice are
 * inputs, never inferred from gender or current nearest-person distance. */
export interface ArchPoint {x:number;z:number}
export interface ArchActor {id:string;position:ArchPoint;yaw:number}
export interface ArchOptions {
 entry:readonly ArchActor[];exit:readonly ArchActor[];overId:string;underId:string;
 hand:'right'|'left';beats:number;minimumClearance?:number;maximumSpeed?:number;
}
export interface ArchPose extends ArchActor {velocity:ArchPoint;angularVelocity:number;under:boolean;archProgress:number;kneeLowering:number}
export interface ArchFrame {beat:number;poses:ArchPose[];contacts:{a:string;b:string;handA:'right'|'left';handB:'right'|'left';point:{x:number;y:number;z:number};strength:number;kind:'arch';underId:string}[]}
const dist=(a:ArchPoint,b:ArchPoint)=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:ArchPoint,b:ArchPoint)=>Math.atan2(b.x-a.x,b.z-a.z);
const turn=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
const progress=(time:number):number=>{const t=Math.max(0,Math.min(1,time)),r=.18,n=1-r;if(t<r){const u=t/r;return r*(u*u*u-.5*u*u*u*u)/n;}if(t>1-r)return 1-progress(1-t);return(t-r/2)/n;};
const snapshot=(actors:readonly ArchActor[])=>actors.map(a=>({id:a.id,position:{...a.position},yaw:a.yaw}));
export function compileArchExchange(options:ArchOptions){
 const entry=snapshot(options.entry),exit=snapshot(options.exit),{overId,underId,hand,beats}=options;
 if(!Number.isFinite(beats)||beats<3||beats>16)throw new Error('An arch exchange needs an explicit supported 3–16 beat budget.');
 if(hand!=='right'&&hand!=='left')throw new Error('The arch hand must be explicit.');
 if(entry.length!==2||exit.length!==2||overId===underId||![overId,underId].every(id=>typeof id==='string'&&id.length>0&&entry.filter(a=>a.id===id).length===1&&exit.filter(a=>a.id===id).length===1))throw new Error('Exactly two stable over/under actor identities are required.');
 if([...entry,...exit].some(a=>![a.position.x,a.position.z,a.yaw].every(Number.isFinite)))throw new Error('Arch endpoints must be finite.');
 const A=entry.find(a=>a.id===overId)!,B=entry.find(a=>a.id===underId)!,X=exit.find(a=>a.id===overId)!,Z=exit.find(a=>a.id===underId)!,spacing=dist(A.position,B.position),finalSpacing=dist(X.position,Z.position),center={x:(A.position.x+B.position.x)/2,z:(A.position.z+B.position.z)/2};
 if(spacing<.9||spacing>1.2||finalSpacing<.9||finalSpacing>1.8+1e-8)throw new Error('The arch requires a reachable .9–1.2 entry stance and .9–1.8 exit spacing.');
 const u={x:(B.position.x-A.position.x)/spacing,z:(B.position.z-A.position.z)/spacing},w={x:u.z*(hand==='right'?1:-1),z:-u.x*(hand==='right'?1:-1)},initialYaw=angle(A.position,B.position),sign=hand==='right'?1:-1;
 if(Math.abs(turn(A.yaw,initialYaw))>1e-6||Math.abs(turn(B.yaw,initialYaw+Math.PI))>1e-6||Math.abs(turn(X.yaw,initialYaw+sign*Math.PI))>1e-6||Math.abs(turn(Z.yaw,initialYaw+Math.PI-sign*Math.PI))>1e-6)throw new Error('This arch adapter requires facing entry and facing, exchanged exit headings.');
 if(dist(X.position,{x:center.x+u.x*finalSpacing/2,z:center.z+u.z*finalSpacing/2})>1e-6||dist(Z.position,{x:center.x-u.x*finalSpacing/2,z:center.z-u.z*finalSpacing/2})>1e-6)throw new Error('Exit constraints must exchange the same two slots about the same center.');
 const minimum=options.minimumClearance??.5,maximum=options.maximumSpeed??1.5;
 if(!Number.isFinite(minimum)||minimum<=0||!Number.isFinite(maximum)||maximum<=0)throw new Error('Finite positive physical budgets are required.');
 const roots=(beat:number)=>{const t=Math.max(0,Math.min(1,beat/beats)),q=progress(t),theta=Math.PI*q,r=spacing/2+(finalSpacing-spacing)/2*smooth((q-.58)/.42),along=r*Math.cos(theta),around=.63*Math.sin(theta),underArc=.11*Math.sin(theta);
  return[{id:overId,position:{x:center.x-u.x*along+w.x*around,z:center.z-u.z*along+w.z*around},yaw:initialYaw+sign*theta,under:false},{id:underId,position:{x:center.x+u.x*along+w.x*underArc,z:center.z+u.z*along+w.z*underArc},yaw:initialYaw+Math.PI-sign*theta,under:true}];};
 function sample(beat:number):ArchFrame {
  if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');const t=Math.max(0,Math.min(beats,beat)),q=progress(t/beats),values=roots(t),h=1e-5,left=roots(Math.max(0,t-h)),right=roots(Math.min(beats,t+h)),dt=Math.min(beats,t+h)-Math.max(0,t-h);
  const poses=values.map((p,i)=>({...p,velocity:{x:(right[i].position.x-left[i].position.x)/dt,z:(right[i].position.z-left[i].position.z)/dt},angularVelocity:(right[i].yaw-left[i].yaw)/dt,archProgress:q,kneeLowering:p.under?.06*Math.sin(Math.PI*q)**4:0}));
  const shoulder=(p:ArchPose)=>{const side=hand==='left'?1:-1;return{x:p.position.x+side*.235*Math.cos(p.yaw),z:p.position.z-side*.235*Math.sin(p.yaw)};},a=shoulder(poses[0]),b=shoulder(poses[1]),bias=.2*Math.sin(Math.PI*q)**2,lateral=((b.x-a.x)*w.x+(b.z-a.z)*w.z)*bias,mid={x:(a.x+b.x)/2+w.x*lateral,z:(a.z+b.z)/2+w.z*lateral},horizontal=Math.max(dist(a,mid),dist(b,mid)),desired=1.24+.66*smooth(q/.22)*smooth((1-q)/.18),maxY=Math.min(...poses.map((p,i)=>1.355-p.kneeLowering+Math.sqrt(Math.max(0,.64**2-dist(i===0?a:b,mid)**2)))),y=Math.min(desired,maxY),strength=smooth((.64-horizontal)/.035)*smooth((1-q)/.18);
  return{beat:t,poses,contacts:strength>.01?[{a:overId,b:underId,handA:hand,handB:hand,point:{...mid,y},strength,kind:'arch',underId}]:[]};
 }
 let minimumObservedClearance=Infinity,maximumObservedSpeed=0;
 for(let i=0;i<=1600;i++){const f=sample(beats*i/1600);minimumObservedClearance=Math.min(minimumObservedClearance,dist(f.poses[0].position,f.poses[1].position));for(const p of f.poses)maximumObservedSpeed=Math.max(maximumObservedSpeed,Math.hypot(p.velocity.x,p.velocity.z));}
 if(minimumObservedClearance<minimum)throw new Error(`Arch root clearance ${minimumObservedClearance} is below ${minimum}.`);
 if(maximumObservedSpeed>maximum)throw new Error(`Arch root speed ${maximumObservedSpeed} exceeds ${maximum}.`);
 return Object.freeze({beats,overId,underId,hand,entrySpacing:spacing,exitSpacing:finalSpacing,minimumObservedClearance,maximumObservedSpeed,sample});
}
