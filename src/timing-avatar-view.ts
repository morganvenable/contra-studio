import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Avatar} from './scene.ts';
import type {ExecutionTimingSample} from './execution-timing-study.ts';
import type {sampleSwingTorsoStudy,StudyPoint} from './swing-torso-study.ts';

const up=new THREE.Vector3(0,1,0);
const point=(p:StudyPoint,y=0)=>new THREE.Vector3(p.x,p.y??y,p.z);
function segment(mesh:THREE.Mesh,a:THREE.Vector3,b:THREE.Vector3,radius:number){
 const delta=b.clone().sub(a);mesh.position.copy(a).add(b).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(up,delta.normalize());mesh.scale.set(radius,Math.max(.02,a.distanceTo(b))/3,radius);
}
/** The same procedural people as the studio, driven by the isolated study's measured joints. */
export function createTimingAvatarView(container:HTMLElement){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#f5f1e8');
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.domElement.setAttribute('aria-label','Articulated dancers: drag to orbit, scroll to zoom');
 renderer.domElement.style.cssText='display:block;width:100%;height:100%;touch-action:none';container.append(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(37,1,.05,30);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.95,0);controls.minDistance=2.2;controls.maxDistance=8;controls.maxPolarAngle=Math.PI*.49;controls.enablePan=false;
 scene.add(new THREE.HemisphereLight('#fffaf0','#8c9691',2.5));
 const light=new THREE.DirectionalLight('#fff7e8',3);light.position.set(2,5,3);light.castShadow=true;light.shadow.mapSize.set(1024,1024);scene.add(light);
 const floor=new THREE.Mesh(new THREE.CircleGeometry(2.6,64),new THREE.MeshStandardMaterial({color:'#e7e1d3',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.006;floor.receiveShadow=true;scene.add(floor);
 const avatars=[0,1].map(id=>new Avatar({id,name:id?'Robin':'Lark',role:id?'robin':'lark',couple:0,direction:1,color:id?'#b65d41':'#337967'}));
 for(const avatar of avatars){
  scene.add(avatar.root);avatar.halo.visible=false;avatar.label.visible=false;
  // Keep hips with the legs while the upper body turns. Adapt only the shirt's
  // horizontal envelope to the study's .36 x .20 shoulder cross section.
  const hips=avatar.body.getObjectByName('hips')!;avatar.root.add(hips);
  const shirt=avatar.body.getObjectByName('torso')!;shirt.scale.set(.18/.2341666667,1,.10/.2341666667);
 }
 let disposed=false;
 const draw=()=>{if(!disposed)renderer.render(scene,camera);};
 controls.addEventListener('change',draw);
 const resize=()=>{const width=Math.max(1,container.clientWidth),height=Math.max(1,container.clientHeight);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();draw();};
 const observer=new ResizeObserver(resize);observer.observe(container);
 function setView(view:'perspective'|'top'){
  camera.position.set(...(view==='top'?[.001,5.6,.001]:[2.7,2.55,3.5]) as [number,number,number]);controls.target.set(0,view==='top'?.8:.95,0);controls.update();draw();
 }
 setView('perspective');resize();
 return {
  setView,
  render(sample:ExecutionTimingSample,frame:ReturnType<typeof sampleSwingTorsoStudy>){
   for(const pose of sample.poses){
    const avatar=avatars[pose.id],torso=frame.torsos.find(t=>t.id===pose.id)!;
    avatar.root.position.set(pose.position.x,0,pose.position.z);avatar.root.rotation.set(0,pose.pelvisYaw,0);
    const offset=point(torso.center).sub(point(pose.position)).applyAxisAngle(up,-pose.pelvisYaw);
    avatar.body.position.copy(offset);avatar.body.rotation.set(0,torso.torsoYaw-pose.pelvisYaw,0);
    avatar.root.updateMatrixWorld(true);
    // Both endpoints are transformed into the exact parent's coordinates, so
    // torso rotation cannot rotate the hands away from their world contacts.
    for(const arm of avatar.arms){
     const plan=frame.arms.find(a=>a.actorId===pose.id&&a.side===(arm.side<0?'right':'left'));
     if(!plan)continue;
     const shoulder=avatar.body.worldToLocal(point(plan.shoulder,1.35));
     const elbow=avatar.body.worldToLocal(point(plan.elbow,1.35));
     const hand=avatar.body.worldToLocal(point(plan.hand,1.35));
     segment(arm.upper,shoulder,elbow,.043);segment(arm.lower,elbow,hand,.034);arm.elbow.position.copy(elbow);arm.hand.position.copy(hand);
     arm.hand.quaternion.setFromUnitVectors(up,hand.clone().sub(elbow).normalize());
    }
    for(const leg of avatar.legs){
     const foot=pose.feet.find(f=>f.side===(leg.side<0?'right':'left'))!;
     const shoe=avatar.root.worldToLocal(new THREE.Vector3(foot.position.x,.055+foot.lift,foot.position.z));
     const hip=new THREE.Vector3(leg.side*.105,.9,0),ankle=shoe.clone().add(new THREE.Vector3(0,.045,0));
     const delta=ankle.clone().sub(hip),distance=delta.length(),axis=delta.normalize();
     // Knee pole follows the pelvis forward axis rather than pointing sideways.
     const pole=new THREE.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize();
     const half=distance/2,knee=hip.clone().addScaledVector(axis,half).addScaledVector(pole,Math.sqrt(Math.max(0,.43*.43-half*half)));
     segment(leg.upper,hip,knee,.083);segment(leg.lower,knee,ankle,.064);leg.knee.position.copy(knee);leg.foot.position.copy(shoe);leg.foot.rotation.set(0,foot.yaw-pose.pelvisYaw,0);
    }
   }
   draw();
  },
  dispose(){disposed=true;observer.disconnect();controls.removeEventListener('change',draw);controls.dispose();for(const avatar of avatars)avatar.dispose();floor.geometry.dispose();(floor.material as THREE.Material).dispose();renderer.dispose();renderer.domElement.remove();}
 };
}



