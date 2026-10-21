import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync}from'node:fs';
import {readContraDbSource}from'./contradb-source.ts';
import {compileCarriedHeyWaveProducer,type CarriedHeyWaveSpec,type CarriedReleasedHeyState}from'./carried-hey-wave-producer.ts';
import {compileCarriedWaveCirculate}from'./carried-wave-circulate.ts';
import {compileChainFigure}from'./chain.ts';import {createDancers}from'./engine.ts';
import {compileCarriedPairedBalanceSwing}from'./carried-paired-balance-swing.ts';
import type {Pose}from'./types.ts';
function fixture(couples:number){
 const dancers=createDancers(couples);for(const d of dancers)if(d.id<4*Math.floor(couples/2))d.couple=Math.floor(d.id/4)*2+([0,3].includes(d.id%4)?0:1);
 const boxes=Array.from({length:Math.floor(couples/2)},(_,i)=>[0,1,2,3].map(id=>id+4*i));
 const partner=dancers.map(a=>[a.id,dancers.find(b=>b.couple===a.couple&&b.id!==a.id)!.id] as const),neighbor=boxes.flatMap(([a,b,c,d])=>[[a,b],[b,a],[c,d],[d,c]]as[number,number][]);
 let poses:Pose[]=dancers.map(({id})=>({id,position:{x:[-.64,-.64,.64,.64][id%4],z:[-.55,.55,.55,-.55][id%4]+Math.floor(id/4)*2.56},yaw:id%4<2?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}));
 for(const ids of boxes){const context={ids,dancers,start:poses,bindingEpoch:3,relations:{epoch:3,partner:new Map(partner),neighbor:new Map(neighbor)}};const chain=compileChainFigure({id:'source-chain',label:'Robins chain',kind:'robins-chain',who:'partner',beats:8},context);poses=poses.map(p=>ids.includes(p.id)?{...p,position:chain.position(p.id,1),yaw:chain.facing(p.id,1,poses)}:p);}
 const exitPoses=boxes.flatMap(box=>box.map(id=>({id,position:{x:[.64,-.64,-.64,.64][id%4],z:[.64,.64,-.64,-.64][id%4]+Math.floor(id/4)*2.56},yaw:[Math.PI/2,Math.PI/2,-Math.PI/2,-Math.PI/2][id%4]})));
 const input:CarriedReleasedHeyState={sourceBeat:24,bindingEpoch:3,actors:dancers.map(({id,role,couple})=>({id,role,couple})),poses,partner,neighbor,boxPartitions:boxes,heldContacts:[],waitingIds:dancers.filter(d=>!boxes.flat().includes(d.id)).map(d=>d.id)};
 const spec:CarriedHeyWaveSpec={beats:8,firstRole:'robin',sidePair:'partner',centerShoulder:'right',endShoulder:'left',inwardRole:'robin',exitPoses,localHand:'left',handRelation:'partner',acquisitionBeats:.25};return{input,spec,dancers};
}
for(const couples of[3,4])test(`2329 source half-hey and two left circulations retain partners in ${couples}-couple carried set`,()=>{
 const source=readContraDbSource(readFileSync(new URL('../test-data/contradb/2329.json',import.meta.url),'utf8')).record!;
 assert.equal(source.rows.reduce((n,r)=>n+r.beats!,0),64);assert.match(source.rows[4].text,/half hey.*partners take left hands/);assert.match(source.rows[6].text,/ladles cross.*loop left.*neighbors take left hands/);assert.match(source.rows[8].text,/gentlespoons cross.*loop left/);assert.match(source.rows[9].text,/partners balance & swing/);
 const {input,spec}=fixture(couples),hey=compileCarriedHeyWaveProducer(spec,input),a=compileCarriedWaveCirculate({kind:'balance-box-circulate',beats:8,phaseBeats:[4,4],balanceStyle:'right-left',crossRole:'robin',loopRole:'lark',loopDirection:'left'},hey.exitState);
 const b=compileCarriedWaveCirculate({kind:'balance-box-circulate',beats:8,phaseBeats:[4,4],balanceStyle:'right-left',crossRole:'lark',loopRole:'robin',loopDirection:'left',exit:{kind:'partner-balance',preparationBeats:2,pairSpacing:1.18,handAcquisitionBeats:.25}},a.exitState);
 assert.equal(b.exitState.sourceBeat,48);assert.equal(b.exitState.bindingEpoch,3);assert.deepEqual(b.exitState.partner,input.partner);assert.deepEqual(b.exitState.neighbor,input.neighbor);
 for(const h of hey.exitState.wave.hands.filter(h=>!hey.exitState.wave.seamHands.includes(h)))assert.equal(new Map(input.partner).get(h.a),h.b);
 for(const h of a.exitState.wave.hands.filter(h=>!a.exitState.wave.seamHands.includes(h)))assert.equal(new Map(input.neighbor).get(h.a),h.b);
 for(const h of b.exitState.heldContacts)assert.equal(new Map(input.partner).get(h.a),h.b);
 const finish=compileCarriedPairedBalanceSwing({beats:16,phaseBeats:[4,12],who:'partner',frameReleaseBeats:1},b.exitState);
 assert.equal(finish.exitState.sourceBeat,64);assert.equal(finish.exitState.bindingEpoch,3);assert.deepEqual(finish.exitState.partner,input.partner);assert.deepEqual(finish.exitState.heldContacts,[]);
 assert.ok(finish.maximumObservedYawRate<=3.2,`yaw ${finish.maximumObservedYawRate}`);assert.ok(finish.maximumObservedReach<=.64+1e-7);assert.ok(finish.minimumObservedClearance>=.45);assert.ok(finish.maximumObservedSpeed<=1.8);
 for(let beat=0;beat<=16;beat+=1/64){const frame=finish.sample(beat);for(const h of frame.contacts)assert.equal(new Map(input.partner).get(h.a),h.b);for(const id of input.waitingIds!)assert.deepEqual(frame.poses.find(p=>p.id===id),input.poses.find(p=>p.id===id));}
 for(const p of[hey,a,b])for(let beat=0;beat<=8;beat+=1/64){const frame=p.sample(beat);for(const id of input.waitingIds!)assert.deepEqual(frame.poses.find(q=>q.id===id),input.poses.find(q=>q.id===id));}
});

test('wave production rejects invented hands, receivers, stations, timing and discarded held entry',()=>{
 const {input,spec}=fixture(3);
 for(const patch of[{handRelation:'neighbor'},{localHand:'right'},{acquisitionBeats:1},{beats:16},{hidden:true}])assert.throws(()=>compileCarriedHeyWaveProducer({...spec,...patch} as CarriedHeyWaveSpec,input));
 const moved=structuredClone(spec);moved.exitPoses[0].position.x+=.1;assert.throws(()=>compileCarriedHeyWaveProducer(moved,input));
 assert.throws(()=>compileCarriedHeyWaveProducer(spec,{...input,waitingIds:[0,5]}));
 assert.throws(()=>compileCarriedHeyWaveProducer(spec,{...input,heldContacts:[{a:0,b:1,handA:'left',handB:'right',kind:'joined',strength:1,point:{x:0,y:1.28,z:0}}]}));
});
function balancedExit(input:CarriedReleasedHeyState,spec:CarriedHeyWaveSpec){const hey=compileCarriedHeyWaveProducer(spec,input),a=compileCarriedWaveCirculate({kind:'box-circulate',beats:4,crossRole:'robin',loopRole:'lark',loopDirection:'left'},hey.exitState);return compileCarriedWaveCirculate({kind:'box-circulate',beats:4,crossRole:'lark',loopRole:'robin',loopDirection:'left',exit:{kind:'partner-balance',preparationBeats:2,pairSpacing:1.18,handAcquisitionBeats:.25}},a.exitState).exitState;}
const finishSpec={beats:16 as const,phaseBeats:[4,12]as const,who:'partner' as const,frameReleaseBeats:1 as const};
test('producer and paired exit use arbitrary carried identities and translated measured geometry',()=>{
 const {input,spec}=fixture(3),id=(n:number)=>100+n*7,point=(p:{x:number;z:number})=>({x:p.x+2,z:p.z-3});
 const changed:CarriedReleasedHeyState={...input,actors:input.actors.map(a=>({...a,id:id(a.id),couple:a.couple+20})),poses:input.poses.map(p=>({...p,id:id(p.id),position:point(p.position)})),partner:input.partner.map(([a,b])=>[id(a),id(b)]),neighbor:input.neighbor.map(([a,b])=>[id(a),id(b)]),boxPartitions:input.boxPartitions.map(box=>box.map(id)),waitingIds:input.waitingIds!.map(id)};
 const transformed={...spec,exitPoses:spec.exitPoses.map(p=>({...p,id:id(p.id),position:point(p.position)}))};
 const h=compileCarriedHeyWaveProducer(spec,input),j=compileCarriedHeyWaveProducer(transformed,changed),a=compileCarriedPairedBalanceSwing(finishSpec,balancedExit(input,spec)),b=compileCarriedPairedBalanceSwing(finishSpec,balancedExit(changed,transformed));
 for(const[A,B,duration]of[[h,j,8],[a,b,16]]as const)for(let beat=0;beat<=duration;beat+=1/32)for(const p of A.sample(beat).poses){const q=B.sample(beat).poses.find(q=>q.id===id(p.id))!,want=point(p.position);assert.ok(Math.hypot(q.position.x-want.x,q.position.z-want.z)<1e-7);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-q.yaw),Math.cos(p.yaw-q.yaw)))<1e-7);}
 const saved=a.sample(12);a.exitState.poses.forEach(p=>assert.ok(Object.isFrozen(p)));assert.deepEqual(a.sample(12),saved);
});
test('paired balance/swing rejects changed receivers, missing hands and unconsumed preparation',()=>{
 const {input,spec}=fixture(3),state=balancedExit(input,spec);
 for(const patch of[{who:'neighbor'},{phaseBeats:[8,8]},{frameReleaseBeats:2},{ignored:true}])assert.throws(()=>compileCarriedPairedBalanceSwing({...finishSpec,...patch}as typeof finishSpec,state));
 assert.throws(()=>compileCarriedPairedBalanceSwing(finishSpec,{...state,heldContacts:state.heldContacts.slice(1)}));
 assert.throws(()=>compileCarriedPairedBalanceSwing(finishSpec,{...state,sourceBeat:Number.MAX_VALUE}));
 assert.throws(()=>compileCarriedPairedBalanceSwing(finishSpec,{...state,poses:state.poses.map((p,i)=>i===4?{...p,yaw:NaN}:p)}));
 const plan=compileCarriedPairedBalanceSwing(finishSpec,state);assert.throws(()=>plan.sample(NaN));
});
