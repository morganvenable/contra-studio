import * as THREE from 'three';
/** A small original procedural practice band. The musical clock, not wall time,
 * drives every gesture, so pause, scrubbing and tempo changes remain coherent. */
export class RobotBand {
 readonly group=new THREE.Group();
 private geometries=new Set<THREE.BufferGeometry>();
 private materials=new Set<THREE.Material>();
 private performers:Array<{root:THREE.Group;head:THREE.Group;left:THREE.Group;right:THREE.Group;instrument:THREE.Group}>=[];
 private bellows!:THREE.Group;
 private bow!:THREE.Group;
 private pluck!:THREE.Group;
 private lamps:THREE.Mesh[]=[];
 private disposed=false;
 constructor(){
  this.group.name='Original synthesized practice robot band';
  const metal=this.material('#9fb5b0',.4,.7),dark=this.material('#294740',.62,.4),brass=this.material('#d5ae65',.42,.65),wood=this.material('#82563c'),white=this.material('#f1edd8'),eye=this.material('#b6ffcf',.4,0,'#468660');
  this.box(this.group,wood,[6.4,.28,2.7],[0,.14,0]);
  for(let x=-3;x<=3;x+=.4)this.box(this.group,dark,[.012,.008,2.68],[x,.285,0]);
  this.box(this.group,brass,[6.42,.05,.06],[0,.27,1.36]);
  for(const x of[-2.9,2.9]){this.box(this.group,dark,[.4,.65,.4],[x,.61,-.8]);for(const y of[.47,.77])this.sphere(this.group,metal,[.14,.14,.02],[x,y,-.585]);}
  for(let i=0;i<3;i++){
   const root=new THREE.Group();root.position.set((i-1)*1.85,.29,i===1?-.25:0);this.group.add(root);
   for(const x of[-.17,.17]){this.box(root,dark,[.16,.41,.16],[x,.23,0]);this.box(root,brass,[.22,.12,.36],[x,.06,.075]);}
   this.box(root,metal,[.62,.55,.33],[0,.72,0]);this.box(root,dark,[.45,.12,.35],[0,.43,0]);
   this.sphere(root,brass,[.08,.08,.08],[0,1.04,0]);
   const head=new THREE.Group();head.position.y=1.25;root.add(head);this.box(head,metal,[.58,.37,.38],[0,0,0]);this.box(head,dark,[.46,.19,.025],[0,0,.202]);
   for(const x of[-.13,.13])this.sphere(head,eye,[.055,.055,.028],[x,.015,.225]);
   this.box(head,brass,[.17,.025,.025],[0,-.11,.21]);this.box(head,dark,[.035,.19,.035],[0,.28,0]);this.sphere(head,brass,[.065,.065,.065],[0,.39,0]);
   const arms=[-1,1].map(side=>{const arm=new THREE.Group();arm.position.set(side*.39,.91,0);root.add(arm);this.sphere(arm,brass,[.09,.09,.09],[0,0,0]);this.box(arm,metal,[.12,.36,.12],[0,-.19,0]);this.sphere(arm,brass,[.085,.085,.085],[0,-.38,0]);this.box(arm,dark,[.12,.12,.32],[0,-.38,.17]);this.sphere(arm,brass,[.085,.085,.085],[0,-.38,.35]);return arm;});
   const instrument=new THREE.Group();root.add(instrument);this.performers.push({root,head,left:arms[0],right:arms[1],instrument});
  }
  // Fiddle: carved body, fingerboard, four strings, moving bow.
  const fiddle=this.performers[0].instrument;fiddle.position.set(.03,.95,.42);fiddle.rotation.z=-.55;
  this.sphere(fiddle,wood,[.22,.29,.06],[0,0,0]);this.sphere(fiddle,wood,[.18,.18,.06],[0,.21,0]);this.box(fiddle,dark,[.08,.5,.05],[0,.4,.04]);
  for(const x of[-.025,-.008,.008,.025])this.box(fiddle,brass,[.004,.72,.004],[x,.2,.067]);
  this.bow=new THREE.Group();fiddle.add(this.bow);this.box(this.bow,brass,[.8,.025,.025],[0,.12,.10]);this.box(this.bow,white,[.75,.009,.009],[0,.10,.12]);
  // Accordion: alternating folds expand with each two-beat phrase.
  const accordion=this.performers[1].instrument;accordion.position.set(0,.73,.43);this.bellows=new THREE.Group();accordion.add(this.bellows);
  for(let i=0;i<9;i++)this.box(this.bellows,i%2?dark:brass,[.048,.43,i%2?.25:.29],[(i-4)*.052,0,0]);
  for(const x of[-.34,.34])this.box(accordion,wood,[.19,.48,.33],[x,0,0]);
  for(let i=0;i<7;i++)this.box(accordion,white,[.15,.044,.025],[-.34,(i-3)*.057,.18]);
  for(let y=-.12;y<=.12;y+=.12)for(const x of[.30,.37])this.sphere(accordion,brass,[.018,.018,.018],[x,y,.18]);
  // Upright bass and a visibly plucking right hand.
  const bass=this.performers[2].instrument;bass.position.set(-.18,.55,.48);bass.rotation.z=-.10;
  this.sphere(bass,wood,[.30,.43,.12],[0,0,0]);this.sphere(bass,wood,[.23,.27,.11],[0,.34,0]);this.box(bass,dark,[.09,.88,.06],[0,.75,.06]);this.box(bass,brass,[.025,.30,.025],[0,-.47,0]);
  for(const x of[-.03,-.01,.01,.03])this.box(bass,brass,[.004,1.38,.004],[x,.36,.135]);this.pluck=new THREE.Group();bass.add(this.pluck);this.sphere(this.pluck,brass,[.09,.065,.055],[.09,.20,.19]);
  for(const x of[-1.85,0,1.85])this.lamps.push(this.sphere(this.group,brass,[.075,.075,.075],[x,.37,1.27]));
  this.update(0,false);
 }
 private material(color:string,roughness=.8,metalness=0,emissive='#000000'){const m=new THREE.MeshStandardMaterial({color,roughness,metalness,emissive});this.materials.add(m);return m;}
 private mesh(parent:THREE.Object3D,g:THREE.BufferGeometry,m:THREE.Material,scale:number[],p:number[]){this.geometries.add(g);const mesh=new THREE.Mesh(g,m);mesh.scale.set(...scale as[number,number,number]);mesh.position.set(...p as[number,number,number]);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 private box(parent:THREE.Object3D,m:THREE.Material,size:number[],p:number[]){return this.mesh(parent,new THREE.BoxGeometry(1,1,1),m,size,p);}
 private sphere(parent:THREE.Object3D,m:THREE.Material,size:number[],p:number[]){return this.mesh(parent,new THREE.SphereGeometry(1,12,8),m,size,p);}
 setFloorBounds(bounds:THREE.Box3){if(bounds.isEmpty()||!bounds.min.toArray().concat(bounds.max.toArray()).every(Number.isFinite))throw new Error('Robot band requires finite dance bounds.');this.group.position.set((bounds.min.x+bounds.max.x)/2,0,bounds.min.z-2);}
 bounds(){this.group.updateMatrixWorld(true);return new THREE.Box3().setFromObject(this.group);}
 update(beat:number,enabled:boolean){if(!Number.isFinite(beat))throw new Error('Robot band beat must be finite.');if(this.disposed)return;const phase=(beat%64)*Math.PI*2,energy=enabled?1:0;
  this.performers.forEach((p,i)=>{p.root.rotation.z=Math.sin(phase/4+i*.7)*.035*energy;p.head.rotation.y=Math.sin(phase/8+i)*.13*energy;p.head.rotation.z=Math.sin(phase)*.035*energy;p.left.rotation.x=-.6+Math.sin(phase/2+i)*.10*energy;p.right.rotation.x=-.65+Math.sin(phase*(i===0?2:1))*.12*energy;});
  this.bow.position.x=Math.sin(phase*2)*.17*energy;this.bellows.scale.x=1+Math.sin(phase/2)*.22*energy;this.pluck.position.x=Math.sin(phase)*.045*energy;
  this.lamps.forEach((lamp,i)=>{lamp.scale.setScalar(.075*(1+.15*Math.max(0,Math.sin(phase+i*.4))*energy));});
 }
 dispose(){if(this.disposed)return;this.disposed=true;for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();this.group.removeFromParent();this.group.clear();}
}
