import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
import {compileOrdinaryHalfHeyFigure} from './ordinary-half-hey.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import type {FigureContext,MotionPlan} from './extended-figures.ts';

test('full-width hey entry retains all four named passes within eight counts and compact gate timing',()=>{
 const caps=REGISTERED_MOTION_CAPABILITIES;
 const review=prepareContraDbReview(readFileSync(new URL('../test-data/contradb/182.json',import.meta.url),'utf8'),[],caps);
 assert.ok(review.result.dance,review.result.errors.join('; '));
 const d=review.result.dance,c=compileChoreography(d,2,caps),f=d.figures[2];
 assert.equal(review.interpretation.rows!['contradb:182:row:6'].chainReceiver,'neighbor');
 assert.equal(c.totalBeats,64);assert.equal(f.beats,8);
 assert.deepEqual([f.who,f.heyStartRole,f.centerShoulder,f.endShoulder,f.exit],['neighbor','robin','left','right','opposite-paired-swing']);
 const ctx:FigureContext={ids:[0,1,2,3],start:(c.formationSample??c.sample)(16).poses,dancers:c.dancers,relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[1,2],[2,1]])},bindingEpoch:0,next:d.figures[3]};
 const wide=compileOrdinaryHalfHeyFigure(f,ctx),compactContext=structuredClone(ctx),center=ctx.start.reduce((n,p)=>n+p.position.z,0)/4;
 for(const p of compactContext.start)p.position.z=center+(p.position.z-center)*1.1/1.8;
 const compact=compileOrdinaryHalfHeyFigure(f,compactContext);
 const gates=[{pairs:[[1,3]],shoulder:-1},{pairs:[[2,3],[1,0]],shoulder:1},{pairs:[[2,0]],shoulder:-1},{pairs:[[3,0],[2,1]],shoulder:1}];
 for(const[path,times]of[[wide,[2.25,3.75,5.5,7.25]],[compact,[2,3.75,5.5,7.25]]] as Array<[MotionPlan,number[]]>){
  for(const[i,gate]of gates.entries())for(const[a,b]of gate.pairs){const t=times[i]/8,A=path.position(a,t),B=path.position(b,t),lo=path.position(a,t-1e-6),hi=path.position(a,t+1e-6),v={x:hi.x-lo.x,z:hi.z-lo.z};assert.ok(Math.abs(A.x-B.x)<1e-7);assert.ok((v.x*(B.z-A.z)-v.z*(B.x-A.x))/Math.hypot(v.x,v.z)*gate.shoulder>.5);assert.equal(path.contacts(t,ctx.start).length,0);}
  for(const id of ctx.ids){assert.deepEqual(path.position(id,0),(path===wide?ctx:compactContext).start[id].position);assert.ok(Math.abs(Math.abs(path.position(id,1).x)-.9)<1e-7);}
 }
});
