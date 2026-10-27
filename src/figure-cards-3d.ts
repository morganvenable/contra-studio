/**
 * The figure gallery's cards drawn with the studio's own dancers: the same
 * Avatar bodies, arms, gait and hand-contact anchoring as the 3D studio, so
 * a card shows the whole animation, not just where people stand. Browsers
 * allow only a few WebGL contexts per page, and copying pixels from one into
 * every card stalls the GPU, so one transparent WebGL layer covers the window
 * and each visible card is drawn into the patch over its own canvas.
 */
import * as THREE from 'three';
import {Avatar,applyBodyContactAnchors,fitPerspectiveBounds} from './scene.ts';
import type {CompiledDance,Frame,StudioState} from './types.ts';

/** Where the studio's default camera looks from, relative to its target. */
const VIEW=new THREE.Vector3(10.2,12.4,14.8);

export interface CardDancers {
  readonly group:THREE.Group;
  readonly avatars:Avatar[];
  readonly dots:THREE.Mesh[];
  readonly camera:THREE.PerspectiveCamera;
  readonly state:StudioState;
  readonly compiled:CompiledDance;
  /** Beat the bodies are posed at. */
  posedAt?:number;
}

export class FigureCardRenderer {
  readonly renderer:THREE.WebGLRenderer;
  /** Milliseconds spent posing and rendering, for the e2e check. */
  readonly stats={pose:0,render:0,draws:0};
  private scene=new THREE.Scene();
  private dotGeometry=new THREE.SphereGeometry(.06,10,8);
  private dotMaterial=new THREE.MeshBasicMaterial({color:'#bf993e'});
  constructor(){
    // Throws where WebGL is unavailable; the gallery then keeps its flat view.
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    const layer=this.renderer.domElement;layer.className='card-dancers';layer.setAttribute('aria-hidden','true');document.body.append(layer);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.25;
    // The studio's lights and floor.
    this.scene.add(new THREE.HemisphereLight('#fff9ed','#869589',2.6));
    const sun=new THREE.DirectionalLight('#fff9ef',3.4);sun.position.set(-6,13,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
    sun.shadow.camera.left=-8;sun.shadow.camera.right=8;sun.shadow.camera.top=8;sun.shadow.camera.bottom=-8;sun.shadow.normalBias=.035;sun.shadow.bias=-.0002;this.scene.add(sun);
    const fill=new THREE.DirectionalLight('#d4e9ed',1.5);fill.position.set(8,7,-5);this.scene.add(fill);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(60,60),new THREE.MeshStandardMaterial({color:'#f6f2e7',roughness:.8}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;this.scene.add(floor);
  }
  /** Dancers for one figure, framed on where they go between start and end. */
  build(compiled:CompiledDance,start:number,end:number,aspect:number):CardDancers {
    const group=new THREE.Group();group.visible=false;this.scene.add(group);
    const avatars=compiled.dancers.map(d=>new Avatar(d));for(const a of avatars)group.add(a.root);
    // Feet and heads wherever the dancers go during the figure.
    const bounds=new THREE.Box3(),points:THREE.Vector3[]=[];
    for(let i=0;i<=32;i++)for(const p of compiled.sample(start+(end-start-1e-3)*i/32).poses)
      for(const [dx,dz] of [[-.4,-.4],[.4,.4],[-.4,.4],[.4,-.4]])for(const y of [0,1.9]){
        const point=new THREE.Vector3(p.position.x+dx,y,p.position.z+dz);points.push(point);bounds.expandByPoint(point);
      }
    const camera=new THREE.PerspectiveCamera(38,aspect,.1,100);
    const fit=fitPerspectiveBounds(bounds,aspect,VIEW.clone(),38,1.02);
    // The box fit leaves the people small; come in until they just fill the card.
    const direction=fit.position.clone().sub(fit.target).normalize(),inside=new THREE.Vector3();
    let near=.5,far=fit.distance;
    for(let i=0;i<20;i++){
      const distance=(near+far)/2;camera.position.copy(fit.target).addScaledVector(direction,distance);camera.lookAt(fit.target);camera.updateMatrixWorld();
      const fits=points.every(p=>{inside.copy(p).project(camera);return Math.abs(inside.x)<=.94&&Math.abs(inside.y)<=.92&&inside.z<1;});
      if(fits)far=distance;else near=distance;
    }
    camera.position.copy(fit.target).addScaledVector(direction,far);camera.lookAt(fit.target);camera.updateProjectionMatrix();
    // Name tags (and their floor rings) are unreadable at card size.
    const state={dance:compiled.dance,showLabels:false,selectedDancer:-1} as unknown as StudioState;
    return {group,avatars,dots:[],camera,state,compiled};
  }
  /** Start a frame: fit the layer to the window and clear it. */
  begin(){
    const width=document.documentElement.clientWidth,height=window.innerHeight,size=this.renderer.getSize(new THREE.Vector2());
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    if(size.x!==width||size.y!==height)this.renderer.setSize(width,height);
    this.renderer.setScissorTest(false);this.renderer.setClearColor(0,0);this.renderer.clear();
  }
  /** Pose the card's dancers at a beat and draw them over its canvas, if on screen. */
  draw(card:CardDancers,beat:number,canvas:HTMLCanvasElement){
    const rect=canvas.getBoundingClientRect(),height=this.renderer.getSize(new THREE.Vector2()).y;
    if(rect.bottom<0||rect.top>height||rect.width<1||rect.height<1)return;
    const aspect=rect.width/rect.height;
    if(Math.abs(card.camera.aspect-aspect)>1e-3){card.camera.aspect=aspect;card.camera.updateProjectionMatrix();}
    const t0=performance.now();
    // A card holding still keeps its pose; only playing cards are re-posed.
    if(card.posedAt!==beat){this.pose(card,beat);card.posedAt=beat;}
    const t1=performance.now();
    const y=height-rect.bottom;
    this.renderer.setViewport(rect.left,y,rect.width,rect.height);this.renderer.setScissor(rect.left,y,rect.width,rect.height);this.renderer.setScissorTest(true);
    this.renderer.setClearColor('#eeeee8',1);this.renderer.clear();
    card.group.visible=true;this.renderer.render(this.scene,card.camera);card.group.visible=false;
    this.stats.pose+=t1-t0;this.stats.render+=performance.now()-t1;this.stats.draws++;
  }
  private pose(card:CardDancers,beat:number){
    const frame:Frame=card.compiled.sample(beat);
    const cache=new Map<number,Frame>();
    const sample=(b:number)=>{let f=cache.get(b);if(!f){f=card.compiled.sample(b);cache.set(b,f);}return f;};
    for(let i=0;i<card.avatars.length;i++)card.avatars[i].update(frame.poses[i],frame,card.state,sample);
    // Held hands, as the studio marks them.
    let shown=0;
    for(const contact of applyBodyContactAnchors(card.avatars,frame).contacts){
      if(contact.strength<.6)continue;
      let dot=card.dots[shown];if(!dot){dot=new THREE.Mesh(this.dotGeometry,this.dotMaterial);card.dots.push(dot);card.group.add(dot);}
      dot.position.set(contact.point.x,contact.point.y,contact.point.z);dot.visible=true;shown++;
    }
    for(let i=shown;i<card.dots.length;i++)card.dots[i].visible=false;
  }
  release(card:CardDancers){
    this.scene.remove(card.group);for(const a of card.avatars)a.dispose();
  }
}
