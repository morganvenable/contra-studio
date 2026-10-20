/** Literal Becket side-site topology for a left-diagonal half hey followed by
 * an across half hey. Sites are named before motion. Pair selection uses their
 * row/side addresses, never nearest-person lookup or the animation endpoint. */
import {createDancers} from './engine.ts';
import {bindActorGroups,type GroupBinding} from './progression-topology.ts';
import type {Dancer,Pose} from './types.ts';
export interface DiagonalHeySite {coupleId:number;side:'east'|'west';row:number;}
export interface DiagonalHeyTopology {dancers:readonly Dancer[];sites:readonly DiagonalHeySite[];}
const freeze=<T>(value:T):T=>{if(value&&typeof value==='object'){for(const v of Object.values(value))freeze(v);Object.freeze(value);}return value;};
export function createDiagonalHeyTopology(couples:number):DiagonalHeyTopology {
 if(!Number.isInteger(couples)||couples<2||couples>12)throw new Error('The finite diagonal-hey topology requires2–12 persistent couples.');
 const sites:DiagonalHeySite[]=[];for(let row=0;row<Math.floor(couples/2);row++){sites.push({coupleId:row*2,side:'east',row},{coupleId:row*2+1,side:'west',row});}if(couples%2)sites.push({coupleId:couples-1,side:'west',row:Math.floor(couples/2)});
 return freeze({dancers:createDancers(couples),sites});
}
export function bindDiagonalHeySites(state:DiagonalHeyTopology,axis:'left-diagonal'|'across',epoch:number):GroupBinding {
 if(!['left-diagonal','across'].includes(axis)||state.sites.length*2!==state.dancers.length||new Set(state.sites.map(s=>`${s.side}:${s.row}`)).size!==state.sites.length||new Set(state.sites.map(s=>s.coupleId)).size!==state.sites.length)throw new Error('The diagonal hey requires distinct persistent couple sites and an explicit interaction axis.');
 const groups:Array<{id:string;actors:number[]}>=[],neighborPairs:[number,number][]=[],used=new Set<number>();
 for(const east of state.sites.filter(s=>s.side==='east').sort((a,b)=>a.row-b.row)){const west=state.sites.find(s=>s.side==='west'&&s.row===east.row+(axis==='left-diagonal'?1:0));if(!west)continue;const e=east.coupleId*2,w=west.coupleId*2;groups.push({id:`${epoch}:${axis}:E${east.row}:W${west.row}`,actors:[e,e+1,w,w+1]});neighborPairs.push([e,w+1],[e+1,w]);used.add(east.coupleId);used.add(west.coupleId);}
 return bindActorGroups(state.dancers,{epoch,groups,neighborPairs,waitingIds:state.sites.filter(s=>!used.has(s.coupleId)).flatMap(s=>[s.coupleId*2,s.coupleId*2+1]).sort((a,b)=>a-b)});
}
export function exchangeDiagonalHeySites(state:DiagonalHeyTopology,binding:GroupBinding):DiagonalHeyTopology {
 const sites=state.sites.map(s=>({...s})),seen=new Set<number>();for(const group of binding.groups){if(group.actors.length!==4)throw new Error('A literal half hey exchanges exactly two persistent couples.');const couples=[...new Set(group.actors.map(id=>state.dancers[id]?.couple))];if(couples.length!==2||couples.some(c=>c===undefined)||couples.some(c=>seen.has(c)))throw new Error('A half-hey site transaction cannot duplicate or replace a persistent couple.');for(const c of couples)seen.add(c);const a=sites.find(s=>s.coupleId===couples[0])!,b=sites.find(s=>s.coupleId===couples[1])!;[a.side,b.side]=[b.side,a.side];[a.row,b.row]=[b.row,a.row];}
 return freeze({dancers:state.dancers,sites});
}
export function diagonalHeySitePoses(state:DiagonalHeyTopology,roleGap=1.8,siteGap=roleGap):Pose[]{
 if(![roleGap,siteGap].every(Number.isFinite)||roleGap<1.1||roleGap>1.8||siteGap<1.1||siteGap>1.8)throw new Error('Choose explicit Becket role and site gaps within1.1–1.8 units.');
 const rows=Math.floor(state.sites.length/2),origin=(rows-1)*siteGap;return state.dancers.map(d=>{const s=state.sites.find(s=>s.coupleId===d.couple)!,side=s.side==='east'?1:-1;return{id:d.id,position:{x:side*.9,z:s.row*2*siteGap-origin+side*(d.role==='lark'?1:-1)*roleGap/2},yaw:-side*Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'};});
}
export function diagonalHeyTopologyKey(state:DiagonalHeyTopology):string{return [...state.sites].sort((a,b)=>a.coupleId-b.coupleId).map(s=>`${s.coupleId}:${s.side}:${s.row}`).join('|');}
