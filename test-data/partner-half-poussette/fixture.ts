import type {Dancer,Pose} from '../../src/types.ts';
import type {PartnerHalfPoussetteOptions} from '../../src/partner-half-poussette.ts';
import type {PartnerHalfPoussetteFigure} from '../../src/partner-half-poussette-adapter.ts';
export const dancers:Dancer[]=Array.from({length:4},(_,id)=>({id,name:String(id),role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:id<2?1:-1,color:'#438b86'}));
export const start:Pose[]=[[.52,-.9,-Math.PI/2],[-.52,-.9,Math.PI/2],[-.52,.9,Math.PI/2],[.52,.9,-Math.PI/2]].map(([x,z,yaw],id)=>({id,position:{x,z},yaw,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
const map=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
export const relations={epoch:3,partner:map([[0,1],[2,3]]),neighbor:map([[0,3],[1,2]])};
export const figure:PartnerHalfPoussetteFigure={id:'half-poussette',kind:'half-poussette',label:'Partner half poussette',beats:8,who:'partner',amount:.5,hands:'both',pullRole:'lark',pullDirection:'back-left',facing:'fixed-room',phaseBeats:[6,2],entry:'partners-facing-across',exit:'neighbor-swing'};
export const next={id:'swing',kind:'swing' as const,who:'neighbor' as const,label:'Neighbors swing',beats:8};
export const context={ids:[0,1,2,3],start,dancers,relations,bindingEpoch:3,next};
export function fixture():PartnerHalfPoussetteOptions{return{actors:structuredClone(dancers),entry:new Map(start.map(p=>[p.id,{position:{...p.position},yaw:p.yaw,velocity:{x:0,z:0},yawRate:0}])),exit:new Map([[.9,.31],[-.9,.31],[-.9,-.31],[.9,-.31]].map(([x,z],id)=>[id,{position:{x,z},yaw:Math.atan2(0,-z)+Math.PI/3,velocity:{x:0,z:0},yawRate:0}])),relations:structuredClone(relations),bindingEpoch:3,pairs:[{pullerId:0,pusherId:1,relationship:'partner'},{pullerId:2,pusherId:3,relationship:'partner'}],beats:8,amount:.5,hands:'both',pullRole:'lark',pullDirection:'back-left',facing:'fixed-room',phaseBeats:[6,2],exitKind:'neighbor-swing',frame:{origin:{x:0,z:0},across:{x:1,z:0}},source:'https://contradb.com/dances/2226'};}
