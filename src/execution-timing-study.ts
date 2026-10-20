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
export interface StudyPose {id:0|1;position:{x:number;z:number};yaw:number;}
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
export function sampleStudy(musicBeat:number,profile:ExecutionTimingProfile):ExecutionTimingSample {
 if(!Number.isFinite(musicBeat))throw Error('Musical beat must be finite.');
 validateExecutionTimingProfile(profile);
 const musical=cycle(musicBeat),start=musicBeat-musical,delay=profile.responseDelayCounts;
 // Hold at the reached entry during a late response. Thereafter execution
 // catches up monotonically; recovery ends before this cycle's preparation.
 const local=musical<=delay?0:musical-delay*(1-smooth((musical-delay)/profile.recoveryCounts));
 const executionBeat=start+local,lag=musical-local;
 let radius:number,angle=0,frameTurn=0,readiness=1;
 let phase:ExecutionTimingSample['phase'];
 if(local<4){
  phase='balance';
  // Two counts forward, two counts back. Preparation never steals count 4.
  radius=local<=2?.9-.25*smooth(local/2):.65+.25*smooth((local-2)/2);
 }else if(local<12){
  phase='swing';
  const elapsed=local-4,closing=smooth(elapsed/profile.transitionCounts);
  radius=.9-(.9-.31)*closing;
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
 }) as [StudyPose,StudyPose];
 return{musicBeat,executionBeat,lag,readiness,phase,musicalCount:Math.floor(musical)+1,cycleBeat:musical,executionCycleBeat:local,poses,phaseAnchors:STUDY_PHASE_ANCHORS,studyLabel:'Synthetic paired timing study — not source choreography or a validated body model'};
}
