/** Synthetic two-person timing study, not a source dance or validated body model.
 * Both people share one execution clock. Musical counts never change. Response
 * delay is demonstrated at each cycle's balance entry, then recovered smoothly.
 * There are no asserted contacts, relationship changes or progression events.
 */
export interface ExecutionTimingProfile {
 anticipationCounts:number;
 transitionCounts:number;
 responseDelayCounts:number;
 recoveryCounts:number;
}
export const FLUENT_TIMING_PROFILE:Readonly<ExecutionTimingProfile>=Object.freeze({
 anticipationCounts:.75,transitionCounts:.5,responseDelayCounts:0,recoveryCounts:4,
});
export const DEFAULT_TIMING_PROFILE:Readonly<ExecutionTimingProfile>=Object.freeze({
 anticipationCounts:.25,transitionCounts:1.25,responseDelayCounts:.5,recoveryCounts:4,
});
export const STUDY_PHASE_ANCHORS=Object.freeze({balanceStart:0,balanceTurn:2,swingStart:4,preparationStart:12,cycleEnd:16});
const clamp=(x:number)=>Math.max(0,Math.min(1,x));
const smooth=(x:number)=>{const t=clamp(x);return t*t*(3-2*t);};
const cycle=(beat:number)=>((beat%16)+16)%16;
export interface StudyFoot {side:'left'|'right';position:{x:number;z:number};yaw:number;lift:number;planted:boolean;supportWeight:number;}
export interface StudyPose {
 id:0|1;position:{x:number;z:number};yaw:number;
 feet:[StudyFoot,StudyFoot];supportPoint:{x:number;z:number};
 bodyLean:{x:number;z:number};pushOff:number;stepIndex:number;
}
export interface ExecutionTimingSample {
 musicBeat:number;executionBeat:number;lag:number;
 readiness:number;phase:'balance'|'swing'|'preparation';
 musicalCount:number;cycleBeat:number;executionCycleBeat:number;
 poses:[StudyPose,StudyPose];phaseAnchors:typeof STUDY_PHASE_ANCHORS;studyLabel:string;
}
export function validateExecutionTimingProfile(profile:ExecutionTimingProfile):void {
 if(!profile||typeof profile!=='object')throw Error('Timing profile must be an object.');
 const bounds={anticipationCounts:[0,1],transitionCounts:[.25,2],responseDelayCounts:[0,1],recoveryCounts:[2,8]} as const;
 if(Object.keys(profile).some(key=>!(key in bounds)))throw Error('Unknown timing parameter.');
 for(const [key,[low,high]]of Object.entries(bounds)){
  const value=profile[key as keyof ExecutionTimingProfile];
  if(!Number.isFinite(value)||value<low||value>high)throw Error(`${key} must be finite and between ${low} and ${high} counts.`);
 }
}
function motionAt(beat:number,profile:ExecutionTimingProfile){
 const local=cycle(beat);
 let radius:number,angle=0,frameTurn=0,readiness=1;
 let phase:ExecutionTimingSample['phase'];
 if(local<4){
  phase='balance';
  // Two advancing steps, then two retreating foot placements. Late in the
  // fourth step, weight moves inward again over the planted rear foot.
  radius=local<=2?.9-.25*smooth(local/2):.65+.25*smooth((local-2)/1.5)-.08*smooth((local-3.65)/.35);
 }else if(local<12){
  phase='swing';
  const elapsed=local-4,closing=smooth(elapsed/profile.transitionCounts);
  radius=.82-(.82-.31)*closing;
  // Angular travel begins immediately while the pair closes, with no
  // gather-then-start dead zone. This is a schematic, not buzzstep mechanics.
  angle=Math.PI/2*elapsed;frameTurn=.6*closing;readiness=closing;
 }else{
  phase='preparation';
  const finish=16-profile.anticipationCounts;
  readiness=smooth((local-(finish-profile.transitionCounts))/profile.transitionCounts);
  // Keep travelling through the exit interval instead of waiting motionless
  // for the final preparation window. One schematic turn returns both actors
  // to their original sides before the next balance.
  radius=.31+(.9-.31)*readiness;
  angle=4*Math.PI+2*Math.PI*smooth((local-12)/(finish-12));
  frameTurn=.6*(1-readiness);
 }
 const poses=([0,1] as const).map(id=>{
  const sign=id===0?-1:1,x=sign*radius*Math.cos(angle),z=sign*radius*Math.sin(angle);
  return{id,position:{x,z},yaw:Math.atan2(-x,-z)+frameTurn};
 });
 return{poses,readiness,phase};
}
export function sampleStudy(musicBeat:number,profile:ExecutionTimingProfile):ExecutionTimingSample {
 if(!Number.isFinite(musicBeat))throw Error('Musical beat must be finite.');
 validateExecutionTimingProfile(profile);
 const musical=cycle(musicBeat),start=musicBeat-musical,delay=profile.responseDelayCounts;
 // Both actors share the same late response and recovery. Foot plans consume
 // this clock too; seeking never integrates or slides previously planted feet.
 const local=musical<=delay?0:musical-delay*(1-smooth((musical-delay)/profile.recoveryCounts));
 const executionBeat=start+local,lag=musical-local,{poses:roots,readiness,phase}=motionAt(local,profile);
 const step=Math.floor(local),u=local-step,supportSide=step%2===0?'left':'right';
 const anchor=(id:0|1,side:'left'|'right',landing:number)=>{
  const count=cycle(landing),root=motionAt(landing,profile).poses[id];
  // During balance, the landing foot leads the body's weight transfer:
  // steps 1/2 go toward the other person, steps 3/4 go away.
  const balanceRadius=[.775,.65,.775,.9][count];
  const x=balanceRadius===undefined?root.position.x:(id===0?-1:1)*balanceRadius;
  const z=balanceRadius===undefined?root.position.z:0;
  const sideSign=side==='left'?1:-1;
  return{x:x+sideSign*.09*Math.cos(root.yaw),z:z-sideSign*.09*Math.sin(root.yaw),yaw:root.yaw};
 };
 const pushOff=local>=3.65&&local<4.5?smooth((local-3.65)/.35)*(1-smooth((local-4)/.5)):0;
 const poses=roots.map(root=>{
  const feet=(['left','right'] as const).map(side=>{
   const planted=side===supportSide;
   const from=anchor(root.id,side,planted?step:step-1),to=planted?from:anchor(root.id,side,step+1),weight=smooth(u);
   const turn=Math.atan2(Math.sin(to.yaw-from.yaw),Math.cos(to.yaw-from.yaw));
   return{side,position:{x:from.x+(to.x-from.x)*weight,z:from.z+(to.z-from.z)*weight},yaw:from.yaw+turn*weight,lift:planted?0:.09*Math.sin(Math.PI*u)**2,planted,supportWeight:planted?1:0};
  }) as [StudyFoot,StudyFoot];
  const supportPoint={...feet.find(foot=>foot.planted)!.position};
  // A bounded schematic torso lean, not a solved center of mass or force.
  const bodyLean={x:(root.position.x-supportPoint.x)*.22,z:(root.position.z-supportPoint.z)*.22};
  return{...root,feet,supportPoint,bodyLean,pushOff,stepIndex:step};
 }) as [StudyPose,StudyPose];
 return{musicBeat,executionBeat,lag,readiness,phase,musicalCount:Math.floor(musical)+1,cycleBeat:musical,executionCycleBeat:local,poses,phaseAnchors:STUDY_PHASE_ANCHORS,studyLabel:'Synthetic paired timing study — not source choreography or a validated body model'};
}
