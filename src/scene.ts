import {backLimit} from './arm-limit.ts';
import {revolvingDoorReleaseRest,revolvingDoorReleaseHand,revolvingDoorReleasePole} from './revolving-door-arm-route.ts';
import {SwingPresentationController,type SwingPresentationStatus} from './swing-presentation.ts';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {figureContinuity} from './engine.ts';
import {RobotBand} from './robot-band.ts';
import {choreographyBounds,fitPerspectiveCamera} from './camera-fit.ts';
import {BODY_PROFILES,dancerAppearance,type DancerAppearance} from './dancer-appearance.ts';
import type {CameraMode, CompiledDance, Dancer, Frame, Hand, Pose, StudioState, Vec3} from './types';

const Y=new THREE.Vector3(0,1,0);
const sphere=new THREE.SphereGeometry(1,18,14),bone=new THREE.CapsuleGeometry(1,1,5,12);
const mat=(color:string,roughness=.8)=>new THREE.MeshStandardMaterial({color,roughness});
const skinColors=['#d6a07b','#a87555','#edc7a2','#7b4d37','#bc8964','#e1b590'];
const hairColors=['#2c251f','#5a3b27','#bd8b4c','#282426','#4b392c','#98948c'];
function ellipsoid(parent:THREE.Object3D,material:THREE.Material,scale:number[],pos:number[]){const m=new THREE.Mesh(sphere,material);m.scale.set(...scale as [number,number,number]);m.position.set(...pos as [number,number,number]);m.castShadow=true;parent.add(m);return m;}
function cylinderBetween(mesh:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3,radius:number){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(Y,b.clone().sub(a).normalize());mesh.scale.set(radius,Math.max(.02,a.distanceTo(b))/3,radius);}
function limbMesh(parent:THREE.Object3D,material:THREE.Material){const m=new THREE.Mesh(bone,material);m.castShadow=true;parent.add(m);return m;}
export function solveJoint(a:THREE.Vector3,b:THREE.Vector3,l1:number,l2:number,bend:THREE.Vector3){const v=b.clone().sub(a),d=Math.min(l1+l2-.003,Math.max(.01,v.length()));v.normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),height=Math.sqrt(Math.max(0,l1*l1-along*along));const normal=bend.clone().addScaledVector(v,-bend.dot(v)).normalize();return a.clone().addScaledVector(v,along).addScaledVector(normal,height);}
/** Sine of how far behind the shoulder an upper arm pointing this far down may go (src/arm-limit.ts). */
const sinBack=(down:number)=>Math.sin(backLimit(down)*Math.PI/180);
/** Radians by which the most forward elbow for this hand still points the upper arm past the limit (0 when reachable). */
function shoulderReachExcess(s:THREE.Vector3,t:THREE.Vector3,l1=.325,l2=.325){const v=t.clone().sub(s),d=Math.min(l1+l2-.003,Math.max(.01,v.length()));v.normalize();const beta=Math.acos(Math.min(1,(l1*l1-l2*l2+d*d)/(2*d*l1))),gamma=Math.asin(Math.max(-1,Math.min(1,-v.z)));return Math.max(0,gamma-beta-backLimit(-v.y)*Math.PI/180);}
/** A hand no elbow can reach within the limit swings forward about the shoulder, keeping its distance. */
function limitShoulderReach(s:THREE.Vector3,t:THREE.Vector3,l1=.325,l2=.325){if(shoulderReachExcess(s,t,l1,l2)<=0)return t.clone();const v=t.clone().sub(s),length=v.length(),d=Math.min(l1+l2-.003,Math.max(.01,length));const beta=Math.acos(Math.min(1,(l1*l1-l2*l2+d*d)/(2*d*l1))),gamma=Math.min(Math.PI/2,backLimit(-v.y/Math.max(1e-9,length))*Math.PI/180+beta)-1e-6;const p=new THREE.Vector3(v.x,v.y,0);if(p.lengthSq()<1e-12)p.set(0,-1,0);p.normalize().multiplyScalar(Math.cos(gamma));return s.clone().add(p.setZ(-Math.sin(gamma)).multiplyScalar(length));}
/** solveJoint within the shoulder limit. An elbow that would point the upper
 * arm past the limit turns around its circle onto the limit. Just past the
 * limit it takes the nearer point, keeping the bend asked for; the further
 * past, the more it settles on the point out from the body, so it never
 * swaps sides when the bend asked for points straight back. */
export function solveLimitedElbow(a:THREE.Vector3,b:THREE.Vector3,l1:number,l2:number,bend:THREE.Vector3,side:number){
  // The allowance depends on how low the upper arm hangs, which bending to
  // the limit changes: settle it over a few passes, keeping the tightest.
  const free=solveJoint(a,b,l1,l2,bend);let s=sinBack(-(free.y-a.y)/l1),elbow=limitedElbow(a,b,l1,l2,bend,side,s);
  for(let i=0;i<3;i++){const next=sinBack(-(elbow.y-a.y)/l1);if(next>=s-1e-6)break;s=next;elbow=limitedElbow(a,b,l1,l2,bend,side,s);}
  return elbow;
}
function limitedElbow(a:THREE.Vector3,b:THREE.Vector3,l1:number,l2:number,bend:THREE.Vector3,side:number,SIN_BACK:number){
  const elbow=solveJoint(a,b,l1,l2,bend);if(-(elbow.z-a.z)<=l1*SIN_BACK)return elbow;
  const v=b.clone().sub(a),d=Math.min(l1+l2-.003,Math.max(.01,v.length()));v.normalize();const along=(l1*l1-l2*l2+d*d)/(2*d),h=Math.sqrt(Math.max(0,l1*l1-along*along)),center=a.clone().addScaledVector(v,along);
  const u1=elbow.clone().sub(center).normalize(),u2=v.clone().cross(u1),R=Math.hypot(u1.z,u2.z);if(h*R<1e-9)return elbow;
  const need=(-l1*SIN_BACK+1e-9-along*v.z)/(h*R),star=Math.atan2(u2.z,u1.z);
  let phi=star;
  if(need<1){
    const w=Math.acos(Math.max(-1,need))-1e-6,o0=Math.atan2(Math.sin(-star),Math.cos(-star)),nearest=Math.sign(o0||1)*w;
    const outward=(o:number)=>side*(u1.x*Math.cos(star+o)+u2.x*Math.sin(star+o)),out=outward(w)>=outward(-w)?w:-w;
    const t=Math.max(0,Math.min(1,(need-Math.cos(o0))/ELBOW_SETTLE)),settle=t*t*(3-2*t);
    phi=star+nearest+(out-nearest)*settle;
  }
  return center.addScaledVector(u1,h*Math.cos(phi)).addScaledVector(u2,h*Math.sin(phi));
}
/** How far past the limit (in the circle's cosine) a bend settles fully on the outer point. */
const ELBOW_SETTLE=.8;
/** The shoulder limit applies to dances drawn by the figure library (src/next). */
export const armLimitFor=(compiled:CompiledDance)=>(compiled as {engine?:string}).engine==='next';
/** How far out a held arm's elbow is drawn: the bend direction's outward part grows by this with the grip (the closed swing frame keeps its own, lower elbows). */
const HELD_ELBOW_OUT=2;
function makeLabel(text:string,color='#24463e'){
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=96;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle='#faf9f4';ctx.beginPath();ctx.roundRect(4,10,248,70,24);ctx.fill();ctx.strokeStyle='#dfdfd5';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=color;ctx.font='600 31px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,128,46);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthWrite:false,transparent:true}));sprite.scale.set(.92,.345,1);return sprite;
}

interface GaitSchedule {start:number;duration:number;times:number[];phases:number[];roots:Pose[];steps:number;maxRate:number;plants:Map<number,{point:THREE.Vector3;yaw:number;phase:number}>;headings:Map<number,number>;pelvis?:{step:number;values:number[]}}

export class Avatar {
  root=new THREE.Group();body=new THREE.Group();head:THREE.Group;label:THREE.Sprite;halo:THREE.Mesh;
  readonly appearance:DancerAppearance;
  arms:{upper:THREE.Mesh;lower:THREE.Mesh;hand:THREE.Mesh;elbow:THREE.Mesh;side:number}[]=[];
  legs:{upper:THREE.Mesh;lower:THREE.Mesh;foot:THREE.Mesh;knee:THREE.Mesh;side:number}[]=[];
  private gaitSchedules=new Map<number,GaitSchedule>();
  private promenadeArmPreparation=0;
  private ovalArmPreparation=0;
  private quarterArmGate=0;
  private centralSwingIngress=false;
  private passSwingIngress=false;
  private centralSwingPreparation=0;
  private roryPassingGate=0;
  /** Hold every upper arm in front of the shoulder (a low arm a little behind; src/arm-limit.ts). On for the figure library's dances; the old engine's reviewed programs keep the arms their motion tests pin. */
  armLimit=false;
  private rorySwingIngress=false;
  public dancer:Dancer;
  constructor(dancer:Dancer){
    this.dancer=dancer;
    const appearance=this.appearance=dancerAppearance(dancer.id),profile=BODY_PROFILES[appearance.bodyShape];
    const id=dancer.id,skin=mat(skinColors[id%skinColors.length]),hair=mat(hairColors[id%hairColors.length]),shirt=mat(dancer.color),pants=mat(id%3===0?'#46545b':'#333e41'),shoes=mat('#f2eee5');
    this.root.add(this.body);
    const torsoShape=profile.torso.map(([radius,height])=>new THREE.Vector2(radius,height));
    const torso=new THREE.Mesh(new THREE.LatheGeometry(torsoShape,24),shirt);torso.name='torso';torso.position.y=.91;torso.scale.z=profile.depth;torso.castShadow=true;this.body.add(torso);
    ellipsoid(this.body,pants,[...profile.hips],[0,.9,0]).name='hips';ellipsoid(this.body,skin,[.075,.12,.073],[0,1.45,0]);
    const head=this.head=new THREE.Group();head.position.y=1.62;this.body.add(head);ellipsoid(head,skin,[.135,.18,.13],[0,0,0]);
    // A sculpted face, ears, hair and a forward gaze make orientation legible at dance scale.
    ellipsoid(head,skin,[.028,.038,.04],[0,-.02,.125]);
    for(const side of [-1,1]){ellipsoid(head,skin,[.026,.044,.027],[side*.133,0,0]);ellipsoid(head,mat('#382d27'),[.011,.012,.007],[side*.047,.027,.119]);}
    ellipsoid(head,hair,[.14,.087,.135],[0,.12,-.014]);ellipsoid(head,hair,[.135,.13,.065],[0,.03,-.09]);
    if(appearance.hairType==='bun')ellipsoid(head,hair,[.07,.075,.07],[0,.09,-.17]).name='hair-bun';
    if(appearance.hairType==='long')ellipsoid(head,hair,[.15,.16,.06],[0,-.08,-.1]).name='hair-long';
    const badge=new THREE.Mesh(new THREE.CircleGeometry(.036,16),mat('#eef5eb'));badge.position.set(-.105,1.25,.151);this.body.add(badge);
    for(const side of [-1,1]){
      this.arms.push({upper:limbMesh(this.body,shirt),lower:limbMesh(this.body,skin),hand:ellipsoid(this.body,skin,[.042,.068,.029],[0,0,0]),elbow:ellipsoid(this.body,skin,[.048,.048,.048],[0,0,0]),side});
      this.legs.push({upper:limbMesh(this.root,pants),lower:limbMesh(this.root,pants),foot:ellipsoid(this.root,shoes,[.075,.055,.145],[0,0,0]),knee:ellipsoid(this.root,pants,[.071,.071,.071],[0,0,0]),side});
    }
    this.label=makeLabel(`${dancer.role==='lark'?'L':'R'}${dancer.couple+1}`,dancer.color);this.label.position.set(0,2.08,0);this.root.add(this.label);
    this.halo=new THREE.Mesh(new THREE.RingGeometry(.33,.37,40),new THREE.MeshBasicMaterial({color:dancer.color,transparent:true,opacity:.5,side:THREE.DoubleSide}));this.halo.rotation.x=-Math.PI/2;this.halo.position.y=.012;this.root.add(this.halo);
    this.root.userData.dancerId=dancer.id;
    this.root.userData.appearance=appearance;
  }
  update(pose:Pose,frame:Frame,state:StudioState,sample:(beat:number)=>Frame){
    this.root.position.set(pose.position.x,0,pose.position.z);this.root.rotation.y=pose.yaw;
    const bodyEase=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
    const bodyPoseGate=bodyEase(frame.figureProgress/.1)*bodyEase((1-frame.figureProgress)/.1);
    const currentFigure=state.dance.figures[frame.figureIndex],nextFigure=state.dance.figures[frame.figureIndex+1];
    const ovalCue=pose.ovalPreparation,insideOval=ovalCue?.route==='whole-set-oval'&&ovalCue.hold==='inside-hand';
    this.ovalArmPreparation=insideOval?ovalCue.strength:0;
    this.promenadeArmPreparation=insideOval?0:pose.activity==='promenade'?bodyEase((1-frame.figureProgress)/.06):pose.activity==='swing'&&['partner','neighbor'].includes(currentFigure?.who??'')&&nextFigure?.kind==='promenade'&&nextFigure.who===currentFigure?.who?bodyEase((frame.figureProgress-.85)/.15):0;
    const continuity=figureContinuity(state.dance.figures,frame.figureIndex),previousContinuity=frame.figureIndex>0?figureContinuity(state.dance.figures,frame.figureIndex-1):{};
    this.quarterArmGate=pose.activity!=='allemande'?0:continuity.heldAllemandeExit?bodyEase((frame.figureProgress*currentFigure.beats-(currentFigure.beats-1.5))/1.0):previousContinuity.heldAllemandeExit?1-bodyEase((frame.figureProgress*currentFigure.beats-.5)/1):0;
    const rorySwingIngress=pose.activity==='allemande'&&currentFigure?.entry==='short-wave'&&currentFigure.exit==='partner-swing'&&currentFigure.who==='robins'&&currentFigure.direction==='right'&&currentFigure.amount===1.5&&currentFigure.beats===8&&currentFigure.phaseBeats?.length===2&&currentFigure.phaseBeats[0]===6&&currentFigure.phaseBeats[1]===2;
    this.rorySwingIngress=rorySwingIngress;
    const ovalSwing=pose.swingPreparation?.armRoute==='oval-return',passSwing=pose.swingPreparation?.armRoute==='pass-to-swing';
    this.passSwingIngress=passSwing;
    this.centralSwingIngress=pose.activity==='allemande'&&(!!continuity.canonicalSwingLayout||rorySwingIngress||ovalSwing);
    this.centralSwingPreparation=ovalSwing?pose.swingPreparation!.strength:this.centralSwingIngress?bodyEase(rorySwingIngress?(frame.figureProgress*8-6)/2:frame.figureProgress*currentFigure.beats-(currentFigure.beats-1)):0;
    // A released Rory pass uses the existing low-elbow passing route, only
    // inside its explicit four-count travel phase. Named wave holds remain exact.
    this.roryPassingGate=currentFigure?.kind==='balance-rory-slide'&&currentFigure.beats===8&&currentFigure.phaseBeats?.length===2&&currentFigure.phaseBeats.every(n=>n===4)?bodyEase((frame.figureProgress*8-4)/.2)*bodyEase((8-frame.figureProgress*8)/.2):0;
    const balance=pose.balance,connection=balance?Math.max(0,...frame.contacts.filter(c=>(c.a===pose.id&&(balance.contactIds??[balance.otherId]).includes(c.b))||(c.b===pose.id&&(balance.contactIds??[balance.otherId]).includes(c.a))).map(c=>c.strength)):0;
    const forward=(balance?.forwardWeight??0)*connection,counter=(balance?.counterWeight??0)*connection*(balance?1-bodyEase((balance.progress-.75)/.0625):1),settle=.012*forward+.035*counter+.012*(balance?.midpointPulse??0)*connection,bounce=balance||pose.arch?0:pose.bounce,archDrop=pose.arch?.kneeLowering??0;
    this.body.position.set(0,bounce-archDrop,0);
    // Illustrative no-contact hey styling keeps the elbows down, not winged out.
    this.body.rotation.y=0;this.body.rotation.z=balance||pose.activity==='swing'?0:pose.lean*.15*bodyPoseGate;this.body.rotation.x=balance?.055*forward-.12*counter:pose.activity==='swing'?0:pose.lean*.3*bodyPoseGate;
    // Tilt around the pelvis, retaining a self-supported hip rather than
    // rotating the entire upper body around the floor.
    if(balance){this.body.position.y+=.9*(1-Math.cos(this.body.rotation.x));this.body.position.z=-.9*Math.sin(this.body.rotation.x);}
    this.root.userData.balance=balance?{connection,forward,counter,tilt:this.body.rotation.x,settle}:undefined;
    this.label.visible=state.showLabels;this.halo.visible=state.showLabels||state.selectedDancer===pose.id;
    (this.halo.material as THREE.MeshBasicMaterial).opacity=state.selectedDancer===pose.id?.95:.25;this.halo.scale.setScalar(state.selectedDancer===pose.id?1.25:1);

    // One alternating weight-transfer/footfall per musical beat. Geometry can
    // expose an overlong step, but must never invent extra steps off the music.
    const wrap=(v:number)=>Math.atan2(Math.sin(v),Math.cos(v));
    const edge=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
    const getGait=(at:Frame)=>{
      const figureBeats=state.dance?.figures[at.figureIndex]?.beats??8;
      const figureStart=Math.round((at.beat-at.figureProgress*figureBeats)*1e6)/1e6;
      const cached=this.gaitSchedules.get(figureStart);if(cached)return cached;
      const count=Math.max(32,Math.ceil(figureBeats*24)),times:number[]=[],roots:Pose[]=[];
      for(let i=0;i<=count;i++){const t=i*figureBeats/count;times.push(t);roots.push(sample(Math.max(0,figureStart+t)).poses[pose.id]);}
      const result:GaitSchedule={start:figureStart,duration:figureBeats,times,phases:times,roots,steps:figureBeats,maxRate:1,plants:new Map<number,{point:THREE.Vector3;yaw:number;phase:number}>(),headings:new Map<number,number>()};
      this.gaitSchedules.set(figureStart,result);if(this.gaitSchedules.size>6)this.gaitSchedules.delete(this.gaitSchedules.keys().next().value!);
      return result;
    };
    const gait=getGait(frame);
    const gaitPhase=frame.beat;
    const beatAtPhase=(p:number,_current=gait):number=>p;
    this.root.userData.gait={phase:gaitPhase,steps:gait.steps,maxRate:gait.maxRate};
    const pointAtPhase=(p:number,side:number,current:GaitSchedule)=>{
      const beat=Math.max(0,beatAtPhase(p,current));
      let route=current;
      if(beat<route.start||beat>route.start+route.duration){route=[...this.gaitSchedules.values()].find(g=>beat>=g.start&&beat<=g.start+g.duration)??getGait(sample(beat));}
      const index=Math.max(0,Math.min(route.roots.length-1,(beat-route.start)/route.duration*(route.roots.length-1))),lo=Math.floor(index),u=index-lo,A=route.roots[lo],B=route.roots[Math.min(lo+1,route.roots.length-1)],yaw=A.yaw+wrap(B.yaw-A.yaw)*u;
      const point=new THREE.Vector3(side*.12,.055,.025).applyAxisAngle(Y,yaw);
      point.x+=A.position.x+(B.position.x-A.position.x)*u;point.z+=A.position.z+(B.position.z-A.position.z)*u;
      return{point,yaw:yaw-side*.06};
    };
    const footPlant=(p:number,side:number,gait:GaitSchedule)=>{
      const cached=gait.plants.get(p);if(cached)return cached;
      // Audio count 1 is the figure's start, not start+1. Land the inward
      // step and close on local beats 0/1, then the outward step and close on
      // local beats 2/3 at the outward count-4 stance. The final fraction
      // after count4 prepares the closed frame; local beat4 is swing count1.
      const landingBeat=Math.max(0,beatAtPhase(p,gait)),landingFrame=sample(landingBeat+1e-5),landing=landingFrame.poses[pose.id];
      const balanceFigure=state.dance?.figures[landingFrame.figureIndex];
      if(p>=0&&landing.balance&&balanceFigure?.beats===4){
        const localBeat=Math.round(landing.balance.progress*4);
        const destinationPhase=p+(localBeat<2?2-localBeat:3-localBeat);
        const result={...pointAtPhase(destinationPhase,side,gait),phase:destinationPhase};gait.plants.set(p,result);return result;
      }
      // Center the stance by travel distance, not elapsed time. An eased
      // side-step otherwise needlessly puts one end of stance out of reach.
      const route=Array.from({length:9},(_,i)=>pointAtPhase(p+i/8,side,gait));
      const lengths=[0];for(let i=1;i<route.length;i++)lengths.push(lengths[i-1]+route[i].point.distanceTo(route[i-1].point));
      const half=lengths[8]/2;let i=1;while(i<8&&lengths[i]<half)i++;
      const fraction=lengths[i]>lengths[i-1]?(half-lengths[i-1])/(lengths[i]-lengths[i-1]):.5;
      const phase=p+(i-1+fraction)/8,result={...pointAtPhase(phase,side,gait),phase};gait.plants.set(p,result);return result;
    };
    const planLegs=(at:Frame,currentPose:Pose)=>{
      const gait=getGait(at),gaitPhase=at.beat;
      return this.legs.map(leg=>{
        const offset=leg.side>0?1:0,plantPhase=Math.floor((gaitPhase-offset)/2)*2+offset,u=gaitPhase-plantPhase;
        const planted=footPlant(plantPhase,leg.side,gait),next=footPlant(plantPhase+2,leg.side,gait),airborne=u>=1;
        const travel=planted.point.distanceTo(next.point),swing=Math.max(0,u-1),ease=swing*swing*(3-2*swing);
        // Follow the curved root lane while airborne; a straight chord can cut
        // through the opposite dancer during a close hey passage.
        const point=airborne?pointAtPhase(planted.phase+(next.phase-planted.phase)*ease,leg.side,gait).point:planted.point.clone();
        const lift=airborne?Math.sin(Math.PI*swing)*Math.min(currentPose.balance?.035:.085,travel*.22):0;point.y+=lift;
        if(!gait.headings.has(plantPhase))gait.headings.set(plantPhase,sample(Math.max(0,beatAtPhase(plantPhase+1.5,gait))).poses[pose.id].yaw);
        const middleYaw=gait.headings.get(plantPhase)!-leg.side*.06;
        const heading=planted.yaw+(airborne?ease*(wrap(middleYaw-planted.yaw)+wrap(next.yaw-middleYaw)):0);
        const foot=point.sub(new THREE.Vector3(currentPose.position.x,0,currentPose.position.z)).applyAxisAngle(Y,-currentPose.yaw);
        const supportX=currentPose.balance?-.06*Math.sin(Math.PI*gaitPhase)*edge(at.figureProgress/.12)*edge((1-at.figureProgress)/.12):0;
        return {leg,foot,lift,heading,supportX};
      });
    };
    const legPlans=planLegs(frame,pose);
    // Reach-derived pelvis motion is anticipated and released smoothly, rather
    // than snapping upward when a foot leaves stance. A bounded Gaussian envelope
    // is deterministic at seeks and shared boundaries, and never stretches legs.
    if(!gait.pelvis){
      const step=1/24,pad=18,count=Math.round(gait.duration/step),needed:number[]=[];
      for(let i=-pad;i<=count+pad;i++){
        const at=sample(Math.max(0,gait.start+i*step)),p=at.poses[pose.id];let lower=0;
        for(const {leg,foot,supportX} of planLegs(at,p)){const ankle=foot.clone().add(new THREE.Vector3(0,.045,-.015)),horizontal=Math.hypot(ankle.x-leg.side*.105-supportX,ankle.z),highestHip=ankle.y+Math.sqrt(Math.max(0,.855*.855-horizontal*horizontal));lower=Math.max(lower,.9+(p.balance||p.arch?0:p.bounce)-(p.arch?.kneeLowering??0)-highestHip);}
        // A lateral opening shift needs a slightly lower pelvis for its two
        // musical steps. Anticipation may extend into the neighboring phrase.
        needed.push(Math.min(p.activity==='becket-shift'?.09:.06,lower));
      }
      // Small sampling guard preserves reach between the cached envelope knots.
      const values:number[]=[];
      for(let i=0;i<=count;i++){let lower=0;for(let j=-pad;j<=pad;j++)lower=Math.max(lower,needed[i+pad+j]*Math.exp(-.5*(j*step/.25)**2));values.push(Math.min(.09,lower>1e-7?lower+.005:0));}
      gait.pelvis={step,values};
    }
    const pIndex=Math.max(0,Math.min(gait.pelvis.values.length-1,(frame.beat-gait.start)/gait.pelvis.step)),pLow=Math.floor(pIndex),lowering=gait.pelvis.values[pLow]+(gait.pelvis.values[Math.min(pLow+1,gait.pelvis.values.length-1)]-gait.pelvis.values[pLow])*(pIndex-pLow);
    this.body.position.y-=lowering+settle;this.body.position.x=legPlans[0].supportX;
    const hipHeight=balance?.9+bounce-lowering-settle:.9+this.body.position.y;
    this.root.userData.hipPosition={x:this.body.position.x,y:hipHeight,z:0};
    this.root.userData.gait.pelvisLowering=lowering;this.root.userData.gait.reachClamps=0;this.root.userData.gait.rawLowering=0;this.root.userData.gait.maxClampDistance=0;
    for(const {leg,foot} of legPlans){const ankle=foot.clone().add(new THREE.Vector3(0,.045,-.015)),h=Math.hypot(ankle.x-leg.side*.105,ankle.z);this.root.userData.gait.rawLowering=Math.max(this.root.userData.gait.rawLowering,.9+(pose.balance||pose.arch?0:pose.bounce)-(pose.arch?.kneeLowering??0)-ankle.y-Math.sqrt(Math.max(0,.855*.855-h*h)));}
    for(const {leg,foot,lift,heading} of legPlans){
      const hip=new THREE.Vector3(leg.side*.105+this.body.position.x,hipHeight,0),ankle=foot.clone().add(new THREE.Vector3(0,.045,-.015));
      // Keep bones fixed-length if an imported path asks for an overlong step.
      // This bounds the pose; diagnostics still reveal excessive path speed.
      const horizontal=new THREE.Vector2(ankle.x-hip.x,ankle.z-hip.z),reach=Math.sqrt(Math.max(0,.855*.855-(hip.y-ankle.y)**2));
      if(horizontal.length()>reach+1e-10){this.root.userData.gait.reachClamps++;this.root.userData.gait.maxClampDistance=Math.max(this.root.userData.gait.maxClampDistance,horizontal.length()-reach);horizontal.setLength(reach);ankle.x=hip.x+horizontal.x;ankle.z=hip.z+horizontal.y;foot.x=ankle.x;foot.z=ankle.z+.015;}
      const knee=solveJoint(hip,ankle,.43,.43,new THREE.Vector3(0,0,1));
      cylinderBetween(leg.upper,hip,knee,.083);cylinderBetween(leg.lower,knee,ankle,.064);leg.knee.position.copy(knee);leg.foot.position.copy(foot);
      leg.foot.rotation.set(-lift*.9,heading-pose.yaw,0);
    }
    // The qualified three-count turn ducks beneath its arch about the unchanged
    // hip center. Root lanes, planted feet and fixed-length legs are untouched.
    if(pose.activity==='california-twirl'&&pose.arch?.armRoute==='three-count-poussette'&&pose.arch.underId===pose.id){const q=pose.arch.progress,gate=bodyEase((q-.12)/.15)*bodyEase((.65-q)/.15);this.body.rotation.x=-.12*gate;this.body.position.add(new THREE.Vector3(0,.9,0).sub(new THREE.Vector3(0,.9,0).applyQuaternion(this.body.quaternion)));}
    this.updateArms(pose,frame);
  }
  updateArms(pose:Pose,frame:Frame){
    const bodyEase=(x:number)=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
    const chainCue=pose.chainCourtesyPreparation,chainProgress=chainCue?.progress??0,chainBack=chainCue?.waistHand??'right',chainFront=chainBack==='right'?'left':'right',chainGate=chainCue?bodyEase((chainProgress-.4)/.08)*bodyEase((1-chainProgress)/.08):0;
    const balance=pose.balance,ringFrameIngress=balance?.handRoute==='released-ring-to-swing',balancePoseGate=bodyEase(frame.figureProgress/.12)*bodyEase((1-frame.figureProgress)/.12),phase=frame.beat*Math.PI,walk=this.rorySwingIngress&&this.centralSwingPreparation>0?0:pose.stride;
    const plan=(arm:Avatar['arms'][number])=>{const hand:Hand=arm.side<0?'right':'left';// local +x is the dancer’s left when facing +z
      const shoulder=new THREE.Vector3(arm.side*.235,1.355,0),passing=pose.activity==='hey'||pose.activity==='ricochet-hey'||pose.activity==='pass-through'||pose.activity==='cross-trails',passGate=passing?bodyEase(frame.figureProgress/.12)*bodyEase((1-frame.figureProgress)/.12):this.roryPassingGate,rightLeft=pose.activity==='right-left-through'||!!chainCue,rltGate=chainCue?chainGate:rightLeft?bodyEase(frame.figureProgress/.06)*bodyEase((1-frame.figureProgress)/.06):0,rltBehind=hand===(chainCue?chainBack:'right')?(chainCue?bodyEase((chainProgress-.4)/.12)*bodyEase((.98-chainProgress)/.08):rightLeft?bodyEase((frame.figureProgress-.34)/.05)*bodyEase((.98-frame.figureProgress)/.06):0):0,rltOffer=chainCue||hand==='right'?rltBehind:rightLeft?bodyEase((frame.figureProgress-.3)/.08):0,swing=Math.sin(phase+(arm.side>0?0:Math.PI))*walk;
      const archRelease=pose.activity==='box-the-gnat'&&hand==='right'&&pose.arch&&'releaseRouting' in pose.arch&&pose.arch.releaseRouting==='wide-exit'&&pose.arch.underId!==pose.id,archQ=pose.arch?.progress??0,archStage=archRelease?bodyEase((archQ-.52)/.12):0,archReturn=archRelease?bodyEase((archQ-.85)/.15):0;
      // Free hands hang at the sides, swinging a little as the dancer walks; a
      // hand about to take hold first comes up to the ready height in front.
      const engaged=Math.min(1,Math.max(0,...frame.contacts.filter(c=>(c.a===pose.id&&c.handA===hand)||((!c.target||c.target==='hands')&&c.b===pose.id&&c.handB===hand)).map(c=>c.strength),...(pose.swingPreparation?.contacts.some(c=>(c.a===pose.id&&c.handA===hand)||((!c.target||c.target==='hands')&&c.b===pose.id&&c.handB===hand))?[pose.swingPreparation.strength]:[])));
      const target=new THREE.Vector3(arm.side*.29,.76,.05+swing*.07).lerp(new THREE.Vector3(arm.side*.23,.98,.08+swing*.08),bodyEase(engaged)).lerp(new THREE.Vector3(arm.side*(.18+.065*this.roryPassingGate),.95,.18+swing*.035),passGate);
      const promenade=this.promenadeArmPreparation>0||pose.activity==='promenade',promenadeGate=this.promenadeArmPreparation;
      // The source-owned inside-hand oval uses a low, uncrossed free-arm route.
      if(this.ovalArmPreparation)target.lerp(new THREE.Vector3(arm.side*.245,.96,.13),this.ovalArmPreparation);
      // Skaters hands cross in front of the two torsos. Offer/release forward
      // before acquiring the opposite same-name hand; never route through a chest.
      if(promenade)target.lerp(new THREE.Vector3(arm.side*.23,hand==='left'?1.04:1.46,.32),promenadeGate);
      // R&L courtesy ingress/egress is an arm route, not a straight palm
      // interpolation through the other torso. Stage the right hand behind
      // its owner's waist before acquiring/releasing the shared back grip.
      if(chainCue){const raised=bodyEase((chainProgress-.52)/.06);target.lerp(new THREE.Vector3(arm.side*((hand===chainFront?.245:.18)+.10*Math.sin(Math.PI*rltBehind)),.79+.16*raised,.23+swing*.015-.47*rltBehind),rltGate);}
      // Passing close, a free hand hangs tucked in, not out where the passer walks.
      else if(rightLeft){target.lerp(new THREE.Vector3(arm.side*.22,.78,.13+swing*.025),rltGate);target.lerp(new THREE.Vector3(arm.side*(.18+.13*Math.sin(Math.PI*rltBehind)+.06*(1-rltBehind)),.95,.23+swing*.025-.47*rltBehind+.06*(1-rltBehind)),rltGate*rltOffer);}
      // The over-person releases behind the raised arm, then lowers outside
      // the shoulder. A straight blend from the far hand to low rest crosses
      // their chest. Return to ordinary rest before the following balance.
      if(archRelease)target.lerp(new THREE.Vector3(-.35+.12*archReturn-.16*Math.sin(Math.PI*archReturn),1.65-.67*archReturn,-.48+.63*archReturn),archStage*bodyEase((1-archQ)/.02));
      // Offer the hands before contact becomes reachable, avoiding a last-
      // instant arm snap when the pair finishes gathering.
      // A released ring-to-swing hand waits beside its own torso. The
      // paired-balance forward offer would cross the other free right arm.
      if(ringFrameIngress)target.x=arm.side*.27;
      if(balance&&!ringFrameIngress)target.lerp(new THREE.Vector3(arm.side*.22,1.24,.60),bodyEase(frame.figureProgress/.18)*bodyEase((1-frame.figureProgress)/.12));
      // California twirl has opposite joined hands and a side-by-side entry.
      // Its free hand stays low and close while the partner passes the arch.
      const california=pose.activity==='california-twirl',poussetteTwirl=california&&pose.arch?.armRoute==='three-count-poussette',twirlStyle=poussetteTwirl?bodyEase(frame.figureProgress*4/.25)*bodyEase((3-frame.figureProgress*4)/.25):1,californiaHeld=california&&hand===(pose.arch?.underId===pose.id?'left':'right');
      if(california){const rest=new THREE.Vector3(arm.side*(californiaHeld?.26:.245),californiaHeld?.95:.84,(californiaHeld?.16:.12)+swing*.025);if(poussetteTwirl)target.lerp(rest,twirlStyle);else target.copy(rest);}
      // The opposite-hand central handoff keeps unheld elbows low while the
      // active pair turns to its next named actor. Held targets still own the wrist.
      if(this.quarterArmGate)target.lerp(new THREE.Vector3(arm.side*.245,.84,.12+swing*.025),this.quarterArmGate);
      const doorCue=pose.revolvingDoorPreparation,door=doorCue?.route==='half-shoulder-waist-door',doorFree=door?(hand==='left'?doorCue.leftFree:doorCue.rightFree):0;const waistRelease=door&&hand==='right'?doorCue.rightWaistRelease:undefined,ordinaryDoorRest=new THREE.Vector3(arm.side*.245,.84,.12+swing*.025),doorRest=waistRelease?revolvingDoorReleaseRest(ordinaryDoorRest,waistRelease.settle):ordinaryDoorRest;if(doorFree)target.lerp(doorRest,doorFree);
      const prepared=pose.swingPreparation?.contacts.find(c=>(c.a===pose.id&&c.handA===hand)||((!c.target||c.target==='hands')&&c.b===pose.id&&c.handB===hand));
      if(prepared){const v=new THREE.Vector3(prepared.point.x-pose.position.x,prepared.point.y,prepared.point.z-pose.position.z).applyAxisAngle(Y,-pose.yaw).sub(this.body.position).applyQuaternion(this.body.quaternion.clone().invert());target.lerp(v,pose.swingPreparation!.strength);target.x+=arm.side*.18*Math.sin(Math.PI*pose.swingPreparation!.strength);}
      const contact=frame.contacts.find(c=>(c.a===pose.id&&c.handA===hand)||((!c.target||c.target==='hands')&&c.b===pose.id&&c.handB===hand));
      if(contact){const v=new THREE.Vector3(contact.point.x-pose.position.x,contact.point.y,contact.point.z-pose.position.z).applyAxisAngle(Y,-pose.yaw).sub(this.body.position).applyQuaternion(this.body.quaternion.clone().invert());target.lerp(v,contact.strength);}
      if(waistRelease&&contact?.kind==='courtesy')target.copy(revolvingDoorReleaseHand(target,contact.strength));
      // Offer both palms outside the chest during the explicit facing count.
      // This bow vanishes at zero/full grip and preserves the authored contact.
      if(poussetteTwirl&&frame.figureProgress>.75&&contact?.kind==='joined'){const bow=Math.sin(Math.PI*contact.strength);target.x+=arm.side*.12*bow;target.z+=.12*bow;}
      // This detour is only for the fading arch grip, never an incoming
      // balance contact. Its endpoint is zero at either full or absent grip.
      if(archRelease&&contact?.kind==='arch'){const release=Math.sin(Math.PI*contact.strength);target.z-=.25*release;target.y+=.12*release;}
      // After a free hey pass or explicit ring release, bring the left hand forward before
      // crossing the chest; route the delayed supporting right hand outside
      // its own side. Both detours vanish at the exact closed-frame endpoint.
      // The central turn's body still settles after its grip is almost full.
      // Retain a small C1 bow through that pose settling; it vanishes exactly
      // at the source boundary without changing the contact or settled frame.
      const heyFrame=(pose.activity==='hey'||ringFrameIngress||this.centralSwingIngress)&&contact?.kind==='swing-frame',heyRoute=heyFrame?Math.sin(Math.PI*contact.strength)+(this.centralSwingIngress?.5*contact.strength*(1-this.centralSwingPreparation):0):0;
      if(heyFrame&&hand==='left'){target.z+=(this.rorySwingIngress?0:.30)*heyRoute;target.y+=.08*heyRoute;}
      if(heyFrame&&contact.target==='back'){target.z-=.30*heyRoute;target.x-=(this.centralSwingIngress?.15:.10)*heyRoute;}
      // The short-wave exit offers the right hand outside its own side;
      // the generic forward left-arm bow would cross the partner's free arm.
      // This offer disappears at both ends and keeps the exact held endpoint.
      if(this.rorySwingIngress&&heyFrame&&hand==='right')target.x-=.30*Math.sin(Math.PI*contact.strength)*(1-contact.strength);
      const distance=target.distanceTo(shoulder);if(distance>.645)target.sub(shoulder).multiplyScalar(.645/distance).add(shoulder);
      const poleStrength=(this.passSwingIngress||door)?Math.max(contact?.strength??0,prepared?pose.swingPreparation!.strength:0):(contact?.strength??(prepared?pose.swingPreparation!.strength:0));
      // Explicit conventional-chain bend route: preserve the safe own-hand
      // return, keep the right bend behind, and settle its elbow before the
      // left. Do not reuse RLT's joined-hand pole for the outgoing ring edge.
      // The outward pole arc avoids a near-cancelling projected bend direction.
      // A held hand bends its elbow down, forearm rising to the hand ("W"
      // hands), easing off as the hand rises into an arch (by its height, so
      // a hand turning from joined to arch does not flip the elbow); figures
      // with their own arm routes steer it from there.
      const pole=new THREE.Vector3(arm.side*(.3+(!this.armLimit||contact?.kind==='swing-frame'||prepared?.kind==='swing-frame'?.5:HELD_ELBOW_OUT)*poleStrength),-1,-.3);if(contact&&(contact.kind==='joined'||contact.kind==='arch'))pole.lerp(new THREE.Vector3(arm.side*.6,-1,.15),Math.min(1,contact.strength*2)*Math.min(1,Math.max(0,(1.6-contact.point.y)/.3)));pole.lerp(new THREE.Vector3(0,-1,-.5),passGate);if(rightLeft){const staged=new THREE.Vector3(arm.side*.6*Math.sin(Math.PI*rltBehind),-1,1-2.1*rltBehind);if(chainCue){if(hand===chainBack&&chainProgress>.52)staged.z=-1.1;const raised=bodyEase((chainProgress-.52)/.06);staged.lerp(new THREE.Vector3(0,-1,-.5),1-raised);if(hand===chainFront)staged.x+=(chainFront==='left'?1:-1)*.35*Math.sin(Math.PI*raised);}if(contact?.kind==='joined'&&!chainCue)staged.lerp(new THREE.Vector3(0,0,1),contact.strength);
      // A hand at the waist or below (a low pull-by, a free hand) hangs from a low elbow.
      if(!chainCue)staged.lerp(new THREE.Vector3(arm.side*.3,-1,-.3),bodyEase((1.12-target.y)/.08)*(1-rltOffer)*(contact?.kind==='courtesy'?1-contact.strength:1));
      // The hand offered forward for the courtesy turn hangs from an elbow down and out.
      if(!chainCue&&hand==='left')staged.lerp(new THREE.Vector3(arm.side*1,-.3,.3),rltOffer*bodyEase((.55-frame.figureProgress)/.05)*(contact?.kind==='courtesy'?1-contact.strength:1));const poleGate=chainCue&&hand===chainBack?rltGate*bodyEase((.98-chainProgress)/.08):rltGate;pole.lerp(staged,poleGate);if(chainCue&&chainProgress>.9)pole.x+=arm.side*(hand===chainBack?.5:1.5)*Math.sin(Math.PI*poleGate);}
      if(door&&hand==='right')pole.lerp(new THREE.Vector3(0,-1,-1),doorCue.centralRight);
      if(doorFree)pole.lerp(new THREE.Vector3(0,-1,-.5),doorFree*(1-(contact?.strength??0)));
      if(this.quarterArmGate)pole.lerp(new THREE.Vector3(0,-1,-.5),this.quarterArmGate*(1-(contact?.strength??0)));
      if(california){const raised=californiaHeld&&contact?.kind==='arch'?bodyEase((contact.point.y-1.3)/.35)*contact.strength:0;pole.lerp(new THREE.Vector3((pose.arch?.underId===pose.id?arm.side:-arm.side)*.6,1,0),raised);if(!californiaHeld){if(poussetteTwirl)pole.lerp(new THREE.Vector3(0,-1,-.5),twirlStyle);else pole.set(0,-1,-.5);}}
      if(archRelease){
        // Route the elbow behind the shoulder as the held hand descends;
        // keep exact fixed-length wrists and do not fold the forearm inward.
        const axis=target.clone().sub(shoulder).normalize(),up=new THREE.Vector3(0,1,0).addScaledVector(axis,-axis.y).normalize(),back=axis.clone().cross(up),theta=(220+30*bodyEase((archQ-.710)/.020))*Math.PI/180;
        pole.lerp(new THREE.Vector3(0,0,-1),archStage*(1-archReturn));
        pole.lerp(up.multiplyScalar(Math.cos(theta)).addScaledVector(back,Math.sin(theta)),bodyEase((archQ-.66)/.04)*bodyEase((.84-archQ)/.04));
      }if(balance)pole.lerp(new THREE.Vector3(arm.side*.2,-1,-.15),balancePoseGate);
      if(this.ovalArmPreparation)pole.lerp(new THREE.Vector3(0,-1,-.8),this.ovalArmPreparation);
      if(promenade)pole.lerp(new THREE.Vector3(arm.side*.15,hand==='left'?-.4:1,1),promenadeGate*(pose.activity==='swing'?1-(contact?.strength??0):1));
      if(contact?.target==='wrist'){
        const incoming=frame.contacts.find(c=>c.target==='wrist'&&c.b===pose.id&&c.handB===hand);
        if(incoming){const grip=new THREE.Vector3(incoming.point.x-pose.position.x,incoming.point.y,incoming.point.z-pose.position.z).applyAxisAngle(Y,-pose.yaw).sub(this.body.position).applyQuaternion(this.body.quaternion.clone().invert()),toward=grip.sub(target);if(toward.lengthSq()>1e-8){const desired=target.clone().addScaledVector(toward.normalize(),.325);pole.lerp(desired.sub(shoulder),contact.strength*incoming.strength);}}
      }
      if(heyFrame&&hand==='left')pole.lerp(new THREE.Vector3(0,0,1),heyRoute*(this.rorySwingIngress?0:1));
      if(heyFrame&&contact.target==='back')pole.lerp(new THREE.Vector3(-.6,0,-1),heyRoute);
      // Opposite-hand elbows clear the head during the compressed arch and
      // its release; the ordinary four-count route never enters this branch.
      if(poussetteTwirl&&californiaHeld){const q=pose.arch!.progress,angle=(pose.arch!.underId===pose.id?-30*bodyEase((q-.12)/.15)*bodyEase((.65-q)/.15):-40*bodyEase((q-.72)/.08)*bodyEase((1-q)/.08))*Math.PI/180;pole.applyAxisAngle(target.clone().sub(shoulder).normalize(),angle);}
      if(waistRelease){
        const held=contact?.kind==='courtesy'?{point:new THREE.Vector3(contact.point.x-pose.position.x,contact.point.y,contact.point.z-pose.position.z).applyAxisAngle(Y,-pose.yaw).sub(this.body.position).applyQuaternion(this.body.quaternion.clone().invert()),strength:contact.strength}:undefined;
        pole.copy(revolvingDoorReleasePole(shoulder,target,ordinaryDoorRest,waistRelease.settle,held));
      }
      return{arm,shoulder,target,pole,hold:Math.max(contact?.strength??0,prepared?pose.swingPreparation!.strength:0)};
    };
    // Shoulder limit: an upper arm never points behind the shoulder, a low
    // arm only a little (src/arm-limit.ts). The elbow bends inside the limit to
    // reach a held hand; a free arm swings forward as a whole; a hand no bend
    // reaches (only while a grip is still taking hold or letting go, since
    // the engine releases holds that would need more) swings forward too.
    const plans=this.arms.map(plan);
    let moved=0;
    for(const plan of plans){
      const {arm,shoulder}=plan;let {target,pole}=plan;
      if(!this.armLimit){const elbow=solveJoint(shoulder,target,.325,.325,pole);cylinderBetween(arm.upper,shoulder,elbow,.055);cylinderBetween(arm.lower,elbow,target,.044);arm.elbow.position.copy(elbow);arm.hand.position.copy(target);arm.hand.quaternion.setFromUnitVectors(Y,target.clone().sub(elbow).normalize());continue;}
      // A free arm swung past the limit swings forward as a whole, hand and
      // all, about the shoulder; a held hand stays on its grip and the elbow
      // bends to it (below). Partly held hands share the two.
      const free=1-Math.min(1,Math.max(0,plan.hold));
      if(free>0){const upper=solveJoint(shoulder,target,.325,.325,pole).sub(shoulder).normalize(),excess=Math.asin(Math.max(-1,Math.min(1,-upper.z)))-backLimit(-upper.y)*Math.PI/180;
        if(excess>0){const axis=upper.clone().cross(new THREE.Vector3(0,0,1));if(axis.lengthSq()<1e-12)axis.set(arm.side,0,0);axis.normalize();target=target.clone().sub(shoulder).applyAxisAngle(axis,excess*free).add(shoulder);pole=pole.clone().applyAxisAngle(axis,excess*free);}}
      const reached=limitShoulderReach(shoulder,target);moved=Math.max(moved,reached.distanceTo(target));
      let elbow=solveLimitedElbow(shoulder,reached,.325,.325,pole,arm.side);
      // Whatever is left past the allowance (a hand pulled out of reach): the
      // whole arm turns forward about the shoulder onto the limit.
      for(let i=0;i<3;i++){const up=elbow.clone().sub(shoulder).normalize(),ex=Math.asin(Math.max(-1,Math.min(1,-up.z)))-backLimit(-up.y)*Math.PI/180;if(ex<=1e-4)break;
        const axis=up.clone().cross(new THREE.Vector3(0,0,1));if(axis.lengthSq()<1e-12)axis.set(arm.side,0,0);axis.normalize();
        elbow=elbow.clone().sub(shoulder).applyAxisAngle(axis,ex).add(shoulder);reached.sub(shoulder).applyAxisAngle(axis,ex).add(shoulder);}
      cylinderBetween(arm.upper,shoulder,elbow,.055);cylinderBetween(arm.lower,elbow,reached,.044);arm.elbow.position.copy(elbow);arm.hand.position.copy(reached);arm.hand.quaternion.setFromUnitVectors(Y,reached.clone().sub(elbow).normalize());
    }
    this.root.userData.armLimit={moved};
  }
  dispose(){
    const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
    this.root.traverse(obj=>{const mesh=obj as THREE.Mesh;if(mesh.geometry&&mesh.geometry!==sphere&&mesh.geometry!==bone)geometries.add(mesh.geometry);const mats=Array.isArray(mesh.material)?mesh.material:mesh.material?[mesh.material]:[];for(const material of mats){materials.add(material);const map=(material as THREE.MeshStandardMaterial).map;if(map)textures.add(map);}});
    for(const g of geometries)g.dispose();for(const t of textures)t.dispose();for(const m of materials)m.dispose();
  }
}

/** Resolve body grips after every torso has been posed. The engine's point
 * remains the root-space plan; only its declared body-anchor contribution moves. */
export function applyBodyContactAnchors(avatars:Avatar[],frame:Frame):Frame {
  const changed=new Set<number>();
  const contacts=frame.contacts.map(contact=>{
    // The raised shared hand follows the actual shoulders after reach-derived
    // pelvis lowering. Both dancers use one target; neither arm is stretched.
    if(contact.kind==='arch'){
      let height=contact.point.y;
      for(const [id,hand] of [[contact.a,contact.handA],[contact.b,contact.handB]] as [number,Hand][]){
        const avatar=avatars.find(a=>a.dancer.id===id);if(!avatar)continue;
        const shoulder=new THREE.Vector3(hand==='left'?.235:-.235,1.355,0).applyQuaternion(avatar.body.quaternion).add(avatar.body.position).applyQuaternion(avatar.root.quaternion).add(avatar.root.position);
        const horizontal=Math.hypot(contact.point.x-shoulder.x,contact.point.z-shoulder.z);
        height=Math.min(height,shoulder.y+Math.sqrt(Math.max(0,.640*.640-horizontal*horizontal)));
        changed.add(id);
      }
      return{...contact,point:{...contact.point,y:height}};
    }
    if(!contact.bodyPoint)return contact;
    const recipient=avatars.find(a=>a.dancer.id===contact.b);if(!recipient)return contact;
    const local=new THREE.Vector3(contact.bodyPoint.x,contact.bodyPoint.y,contact.bodyPoint.z);
    const delta=local.clone().applyQuaternion(recipient.body.quaternion).add(recipient.body.position).sub(local).applyQuaternion(recipient.root.quaternion).multiplyScalar(contact.bodyBlend??1);
    changed.add(contact.a);
    return{...contact,point:{x:contact.point.x+delta.x,y:contact.point.y+delta.y,z:contact.point.z+delta.z}};
  });
  if(!changed.size)return frame;
  const corrected={...frame,contacts};for(const avatar of avatars)if(changed.has(avatar.dancer.id))avatar.updateArms(frame.poses[avatar.dancer.id],corrected);
  return corrected;
}

/** Pure camera fit calculation; no DOM/WebGL or camera mutation required. */
export function fitPerspectiveBounds(bounds:THREE.Box3,aspect:number,direction:THREE.Vector3,fov=38,padding=1.1,target=bounds.getCenter(new THREE.Vector3())){
  const camera=new THREE.PerspectiveCamera(fov,aspect,.1,100);camera.position.copy(target).add(direction);
  const distance=fitPerspectiveCamera(camera,bounds,target,padding);
  return{position:camera.position.clone(),target:target.clone(),distance};
}

export class DanceScene {
  renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.1,100);controls:OrbitControls;avatars:Avatar[]=[];compiled:CompiledDance;
  private swingPresentationController?:SwingPresentationController;
  public presentationStatus:SwingPresentationStatus={applied:'source',warnings:[]};
  get presentationResult(){return this.swingPresentationController?.lastResult;}
  private paths=new THREE.Group();private handLines=new THREE.Group();private contactDots:THREE.Mesh[]=[];private contactDotGeometry=new THREE.SphereGeometry(.026,10,8);private contactDotMaterial=new THREE.MeshBasicMaterial({color:'#bf993e'});private resize:ResizeObserver;private mode:CameraMode='perspective';private selected=-1;private lastFigure=-1;private lastRepeat=-1;
  private band=new RobotBand();private visualBounds=new THREE.Box3();
  private floorDetail=new THREE.Group();private floorSlab!:THREE.Mesh;private musicMarker!:THREE.Sprite;
  private danceBounds=new THREE.Box3(new THREE.Vector3(-2.5,0,-7),new THREE.Vector3(2.5,2.3,7));
  private targetPosition=new THREE.Vector3();private targetLook=new THREE.Vector3();private focus=new THREE.Vector3();private select:(id:number)=>void;
  public host:HTMLElement;
  constructor(host:HTMLElement,compiled:CompiledDance,onSelect:(id:number)=>void){
    this.host=host;
    this.compiled=compiled;this.select=onSelect;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.setClearColor('#eeeee8');this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
    this.renderer.domElement.setAttribute('aria-label','Interactive 3D contra dance floor. Drag to orbit, scroll to zoom, click a dancer to follow.');this.renderer.domElement.tabIndex=0;this.host.append(this.renderer.domElement);
    this.scene.fog=new THREE.Fog('#eeeee8',24,60);
    this.scene.add(new THREE.HemisphereLight('#fff9ed','#869589',2.6));const sun=new THREE.DirectionalLight('#fff9ef',3.4);sun.position.set(-6,13,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-12;sun.shadow.camera.right=12;sun.shadow.camera.top=12;sun.shadow.camera.bottom=-12;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;this.scene.add(sun);
    const fill=new THREE.DirectionalLight('#d4e9ed',1.5);fill.position.set(8,7,-5);this.scene.add(fill);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(140,140),mat('#e9e8df'));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);
    this.floorSlab=new THREE.Mesh(new THREE.BoxGeometry(1,.07,1),mat('#f6f2e7'));this.floorSlab.position.y=-.035;this.floorSlab.receiveShadow=true;this.scene.add(this.floorSlab,this.floorDetail);
    this.musicMarker=makeLabel('TOWARD THE MUSIC','#66796e');this.musicMarker.position.set(0,.12,-7);this.musicMarker.scale.set(2.3,.85,1);this.scene.add(this.musicMarker);
    this.scene.add(this.paths,this.handLines,this.band.group);this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=true;this.controls.dampingFactor=.08;this.controls.minDistance=3;this.controls.maxDistance=32;this.controls.maxPolarAngle=Math.PI/2-.04;this.controls.target.set(0,.45,0);this.resetCamera();
    this.resize=new ResizeObserver(()=>this.resizeCanvas());this.resize.observe(host);this.setDance(compiled);
    let downX=0,downY=0;this.renderer.domElement.addEventListener('pointerdown',e=>{downX=e.clientX;downY=e.clientY;});this.renderer.domElement.addEventListener('pointerup',e=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)>5)return;const rect=this.renderer.domElement.getBoundingClientRect(),mouse=new THREE.Vector2((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(mouse,this.camera);const hits=ray.intersectObjects(this.avatars.map(a=>a.root),true);if(hits.length){let obj:THREE.Object3D|null=hits[0].object;while(obj&&obj.userData.dancerId===undefined)obj=obj.parent;if(obj)this.select(obj.userData.dancerId);}});
  }
  setDance(compiled:CompiledDance){
    this.swingPresentationController?.dispose();this.swingPresentationController=undefined;this.presentationStatus={applied:'source',warnings:[]};
    this.compiled=compiled;for(const a of this.avatars){this.scene.remove(a.root);a.dispose();}this.avatars=compiled.dancers.map(d=>new Avatar(d));const limit=armLimitFor(compiled);for(const a of this.avatars){a.armLimit=limit;this.scene.add(a.root);}this.lastFigure=-1;this.lastRepeat=-1;
    for(const obj of this.paths.children){const line=obj as THREE.Line;line.geometry.dispose();(line.material as THREE.Material).dispose();}this.paths.clear();
    this.danceBounds.copy(choreographyBounds(compiled));
    this.band.setFloorBounds(this.danceBounds);this.visualBounds.copy(this.danceBounds).union(this.band.bounds().expandByScalar(.25));
    const size=this.visualBounds.getSize(new THREE.Vector3()),center=this.visualBounds.getCenter(new THREE.Vector3()),width=Math.max(7,size.x+1.4),length=Math.max(8,size.z+1.4);
    this.floorSlab.scale.set(width,1,length);this.floorSlab.position.z=center.z;this.musicMarker.position.z=this.danceBounds.min.z-.25;
    for(const child of this.floorDetail.children){const mesh=child as THREE.Mesh;mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();}this.floorDetail.clear();
    for(let z=center.z-length/2;z<=center.z+length/2;z+=.5){const seam=new THREE.Mesh(new THREE.BoxGeometry(width,.001,.008),new THREE.MeshBasicMaterial({color:'#e3e0d5'}));seam.position.set(0,.003,z);this.floorDetail.add(seam);}
    for(const x of [-(width/2-.6),width/2-.6]){const line=new THREE.Mesh(new THREE.BoxGeometry(.012,.004,length-1.4),new THREE.MeshBasicMaterial({color:'#b8c6b7',transparent:true,opacity:.55}));line.position.set(x,.006,center.z);this.floorDetail.add(line);}
    if(this.mode!=='dancer')this.fitCamera(false);
  }
  private fitCamera(preserveView:boolean){
    const direction=this.camera.position.clone().sub(this.controls.target),oldDistance=direction.length();if(oldDistance<.1)direction.set(10,12,15);
    const bounds=this.visualBounds.isEmpty()?this.danceBounds:this.visualBounds;
    const fit=fitPerspectiveBounds(bounds,this.camera.aspect,direction,this.camera.fov,1.1,preserveView?this.controls.target:bounds.getCenter(new THREE.Vector3()));
    this.controls.target.copy(fit.target);this.camera.position.copy(fit.target).addScaledVector(direction.normalize(),preserveView?Math.max(oldDistance,fit.distance):fit.distance);
    this.controls.maxDistance=Math.max(32,fit.distance*2.5);this.camera.far=Math.max(100,this.controls.maxDistance+bounds.getSize(new THREE.Vector3()).length()*2);this.camera.updateProjectionMatrix();
    if(this.scene.fog instanceof THREE.Fog){this.scene.fog.near=this.controls.maxDistance;this.scene.fog.far=this.camera.far;}
    this.controls.update();
  }
  resizeCanvas(){const {width,height}=this.host.getBoundingClientRect();if(width<1||height<1)return;const oldAspect=this.camera.aspect;this.renderer.setSize(width,height);this.camera.aspect=width/height;this.camera.updateProjectionMatrix();if(this.mode!=='dancer'&&Math.abs(oldAspect-this.camera.aspect)>.015)this.fitCamera(true);}
  resetCamera(){this.mode='perspective';this.controls.enabled=true;this.controls.target.set(0,.5,0);this.camera.position.set(10.2,12.4,14.8);this.fitCamera(false);}
  setCamera(mode:CameraMode){this.mode=mode;this.controls.enabled=mode!=='dancer';if(mode==='perspective'){this.resetCamera();return;}if(mode==='overhead'){this.camera.position.set(0,19,.01);this.controls.target.set(0,0,0);}if(mode==='side'){this.camera.position.set(15,4.8,1);this.controls.target.set(0,.8,0);}if(mode!=='dancer')this.fitCamera(false);else this.controls.update();}
  update(frame:Frame,state:StudioState){
    if(this.mode!==state.camera)this.setCamera(state.camera);
    const requested=state.swingPresentation?.kind==='reciprocal-blade-preview';
    if(!requested&&this.swingPresentationController){this.swingPresentationController.dispose();this.swingPresentationController=undefined;}
    if(requested&&!this.swingPresentationController)this.swingPresentationController=new SwingPresentationController(this.compiled,this.avatars,{createAvatar:d=>{const a=new Avatar(d);a.armLimit=armLimitFor(this.compiled);return a;},applyBodyContactAnchors});
    this.swingPresentationController?.prepareBaseline();
    const footSamples=new Map<number,Frame>();const sample=(beat:number)=>{if(!footSamples.has(beat))footSamples.set(beat,this.compiled.sample(beat));return footSamples.get(beat)!;};
    for(let i=0;i<this.avatars.length;i++)this.avatars[i].update(frame.poses[i],frame,state,sample);
    const renderedFrame=applyBodyContactAnchors(this.avatars,frame);
    const presentation=this.swingPresentationController?.apply(frame,renderedFrame,state);
    this.presentationStatus=presentation?this.swingPresentationController!.status:{applied:'source',warnings:[]};
    const renderedContacts=presentation?this.swingPresentationController!.contactDots(presentation):renderedFrame.contacts;
    this.band.update(frame.beat,state.audioMode!=='off');
    // Trails are rebuilt only while shown: rebuilding samples the whole figure (a dropped frame at each figure change).
    if(state.showTrails&&(this.lastFigure!==frame.figureIndex||this.lastRepeat!==frame.repeat||this.selected!==state.selectedDancer)){this.rebuildPaths(frame,state);this.lastFigure=frame.figureIndex;this.lastRepeat=frame.repeat;this.selected=state.selectedDancer;}
    this.paths.visible=state.showTrails;
    let visibleDots=0;
    if(state.showConnections){for(const contact of renderedContacts){if(contact.strength<.6)continue;
      let dot=this.contactDots[visibleDots];if(!dot){dot=new THREE.Mesh(this.contactDotGeometry,this.contactDotMaterial);this.contactDots.push(dot);this.handLines.add(dot);}
      dot.position.set(contact.point.x,contact.point.y,contact.point.z);dot.visible=true;visibleDots++;
    }}
    for(let i=visibleDots;i<this.contactDots.length;i++)this.contactDots[i].visible=false;
    if(state.camera==='dancer'){const p=frame.poses[state.selectedDancer>=0?state.selectedDancer:0];this.targetPosition.set(p.position.x-Math.sin(p.yaw)*2.4,2.8,p.position.z-Math.cos(p.yaw)*2.4);this.targetLook.set(p.position.x,1.1,p.position.z);this.camera.position.lerp(this.targetPosition,.07);this.controls.target.lerp(this.targetLook,.1);this.camera.lookAt(this.controls.target);}
    else this.controls.update();this.renderer.render(this.scene,this.camera);
  }
  private rebuildPaths(frame:Frame,state:StudioState){
    for(const obj of this.paths.children){const line=obj as THREE.Line;line.geometry.dispose();(line.material as THREE.Material).dispose();}this.paths.clear();
    const start=frame.repeat*this.compiled.totalBeats+this.compiled.starts[frame.figureIndex],duration=this.compiled.dance.figures[frame.figureIndex].beats;
    const selected=state.selectedDancer>=0?[state.selectedDancer]:[0,1,2,3];
    for(const id of selected){const points=[];for(let i=0;i<=80;i++){const p=this.compiled.sample(start+duration*i/80-.00001).poses[id].position;points.push(new THREE.Vector3(p.x,.024,p.z));}const g=new THREE.BufferGeometry().setFromPoints(points),m=new THREE.LineDashedMaterial({color:this.compiled.dancers[id].color,transparent:true,opacity:.52,dashSize:.13,gapSize:.07});const line=new THREE.Line(g,m);line.computeLineDistances();this.paths.add(line);}
  }
  dispose(){this.swingPresentationController?.dispose();this.swingPresentationController=undefined;this.resize.disconnect();this.controls.dispose();this.band.dispose();for(const avatar of this.avatars)avatar.dispose();this.contactDotGeometry.dispose();this.contactDotMaterial.dispose();this.renderer.dispose();}
}
