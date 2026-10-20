import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import {compileChoreography} from './choreography.ts';
import {BUTTER_CANDIDATE} from './catalog.ts';
import {canonicalDanceText,sha256} from './swing-study-hash.ts';
import {evaluateReciprocalPreviewScope,RECIPROCAL_REVIEWED_BINDINGS} from './swing-study-inputs.ts';
import {ReciprocalPoseAdapter} from './swing-study-pose.mjs';
import {actualStudyContacts,ownSwingPresentation,retainUnownedContacts,SwingPresentationController} from './swing-presentation.ts';
import type {StudioState,Frame} from './types.ts';
globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
const state=(dance=structuredClone(BUTTER_CANDIDATE))=>({dance,showLabels:true,selectedDancer:3} as StudioState);
const matrices=(avatars:Avatar[])=>avatars.flatMap(a=>{a.root.updateMatrixWorld(true);const result:number[]=[];a.root.traverse(o=>result.push(...o.matrixWorld.elements));return result;});
function baseline(avatars:Avatar[],frame:Frame,s:StudioState,sample:(beat:number)=>Frame){for(const a of avatars)a.update(frame.poses[a.dancer.id],frame,s,sample);return applyBodyContactAnchors(avatars,frame);}
const make=()=>{const s=state(),c=compileChoreography(s.dance,6),avatars=c.dancers.map(d=>new Avatar(d));return{s,c,avatars};};

test('full canonical SHA-256 uses every Dance property, sorted keys, original array order and UTF-8',()=>{
 for(const text of['','abc','✨ Contra '+ 'é'.repeat(128),'a'.repeat(10000)])assert.equal(sha256(text),createHash('sha256').update(text).digest('hex'));
 assert.equal(canonicalDanceText({b:2,a:{d:[3,2,1],c:'é'}}),' {"a":{"c":"é","d":[3,2,1]},"b":2}'.trim());
 assert.equal(sha256(canonicalDanceText(BUTTER_CANDIDATE)),RECIPROCAL_REVIEWED_BINDINGS[0].canonicalDanceSha256);
 for(const change of[{title:'Butter edited'},{sourceUrl:'https://example.com/edited'},{notes:'edited'}, {figures:[...BUTTER_CANDIDATE.figures].reverse()}])assert.notEqual(sha256(canonicalDanceText({...BUTTER_CANDIDATE,...change})),RECIPROCAL_REVIEWED_BINDINGS[0].canonicalDanceSha256);
});
test('reviewed geometry and source/window registry are deeply immutable',()=>{
 const visit=(x:unknown)=>{if(x&&typeof x==='object'){assert.ok(Object.isFrozen(x));Object.values(x).forEach(visit);}};visit(RECIPROCAL_REVIEWED_BINDINGS);
 assert.throws(()=>{(RECIPROCAL_REVIEWED_BINDINGS[0].absoluteBeatWindows[0] as unknown as number[])[0]=0;},TypeError);
});
test('preview requests must be explicit owned exact objects',()=>{
 for(const v of[null,undefined,'reciprocal-blade-preview',{kind:'other'},{kind:'source',footwork:'buzz'},{kind:'reciprocal-blade-preview',revision:'272ea12a',footwork:'buzz'},{kind:'reciprocal-blade-preview',revision:'1309cde7',footwork:'other'},{kind:'reciprocal-blade-preview',revision:'1309cde7',footwork:'buzz',runtimeReviewed:true}])assert.equal(ownSwingPresentation(v),undefined);
 const input={kind:'reciprocal-blade-preview',revision:'1309cde7',footwork:'buzz'},owned=ownSwingPresentation(input);assert.ok(owned);input.footwork='walk';assert.equal(owned.kind==='reciprocal-blade-preview'&&owned.footwork,'buzz');assert.ok(Object.isFrozen(owned));
});
test('scope is source/build/count/absolute-window bound, never modulo repeats',()=>{
 const base={revision:'1309cde7',canonicalDanceSha256:RECIPROCAL_REVIEWED_BINDINGS[0].canonicalDanceSha256,couples:6,absoluteBeat:52,runtimeReviewed:true};
 assert.equal(evaluateReciprocalPreviewScope(base).applied,'reciprocal-blade-preview');
 for(const change of[{runtimeReviewed:false},{runtimeReviewed:undefined},{revision:'272ea12a'},{canonicalDanceSha256:'butter'},{couples:4},{couples:8},{absoluteBeat:52+64},{absoluteBeat:-1},{absoluteBeat:1e12},{absoluteBeat:Infinity},{absoluteBeat:NaN},{absoluteBeat:49.999999},{absoluteBeat:65.000001}])assert.equal(evaluateReciprocalPreviewScope({...base,...change}).applied,'source');
});
test('hand ownership suppresses traveling source contacts without deleting unrelated hands',()=>{
 const hand={kind:'swing-frame',a:0,b:1,handA:'left',handB:'right',point:{x:0,y:1,z:0},strength:1} as Frame['contacts'][number];
 const body={...hand,target:'back'} as Frame['contacts'][number];
 assert.deepEqual(retainUnownedContacts([hand,body],[{dancerId:1,hand:'right'}]),[body]);
 assert.deepEqual(retainUnownedContacts([hand,body],[{dancerId:0,hand:'left'}]),[]);
 assert.deepEqual(retainUnownedContacts([hand,body],[{dancerId:0,hand:'right'}]),[hand,body]);
});
test('standard rendering is exact and allocates/disposes no private reference avatars',()=>{
 const {s,c,avatars}=make(),standard=c.dancers.map(d=>new Avatar(d));let allocated=0;
 const controller=new SwingPresentationController(c,avatars,{createAvatar:d=>{allocated++;return new Avatar(d);},applyBodyContactAnchors});
 for(const beat of[0,6,8.25,51.8,52,65,1e3,52,0]){const f=c.sample(beat),copy=JSON.stringify(f);controller.prepareBaseline();const rendered=baseline(avatars,f,s,c.sample);baseline(standard,f,s,c.sample);const before=matrices(avatars);const result=controller.apply(f,rendered,s);assert.deepEqual(matrices(avatars),before);assert.deepEqual(matrices(avatars),matrices(standard));assert.equal(result.sourceFrame,f);assert.equal(result.retainedRenderedContacts,rendered.contacts);assert.equal(controller.contactDots(result),rendered.contacts);assert.equal(JSON.stringify(f),copy);assert.equal(result.applied,'source');}
 controller.dispose();assert.equal(allocated,0);avatars.forEach(a=>a.dispose());standard.forEach(a=>a.dispose());
});
test('raw geometry is deterministic in fresh/reverse seeks and independent of visible selection',()=>{
 for(const footwork of['walk','buzz'] as const){const {s,c,avatars}=make(),other=c.dancers.map(d=>new Avatar(d)),adapter=new ReciprocalPoseAdapter(c,avatars,{createAvatar:d=>new Avatar(d),applyBodyContactAnchors},{footwork}),reference=new ReciprocalPoseAdapter(c,other,{createAvatar:d=>new Avatar(d),applyBodyContactAnchors},{footwork});
  const beats=[6,6.75,8.125,16.9,17,50,51.766891941070206,51.766891941070305,51.8,52,63.3,65],saved=new Map<number,number[]>();
  for(const beat of beats){const f=c.sample(beat);avatars.forEach(a=>a.head.rotation.set(0,0,0));baseline(avatars,f,s,c.sample);const result=adapter.apply(f);saved.set(beat,matrices(avatars));const contact=actualStudyContacts(result.diagnostics);for(const acquisition of contact.acquisitions)if(acquisition.armRouteProgress<1)assert(acquisition.edges.every(e=>e.state!=='attached'));assert.equal(avatars[3].halo.scale.x,1.25);assert.ok(avatars.every(a=>a.label.visible));}
  const fractionalA=saved.get(51.766891941070206)!,fractionalB=saved.get(51.766891941070305)!;assert.ok(Math.max(...fractionalA.map((v,i)=>Math.abs(v-fractionalB[i])))<1e-8,`${footwork}: permanent former272 fractional discontinuity bracket`);
  for(const beat of [...beats].reverse()){const f=c.sample(beat);other.forEach(a=>a.head.rotation.set(0,0,0));baseline(other,f,s,c.sample);reference.apply(f);assert.deepEqual(matrices(other),saved.get(beat),`${footwork}/${beat}`);}
  // Deliberately evict all acceleration caches; geometry must not be warm-state dependent.
  adapter.frames.clear();adapter.basePlants.clear();adapter.armAnchors.length=0;
  const repeatBeat=51.8,repeatFrame=c.sample(repeatBeat);avatars.forEach(a=>a.head.rotation.set(0,0,0));baseline(avatars,repeatFrame,s,c.sample);adapter.apply(repeatFrame);assert.deepEqual(matrices(avatars),saved.get(repeatBeat));
  assert.ok(adapter.frames.size<=1024);assert.ok(adapter.basePlants.size<=512);assert.ok(adapter.armAnchors.length<=128);
  let visibleDisposals=0;for(const a of avatars){const dispose=a.dispose.bind(a);a.dispose=()=>{visibleDisposals++;dispose();};}adapter.dispose();assert.equal(visibleDisposals,0);assert.equal(adapter.frames.size,0);assert.equal(adapter.basePlants.size,0);assert.equal(adapter.armAnchors.length,0);reference.dispose();avatars.forEach(a=>a.dispose());other.forEach(a=>a.dispose());
 }
});

test('actual attachment is geometric, leading hands deduplicate, and route progress is not force',()=>{
 const diagnostics={beat:1,pairs:[{a:0,b:1,gate:1,armGate:1,start:0,end:4}],posedContacts:[
  {a:0,b:1,hand:'right',kind:'blade-palm',surface:[0,1,0],palmCenter:[0,1,.029],wrist:[.065,1,.029],strength:1},
  {a:1,b:0,hand:'left',kind:'blade-palm',surface:[1,1,0],palmCenter:[1,1,.029],wrist:[1.065,1,.029],strength:1},
  {a:0,b:1,hand:'left',kind:'leading-hand',surface:[.5,1,0],palmCenter:[.5,1,0],wrist:[.5,1,0],strength:1},
  {a:1,b:0,hand:'right',kind:'leading-hand',surface:[.5,1,0],palmCenter:[.5,1,0],wrist:[.5,1,0],strength:1},
 ],palmTargets:[{id:0,hand:'right',normal:[0,0,1],error:0},{id:1,hand:'left',normal:[0,0,1],error:0}]} as unknown as Parameters<typeof actualStudyContacts>[0];
 const held=actualStudyContacts(diagnostics);assert.equal(held.posedSwingContacts.length,3);assert.equal(held.posedSwingContacts.filter(c=>c.kind==='leading-hand').length,1);assert.equal(held.acquisitions[0].phase,'held');assert.equal(held.overriddenHands.length,4);
 diagnostics.pairs[0].armGate=.999999;const traveling=actualStudyContacts(diagnostics);assert.equal(traveling.posedSwingContacts.length,0);assert.equal(traveling.overriddenHands.length,4);assert.ok(traveling.acquisitions[0].edges.every(e=>e.state==='traveling'));assert.equal(traveling.acquisitions[0].phase,'acquiring');
 diagnostics.pairs[0].armGate=1;diagnostics.palmTargets[0].error=.001;const missed=actualStudyContacts(diagnostics);assert.equal(missed.posedSwingContacts.length,2);assert.notEqual(missed.acquisitions[0].phase,'held');
 diagnostics.pairs[0].gate=0;diagnostics.pairs[0].armGate=0;diagnostics.posedContacts=[];diagnostics.palmTargets=[];const released=actualStudyContacts(diagnostics);assert.equal(released.posedSwingContacts.length,0);assert.equal(released.overriddenHands.length,0);assert.ok(released.acquisitions[0].edges.every(e=>e.state==='released'));
});

test('qualified controller opt-in restores exact standard poses across mode, seek, fallback and off lifecycle',()=>{
 const{s,c,avatars}=make(),standard=c.dancers.map(d=>new Avatar(d));let created=0,disposed=0;
 const controller=new SwingPresentationController(c,avatars,{createAvatar:d=>{created++;const a=new Avatar(d),dispose=a.dispose.bind(a);a.dispose=()=>{disposed++;dispose();};return a;},applyBodyContactAnchors});
 const preview=(footwork:'walk'|'buzz')=>({kind:'reciprocal-blade-preview',revision:'1309cde7',footwork} as const);
 const events=[{beat:52,request:preview('buzz'),applied:'reciprocal-blade-preview'},{beat:51.8,request:preview('walk'),applied:'reciprocal-blade-preview'},{beat:65.001,request:preview('walk'),applied:'source'},{beat:52,request:preview('buzz'),applied:'reciprocal-blade-preview'},{beat:0,request:preview('buzz'),applied:'source'},{beat:52,request:preview('buzz'),applied:'reciprocal-blade-preview'},{beat:116,request:preview('buzz'),applied:'source'},{beat:52,request:{kind:'source'} as const,applied:'source'}];
 for(const e of events){s.swingPresentation=e.request;controller.prepareBaseline();const f=c.sample(e.beat),before=JSON.stringify(f),rendered=baseline(avatars,f,s,c.sample);baseline(standard,f,s,c.sample);const roots=avatars.map(a=>a.root.position.toArray());const result=controller.apply(f,rendered,s);assert.equal(result.applied,e.applied);assert.equal(JSON.stringify(f),before);assert.deepEqual(avatars.map(a=>a.root.position.toArray()),roots);
  if(e.applied==='source'){assert.deepEqual(matrices(avatars),matrices(standard));assert.equal(created,disposed);assert.ok(avatars.every(a=>!Object.hasOwn(a.root.userData,'candidateHip')));assert.equal(result.posedSwingContacts.length,0);assert.equal(result.acquisitions.length,0);}
  else{assert.equal(created-disposed,12);assert.equal(result.sourceFrame,f);assert.ok(result.overriddenHands.length>0);}
 }
 s.swingPresentation=preview('buzz');s.dance={...s.dance,title:s.dance.title+' edited'};controller.prepareBaseline();const f=c.sample(52),rendered=baseline(avatars,f,{...s,dance:c.dance},c.sample);assert.equal(controller.apply(f,rendered,s).inactiveReason,'unreviewed-source');assert.equal(created,disposed);
 controller.dispose();assert.equal(created,disposed);avatars.forEach(a=>a.dispose());standard.forEach(a=>a.dispose());
});
