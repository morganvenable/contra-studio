import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbSource} from './contradb-source.ts';
import {compileWaveFigure,conventionalPassToWaveBinding,type WaveFigureContext,type WaveFigureSpec} from './wave-figure-adapter.ts';
import type {WaveConstraint,WaveGraph} from './wave-figures.ts';
import type {Dancer,Pose} from './types.ts';
const actors:Dancer[]=Array.from({length:4},(_,id)=>({id,name:`D${id}`,role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:1,color:'#438b86'}));
const pairMap=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const pose=(id:number,x:number,z:number,yaw:number):Pose=>({id,position:{x,z},yaw,stride:0,lean:0,bounce:0,turn:0,activity:'long-lines'});
const source=(id:number)=>readContraDbSource(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8')).record!;
const relation=()=>({epoch:7,partner:pairMap([[0,1],[2,3]]),neighbor:pairMap([[0,3],[2,1]])});
function passContext():WaveFigureContext{return{ids:[0,1,2,3],dancers:structuredClone(actors),start:[pose(0,-.9,.9,Math.PI/2),pose(1,.9,.9,-Math.PI/2),pose(2,.9,-.9,-Math.PI/2),pose(3,-.9,-.9,Math.PI/2)],relations:relation(),bindingEpoch:7};}
const passFigure=():Extract<WaveFigureSpec,{kind:'pass-to-wave-balance'}>=>({id:'wave',kind:'pass-to-wave-balance',beats:8,label:'Pass through to ocean wave and balance',centerRole:'lark',sideRelation:'neighbor',passingShoulder:'right',centerHand:'left',sideHand:'right',entry:'facing-couples-across',phaseBeats:[4,4],balanceStyle:'right-left'});
const graph=(a:number,b:number,c:number,d:number):WaveGraph=>({lines:[{order:[a,b],axis:{x:0,z:1}},{order:[c,d],axis:{x:0,z:1}}],hands:[{a,b,handA:'right',handB:'right'},{a:c,b:d,handA:'right',handB:'right'}]});
function boxContext():WaveFigureContext{return{ids:[0,1,2,3],dancers:structuredClone(actors),start:[pose(0,-.9,-.45,Math.PI/2),pose(1,.9,-.45,Math.PI/2),pose(2,.9,.45,-Math.PI/2),pose(3,-.9,.45,-Math.PI/2)],relations:relation(),bindingEpoch:7,wave:{graph:graph(0,3,1,2),handRelations:['neighbor','neighbor']},circulate:{mapping:[{id:0,destinationId:1,mode:'cross'},{id:1,destinationId:2,mode:'loop-right'},{id:2,destinationId:3,mode:'cross'},{id:3,destinationId:0,mode:'loop-right'}],exitWave:graph(3,2,0,1),exitHandRelations:['partner','partner'],frame:{origin:{x:0,z:0},across:{x:1,z:0}}}};}
const boxFigure=():Extract<WaveFigureSpec,{kind:'balance-box-circulate'}>=>({id:'box',kind:'balance-box-circulate',beats:8,label:'Wave balance and box circulate',crossRole:'lark',loopRole:'robin',loopDirection:'right',phaseBeats:[4,4],balanceStyle:'forward-back'});
test('retained Jacqui Grennan Undercurrent source binds larks-center LH and current-neighbor RH without reassigning identities',()=>{
 const r=source(1992),row=r.rows[1];assert.equal(r.author,'Jacqui Grennan');assert.equal(r.title,'Undercurrent');assert.equal(row.beats,8);assert.match(row.text,/gentlespoons by left in the center, neighbors by right on the sides/);
 const c=passContext();c.source={url:r.sourceUrl,snapshotId:r.snapshotId,rowId:row.id,text:row.text,beats:8};const f=passFigure(),binding=conventionalPassToWaveBinding(f,c),p=compileWaveFigure(f,c);assert.deepEqual(binding.waveOrder,[1,2,0,3]);assert.equal(p.beats,8);assert.deepEqual(p.segments.map(s=>s.beats),[4,4]);assert.deepEqual(p.source,c.source);assert.deepEqual(p.exitWave.hands.map(h=>[h.a,h.b,h.handA]),[[1,2,'right'],[2,0,'left'],[0,3,'right']]);
 for(let id=0;id<4;id++){assert.deepEqual(p.position(id,0),c.start[id].position);assert.deepEqual(p.position(id,.5),p.position(id,1));assert.ok(Math.abs(p.segments[0].facing(id,1)-p.segments[1].facing(id,0))<1e-7||Math.abs(Math.sin((p.segments[0].facing(id,1)-p.segments[1].facing(id,0))/2))<1e-7);}
 assert.equal(c.relations.epoch,7);assert.equal(c.relations.neighbor.get(0),3);assert.equal(c.relations.partner.get(0),1);
});
test('Bob the Surfer first circulate retains its eight-count row and changes hand partners, not bound neighbor identities',()=>{
 const r=source(1591);assert.equal(r.title,'Bob the Surfer');assert.equal(r.author,'Dugan Murphy');const setup=r.rows.find(r=>r.beats===0)!;assert.match(setup.text,/gentlespoons face in, ladles face out/);const row=r.rows.find(r=>/gentlespoons cross while ladles loop right/.test(r.text))!;assert.equal(row.beats,8);
 const c=boxContext();c.source={url:r.sourceUrl,snapshotId:r.snapshotId,rowId:row.id,text:row.text,beats:row.beats};const p=compileWaveFigure(boxFigure(),c);assert.equal(p.beats,8);assert.deepEqual(p.segments.map(p=>p.beats),[4,4]);for(let id=0;id<4;id++)assert.deepEqual(p.position(id,0),p.position(id,.5));assert.deepEqual(p.exitWave.hands.map(h=>[h.a,h.b]),[[3,2],[0,1]]);assert.equal(c.relations.neighbor.get(0),3);assert.equal(c.relations.partner.get(0),1);assert.match(r.rows.at(-1)!.text,/look to next neighbors/,'a separate full-set exit remains required');
});
test('second Bob circulate reverses source roles and moves original couples to the opposite rows without rebinding neighbors',()=>{
 const c=boxContext(),a=compileWaveFigure(boxFigure(),c),start=c.start.map(p=>({...p,position:a.position(p.id,1),yaw:a.facing(p.id,1,c.start)})),second:WaveFigureContext={...c,start,wave:{graph:a.exitWave,handRelations:['partner','partner']},circulate:{mapping:[{id:3,destinationId:0,mode:'cross'},{id:0,destinationId:1,mode:'loop-right'},{id:1,destinationId:2,mode:'cross'},{id:2,destinationId:3,mode:'loop-right'}],exitWave:graph(2,1,3,0),exitHandRelations:['neighbor','neighbor'],frame:{origin:{x:0,z:0},across:{x:1,z:0}}}},b=compileWaveFigure({...boxFigure(),crossRole:'robin',loopRole:'lark'},second);
 assert.ok(b.position(0,1).z>0&&b.position(1,1).z>0);assert.ok(b.position(2,1).z<0&&b.position(3,1).z<0);assert.equal(second.relations.epoch,7);assert.deepEqual(b.exitWave.hands.map(h=>[h.a,h.b]),[[2,1],[3,0]]);
 // The primitive still faces waves; it does not silently consume the source's
 // final look-to-new-neighbor clause or finite-set end effects.
 assert.ok(Math.abs(Math.cos(b.facing(0,1,start)))<1e-7);
});
test('stale relations, wrong source role/hand/entry/exit, extra semantics and missing maps fail closed',()=>{
 for(const change of[{centerRole:'robin'},{sideRelation:'partner'},{passingShoulder:'left'},{centerHand:'right'},{sideHand:'left'},{entry:'side-couples'},{phaseBeats:[2,6]},{balanceStyle:'Rory-slide'},{beats:12},{progression:true},{exit:'face-next-neighbor'},{amount:.5},{who:'all'},{unconsumed:true}])assert.throws(()=>compileWaveFigure({...passFigure(),...change} as any,passContext()));
 let c=passContext();c.bindingEpoch=8;assert.throws(()=>compileWaveFigure(passFigure(),c),/stale/);c=passContext();c.start[0].yaw=0;assert.throws(()=>compileWaveFigure(passFigure(),c),/facing directly across/);c=passContext();c.start[0].position.z=.8;assert.throws(()=>compileWaveFigure(passFigure(),c),/slot/);
 for(const change of[{crossRole:'robin'},{loopRole:'lark'},{loopDirection:'left'},{phaseBeats:[4,6]},{amount:1},{progression:true}])assert.throws(()=>compileWaveFigure({...boxFigure(),...change} as any,boxContext()));
 c=boxContext();delete c.circulate;assert.throws(()=>compileWaveFigure(boxFigure(),c),/actor-to-slot/);c=boxContext();delete c.wave;assert.throws(()=>compileWaveFigure(boxFigure(),c),/hand graph/);c=boxContext();c.wave!.handRelations=['partner','partner'];assert.throws(()=>compileWaveFigure(boxFigure(),c),/relationship/);c=boxContext();c.circulate!.exitHandRelations=['neighbor','neighbor'];assert.throws(()=>compileWaveFigure(boxFigure(),c),/relationship/);
 c=passContext();c.source={url:'https://contradb.com/dances/1992',snapshotId:'retained',rowId:'row',text:'pass and balance',beats:4};assert.throws(()=>compileWaveFigure(passFigure(),c),/beat budget/);
});
test('compiled source wrapper owns source and endpoint metadata instead of retaining mutable interpreter input',()=>{
 const c=boxContext(),p=compileWaveFigure(boxFigure(),c),before=p.position(0,.8),hands=structuredClone(p.exitWave);c.start[0].position.x=99;c.wave!.graph.hands[0].a=99;c.circulate!.exitWave.hands[0].a=99;c.circulate!.mapping[0].destinationId=99;assert.deepEqual(p.position(0,.8),before);assert.deepEqual(p.exitWave,hands);assert.throws(()=>{p.exitWave.hands[0].a=99;});
});
