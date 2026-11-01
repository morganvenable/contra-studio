import{probePetronellaTransitions}from'../test-data/petronella/mesh-probe.ts';
import assert from 'node:assert/strict';import test from 'node:test';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
function compileChainRouteSource(couples:number,source:string){const r=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${source}.json`,import.meta.url),'utf8')).result;assert.ok(r.dance,JSON.stringify(r.errors));return compileChoreography(r.dance,couples);}
import {measureChainCourtesyMeshes} from '../test-data/chain-courtesy/mesh.ts';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
for(const source of['2331'])test(`${source}: changed courtesy acquisition/release actual meshes`,t=>{
 const c=compileChainRouteSource(3,source),beats:number[]=[];for(const[i,f]of c.dance.figures.entries())if(['larks-chain','robins-chain'].includes(f.kind))for(const q of[.55,.55375,.57,.5925,.62,.6253125,.6833333333333,.70,.80,.8195833333333,.8208333333333,.8395833333333,.85,.89,.91,.94,.9490625,.97])beats.push(c.totalBeats+c.starts[i]+q*f.beats);
 const out=measureChainCourtesyMeshes(c,beats,d=>new Avatar(d),applyBodyContactAnchors);
 t.diagnostic(JSON.stringify(out));for(const key of['foreignArm','torso','head','selfTorso','armLeg','selfArmLeg','selfOppositeArm','leg','associatedUpperElbow'])assert.ok(out.metrics[key].value>=-.05,`${source}/${key}: ${JSON.stringify(out.metrics[key])}`);assert.ok(out.metrics.associatedArmRaw.value>=-.029001,'measured intended hand/forearm hub overlap');assert.ok(out.metrics.associatedOutsideGrip.value>=-.0142,'measured partial hand overlap outside hub');assert.ok(out.fullWrist<1e-9);assert.ok(out.fixedLimbError<1e-10);
});

test('2331 actual wave acquisition and finite-end transition keep wrists on owned targets',t=>{const p=compileChainRouteSource(3,'2331'),beats=[7.75,8,12,15.75,15.9,16,16.1,18,20,22,23.9,24,24.25,25.75];const result=measureChainCourtesyMeshes(p,beats,d=>new Avatar(d),applyBodyContactAnchors);assert.ok(p.sample(16).contacts.length>0);assert.ok(p.sample(24).contacts.length>0);assert.ok(result.fullWrist<1e-9);assert.ok(result.fixedLimbError<1e-10);t.diagnostic(JSON.stringify({samples:result.samples,fullWrist:result.fullWrist,fixedLimbError:result.fixedLimbError}));});
