/** Focused geometric fixtures. A scaled fixture is a declared synthetic incoming
 * boundary, never a rescaling of a retained source's preceding choreography. */
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from '../../src/source-review.ts';
import {compileChoreography} from '../../src/choreography.ts';
import {captureSequenceBoundary,type SequenceBoundary} from '../../src/sequence-boundary.ts';
import {compileMeasuredSixCountCircleStep,compileMeasuredTwoCountPassStep} from '../../src/measured-six-two-step.ts';
import type {FigureContext} from '../../src/extended-figures.ts';
import type {Figure,Pose} from '../../src/types.ts';
const pairs=(p:number[][])=>new Map(p.flatMap(([a,b])=>[[a,b],[b,a]]));
export function retained(id=892){
 const prepared=prepareContraDbReview(readFileSync(new URL(`../contradb/${id}.json`,import.meta.url),'utf8'));
 if(!prepared.result.dance)throw new Error(JSON.stringify(prepared.result.diagnostics));
 const dance=prepared.result.dance,compiled=compileChoreography(dance,2),sample=compiled.formationSample??compiled.sample;
 return{dance,compiled,sample};
}
export function fixture(halfWidth=.72,sourceBeat=56){
 const legacy=retained(),figure=legacy.dance.figures.at(-2)!,next=legacy.dance.figures.at(-1)!,start=structuredClone(legacy.sample(56).poses);
 for(const p of start){p.position.x*=halfWidth/.72;p.position.z*=halfWidth/.72;}
 const context:FigureContext={ids:[0,1,2,3],start,dancers:structuredClone(legacy.compiled.dancers),relations:{epoch:3,partner:pairs([[0,1],[2,3]]),neighbor:pairs([[0,3],[1,2]])},bindingEpoch:3,next};
 return{figure,next,context,boundary:captureSequenceBoundary(context,sourceBeat,[])};
}
export function after(context:FigureContext,state:SequenceBoundary,next?:Figure):FigureContext{
 const start=context.start.map(p=>({...p,position:{...p.position}}));for(const p of state.poses)start[p.id]={...start[p.id],position:{...p.position},yaw:p.yaw};return{...context,start,next};
}
export function sequence(halfWidth=.72,sourceBeat=56){const f=fixture(halfWidth,sourceBeat),circle=compileMeasuredSixCountCircleStep(f.figure,f.context,f.boundary),passContext=after(f.context,circle.exitState),pass=compileMeasuredTwoCountPassStep(f.next,passContext,circle.exitState);return{...f,circle,pass,passContext};}
export function sample(context:FigureContext,plan:{position(id:number,t:number):{x:number;z:number};facing(id:number,t:number,poses:Pose[]):number},t:number):Pose[]{const out=context.start.map(p=>({...p,position:{...p.position}}));for(const id of context.ids)out[id].position=plan.position(id,t);for(const id of context.ids)out[id].yaw=plan.facing(id,t,out);return out;}
