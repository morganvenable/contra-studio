/** Illustrative shoulder connection study; not a biomechanical solver.
 * Hands meet the fixed posterior upper-shoulder edge at y=1.35, not the
 * lower shoulder blade. The torso is a finite elliptical cylinder and elbows
 * may rise .04-.12 above its top, with the returning arm above the leading arm.
 * Joined-hand elbows hang below shoulder level. Arm thickness/head collisions are not modeled.
 */
import type {StudyPose} from './execution-timing-study.ts';
export interface StudyPoint {x:number;z:number;y?:number;}
export interface SwingTorsoOptions {torsoTwistDegrees:number;inwardLean?:number;contactStrength?:number;}
export interface StudyTorso {
 id:0|1;center:StudyPoint;pelvisCenter:StudyPoint;pelvisYaw:number;torsoYaw:number;twistRadians:number;
 width:number;depth:number;leftShoulder:StudyPoint;rightShoulder:StudyPoint;leftBackShoulder:StudyPoint;rightBackShoulder:StudyPoint;
}
export interface StudyShoulderArm {
 actorId:0|1;partnerId:0|1;side:'left'|'right';kind:'shoulder'|'joined';shoulder:StudyPoint;elbow:StudyPoint;hand:StudyPoint;target:StudyPoint;
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
   leftBackShoulder:add(add(center,left,.18*Math.SQRT1_2),forward,-.10*Math.SQRT1_2),
   rightBackShoulder:add(add(center,left,-.18*Math.SQRT1_2),forward,-.10*Math.SQRT1_2)};
 }) as [StudyTorso,StudyTorso];
 // The shoulder embrace and joined hands occupy opposite sides of the pair.
 const lark=torsos.find(t=>t.id===0)!,robin=torsos.find(t=>t.id===1)!;
 const joinedMid={x:(lark.leftShoulder.x+robin.rightShoulder.x)/2,z:(lark.leftShoulder.z+robin.rightShoulder.z)/2};
 const pairSpan=Math.hypot(robin.center.x-lark.center.x,robin.center.z-lark.center.z);
 const lateral={x:Math.cos(lark.torsoYaw),z:-Math.sin(lark.torsoYaw)};
 const perpendicular=pairSpan>1e-12?{x:-(robin.center.z-lark.center.z)/pairSpan,z:(robin.center.x-lark.center.x)/pairSpan}:lateral;
 const sign=perpendicular.x*lateral.x+perpendicular.z*lateral.z>=0?1:-1;
 const joinedOut={x:perpendicular.x*sign,z:perpendicular.z*sign};
 const joinedTarget={...add(joinedMid,joinedOut,.24),y:1.35};
 const specs=[
  {torso:lark,partner:robin,side:'right',kind:'shoulder',target:robin.leftBackShoulder},
  {torso:robin,partner:lark,side:'left',kind:'shoulder',target:lark.rightBackShoulder},
  {torso:lark,partner:robin,side:'left',kind:'joined',target:joinedTarget},
  {torso:robin,partner:lark,side:'right',kind:'joined',target:joinedTarget},
 ] as const;
 const arms=specs.map(({torso,partner,side,kind,target:contactTarget})=>{
  const shoulder={...(side==='left'?torso.leftShoulder:torso.rightShoulder),y:1.35},target={...contactTarget,y:1.35};
  const reachDistance=distance(shoulder,target),reachable=reachDistance<=.65+1e-12;
  const direction=reachDistance>1e-12?{x:(target.x-shoulder.x)/reachDistance,z:(target.z-shoulder.z)/reachDistance,y:(target.y-shoulder.y)/reachDistance}:{x:Math.sin(torso.torsoYaw),z:Math.cos(torso.torsoYaw),y:0};
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
  let elbow=add(mid,u,bend),routeClear=false,bestScore=-Infinity;
  for(let j=0;j<720;j++){
   const angle=j*Math.PI/360,candidate=add(add(mid,u,bend*Math.cos(angle)),v,bend*Math.sin(angle));
   const minHeight=kind==='joined'?1.10:torso.id===0?1.39:1.35+Math.min(.10,bend*.8);
   const maxHeight=kind==='joined'?1.25:torso.id===0?1.41:1.47;
   if((candidate.y??0)>maxHeight+1e-10||(candidate.y??0)<minHeight)continue;
   if(torsos.every(t=>segmentClear(shoulder,candidate,t)&&segmentClear(candidate,hand,t))){
    // Favor the elbow on its own side, away from the space between torsos.
    const lateral={x:Math.cos(torso.torsoYaw)*(side==='left'?1:-1),z:-Math.sin(torso.torsoYaw)*(side==='left'?1:-1)};
    const outward=(candidate.x-mid.x)*lateral.x+(candidate.z-mid.z)*lateral.z;
    const score=kind==='joined'?-(candidate.y??0)+.05*outward:outward;
    if(score>bestScore){elbow=candidate;routeClear=true;bestScore=score;}
   }
  }
  const bendDegrees=2*Math.acos(Math.min(1,span/.65))*180/Math.PI,comfortable=reachable&&reachDistance<=.585;
  return{actorId:torso.id,partnerId:partner.id,side,kind,shoulder,elbow,hand,target,reachable,comfortable,bendDegrees,routeClear,elbowRaised:(elbow.y??0)>1.35+1e-6,contactStrength:reachable?contactStrength:0,reachDistance,upperLength:.325,lowerLength:.325};
 }) as StudyShoulderArm[];
 return{torsos,arms,maxReach:.65,illustrative:true as const};
}


