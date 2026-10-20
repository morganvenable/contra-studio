/** Finite-set conventional Becket CW layout adapter.
 * Topology advances at the timed shift, not at the end of an arbitrary 64-beat loop.
 */
export type BecketSide='east'|'west';
export type BoundaryState='active'|'ready-to-reenter'|'waiting';
export interface BecketCouple {id:number;larkId:number;robinId:number;side:BecketSide;centerZ:number;status:BoundaryState;}
export interface BecketGroup {id:string;eastCouple:number;westCouple:number;dancers:[number,number,number,number];centerZ:number;epoch:number;}
export interface BecketState {formation:'becket';circulation:'cw';epoch:number;couples:BecketCouple[];groups:BecketGroup[];rowGap:number;halfWidth:number;}
export interface BecketPose {id:number;couple:number;role:'lark'|'robin';position:{x:number;z:number};yaw:number;activity:'shift'|'waiting'|'ready';}
export interface TopologyEvent {beat:number;kind:'rebind-neighbors'|'enter-wait'|'change-side'|'reenter';couples:number[];oldEpoch:number;newEpoch:number;end?:'top'|'bottom';}
export interface BecketShiftPlan {shiftBeats:number;roundBeats:number;afterShift:BecketState;nextRound:BecketState;events:TopologyEvent[];waitingCouples:number[];sample(beat:number):BecketPose[];}
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const ease=(t:number)=>{t=clamp(t);return t*t*(3-2*t);};
// A short smooth velocity ramp leaves most of the two-beat shift at a
// steady side-travel speed. Position, velocity and acceleration are continuous;
// this preserves the source duration and exact one-place endpoint.
const shiftProgress=(time:number):number=>{
 const t=clamp(time),ramp=.12,normalizer=1-ramp;
 if(t<ramp){const u=t/ramp;return ramp*(u*u*u-.5*u*u*u*u)/normalizer;}
 if(t>1-ramp)return 1-shiftProgress(1-t);
 return(t-ramp/2)/normalizer;
};
const sign=(side:BecketSide)=>side==='east'?1:-1;
const clone=(s:BecketState):BecketState=>({...s,couples:s.couples.map(c=>({...c})),groups:s.groups.map(g=>({...g,dancers:[...g.dancers]}))});
const rotate=(x:number,z:number,a:number)=>({x:x*Math.cos(a)-z*Math.sin(a),z:x*Math.sin(a)+z*Math.cos(a)});
function bind(couples:BecketCouple[],epoch:number):BecketGroup[]{const result:BecketGroup[]=[];for(const east of couples.filter(c=>c.side==='east')){const west=couples.find(c=>c.side==='west'&&Math.abs(c.centerZ-east.centerZ)<1e-7);if(west)result.push({id:`${epoch}:${east.id}:${west.id}`,eastCouple:east.id,westCouple:west.id,dancers:[east.larkId,east.robinId,west.larkId,west.robinId],centerZ:east.centerZ,epoch});}return result.sort((a,b)=>a.centerZ-b.centerZ);}

/** Odd couple counts explicitly begin with one extra west-side end couple ready to enter. */
export function createBecketState(coupleCount:number,options:{rowGap?:number;halfWidth?:number}={}):BecketState{
 if(!Number.isInteger(coupleCount)||coupleCount<2||coupleCount>12)throw new Error('Becket fixtures support 2–12 couples.');
 const rowGap=options.rowGap??1.8,halfWidth=options.halfWidth??.9;
 if(!Number.isFinite(rowGap)||rowGap<=0||!Number.isFinite(halfWidth)||halfWidth<=0)throw new Error('Formation dimensions must be finite and positive.');
 const pairs=Math.floor(coupleCount/2),couples:BecketCouple[]=[];
 for(let row=0;row<pairs;row++)for(const side of ['east','west'] as const){const id=couples.length;couples.push({id,larkId:id*2,robinId:id*2+1,side,centerZ:(row-(pairs-1)/2)*2*rowGap,status:'active'});}
 if(coupleCount%2){const id=couples.length;couples.push({id,larkId:id*2,robinId:id*2+1,side:'west',centerZ:(pairs-(pairs-1)/2)*2*rowGap,status:'ready-to-reenter'});}
 return{formation:'becket',circulation:'cw',epoch:0,couples,groups:bind(couples,0),rowGap,halfWidth};
}
export function becketPoses(state:BecketState):BecketPose[]{return state.couples.flatMap(c=>{const side=sign(c.side);return([{id:c.larkId,role:'lark',offset:1},{id:c.robinId,role:'robin',offset:-1}] as const).map(d=>({id:d.id,couple:c.id,role:d.role,position:{x:side*state.halfWidth,z:c.centerZ+side*d.offset*state.rowGap/2},yaw:side>0?-Math.PI/2:Math.PI/2,activity:c.status==='waiting'?'waiting' as const:'ready' as const}));}).sort((a,b)=>a.id-b.id);}

export function compileBecketShift(state:BecketState,options:{shiftBeats?:number;roundBeats?:number}={}):BecketShiftPlan{
 if(state.couples.length<2||state.couples.length>12||state.couples.some((c,i)=>c.id!==i||c.larkId!==i*2||c.robinId!==i*2+1))throw new Error('This adapter needs stable contiguous couple and dancer identities from its layout initializer.');
 if(!Number.isFinite(state.rowGap)||state.rowGap<=0||!Number.isFinite(state.halfWidth)||state.halfWidth<=0||!Number.isInteger(state.epoch)||state.epoch<0)throw new Error('Invalid Becket dimensions or topology epoch.');
 if(new Set(state.couples.map(c=>c.id)).size!==state.couples.length||new Set(state.couples.flatMap(c=>[c.larkId,c.robinId])).size!==state.couples.length*2||state.couples.some(c=>!Number.isFinite(c.centerZ)||!['east','west'].includes(c.side)))throw new Error('Becket state has duplicate identities or invalid positions.');
 if(state.formation!=='becket'||state.circulation!=='cw')throw new Error('Only conventional clockwise Becket is implemented by this adapter.');
 if(state.couples.some(c=>!['active','ready-to-reenter','waiting'].includes(c.status)))throw new Error('Unknown finite-end status.');
 const expectedGroups=bind(state.couples,state.epoch);
 if(!Array.isArray(state.groups)||state.groups.length!==expectedGroups.length||expectedGroups.some(g=>!state.groups.some(h=>h.id===g.id&&h.epoch===g.epoch&&h.eastCouple===g.eastCouple&&h.westCouple===g.westCouple&&Math.abs(h.centerZ-g.centerZ)<1e-7&&h.dancers.length===4&&h.dancers.every((id,i)=>id===g.dancers[i]))))throw new Error('The incoming group bindings are stale or contradict the actual couple positions.');
 if(new Set(expectedGroups.flatMap(g=>g.dancers)).size!==expectedGroups.length*4)throw new Error('A dancer cannot belong to two minor sets.');
 if(state.couples.some(c=>c.status==='waiting'))throw new Error('Finish the current end crossing before compiling another shift.');
 const shiftBeats=options.shiftBeats??2,roundBeats=options.roundBeats??64;
 if(!Number.isFinite(shiftBeats)||!Number.isFinite(roundBeats)||shiftBeats<=0||roundBeats<=shiftBeats+8)throw new Error('A bounded shift and end-wait interval are required.');
 if(state.rowGap/(shiftBeats*.88)>1.1)throw new Error('The opening shift is too fast for the reviewed walking adapter; give the one-place shift more source beats.');
 const afterShift=clone(state);afterShift.epoch++;
 for(const c of afterShift.couples)c.centerZ+=sign(c.side)*state.rowGap;
 afterShift.groups=bind(afterShift.couples,afterShift.epoch);
 const active=new Set(afterShift.groups.flatMap(g=>[g.eastCouple,g.westCouple]));
 const waiting=afterShift.couples.filter(c=>!active.has(c.id));
 if(waiting.length>2)throw new Error('This shift leaves unsupported unmatched couples inside the set.');
 const groupMin=Math.min(...afterShift.groups.map(g=>g.centerZ)),groupMax=Math.max(...afterShift.groups.map(g=>g.centerZ));
 for(const c of waiting){const outside=afterShift.groups.length===0||c.centerZ<groupMin||c.centerZ>groupMax;if(!outside)throw new Error('An unmatched middle couple cannot be treated as an end effect.');c.status='waiting';}
 for(const c of afterShift.couples)if(active.has(c.id))c.status='active';
 const nextRound=clone(afterShift);
 for(const c of nextRound.couples)if(c.status==='waiting'){c.side=c.side==='east'?'west':'east';c.status='ready-to-reenter';}
 nextRound.groups=bind(nextRound.couples,nextRound.epoch);
 const events:TopologyEvent[]=[{beat:shiftBeats,kind:'rebind-neighbors',couples:[...active],oldEpoch:state.epoch,newEpoch:afterShift.epoch}];
 for(const c of waiting){const end=c.side==='east'?'bottom':'top';events.push({beat:shiftBeats,kind:'enter-wait',couples:[c.id],oldEpoch:state.epoch,newEpoch:afterShift.epoch,end},{beat:Math.min(roundBeats-1,shiftBeats+12),kind:'change-side',couples:[c.id],oldEpoch:afterShift.epoch,newEpoch:afterShift.epoch,end});}
 for(const c of state.couples)if(c.status==='ready-to-reenter'&&active.has(c.id))events.push({beat:shiftBeats,kind:'reenter',couples:[c.id],oldEpoch:state.epoch,newEpoch:afterShift.epoch});
 return{shiftBeats,roundBeats,afterShift,nextRound,events:events.sort((a,b)=>a.beat-b.beat),waitingCouples:waiting.map(c=>c.id),sample(beat:number){
   if(!Number.isFinite(beat))throw new Error('Sample beat must be finite.');beat=Math.max(0,Math.min(roundBeats,beat));
   if(beat<=shiftBeats){const f=clone(state);for(const c of f.couples)c.centerZ+=sign(c.side)*state.rowGap*shiftProgress(beat/shiftBeats);return becketPoses(f).map(p=>({...p,activity:'shift' as const}));}
   const poses=becketPoses(afterShift),q=ease((beat-shiftBeats-4)/Math.min(8,roundBeats-shiftBeats-5));
   for(const c of waiting){const side=sign(c.side),endSign=side,angle=-side*Math.PI*q,centerX=side*state.halfWidth*(1-2*q),centerZ=c.centerZ+endSign*.45*Math.sin(Math.PI*q);
     for(const id of [c.larkId,c.robinId]){const p=poses[id],radial=rotate(0,side*(p.role==='lark'?1:-1)*state.rowGap/2,angle);p.position={x:centerX+radial.x,z:centerZ+radial.z};p.yaw=(side>0?-Math.PI/2:Math.PI/2)-angle;p.activity='waiting';}
   }
   return poses;
 }};
}
