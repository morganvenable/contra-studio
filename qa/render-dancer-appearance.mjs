// Offline projections of actual Avatar triangles. No browser or substitute art.
import fs from 'node:fs';
import * as THREE from 'three';
import {Avatar} from '../src/scene.ts';
import {compileChoreography} from '../src/choreography.ts';
import {DANCES} from '../src/catalog.ts';

globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})};
const out=process.argv[2]??'/tmp/dancer-appearance';fs.mkdirSync(out,{recursive:true});
const compiled=compileChoreography(DANCES[0],6),initial=compiled.sample(0),width=240,height=400;
const neutral={...initial,contacts:[],poses:initial.poses.map(p=>({...p,position:{x:0,y:0,z:0},yaw:0,stride:0,lean:0,bounce:0,activity:'waiting'}))};
const sample=beat=>({...neutral,beat});
for(const view of ['front','rear']){
 const panels=[];
 for(const dancer of compiled.dancers){
  const avatar=new Avatar(dancer);avatar.update(neutral.poses[dancer.id],neutral,{dance:compiled.dance,showLabels:false,selectedDancer:-1},sample);avatar.root.updateMatrixWorld(true);
  const camera=new THREE.OrthographicCamera(-.60,.60,1,-1,.1,20);camera.position.set(view==='front'?1.4:-1.4,1.3,view==='front'?4:-4);camera.lookAt(0,.95,0);camera.updateMatrixWorld(true);
  const polys=[];avatar.root.traverse(mesh=>{
   if(!mesh.isMesh||!mesh.visible)return;const pos=mesh.geometry.attributes.position,indices=mesh.geometry.index,count=indices?.count??pos.count;
   for(let i=0;i<count;i+=3){
    const vertices=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(pos,indices?indices.getX(i+j):i+j).applyMatrix4(mesh.matrixWorld));
    const center=vertices[0].clone().add(vertices[1]).add(vertices[2]).divideScalar(3),normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize();
    if(normal.dot(camera.position.clone().sub(center))<=0)continue;
    const brightness=.64+.36*Math.max(0,normal.dot(new THREE.Vector3(-.4,.8,view==='front'?.5:-.5).normalize())),hex=mesh.material.color.getHex(),color=[hex>>16,(hex>>8)&255,hex&255].map(v=>Math.round(v*brightness));
    polys.push({points:vertices.map(v=>{const p=v.project(camera);return[(p.x+1)*width/2,(1-p.y)*height/2,p.z];}),color});
   }
  });
  panels.push({id:dancer.id,role:dancer.role,couple:dancer.couple,appearance:avatar.appearance,polys});avatar.dispose();
 }
 fs.writeFileSync(`${out}/${view}.json`,JSON.stringify({width,height,view,panels}));
}
console.log(`Actual mesh projections written to ${out}. Run python3 qa/rasterize-dancer-appearance.py ${out}.`);
