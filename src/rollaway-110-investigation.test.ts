import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {createDancers,initialPoses,compilePrimitiveFigure} from './engine.ts';
import {compileRoleTurnSwingPrototype} from './role-turn-swing-prototype.ts';
import {compileStandaloneRollawayStep,type StandaloneRollawayFigure} from './standalone-rollaway-step.ts';
import {captureSequenceBoundary,assertSequenceHandoff} from './sequence-boundary.ts';
import {sampleFormationEndpoint} from './formation-handoff.ts';
import type {FigureContext} from './extended-figures.ts';
const source=()=>prepareContraDbReview(readFileSync(new URL('../test-data/contradb/110.json',import.meta.url),'utf8'),[],REGISTERED_MOTION_CAPABILITIES);
function prefix(){const review=source(),rows=review.result.rows,dancers=createDancers(2);let context:FigureContext={ids:[0,1,2,3],dancers,start:initialPoses(dancers),bindingEpoch:2,relations:{epoch:2,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},next:rows[1].figures[0]};
 const turn=compileRoleTurnSwingPrototype(rows[0].figures[0],context,captureSequenceBoundary(context,0,[]));context={...context,start:sampleFormationEndpoint(context,turn,1)};
 const swing=compilePrimitiveFigure(rows[1].figures[0],context.ids,context.start,dancers,[],{swingEntry:'prepared-circle'});context={...context,start:sampleFormationEndpoint(context,swing,1)};
 const circle=compilePrimitiveFigure(rows[2].figures[0],context.ids,context.start,dancers,[]);context={...context,start:sampleFormationEndpoint(context,circle,1),next:rows[4].figures[0]};
 return{review,context,incoming:captureSequenceBoundary(context,20,circle.contacts(1,context.start))};}
test('110 review retains source role reversal while existing generic rollaway consumes the physical prefix',t=>{
 const {review,context,incoming}=prefix();assert.equal(review.result.dance,undefined);assert.equal(review.result.coverage.resolvedRows,9);assert.equal(review.result.rows[3].source.text,'ladles roll away neighbors with a half sashay');
 const results=[];for(const rollDirection of['left-to-right','right-to-left'] as const){const f:StandaloneRollawayFigure={id:'probe-role-reversal',label:'Robins initiate neighbor half sashay; larks roll',kind:'rollaway',beats:4,who:'neighbor',rollRelation:'neighbor',rollRole:'lark',sashayRole:'robin',rollHalfSashay:true,rollDirection};try{const p=compileStandaloneRollawayStep(f,context,incoming);assertSequenceHandoff(incoming,p.entryState);results.push({direction:rollDirection,pass:true,pairs:p.namedPairs,clearance:p.minimumClearanceBound,speed:p.maximumObservedSpeed,yaw:p.maximumObservedYawRate,handReach:p.maximumRawHandReach,exit:p.exitState.poses});}catch(error){results.push({direction:rollDirection,pass:false,error:String(error)});}}
 t.diagnostic(JSON.stringify({entry:incoming.poses,results}));assert.equal(results.filter(r=>r.pass).length,1);
});
test('role-reversed rollaway reaches the next literal turn roots but exposes a facing seam',t=>{
 const {review,context,incoming}=prefix(),f:StandaloneRollawayFigure={id:'role-reversal',label:'Larks roll in front of current neighbor robins',kind:'rollaway',beats:4,who:'neighbor',rollRelation:'neighbor',rollRole:'lark',sashayRole:'robin',rollHalfSashay:true,rollDirection:'left-to-right'};
 const p=compileStandaloneRollawayStep(f,context,incoming),received={...context,start:sampleFormationEndpoint(context,p,1)},turn=compilePrimitiveFigure(review.result.rows[4].figures[0],received.ids,received.start,received.dancers,[]),wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
 const jumps=received.ids.map(id=>({id,root:Math.hypot(turn.position(id,0).x-received.start[id].position.x,turn.position(id,0).z-received.start[id].position.z),yaw:Math.abs(wrap(turn.facing(id,0,received.start)-received.start[id].yaw))}));
 assert.ok(jumps.every(j=>j.root<1e-12));assert.ok(jumps.every(j=>Math.abs(j.yaw-Math.PI/4)<1e-12));assert.deepEqual(p.exitState.heldContacts,[]);assert.deepEqual(turn.contacts(0,received.start),[]);
 assert.equal(p.exitState.sourceBeat,24);assert.equal(p.exitState.relationshipEpoch,2);assert.deepEqual(p.exitState.partner,incoming.partner);assert.deepEqual(p.exitState.neighbor,incoming.neighbor);
 const end=sampleFormationEndpoint(received,turn,1);for(const id of received.ids){const partner=received.relations.partner.get(id)!;assert.ok(Math.abs(end[id].position.x-end[partner].position.x)<1e-12);assert.ok(Math.abs(Math.abs(end[id].position.z-end[partner].position.z)-1.8)<1e-12);}
 // engine.ts applies this established-acquisition blend to the raw primitive.
 // Audit it separately instead of misreporting the raw yaw difference as a
 // rendered discontinuity, or claiming established contact acquisition is strict.
 const smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};let maximumRawReach=0,worst:unknown;
 for(let n=0;n<=960;n++){const u=n/960,poses=received.start.map(q=>({...q,position:turn.position(q.id,u)}));for(const q of poses){const natural=turn.facing(q.id,u,poses);q.yaw=u<.12?received.start[q.id].yaw+wrap(natural-received.start[q.id].yaw)*smooth(u/.12):natural;}
  if(n===0)for(const q of poses)assert.equal(q.yaw,received.start[q.id].yaw);
  for(const contact of turn.contacts(u,poses))for(const[id,hand]of[[contact.a,contact.handA],[contact.b,contact.handB]] as const){const q=poses[id],sign=hand==='left'?1:-1,reach=Math.hypot(contact.point.x-q.position.x-sign*.235*Math.cos(q.yaw),contact.point.z-q.position.z+sign*.235*Math.sin(q.yaw),contact.point.y-1.355);if(reach>maximumRawReach){maximumRawReach=reach;worst={beat:24+u*8,id,hand,strength:contact.strength,reach};}}
 }
 assert.ok(maximumRawReach>.645,'the established next turn does not satisfy the standalone rollaway contact envelope');
 t.diagnostic(JSON.stringify({jumps,nextTurnEndpoint:end.map(p=>({id:p.id,position:p.position,yaw:p.yaw})),establishedEntryBlendCounts:.96,maximumRawReach,worst,remaining:'strict acquisition of next role-allemande contacts; established facing already blends'}));
});
