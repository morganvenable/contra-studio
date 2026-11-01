import{probePetronellaTransitions}from'../test-data/petronella/mesh-probe.ts';
import assert from 'node:assert/strict';import test from 'node:test';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {compileChoreography} from './choreography.ts';
function compileChainRouteSource(couples:number,source:string){const r=prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${source}.json`,import.meta.url),'utf8')).result;assert.ok(r.dance,JSON.stringify(r.errors));return compileChoreography(r.dance,couples);}
import {measureChainCourtesyMeshes} from '../test-data/chain-courtesy/mesh.ts';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;
for(const source of['2330'])test(`${source}: changed courtesy acquisition/release actual meshes`,t=>{
 const c=compileChainRouteSource(3,source),beats:number[]=[];for(const[i,f]of c.dance.figures.entries())if(['larks-chain'].includes(f.kind))for(const q of[.55,.55375,.57,.5925,.62,.6253125,.6833333333333,.70,.80,.8195833333333,.8208333333333,.8395833333333,.85,.89,.91,.94,.9490625,.97])beats.push(c.totalBeats+c.starts[i]+q*f.beats);
 const out=measureChainCourtesyMeshes(c,beats,d=>new Avatar(d),applyBodyContactAnchors);
 t.diagnostic(JSON.stringify(out));for(const key of['foreignArm','torso','head','selfTorso','armLeg','selfArmLeg','selfOppositeArm','leg','associatedUpperElbow'])assert.ok(out.metrics[key].value>-.05,`${source}/${key}: ${JSON.stringify(out.metrics[key])}`);assert.ok(out.metrics.associatedArmRaw.value>=-.05,'measured intended hand/forearm hub overlap');assert.ok(out.metrics.associatedOutsideGrip.value>=-.05,'measured partial hand overlap outside hub');assert.ok(out.fullWrist<1e-9);assert.ok(out.fixedLimbError<1e-10);
});

test('2330 reports inherited compact foot/self-mesh limits against existing2329 and retains exact wrists',t=>{const p=compileChainRouteSource(3,'2330'),result=probePetronellaTransitions(p,Array.from({length:201},(_,i)=>i/20));const baseline=probePetronellaTransitions(compileChainRouteSource(3,'2329'),Array.from({length:161},(_,i)=>i/20));t.diagnostic('INHERITED SCHEMATIC BODY LIMIT, not an anatomy clearance claim: '+JSON.stringify({candidate:result,existing2329:baseline}));assert.ok(baseline.minimum<0&&baseline.minimumSelfForearmTorso<0);assert.ok(result.minimum>=baseline.minimum-1e-8);assert.ok(result.minimumSelfForearmTorso>=baseline.minimumSelfForearmTorso-.05);const mesh=measureChainCourtesyMeshes(p,[2,2.2,2.5,3,3.5,4,5,6,7,7.5,8],d=>new Avatar(d),applyBodyContactAnchors);assert.ok(p.sample(5).contacts.some(h=>h.strength>.99));assert.ok(mesh.fullWrist<1e-9);assert.ok(mesh.fixedLimbError<1e-10);});
