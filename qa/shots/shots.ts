// Close-up review renders: ?case=<proof id>&beat=<n>&focus=<id,id>&view=front|side|back&w=&h=
import * as THREE from 'three';
import {Avatar,applyBodyContactAnchors,armLimitFor} from '../../src/scene.ts';
import {compileProof,type ProofCase} from '../../src/next/proof.ts';
import cases from '../../src/next/proof-cases.json';
const q=new URLSearchParams(location.search),c=(cases as ProofCase[]).find(x=>x.id===q.get('case'))!;
const proof=compileProof(c),dance=proof.dance as any,beat=proof.start+Number(q.get('beat')??0);
const W=Number(q.get('w')??640),H=Number(q.get('h')??520);
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(W,H);renderer.setClearColor('#eeeee8');renderer.shadowMap.enabled=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;document.body.append(renderer.domElement);
const scene=new THREE.Scene();scene.add(new THREE.HemisphereLight('#fff9ed','#869589',2.6));const sun=new THREE.DirectionalLight('#fff9ef',3.4);sun.position.set(-6,13,8);sun.castShadow=true;scene.add(sun);const fill=new THREE.DirectionalLight('#d4e9ed',1.5);fill.position.set(8,7,-5);scene.add(fill);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:'#f6f2e7',roughness:.8}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const avatars=dance.dancers.map((d:any)=>{const a=new Avatar(d);a.armLimit=armLimitFor(dance);return a;});for(const a of avatars)scene.add(a.root);
const state={dance:dance.dance,showLabels:false,selectedDancer:-1} as any,cache=new Map<number,any>(),sample=(b:number)=>{let f=cache.get(b);if(!f){f=dance.sample(b);cache.set(b,f);}return f;};
const frame=sample(beat);for(const a of avatars)a.update(frame.poses[a.dancer.id],frame,state,sample);applyBodyContactAnchors(avatars,frame);
const focus=(q.get('focus')??'').split(',').filter(Boolean).map(Number),who=focus.length?focus:avatars.map((a:any)=>a.dancer.id);
const center=new THREE.Vector3();let yaw=0;for(const id of who){const p=frame.poses[id];center.x+=p.position.x/who.length;center.z+=p.position.z/who.length;}
const p0=frame.poses[who[0]];yaw=p0.yaw;
const view=q.get('view')??'front';let ang=yaw+(view==='side'?Math.PI/2:view==='rside'?-Math.PI/2:view==='back'?Math.PI:view==='diag'?Math.PI/4:0);
if(view.startsWith('pair')&&who.length>=2){const a=frame.poses[who[0]].position,b=frame.poses[who[1]].position;ang=Math.atan2(b.x-a.x,b.z-a.z)+(view==='pair2'?-Math.PI/2:Math.PI/2);}
if(view.startsWith('deg'))ang=Number(view.slice(3))*Math.PI/180;
const dist=Number(q.get('dist')??(who.length>2?7:4.6));
const camera=new THREE.PerspectiveCamera(32,W/H,.1,100);camera.position.set(center.x+Math.sin(ang)*dist,1.7,center.z+Math.cos(ang)*dist);camera.lookAt(center.x,.95,center.z);
renderer.render(scene,camera);(window as any).done=true;
