import {compileDance}from'../../src/engine.ts';
import {reviewedNamedPullBy,NAMED_PULL_BY_CAPABILITIES as caps}from'./fixture.ts';
import {distance,turn}from'../../src/ring-twirl-contract.ts';
for(const id of[1495,2457]as const){const{dance}=reviewedNamedPullBy(id);let minimum=Infinity,maxJump=0,maxYawJump=0,maxFrameStep=0;let worst:any;for(let couples=2;couples<=12;couples++){
 const c=compileDance(dance,couples,caps);if(!c.repeatable)throw Error(`${id}/${couples} not repeatable`);
 let prev=c.sample(0);for(let step=0;step<=2*couples*64*8;step++){const frame=c.sample(step/8);for(const p of frame.poses){maxFrameStep=Math.max(maxFrameStep,distance(p.position,prev.poses[p.id].position));for(const q of frame.poses)if(q.id>p.id){const d=distance(p.position,q.position);if(d<minimum){minimum=d;worst={couples,beat:step/8,pair:[p.id,q.id]};}}}prev=frame;}
 for(let cycle=0;cycle<=2*couples;cycle++)for(const start of c.starts){const beat=cycle*64+start;if(beat===0)continue;const a=c.sample(beat-1e-6),b=c.sample(beat);for(const p of a.poses){maxJump=Math.max(maxJump,distance(p.position,b.poses[p.id].position));maxYawJump=Math.max(maxYawJump,Math.abs(turn(p.yaw,b.poses[p.id].yaw)));}}
 }console.log(JSON.stringify({id,minimum,worst,maxJump,maxYawJump,maxFrameStep}));}
