/** Staged, right-waist-hand release for the source-explicit revolving door.
 *
 * These are body-local animation controls, not additional musical phases.
 * The existing support fades on 5.35–5.75. The now-free hand settles during
 * 5.75–6.65, inside the already authored free half turn. No root, contact,
 * limb length, or source count is changed here.
 */
import {Quaternion,Vector3} from 'three';

const waypoint=()=>new Vector3(-.34,1,-.40);
const waistPole=()=>new Vector3(-.8,-1,-.3);
const rearPole=()=>new Vector3(0,0,-1);
const restPole=()=>new Vector3(0,-1,-.5);
function unit(v:Vector3){
  if(![v.x,v.y,v.z].every(Number.isFinite)||v.lengthSq()<1e-12)throw new Error('Degenerate revolving-door release axis.');
  return v.normalize();
}
function fraction(q:number){if(!Number.isFinite(q)||q<0||q>1)throw new Error('Revolving-door release fraction is outside [0,1].');return q;}

/** Parallel-transport both endpoint bends to the current shoulder–wrist
 * plane, then follow its signed short arc. A linear blend of projected
 * poles can cancel and make the elbow flip despite a continuous wrist.
 */
function bend(shoulder:Vector3,target:Vector3,start:Vector3,end:Vector3,from:Vector3,to:Vector3,q:number){
  const axis=unit(target.clone().sub(shoulder)),a=unit(start.clone().sub(shoulder)),b=unit(end.clone().sub(shoulder));
  unit(from.addScaledVector(a,-from.dot(a))).applyQuaternion(new Quaternion().setFromUnitVectors(a,axis));
  unit(to.addScaledVector(b,-to.dot(b))).applyQuaternion(new Quaternion().setFromUnitVectors(b,axis));
  const angle=Math.atan2(axis.dot(from.clone().cross(to)),from.dot(to));
  return from.applyAxisAngle(axis,angle*fraction(q));
}

/** The hand first withdraws behind its own side, then lowers to ordinary rest. */
export function revolvingDoorReleaseRest(rest:Vector3,settle:number){return waypoint().lerp(rest,fraction(settle));}

/** Small rearward bow only while the support is fading; exact at both ends. */
export function revolvingDoorReleaseHand(target:Vector3,strength:number){return target.clone().add(new Vector3(0,0,-.10*Math.sin(Math.PI*fraction(strength))));}

export function revolvingDoorReleasePole(shoulder:Vector3,target:Vector3,rest:Vector3,settle:number,held?:{point:Vector3;strength:number}){
  fraction(settle);
  // Let the elbow start turning rearward slightly ahead of hand withdrawal.
  // This polynomial preserves C1 joins without a fractional-power speed cusp.
  return held
    ?bend(shoulder,target,held.point,waypoint(),waistPole(),rearPole(),(1-fraction(held.strength))*(1+.4*held.strength*held.strength))
    :bend(shoulder,target,waypoint(),rest,rearPole(),restPole(),settle);
}
