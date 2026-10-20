/** Illustrative shoulder connection study; not a biomechanical solver.
 * Hands meet the fixed posterior upper-shoulder edge at y=1.35, not the
 * lower shoulder blade. The torso is a finite elliptical cylinder and elbows
 * may rise .04-.12 above its top; arm thickness/head collisions are not modeled.
 */
import type {StudyPose} from './execution-timing-study.ts';
export interface StudyPoint {x:number;z:number;y?:number;}
export interface SwingTorsoOptions {torsoTwistDegrees:number;inwardLean?:number;contactStrength?:number;}
export interface StudyTorso {
 id:0|1;center:StudyPoint;pelvisCenter:StudyPoint;pelvisYaw:number;torsoYaw:number;twistRadians:number;
 width:number;depth:number;leftShoulder:StudyPoint;rightShoulder:StudyPoint;leftBackShoulder:StudyPoint;
}
export interface StudyShoulderArm {
 actorId:0|1;partnerId:0|1;shoulder:StudyPoint;elbow:StudyPoint;hand:StudyPoint;target:StudyPoint;
 reachable:boolean;comfortable:boolean;bendDegrees:number;routeClear:boolean;elbowRaised:boolean;contactStrength:number;reachDistance:number;upperLength:number;lowerLength:number;
}
const distance=(a:StudyPoint,b:StudyPoint)=>Math.hypot(a.x-b.x,a.z-b.z,(a.y??0)-(b.y??0));
const add=(a:StudyPoint,b:StudyPoint,s:number):StudyPoint=>({x:a.x+b.x*s,z:a.z+b.z*s,...(a.y!==undefined||b.y!==undefined?{y:(a.y??0)+(b.y??0)*s}:{})});
function ellipseMinimum(a:StudyPoint,b:StudyPoint,t:StudyTorso){
 const local=(p:StudyPoint)=>({x:((p.x-t.center.x)*Math.cos(t.torsoYaw)-(p.z-t.center.z)*Math.sin(t.torsoYaw))/(t.width/2),z:((p.x-t.center.x)*Math.sin(t.torsoYaw)+(p.z-t.center.z)*Math.cos(t.torsoYaw))/(t.depth/2)});
 const p=local(a),q=local(b),dx=q.x-p.x,dz=q.z-p.z,den=dx*dx+dz*dz;
 const u=den?Math.max(0,Math.min(1,-(p.x*dx+p.z*dz)/den)):0;
 return (p.x+u*dx)**2+(p.z+u*dz)**2;
}
export function sampleSwingTorsoStudy(poses:readonly [StudyPose,StudyPose],options:SwingTorsoOptions){
 const {torsoTwistDegrees,inwardLean=0,contactStrength=1}=options;
 if(!Number.isFinite(torsoTwistDegrees)||torsoTwistDegrees< -70||torsoTwistDegrees>35)throw Error('Torso twist must be between -70 and 35 degrees.');
 if(!Number.isFinite(inwardLean)||inwardLean<0||inwardLean>.08)throw Error('Inward torso lean must be between 0 and .08.');
 if(!Number.isFinite(contactStrength)||contactStrength<0||contactStrength>1)throw Error('Contact strength must be between 0 and 1.');
 if(poses.length!==2||poses[0].id===poses[1].id)throw Error('Two distinct study dancers are required.');
 for(const p of poses)if(![p.position.x,p.position.z,p.pelvisYaw].every(Number.isFinite))throw Error('Finite pelvis poses are required.');
 const pairCenter={x:(poses[0].position.x+poses[1].position.x)/2,z:(poses[0].position.z+poses[1].position.z)/2};
 const torsos=poses.map(p=>{
  const d=distance(p.position,pairCenter),lean=Math.min(inwardLean,d),center=d?add(p.position,{x:(pairCenter.x-p.position.x)/d,z:(pairCenter.z-p.position.z)/d},lean):{...p.position};
  const twistRadians=torsoTwistDegrees*Math.PI/180,torsoYaw=p.pelvisYaw+twistRadians;
  // Same left-positive lateral axis as the study feet. Forward is (sin yaw, cos yaw).
  const left={x:Math.cos(torsoYaw),z:-Math.sin(torsoYaw)},forward={x:Math.sin(torsoYaw),z:Math.cos(torsoYaw)};
  return{id:p.id,center,pelvisCenter:{...p.position},pelvisYaw:p.pelvisYaw,torsoYaw,twistRadians,width:.36,depth:.20,
   leftShoulder:add(center,left,.18),rightShoulder:add(center,left,-.18),
   // Posterior quadrant of the oblong, not its front or lateral extremity.
   leftBackShoulder:add(add(center,left,.18*Math.SQRT1_2),forward,-.10*Math.SQRT1_2)};
 }) as [StudyTorso,StudyTorso];
 const arms=torsos.map((torso,i)=>{
  const partner=torsos[1-i],shoulder={...torso.rightShoulder,y:1.35},target={...partner.leftBackShoulder,y:1.35};
  const reachDistance=distance(shoulder,target),reachable=reachDistance<=.65+1e-12;
  const direction={x:(target.x-shoulder.x)/reachDistance,z:(target.z-shoulder.z)/reachDistance,y:(target.y-shoulder.y)/reachDistance};
  const hand=reachable?{...target}:add(shoulder,direction,.65),span=distance(shoulder,hand),mid=add(shoulder,direction,span/2);
  const bend=Math.sqrt(Math.max(0,.325**2-(span/2)**2));
  const horizontal=Math.hypot(direction.x,direction.z),u=horizontal>1e-12?{x:-direction.z/horizontal,z:direction.x/horizontal,y:0}:{x:1,z:0,y:0};
  const v={x:direction.y*u.z,z:-direction.y*u.x,y:direction.z*u.x-direction.x*u.z};
  // The torso has a top: an elbow may rise up to .12 above its shoulder.
  // Clip each arm segment to the torso's vertical interval, then test the
  // whole clipped segment analytically against the elliptical cylinder.
  const segmentClear=(a:StudyPoint,b:StudyPoint,t:StudyTorso)=>{
   const ay=a.y??0,by=b.y??0,dy=by-ay;
   let lo=0,hi=1;
   if(Math.abs(dy)<1e-12){if(ay>=1.35-1e-10||ay<=.9)return true;}
   else{const q=(.9-ay)/dy,r=(1.35-1e-10-ay)/dy;lo=Math.max(0,Math.min(q,r));hi=Math.min(1,Math.max(q,r));if(lo>hi)return true;}
   const along={x:b.x-a.x,z:b.z-a.z,y:dy};
   return ellipseMinimum(add(a,along,lo),add(a,along,hi),t)>=1-1e-9;
  };
  let elbow=add(mid,u,bend),routeClear=false;
  for(let j=0;j<720;j++){
   const angle=j*Math.PI/360,candidate=add(add(mid,u,bend*Math.cos(angle)),v,bend*Math.sin(angle));
   if((candidate.y??0)>1.47+1e-10||(candidate.y??0)<1.39)continue;
   if(torsos.every(t=>segmentClear(shoulder,candidate,t)&&segmentClear(candidate,hand,t))){elbow=candidate;routeClear=true;break;}
  }
  const bendDegrees=2*Math.acos(Math.min(1,span/.65))*180/Math.PI,comfortable=reachable&&reachDistance<=.585;
  return{actorId:torso.id,partnerId:partner.id,shoulder,elbow,hand,target,reachable,comfortable,bendDegrees,routeClear,elbowRaised:(elbow.y??0)>1.35+1e-6,contactStrength:reachable?contactStrength:0,reachDistance,upperLength:.325,lowerLength:.325};
 }) as [StudyShoulderArm,StudyShoulderArm];
 return{torsos,arms,maxReach:.65,illustrative:true as const};
}


