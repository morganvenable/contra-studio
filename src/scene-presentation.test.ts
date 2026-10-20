import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {Avatar,DanceScene,applyBodyContactAnchors} from './scene.ts';
import {OverheadScene} from './fallback.ts';
import {compileChoreography} from './choreography.ts';
import {DANCES,BUTTER_CANDIDATE} from './catalog.ts';
import {changeSwingPresentation} from './presentation-actions.ts';
import type {StudioState} from './types.ts';

const dom=()=>{globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})}as unknown as Document;globalThis.devicePixelRatio=1;};
const stateFor=(dance= DANCES[0])=>({dance,showLabels:true,selectedDancer:2,showConnections:true,showTrails:false,camera:'overhead',audioMode:'off',playing:false,swingPresentation:{kind:'source'}}as StudioState);
const matrices=(avatars:Avatar[])=>avatars.map(a=>{a.root.updateMatrixWorld(true);const result:number[]=[];a.root.traverse(o=>result.push(...o.matrixWorld.elements));return result;});
function headlessScene(compiled:ReturnType<typeof compileChoreography>,state:StudioState){
 const scene=Object.create(DanceScene.prototype)as DanceScene;
 Object.assign(scene,{compiled,avatars:compiled.dancers.map(d=>new Avatar(d)),mode:state.camera,selected:state.selectedDancer,lastFigure:-2,lastRepeat:-2,paths:new THREE.Group(),handLines:new THREE.Group(),contactDots:[],contactDotGeometry:new THREE.SphereGeometry(.026,10,8),contactDotMaterial:new THREE.MeshBasicMaterial(),band:{update(){},dispose(){}},controls:{update(){},dispose(){}},renderer:{render(){},dispose(){}},resize:{disconnect(){}},scene:new THREE.Scene(),camera:new THREE.PerspectiveCamera(),presentationStatus:{applied:'source',warnings:[]}});
 return scene;
}
function update(scene:DanceScene,beat:number,state:StudioState){const f=scene.compiled.sample(beat);Object.assign(scene,{lastFigure:f.figureIndex,lastRepeat:f.repeat,selected:state.selectedDancer});scene.update(f,state);return f;}

test('source scene branch retains exact Avatar matrices and never allocates a study controller',()=>{
 dom();const c=compileChoreography(DANCES[0],6),state=stateFor(c.dance),scene=headlessScene(c,state),baseline=c.dancers.map(d=>new Avatar(d));
 for(const beat of[0,6,7.25,8,14,16,50,51.766891941070206,60,65]){
  const f=update(scene,beat,state);for(const a of baseline)a.update(f.poses[a.dancer.id],f,state,c.sample);applyBodyContactAnchors(baseline,f);
  assert.deepEqual(matrices(scene.avatars),matrices(baseline));assert.equal((scene as any).swingPresentationController,undefined);assert.equal(scene.presentationResult,undefined);assert.equal(scene.presentationStatus.applied,'source');
  for(const a of scene.avatars)assert.equal(a.head,a.body.children.find(o=>o.type==='Group'&&o.position.y===1.62));
 }
 scene.dispose();baseline.forEach(a=>a.dispose());
});

test('switching either study foot mode back to source restores exact geometry and keeps visible avatars alive',()=>{
 dom();const c=compileChoreography(BUTTER_CANDIDATE,6),state=stateFor(c.dance),scene=headlessScene(c,state),baseline=c.dancers.map(d=>new Avatar(d));let disposed=0;
 const originals=scene.avatars.map(a=>a.dispose.bind(a));scene.avatars.forEach(a=>a.dispose=()=>{disposed++;});
 for(const footwork of['walk','buzz']as const){
  state.swingPresentation={kind:'reciprocal-blade-preview',revision:'1309cde7',footwork};const activeFrame=update(scene,51.766891941070206,state);assert.ok((scene as any).swingPresentationController);assert.equal(scene.presentationStatus.applied,'reciprocal-blade-preview');assert.equal(scene.presentationResult?.sourceFrame,activeFrame);assert.ok(scene.presentationResult!.overriddenHands.length>0);assert.ok(scene.avatars.some(a=>Object.hasOwn(a.root.userData,'candidateHip')));
  state.swingPresentation={kind:'source'};const f=update(scene,51.766891941070305,state);for(const a of baseline)a.update(f.poses[a.dancer.id],f,state,c.sample);applyBodyContactAnchors(baseline,f);
  assert.deepEqual(matrices(scene.avatars),matrices(baseline));assert.equal(disposed,0);assert.equal((scene as any).swingPresentationController,undefined);assert.equal(scene.presentationStatus.applied,'source');
  assert.ok(scene.avatars.every(a=>!Object.hasOwn(a.root.userData,'candidateHip')));
 }
 scene.avatars.forEach((a,i)=>a.dispose=originals[i]);scene.dispose();baseline.forEach(a=>a.dispose());
});

test('overhead fallback draws the same source paths and reports that the study renderer is unavailable',()=>{
 dom();const c=compileChoreography(DANCES[0],2),state=stateFor(c.dance),scene=Object.create(OverheadScene.prototype)as OverheadScene,operations:unknown[]=[];
 const context=new Proxy({},{get:(_target,key)=>(...args:unknown[])=>operations.push([key,...args]),set:(_target,key,value)=>{operations.push([key,value]);return true;}});
 Object.assign(scene,{compiled:c,canvas:{width:800,height:600},ctx:context,bounds:{minX:-2.5,maxX:2.5,minZ:-3.5,maxZ:3.5}});
 scene.update(c.sample(8),state);const standard=structuredClone(operations);operations.length=0;state.swingPresentation={kind:'reciprocal-blade-preview',revision:'1309cde7',footwork:'buzz'};scene.update(c.sample(8),state);
 assert.deepEqual(operations,standard);assert.equal(scene.presentationStatus.applied,'source');assert.equal(scene.presentationStatus.inactiveReason,'unsupported-renderer');assert.ok(scene.presentationStatus.warnings.length>0);
});

test('presentation action validates before pausing and preserves the exact musical/source state',()=>{
 const state={...stateFor(),beat:51.25,bpm:112,speed:1,repeat:0,figureIndex:8,figureProgress:.25,playing:true}as StudioState,source=state.dance,snapshot=JSON.stringify(source);let pauses=0;
 const pause=()=>{pauses++;state.playing=false;};
 assert.throws(()=>changeSwingPresentation(state,{kind:'reciprocal-blade-preview',revision:'old',footwork:'walk'},pause));assert.equal(pauses,0);assert.equal(state.playing,true);
 const requested={kind:'reciprocal-blade-preview',revision:'1309cde7',footwork:'walk'};
 changeSwingPresentation(state,requested,pause);assert.equal(pauses,1);assert.equal(state.playing,false);assert.equal(state.beat,51.25);assert.equal(state.bpm,112);assert.equal(state.speed,1);assert.equal(state.figureIndex,8);assert.equal(state.figureProgress,.25);assert.equal(state.dance,source);assert.equal(JSON.stringify(source),snapshot);assert.notEqual(state.swingPresentation,requested);assert.ok(Object.isFrozen(state.swingPresentation));
 requested.footwork='buzz';assert.equal((state.swingPresentation as any).footwork,'walk');
 changeSwingPresentation(state,{kind:'source'},pause);assert.equal(pauses,2);assert.deepEqual(state.swingPresentation,{kind:'source'});
});
