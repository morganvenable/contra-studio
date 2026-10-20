import type {CompiledDance} from './types.ts';
export interface OverheadBounds {minX:number;maxX:number;minZ:number;maxZ:number;}
export function sampleOverheadBounds(dance:CompiledDance):OverheadBounds {
  const bounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};
  for(let beat=0;beat<=dance.totalBeats*2;beat+=.5)for(const p of dance.sample(beat).poses){bounds.minX=Math.min(bounds.minX,p.position.x-.65);bounds.maxX=Math.max(bounds.maxX,p.position.x+.65);bounds.minZ=Math.min(bounds.minZ,p.position.z-.65);bounds.maxZ=Math.max(bounds.maxZ,p.position.z+.65);}
  return bounds;
}
export function fitOverheadBounds(bounds:OverheadBounds,width:number,height:number){
  const scale=Math.max(.1,Math.min(Math.max(1,width-32)/(bounds.maxX-bounds.minX),Math.max(1,height-105)/(bounds.maxZ-bounds.minZ)));
  return{scale,offsetX:width/2-(bounds.minX+bounds.maxX)/2*scale,offsetY:(height-40)/2-(bounds.minZ+bounds.maxZ)/2*scale};
}
