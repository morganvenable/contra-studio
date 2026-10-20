/** Retained source composition probe. No registry, admission or endpoint reset. */
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {createDancers,initialPoses,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {compileRoleTurnSwingPrototype} from './role-turn-swing-prototype.ts';import {compileRollawayAllemandePrototype} from './rollaway-allemande-prototype.ts';import {compileStandaloneRollawayStep} from './standalone-rollaway-step.ts';
import {compileRingTransitionFigure} from './ring-transition-adapter.ts';import {compileCaliforniaTwirlFigure} from './ring-california-adapter.ts';import {compilePetronellaFigure,type PetronellaFigure} from './petronella-adapter.ts';import {prepareSwingRingExit} from './ring-pair-handoff.ts';
import {captureSequenceBoundary,assertSequenceHandoff,sampleSequenceBoundary,type SequenceBoundary} from './sequence-boundary.ts';import {sampleFormationEndpoint} from './formation-handoff.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';import type {Figure} from './types.ts';
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x)),smooth=(x:number)=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};
test('one actual retained64-count source carries its reached prefix through available contracts',t=>{
 const reviewed=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/110.json',import.meta.url),'utf8')),rows=reviewed.result.rows,figures=rows.flatMap(r=>r.figures);assert.equal(reviewed.result.dance,undefined);assert.equal(reviewed.result.record!.snapshotId,'contradb:110:9c3093c28056616f');
 assert.deepEqual(rows.map(r=>r.figures.reduce((s,f)=>s+f.beats,0)),rows.map(r=>r.source.beats));assert.equal(figures.reduce((s,f)=>s+f.beats,0),64);
 const dancers=createDancers(2);let context:FigureContext={ids:[0,1,2,3],dancers,start:initialPoses(dancers),bindingEpoch:0,relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])}},incoming=captureSequenceBoundary(context,0,[]),beat=0;
 const seams:Array<{beat:number;kind:string;policy:string;handoff:string;entryContacts:number;priorContacts:number;exitContacts:number;contactDifference?:unknown}>=[],completed:string[]=[];let blocked:unknown;
 for(const[i,f]of figures.entries()){context={...context,next:figures[i+1]};let plan:MotionPlan,policy:'strict-carried'|'established-acquisition'='established-acquisition';
  try{
   if(f.kind==='allemande'&&f.direction==='right'&&f.amount===.75){plan=compileRoleTurnSwingPrototype(f,context,incoming);policy='strict-carried';}
   else if(f.kind==='allemande'&&f.direction==='left'&&f.amount===1.5){plan=compileRollawayAllemandePrototype(f,context,incoming);policy='strict-carried';}
   else if(f.kind==='rollaway'){plan=compileStandaloneRollawayStep(f,context,incoming);policy='strict-carried';}
   else if(f.kind==='ring-balance')plan=compileRingTransitionFigure(f,context);
   else if(f.kind==='petronella')plan=compilePetronellaFigure(f as PetronellaFigure,context);
   else if(f.kind==='california-twirl')plan=compileCaliforniaTwirlFigure(f,context);
   else{const continuity=figureContinuity(figures,i);plan=compilePrimitiveFigure(f,context.ids,context.start,dancers,[],continuity);if(f.kind==='swing'&&context.next?.kind==='ring-balance')plan=prepareSwingRingExit(f,context,plan);
    // Reproduce the existing engine's entry-facing acquisition convention.
    // This neither changes incoming roots nor labels legacy contacts strict.
    if(!continuity.swingEntry){const raw=plan,entry=context.start;plan={...raw,facing:(id,u,poses)=>{const natural=raw.facing(id,u,poses);return u<.12?entry[id].yaw+wrap(natural-entry[id].yaw)*smooth(u/.12):natural;}};}
   }
  }catch(error){blocked={beat,kind:f.kind,id:f.id,error:String(error)};break;}
  const actualEntry=sampleSequenceBoundary(context,plan,beat,0);let handoff='exact';try{assertSequenceHandoff(incoming,actualEntry);}catch(error){handoff=String(error);if(policy==='strict-carried')throw error;}
  if(beat===60){
   // The intentional raw-record mismatch must not mask another handoff error.
   assertSequenceHandoff({...incoming,heldContacts:[]},{...actualEntry,heldContacts:[]});
   assert.equal(incoming.heldContacts.length,2);assert.equal(actualEntry.heldContacts.length,2);
   const matched=new Set();for(const old of incoming.heldContacts){const next=actualEntry.heldContacts.find(c=>c.a===old.b&&c.b===old.a&&c.handA===old.handB&&c.handB===old.handA)!;assert.ok(next);assert.ok(!matched.has(next));matched.add(next);assert.equal(old.kind,'joined');assert.equal(next.kind,'arch');assert.equal(dancers[next.underId!].role,'robin');assert.equal(next.strength,old.strength);assert.ok(Math.hypot(next.point.x-old.point.x,next.point.y-old.point.y,next.point.z-old.point.z)<1e-12);}assert.equal(matched.size,actualEntry.heldContacts.length);
  }
  const rootJump=Math.max(...context.ids.map(id=>Math.hypot(plan.position(id,0).x-context.start[id].position.x,plan.position(id,0).z-context.start[id].position.z)));assert.ok(rootJump<1e-7,'no actor may be reset between figures');
  const exit=sampleSequenceBoundary(context,plan,beat+f.beats,1);assert.equal(exit.relationshipEpoch,0);assert.deepEqual(exit.partner,incoming.partner);assert.deepEqual(exit.neighbor,incoming.neighbor);
  seams.push({beat,kind:f.kind,policy,handoff,entryContacts:actualEntry.heldContacts.length,priorContacts:incoming.heldContacts.length,exitContacts:exit.heldContacts.length,...(handoff==='exact'?{}:{contactDifference:{outgoing:incoming.heldContacts,incoming:actualEntry.heldContacts}})});completed.push(f.kind);beat+=f.beats;context={...context,start:sampleFormationEndpoint(context,plan,1)};incoming=exit;
 }
 t.diagnostic(JSON.stringify({beat,completed,seams,blocked,actualEndpoint:incoming.poses}));assert.equal(blocked,undefined);assert.equal(beat,64);assert.equal(completed.length,figures.length);assert.deepEqual(seams.filter(s=>s.handoff!=='exact').map(s=>[s.beat,s.kind]),[[60,'california-twirl']]);
 // The local paths physically exchange couple rows, but the probe deliberately
 // has no finite topology transaction. It cannot claim next-neighbor repeatability.
 for(const couple of[0,1]){const pair=incoming.poses.filter(p=>dancers[p.id].couple===couple);assert.ok(pair.every(p=>Math.abs(p.position.z-(couple===0?.9:-.9))<1e-7));}assert.equal(incoming.relationshipEpoch,0);
});
