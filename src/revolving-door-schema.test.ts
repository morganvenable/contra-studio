import test from 'node:test';
import assert from 'node:assert/strict';
import {compileRevolvingDoor,type RevolvingDoorOptions} from './revolving-door.ts';
import {compileRevolvingDoorFigure,type RevolvingDoorFigure} from './revolving-door-adapter.ts';
import type {FigureContext} from './extended-figures.ts';
import {actors,p as fixture} from '../test-data/revolving-door/fixture.ts';

// Schema-only adversaries. Endpoint/path/hand oracles stay in the separate
// contract suite; these checks must not alter its geometry or cue timing.
function options():RevolvingDoorOptions {
  return {actors:structuredClone(actors),entry:new Map(structuredClone([...fixture.entry])),exit:new Map(structuredClone([...fixture.exit])),
    relations:{epoch:0,partner:new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor:new Map([[0,3],[3,0],[2,1],[1,2]])},bindingEpoch:0,
    pairs:[{carrierId:1,carriedId:0,relationship:'partner'},{carrierId:3,carriedId:2,relationship:'partner'}],
    centerRole:'robin',hand:'right',direction:'right',amount:1,dropOffAfter:.5,approachHold:'half-shoulder-waist',beats:8,phaseBeats:[1.25,4.5,1.25,1],frame:{origin:{x:0,z:0},across:{x:1,z:0}}};
}
function figure():RevolvingDoorFigure {
  return {id:'door',kind:'revolving-door',label:'Explicit source contract',beats:8,who:'partner',centerRole:'robin',hands:'right',direction:'right',amount:1,dropOffAfter:.5,approachHold:'half-shoulder-waist',entry:'side-couples',exit:'opposite-paired-swing',phaseBeats:[1.25,4.5,1.25,1]};
}
function context():FigureContext {
  const o=options();return {ids:[0,1,2,3],dancers:structuredClone(actors),start:actors.map(d=>({id:d.id,position:{...o.entry.get(d.id)!.position},yaw:o.entry.get(d.id)!.yaw,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'})),relations:o.relations,bindingEpoch:0,next:{id:'swing',kind:'swing',who:'neighbor',beats:8,label:'Neighbor swing'}};
}

const invalidPhases:[string,()=>unknown][]=[
  ['entire sparse array',()=>new Array(4)],
  ...[0,1,2,3].map(index=>[`missing own phase ${index}`,()=>{const phases=[1.25,4.5,1.25,1];delete phases[index];return phases;}] as [string,()=>unknown]),
  ['inherited phase',()=>{const phases=[1.25,4.5,1.25,1];delete phases[1];Object.setPrototypeOf(phases,Object.assign(Object.create(Array.prototype),{1:4.5}));return phases;}],
  ['array-like object',()=>({0:1.25,1:4.5,2:1.25,3:1,length:4})],
  ['typed array',()=>new Float64Array([1.25,4.5,1.25,1])],
  ['array with extra direction',()=>Object.assign([1.25,4.5,1.25,1],{direction:'left'})],
  ['array with hidden modifier',()=>Object.defineProperty([1.25,4.5,1.25,1],'spinAmount',{value:2})],
  ['array with symbol modifier',()=>Object.assign([1.25,4.5,1.25,1],{[Symbol('spin')]:2})],
];
for(const [name,make] of invalidPhases) test(`primitive and adapter reject ${name} phases instead of substituting reviewed defaults`,()=>{
  const o=options();o.phaseBeats=make() as any;assert.throws(()=>compileRevolvingDoor(o),/eight counts/);
  const f=figure();f.phaseBeats=make() as any;assert.throws(()=>compileRevolvingDoorFigure(f,context()),/eight counts/);
});

for(const [key,value] of [['spinAmount',2],['progression',true],['hands','left'],['unconsumed',undefined],['carriage',{hand:'left'}]] as const) test(`primitive rejects unconsumed ${key}`,()=>{
  assert.throws(()=>compileRevolvingDoor(Object.assign(options(),{[key]:value})),/extra or missing/);
});
test('primitive rejects hidden and symbol top-level modifiers',()=>{
  for(const o of [Object.defineProperty(options(),'spinAmount',{value:2}),Object.assign(options(),{[Symbol('direction')]:'left'})])assert.throws(()=>compileRevolvingDoor(o),/extra or missing/);
});
for(const [key,value] of [['dropOffAfter',1],['direction','left'],['carriage',{hand:'left',amount:.25}],['unconsumed',undefined]] as const) test(`pairs reject unconsumed ${key} rather than retaining nested aliases`,()=>{
  const o=options();Object.assign(o.pairs[0],{[key]:value});assert.throws(()=>compileRevolvingDoor(o),/pairs require exactly/);
});
test('pair schema rejects sparse arrays, hidden modifiers, symbols and inherited identity fields',()=>{
  const inputs=[];
  {const o=options();o.pairs=new Array(2);inputs.push(o);}
  {const o=options();delete (o.pairs as any)[1];inputs.push(o);}
  {const o=options();Object.defineProperty(o.pairs[0],'direction',{value:'left'});inputs.push(o);}
  {const o=options();Object.assign(o.pairs[0],{[Symbol('direction')]:'left'});inputs.push(o);}
  {const o=options();o.pairs=[Object.create(o.pairs[0]),o.pairs[1]];inputs.push(o);}
  {const o=options();Object.assign(o.pairs,{direction:'left'});inputs.push(o);}
  for(const o of inputs)assert.throws(()=>compileRevolvingDoor(o),/pairs require exactly/);
});
test('frame schema rejects ignored directions and nested vector modifiers',()=>{
  for(const change of [(o:any)=>o.frame.direction='left',(o:any)=>o.frame.origin.amount=2,(o:any)=>o.frame.across.hand='left',(o:any)=>delete o.frame.across.z,(o:any)=>Object.defineProperty(o.frame,'spin',{value:2})]){
    const o=options();change(o);assert.throws(()=>compileRevolvingDoor(o),/extra or missing/);
  }
});

for(const end of ['entry','exit'] as const)for(const field of ['constraint','position','velocity'] as const)test(`${end} ${field} rejects unconsumed endpoint modifiers`,()=>{
  for(const add of [(value:any)=>{value.amount=2;},(value:any)=>{value.extraTurn=.5;},(value:any)=>{value.unconsumed=undefined;},(value:any)=>{value.carriage={direction:'left'};},(value:any)=>{Object.defineProperty(value,'spinAmount',{value:2});},(value:any)=>{value[Symbol('spinAmount')]=2;}]){
    const o=options(),endpoint=o[end].get(0)!;add(field==='constraint'?endpoint:endpoint[field]);assert.throws(()=>compileRevolvingDoor(o),/endpoint constraints require exactly/);
  }
});
for(const end of ['entry','exit'] as const)test(`${end} endpoints require their own complete constraint and vector fields`,()=>{
  for(const field of ['position','yaw','velocity','yawRate']){const o=options();delete (o[end].get(0)! as any)[field];assert.throws(()=>compileRevolvingDoor(o),/endpoint constraints require exactly/);}
  for(const vector of ['position','velocity'] as const)for(const coordinate of ['x','z']){const o=options();delete (o[end].get(0)![vector] as any)[coordinate];assert.throws(()=>compileRevolvingDoor(o),/endpoint constraints require exactly/);}
  const o=options();(o[end] as Map<number,any>).set(0,Object.create(o[end].get(0)!));assert.throws(()=>compileRevolvingDoor(o),/endpoint constraints require exactly/);
});

for(const value of [null,0,'',NaN,true,1,'false',{},[],new Boolean(false)]) test(`adapter rejects non-contract progression ${String(value)}`,()=>{
  const f=figure();(f as any).progression=value;assert.throws(()=>compileRevolvingDoorFigure(f,context()),/non-progression/);
  const ctx=context();(ctx.next as any).progression=value;assert.throws(()=>compileRevolvingDoorFigure(figure(),ctx),/non-progression/);
});
for(const value of [false,null,'unreviewed',{level:'unsupported'},'unsupported',0,NaN,[],new String('verified')]) test(`adapter rejects non-contract confidence ${String(value)}`,()=>{
  const f=figure();(f as any).confidence=value;assert.throws(()=>compileRevolvingDoorFigure(f,context()),/confidence/);
  const ctx=context();(ctx.next as any).confidence=value;assert.throws(()=>compileRevolvingDoorFigure(figure(),ctx),/confidence/);
});
test('adapter rejects hidden, symbol and explicitly undefined unconsumed fields before cloning',()=>{
  for(const f of [Object.defineProperty(figure(),'spinAmount',{value:2}),Object.assign(figure(),{[Symbol('direction')]:'left'}),Object.assign(figure(),{spinAmount:undefined})])assert.throws(()=>compileRevolvingDoorFigure(f,context()),/supported fields/);
});
test('adapter metadata is text rather than an ignored nested object',()=>{
  for(const key of ['id','label','notes'])for(const value of [null,1,{},[]]){
    const f=figure();(f as any)[key]=value;assert.throws(()=>compileRevolvingDoorFigure(f,context()),/text metadata/);
    const ctx=context();(ctx.next as any)[key]=value;assert.throws(()=>compileRevolvingDoorFigure(figure(),ctx),/text metadata/);
  }
});
test('explicit false progression and valid optional confidence preserve exact motion and right-waist release cue',()=>{
  const original=compileRevolvingDoorFigure(figure(),context()),p=compileRevolvingDoor(options());
  assert.deepEqual(Object.keys(p.pairs[0]).sort(),['carriedId','carrierId','relationship']);assert.ok(Object.isFrozen(p.pairs[0]));
  for(const confidence of [undefined,'verified','approximate'] as const)for(const progression of [undefined,false] as const){
    const f={...figure(),confidence,progression},ctx=context();Object.assign(ctx.next!,{confidence,progression});const actual=compileRevolvingDoorFigure(f,ctx);
    for(const beat of [0,1.25,5.35,5.55,5.75,6.2,6.65,7,8])for(const id of ctx.ids){
      assert.deepEqual(actual.position(id,beat/8),original.position(id,beat/8));assert.equal(actual.facing(id,beat/8,[]),original.facing(id,beat/8,[]));
      assert.deepEqual(actual.revolvingDoorPreparation(id,beat/8),original.revolvingDoorPreparation(id,beat/8));
    }
  }
  for(const beat of [5.35,5.75,6.2,6.65]){const cue=original.revolvingDoorPreparation(0,beat/8);assert.ok(cue.rightWaistRelease);assert.ok(Object.isFrozen(cue.rightWaistRelease));}
  assert.equal(original.revolvingDoorPreparation(0,5.75/8).rightWaistRelease!.settle,0);
  assert.equal(original.revolvingDoorPreparation(0,6.65/8).rightWaistRelease!.settle,1);
});
