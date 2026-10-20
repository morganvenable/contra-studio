import {SWING_STUDY_WARNINGS,type SwingPresentationStatus} from './swing-presentation.ts';
import type {CameraMode,CompiledDance,Frame,StudioState} from './types';
import {fitOverheadBounds,sampleOverheadBounds} from './floor-fit.ts';
/** Deterministic overhead fallback for browsers that cannot create a WebGL context. */
export class OverheadScene {
  public presentationStatus:SwingPresentationStatus={applied:'source',warnings:[]};
  canvas=document.createElement('canvas');ctx:CanvasRenderingContext2D;resize:ResizeObserver;compiled:CompiledDance;
  private bounds={minX:-2.5,maxX:2.5,minZ:-6.5,maxZ:6.5};
  public host:HTMLElement;
  constructor(host:HTMLElement,compiled:CompiledDance,onSelect:(id:number)=>void){
    this.host=host;this.compiled=compiled;this.ctx=this.canvas.getContext('2d')!;this.canvas.style.cssText='width:100%;height:100%;display:block;';this.canvas.setAttribute('aria-label','Overhead 2D dance study view. WebGL is unavailable in this browser.');host.append(this.canvas);
    const notice=document.createElement('div');notice.className='fallback-notice';notice.style.cssText='position:absolute;left:16px;right:16px;bottom:16px;padding:9px 12px;border-radius:10px;background:#fffbec;color:#65562e;font:12px system-ui;pointer-events:none;z-index:3';notice.textContent='Overhead study view · WebGL is unavailable in this browser. 3D views need a WebGL-enabled browser.';host.append(notice);
    this.resize=new ResizeObserver(()=>this.resizeCanvas());this.resize.observe(host);this.setDance(compiled);this.canvas.addEventListener('pointerup',e=>{const rect=this.canvas.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;const nearest=this.last?.poses.map(p=>({id:p.id,distance:Math.hypot(this.project(p.position.x,p.position.z).x-x,this.project(p.position.x,p.position.z).y-y)})).sort((a,b)=>a.distance-b.distance)[0];if(nearest&&nearest.distance<20)onSelect(nearest.id);});
  }
  private last?:Frame;
  private project(x:number,z:number){const fit=fitOverheadBounds(this.bounds,this.canvas.width/devicePixelRatio,this.canvas.height/devicePixelRatio);return{x:fit.offsetX+x*fit.scale,y:fit.offsetY+z*fit.scale,scale:fit.scale};}
  resizeCanvas(){const rect=this.host.getBoundingClientRect();this.canvas.width=Math.max(1,rect.width*devicePixelRatio);this.canvas.height=Math.max(1,rect.height*devicePixelRatio);}
  setDance(dance:CompiledDance){this.compiled=dance;this.bounds=sampleOverheadBounds(dance);this.last=undefined;}
  resetCamera(){}
  setCamera(_mode:CameraMode){}
  update(frame:Frame,state:StudioState){this.presentationStatus=state.swingPresentation?.kind==='reciprocal-blade-preview'?{applied:'source',inactiveReason:'unsupported-renderer',warnings:SWING_STUDY_WARNINGS}:{applied:'source',warnings:[]};this.last=frame;const ctx=this.ctx,w=this.canvas.width/devicePixelRatio,h=this.canvas.height/devicePixelRatio;ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);ctx.fillStyle='#edeee6';ctx.fillRect(0,0,w,h);const floor=this.project(this.bounds.minX,this.bounds.minZ),end=this.project(this.bounds.maxX,this.bounds.maxZ);ctx.fillStyle='#f7f3e8';ctx.fillRect(floor.x,floor.y,end.x-floor.x,end.y-floor.y);ctx.strokeStyle='#e1e1d6';for(let z=Math.ceil(this.bounds.minZ*2)/2;z<=this.bounds.maxZ;z+=.5){const a=this.project(this.bounds.minX,z),b=this.project(this.bounds.maxX,z);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
    if(state.showTrails){const start=frame.repeat*this.compiled.totalBeats+this.compiled.starts[frame.figureIndex],beats=this.compiled.dance.figures[frame.figureIndex].beats;for(const id of state.selectedDancer>=0?[state.selectedDancer]:[0,1,2,3]){ctx.strokeStyle=this.compiled.dancers[id].color;ctx.globalAlpha=.35;ctx.lineWidth=2;ctx.setLineDash([5,5]);ctx.beginPath();for(let t=0;t<=40;t++){const pose=this.compiled.sample(start+beats*t/40-.000001).poses[id],p=this.project(pose.position.x,pose.position.z);t?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);}ctx.stroke();}ctx.setLineDash([]);ctx.globalAlpha=1;}
    for(const pose of frame.poses){const p=this.project(pose.position.x,pose.position.z),d=this.compiled.dancers[pose.id];ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-pose.yaw);ctx.fillStyle=d.color;ctx.shadowColor='#53634b44';ctx.shadowBlur=4;ctx.beginPath();ctx.ellipse(0,0,.26*p.scale,.18*p.scale,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#dcb899';ctx.beginPath();ctx.arc(0,.07*p.scale,.135*p.scale,0,Math.PI*2);ctx.fill();ctx.fillStyle='#3e423d';ctx.beginPath();ctx.moveTo(-.055*p.scale,.18*p.scale);ctx.lineTo(.055*p.scale,.18*p.scale);ctx.lineTo(0,.28*p.scale);ctx.fill();ctx.restore();if(state.selectedDancer===pose.id){ctx.strokeStyle='#234c45';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,.36*p.scale,0,Math.PI*2);ctx.stroke();}if(state.showLabels){ctx.fillStyle='#29483f';ctx.font='600 11px system-ui';ctx.textAlign='center';ctx.fillText(`${d.role==='lark'?'L':'R'}${d.couple+1}`,p.x,p.y-.32*p.scale);}}
    if(state.showConnections){ctx.fillStyle='#bc9650';for(const contact of frame.contacts){if(contact.strength<.65)continue;const p=this.project(contact.point.x,contact.point.z);ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fill();}}
    ctx.font='500 11px system-ui';ctx.textAlign='center';ctx.fillStyle='#7c8878';ctx.fillText('↑ TOWARD THE MUSIC',w/2,Math.max(22,floor.y-15));
  }
  dispose(){this.resize.disconnect();}
}
