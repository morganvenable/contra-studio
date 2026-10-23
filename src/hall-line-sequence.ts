import {compileBecketLongLinesStep} from './becket-long-lines-step.ts';
import {compileCompactGiveTakeStep} from './compact-give-take-step.ts';
import {captureSequenceBoundary} from './sequence-boundary.ts';
/** Source-counted hall operations over the shared finite Becket ledger. */
import {createFiniteBecketState,finiteBecketPoses} from './progression-topology.ts';
import {createDancers,compilePrimitiveFigure,figureContinuity,makeBalanceCue} from './engine.ts';
import {captureBecketSliceBoundary} from './becket-slice-step.ts';
import {compileBecketCirclePassStep,type BecketCirclePassOptions} from './becket-circle-pass-step.ts';
import {hallLineSlots,compileActualLineHall,compileHallLineSwing,compileHallNeighborDosido} from './hall-line-step.ts';
import type {Figure,Pose,HandContact} from './types.ts';
export interface HallLineProgram {figures:Figure[];eventOptions:BecketCirclePassOptions;}
const copy=(p:Pose):Pose=>({...p,position:{...p.position}});
const smooth=(n:number)=>{const t=Math.max(0,Math.min(1,n));return t*t*(3-2*t);};
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
export function compileHallLineSequence(program:HallLineProgram,couples:number){
 const figures=structuredClone(program.figures),dancers=createDancers(couples);
 if(figures.reduce((n,f)=>n+f.beats,0)!==64||figures[0]?.kind!=='hall-travel'||figures[0].beats!==16||figures.at(-1)?.kind!=='swing'||figures.at(-1)?.who!=='partner')throw Error('Hall line program requires a counted opening hall and final partner swing.');
 let state=createFiniteBecketState(couples,{circulation:'cw',roleArrangement:'lark-left',halfWidth:.64,rowGap:1.28});
 const lineFor=(s:typeof state)=>{const poses=finiteBecketPoses(s);for(const g of s.binding.groups){const slots=hallLineSlots({ids:[...g.actors],dancers,start:poses,bindingEpoch:s.epoch,relations:s.binding.relations});for(const id of g.actors){poses[id].position={...slots.positions.get(id)!};poses[id].yaw=0;}}return poses;};
 let poses=lineFor(state),period=0,periodStart=0;const rounds:any[]=[],seen=new Map<string,number>();
 for(let round=0;round<128;round++){
  const key=JSON.stringify(state.couples.map(c=>[c.id,c.side,c.rank,c.status])),old=seen.get(key);if(old!==undefined){periodStart=old;period=round-old;break;}seen.set(key,round);
  const before=state,sections:any[]=[],entry=poses.map(copy);let binding=state.binding,event:ReturnType<typeof compileBecketCirclePassStep>|undefined,cursor=0,contacts:HandContact[]=[];
  const add=(beats:number,sampler:(beat:number)=>{poses:Pose[];contacts:HandContact[]})=>{const start=cursor,waitingEvent=event;const sample=(beat:number)=>{const f=sampler(beat);if(waitingEvent&&start>=waitingEvent.rebindBeat)for(const p of waitingEvent.sampleWaiting(start+beat))f.poses[p.id]=p;return f;};sections.push({start,beats,sample});const end=sample(beats);poses=end.poses.map(copy);contacts=end.contacts;cursor+=beats;};
  for(let i=0;i<figures.length;i++){
   const figure=figures[i];
   if(figure.kind==='circle'&&figures[i+1]?.kind==='pass-through'){
    if(event)throw Error('Only one source progression may rebind this round.');
    const held=structuredClone(contacts),source=poses.map(copy);
    if(held.length!==4*binding.groups.length||held.some(h=>h.kind!=='joined'||h.handA===h.handB))throw Error('Hall circle must consume the reached four-hand rings.');
    const plan=compileBecketCirclePassStep(figure,figures[++i],captureBecketSliceBoundary(dancers,poses,binding,cursor,[]),state,program.eventOptions),start=cursor;
    // The root-only event receives released contacts because this wrapper owns
    // the carried ring throughout rotation and releases it before the pass.
    add(8,n=>{const frame=plan.sample(start+n),release=1-smooth((n-4.5)/.75);frame.contacts=held.map(h=>{const a=frame.poses[h.a],b=frame.poses[h.b],A=source[h.a],B=source[h.b];return{...h,point:{...h.point,x:h.point.x+(a.position.x-A.position.x+b.position.x-B.position.x)/2,z:h.point.z+(a.position.z-A.position.z+b.position.z-B.position.z)/2},strength:h.strength*release};}).filter(h=>h.strength>0);return frame;});
    event=plan;binding=plan.endBinding;state=plan.nextState;continue;
   }
   if(figure.kind==='long-lines'&&figure.progression){
    if(event)throw Error('Only one reached event is allowed.');
    const {preparation:_unused,...lineOptions}=program.eventOptions;
    const plan=compileBecketLongLinesStep(figure,captureBecketSliceBoundary(dancers,poses,binding,cursor,contacts),state,lineOptions),start=cursor;
    add(8,n=>plan.sample(start+n));event=plan;binding=plan.endBinding;state=plan.nextState;continue;
   }
   const localWaiting=[...binding.waitingIds],waitingDirections=new Map(state.couples.map(c=>[c.id,Math.sign(c.rank)||1])),source=poses.map(copy),canonical=finiteBecketPoses(state),plans=binding.groups.map(g=>{const ids=[...g.actors],context={ids,dancers,start:source,bindingEpoch:binding.epoch,relations:binding.relations,next:figures[i+1]};
    if(figure.kind==='hall-travel'){if(i!==0||figure.hallTurn!=='couples')throw Error('Actual-line opening currently preserves the explicit couples turn.');const slots=hallLineSlots({...context,start:canonical});return{ids,plan:compileActualLineHall(context,slots)};}
    if(figure.kind==='give-and-take')return{ids,plan:compileCompactGiveTakeStep(figure,context,captureSequenceBoundary(context,cursor,contacts.filter(h=>ids.includes(h.a)||ids.includes(h.b))))};
    if(figure.kind==='do-si-do')return{ids,plan:compileHallNeighborDosido(figure,context)};
    if(i===figures.length-1)return{ids,plan:compileHallLineSwing(figure,context)};
    if(!['circle','do-si-do','balance','swing','allemande'].includes(figure.kind)||figure.progression)throw Error('Unconsumed local hall operation.');
    const base=compilePrimitiveFigure(figure,ids,source,dancers,[],{...figureContinuity(figures,i),...(figure.kind==='balance'?{balanceEntry:'held-two-hand' as const}:{}),geometry:{halfWidth:.64,rowGap:1.28,allemandeRadius:.43},canonicalSwingLayout:true});
    return{ids,plan:{...base,facing:(id:number,t:number,p:Pose[])=>base.facing(id,t,p)+wrap(source[id].yaw-base.facing(id,0,source))*(1-smooth(t*figure.beats))}};
   });
   add(figure.beats,n=>{const t=Math.max(0,Math.min(1,n/figure.beats)),at=source.map(copy);for(const{ids,plan}of plans)for(const id of ids){at[id].position=plan.position(id,t);at[id].yaw=plan.facing(id,t,at);at[id].balance=makeBalanceCue(figure,id,ids,dancers,t);}if(figure.kind==='hall-travel')for(const id of localWaiting){const sign=waitingDirections.get(dancers[id].couple)!;at[id].position.z+=sign*.9*Math.sin(Math.PI*t)**2;}
    const held=plans.flatMap(({plan})=>plan.contacts(t,at)).map(h=>{const reach=(id:number,hand:string)=>{const p=at[id],s=hand==='left'?1:-1;return Math.hypot(h.point.x-p.position.x-s*.235*Math.cos(p.yaw),h.point.y-1.355,h.point.z-p.position.z+s*.235*Math.sin(p.yaw));};return{...h,strength:h.strength*smooth((.64-Math.max(reach(h.a,h.handA),!h.target||h.target==='hands'?reach(h.b,h.handB):0))/.01)};}).filter(h=>h.strength>1e-9);return{poses:at,contacts:held};});
  }
  if(!event||cursor!==64||contacts.length!==3*binding.groups.length)throw Error('Hall sequence must finish after its source event in the reached held four-person line.');
  const expected=lineFor(state);for(const p of poses){const q=expected[p.id];if(Math.hypot(p.position.x-q.position.x,p.position.z-q.position.z)>1e-7||Math.abs(wrap(p.yaw-q.yaw))>1e-7)throw Error('Partner swing did not physically reach the next actual four-person line: '+JSON.stringify({id:p.id,p:p.position,q:q.position,y:p.yaw,qy:q.yaw}));}
  rounds.push({before,event,sections,entry,end:poses.map(copy)});
 }
 if(!period)throw Error('Hall finite period failed to close.');
 const locate=(beat:number)=>{if(!Number.isFinite(beat)||beat<0)throw Error('Invalid hall clock.');const repeat=Math.floor(beat/64),local=beat%64,index=repeat<rounds.length?repeat:periodStart+(repeat-periodStart)%period;return{repeat,local,round:rounds[index]};};
 return{dancers,figures,totalBeats:64,periodStart,periodRepeats:period,rounds,sample(beat:number){const at=locate(beat),s=at.round.sections.find((s:any)=>at.local<s.start+s.beats)??at.round.sections.at(-1);return s.sample(at.local-s.start);},topology(beat:number){const at=locate(beat),b=at.local<at.round.event.rebindBeat?at.round.before.binding:at.round.event.endBinding;return{epoch:at.repeat+Number(at.local>=at.round.event.rebindBeat),partner:[...b.relations.partner],neighbor:[...b.relations.neighbor],waitingIds:b.waitingIds};}};
}
