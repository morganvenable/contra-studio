/** Conservative controls for the experimental ballroom frame.
 * This is a sampled operating range, not anatomical certification. The wider
 * low-level solver remains available for explicitly marked invalid-pose study.
 * Original default 50 degrees / .06 lean is preserved exactly.
 */
import type {ExecutionTimingSample} from './execution-timing-study.ts';
import type {SwingTorsoOptions} from './swing-torso-study.ts';

export interface SwingFrameSettings {inwardTurnDegrees:number;inwardLean:number;}
export const SAMPLED_SWING_FRAME_DOMAIN=Object.freeze({
 inwardTurnDegrees:Object.freeze({min:50,max:70}),
 inwardLean:Object.freeze({min:.04,max:.08}),
});
export const DEFAULT_SWING_FRAME_SETTINGS:Readonly<SwingFrameSettings>=Object.freeze({inwardTurnDegrees:50,inwardLean:.06});

export function isInSampledSwingFrameDomain(settings:SwingFrameSettings):boolean {
 return Object.entries(SAMPLED_SWING_FRAME_DOMAIN).every(([name,{min,max}])=>{
  const value=settings[name as keyof SwingFrameSettings];
  return Number.isFinite(value)&&value>=min&&value<=max;
 });
}

/** Reject unsupported control values rather than silently clamping the user's
 * input. Callers must still inspect reachable/routeClear on the solver result;
 * this range does not certify arbitrary carried poses or timing profiles.
 */
export function sampledSwingFrameOptions(
 sample:Pick<ExecutionTimingSample,'phase'|'readiness'>,
 settings:Readonly<SwingFrameSettings>=DEFAULT_SWING_FRAME_SETTINGS,
):SwingTorsoOptions {
 if(!isInSampledSwingFrameDomain(settings))throw Error('Sampled ballroom controls require inward turn 50–70 degrees and lean .04–.08.');
 if(!Number.isFinite(sample.readiness)||sample.readiness<0||sample.readiness>1)throw Error('Frame readiness must be between 0 and 1.');
 const ballroomWeight=sample.phase==='swing'?sample.readiness:sample.phase==='preparation'?1-sample.readiness:0;
 return {torsoTwistDegrees:-settings.inwardTurnDegrees*ballroomWeight,inwardLean:settings.inwardLean*ballroomWeight,contactStrength:1,ballroomWeight};
}
