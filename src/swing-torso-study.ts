/** Experimental balance and ballroom frame, not a biomechanical solver.
 * Joined hands hang at 1.10; the supporting hand meets the rear shoulder at
 * 1.35 and the returning hand rests above it at 1.40. Closed shoulder-arm
 * routes are selected together using the visible limb radii. Torso clearance
 * uses a finite elliptical volume; full anatomical limits remain unmodeled.
 */
import type {StudyPose} from './execution-timing-study.ts';
export interface StudyPoint {x:number;z:number;y?:number;}
export interface SwingTorsoOptions {torsoTwistDegrees:number;inwardLean?:number;contactStrength?:number;ballroomWeight?:number;}
export interface StudyTorso {
 id:0|1;center:StudyPoint;pelvisCenter:StudyPoint;pelvisYaw:number;torsoYaw:number;twistRadians:number;
 width:number;depth:number;leftShoulder:StudyPoint;rightShoulder:StudyPoint;leftBackShoulder:StudyPoint;rightBackShoulder:StudyPoint;
}
export interface StudyShoulderArm {
 actorId:0|1;partnerId:0|1;side:'left'|'right';kind:'shoulder'|'joined';shoulder:StudyPoint;elbow:StudyPoint;wrist:StudyPoint;hand:StudyPoint;target:StudyPoint;
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
function segmentDistance(a:StudyPoint,b:StudyPoint,c:StudyPoint,d:StudyPoint){
 const v=(p:StudyPoint,q:StudyPoint)=>[q.x-p.x,(q.y??0)-(p.y??0),q.z-p.z];
 const dot=(u:number[],v:number[])=>u.reduce((sum,x,i)=>sum+x*v[i],0);
 const u=v(a,b),w=v(c,d),r=v(c,a),aa=dot(u,u),ee=dot(w,w),bb=dot(u,w),cc=dot(u,r),ff=dot(w,r);
 const clamp=(x:number)=>Math.max(0,Math.min(1,x));
 let t=0,k=0;
 if(aa<=1e-12)k=clamp(ff/ee);
 else if(ee<=1e-12)t=clamp(-cc/aa);
 else {const den=aa*ee-bb*bb;t=den>1e-12?clamp((bb*ff-cc*ee)/den):0;k=(bb*t+ff)/ee;if(k<0){k=0;t=clamp(-cc/aa);}else if(k>1){k=1;t=clamp((bb-cc)/aa);}}
 return Math.hypot(...r.map((x,i)=>x+t*u[i]-k*w[i]));
}
export function sampleSwingTorsoStudy(poses:readonly [StudyPose,StudyPose],options:SwingTorsoOptions){
 const {torsoTwistDegrees,inwardLean=0,contactStrength=1,ballroomWeight=1}=options;
 if(!Number.isFinite(torsoTwistDegrees)||torsoTwistDegrees< -70||torsoTwistDegrees>35)throw Error('Torso twist must be between -70 and 35 degrees.');
 if(!Number.isFinite(inwardLean)||inwardLean<0||inwardLean>.08)throw Error('Inward torso lean must be between 0 and .08.');
 if(!Number.isFinite(contactStrength)||contactStrength<0||contactStrength>1)throw Error('Contact strength must be between 0 and 1.');
 if(!Number.isFinite(ballroomWeight)||ballroomWeight<0||ballroomWeight>1)throw Error('Ballroom weight must be between 0 and 1.');
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
 const joinedTarget={...add(joinedMid,joinedOut,.30*ballroomWeight),y:1.10};
 const balanceWrapTarget={x:(lark.rightShoulder.x+robin.leftShoulder.x)/2,z:(lark.rightShoulder.z+robin.leftShoulder.z)/2,y:1.10};
 // Keep both hands joined through the balance; form the shoulder wrap as the bodies close.
 const transferWeight=ballroomWeight*ballroomWeight;
 const blendTarget=(target:StudyPoint)=>transferWeight===1?{...target,y:target.y??1.35}:{...add(balanceWrapTarget,{x:target.x-balanceWrapTarget.x,z:target.z-balanceWrapTarget.z},transferWeight),y:1.10+((target.y??1.35)-1.10)*Math.min(1,ballroomWeight*4)};
 const specs=[
  {torso:lark,partner:robin,side:'right',kind:'shoulder',target:blendTarget({...robin.leftBackShoulder,y:1.30})},
  {torso:robin,partner:lark,side:'left',kind:'shoulder',target:blendTarget({...lark.rightBackShoulder,y:1.40})},
  {torso:lark,partner:robin,side:'left',kind:'joined',target:joinedTarget},
  {torso:robin,partner:lark,side:'right',kind:'joined',target:joinedTarget},
 ] as const;
 const candidates:{point:StudyPoint;score:number}[][]=[];
 const arms=specs.map(({torso,partner,side,kind,target:contactTarget})=>{
  const shoulder={...(side==='left'?torso.leftShoulder:torso.rightShoulder),y:1.35},target={...contactTarget,y:contactTarget.y??1.35};
  const wristWrap=kind==='shoulder'?transferWeight:0;
  const partnerSide=torso.id===0?1:-1;
  const sidePoint=partnerSide===1?partner.leftShoulder:partner.rightShoulder;
  const gripWrist={x:sidePoint.x+partnerSide*.04*Math.cos(partner.torsoYaw),z:sidePoint.z-partnerSide*.04*Math.sin(partner.torsoYaw),y:torso.id===0?1.24:1.45};
  const unit=(v:StudyPoint)=>{const length=Math.hypot(v.x,v.z,v.y??0)||1;return{x:v.x/length,z:v.z/length,y:(v.y??0)/length};};
  const restDirection=unit({x:shoulder.x-target.x,z:shoulder.z-target.z,y:shoulder.y-(target.y??1.35)});
  const wrapDirection=unit({x:gripWrist.x-target.x,z:gripWrist.z-target.z,y:gripWrist.y-(target.y??1.35)});
  const handDirection=unit({x:restDirection.x+(wrapDirection.x-restDirection.x)*wristWrap,z:restDirection.z+(wrapDirection.z-restDirection.z)*wristWrap,y:restDirection.y+(wrapDirection.y-restDirection.y)*wristWrap});
  const wristTarget=add(target,handDirection,.115);
  const upperLength=.325,lowerLength=.27,maxReach=upperLength+lowerLength;
  const reachDistance=distance(shoulder,wristTarget),reachable=reachDistance<=maxReach+1e-12;
  const direction=reachDistance>1e-12?{x:(wristTarget.x-shoulder.x)/reachDistance,z:(wristTarget.z-shoulder.z)/reachDistance,y:((wristTarget.y??0)-shoulder.y)/reachDistance}:{x:Math.sin(torso.torsoYaw),z:Math.cos(torso.torsoYaw),y:0};
  const wrist=reachable?{...wristTarget}:add(shoulder,direction,maxReach),hand=reachable?{...target}:add(target,{x:wrist.x-wristTarget.x,z:wrist.z-wristTarget.z,y:(wrist.y??0)-(wristTarget.y??0)},1);
  const span=distance(shoulder,wrist),along=span>1e-12?(upperLength**2-lowerLength**2+span**2)/(2*span):0,mid=add(shoulder,direction,along);
  const bend=Math.sqrt(Math.max(0,upperLength**2-along**2));
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
  const choices:{point:StudyPoint;score:number}[]=[];
  for(let j=0;j<720;j++){
   const angle=j*Math.PI/360,candidate=add(add(mid,u,bend*Math.cos(angle)),v,bend*Math.sin(angle));
   const wrapWeight=kind==='joined'?0:transferWeight;
   const liftWeight=kind==='joined'?0:Math.min(1,ballroomWeight*4);
   const minHeight=.90+liftWeight*((torso.id===0?1.05:1.36)-.90);
   // Lift the elbow before the hand travels around the shoulder, preserving torso clearance.
   const maxHeight=1.25+liftWeight*((torso.id===0?1.34:1.60)-1.25);
   if((candidate.y??0)>maxHeight+1e-10||(candidate.y??0)<minHeight)continue;
   if(torsos.every(t=>segmentClear(shoulder,candidate,t)&&segmentClear(candidate,wrist,t))){
    // Favor the elbow on its own side, away from the space between torsos.
    const lateral={x:Math.cos(torso.torsoYaw)*(side==='left'?1:-1),z:-Math.sin(torso.torsoYaw)*(side==='left'?1:-1)};
    const outward=(candidate.x-mid.x)*lateral.x+(candidate.z-mid.z)*lateral.z;
    const forward=(candidate.x-shoulder.x)*Math.sin(torso.torsoYaw)+(candidate.z-shoulder.z)*Math.cos(torso.torsoYaw);
    // Let the joined arms hang down; do not pull the elbow behind the torso.
    if(wrapWeight===0&&forward<-.015)continue;
    const wrapSide=-(candidate.x-pairCenter.x)*joinedOut.x-(candidate.z-pairCenter.z)*joinedOut.z;
    if(kind==='shoulder'&&ballroomWeight>.8&&(wrapSide<.07*(ballroomWeight-.8)/.2||forward<-.12))continue;
    const score=wrapWeight*(wrapSide-.35*(candidate.y??0)) +(.35*outward+.15*forward-2*(candidate.y??0))*(1-wrapWeight);
    choices.push({point:candidate,score});
    if(score>bestScore){elbow=candidate;routeClear=true;bestScore=score;}
   }
  }
  const bendDegrees=Math.acos(Math.max(-1,Math.min(1,(span**2-upperLength**2-lowerLength**2)/(2*upperLength*lowerLength))))*180/Math.PI,comfortable=reachable&&reachDistance<=maxReach*.9;
  const arm={actorId:torso.id,partnerId:partner.id,side,kind,shoulder,elbow,wrist,hand,target,reachable,comfortable,bendDegrees,routeClear,elbowRaised:(elbow.y??0)>1.35+1e-6,contactStrength:reachable?contactStrength:0,reachDistance,upperLength,lowerLength};
  candidates.push(choices.sort((a,b)=>b.score-a.score));return arm;
 }) as StudyShoulderArm[];
 if(ballroomWeight>.8){
  const factor=Math.min(1,(ballroomWeight-.8)/.2),a=arms[0],b=arms[1];let selected=false;
  // Bound interactive work at unusual slider settings while retaining the
  // full angular range of each admissible elbow path.
  const pool=(items:typeof candidates[number])=>items.length<=48?items:Array.from({length:48},(_,i)=>items[Math.floor(i*(items.length-1)/47)]);
  outer:for(const ca of pool(candidates[0]))for(const cb of pool(candidates[1])){
   const as=[[a.shoulder,ca.point],[ca.point,a.wrist]],bs=[[b.shoulder,cb.point],[cb.point,b.wrist]],radii=[.043,.034];
   if(as.every(([p,q],i)=>bs.every(([r,s],j)=>segmentDistance(p,q,r,s)>=(radii[i]+radii[j]+.002)*factor))){
    a.elbow=ca.point;b.elbow=cb.point;selected=true;break outer;
   }
  }
  for(const arm of [a,b]){arm.routeClear=arm.routeClear&&selected;arm.elbowRaised=(arm.elbow.y??0)>1.35+1e-6;}
 }
 return{torsos,arms,maxReach:.65,illustrative:true as const};
}



