import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {importContraDb} from './contradb-import.ts';import {prepareContraDbReview} from './source-review.ts';import {readContraDbSource} from './contradb-source.ts';
import {compileChoreography} from './choreography.ts';import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {Pose,StudioState,MotionCapabilities} from './types.ts';
const input=readFileSync(new URL('../test-data/contradb/1972.json',import.meta.url),'utf8');
const capabilities={longLinesRollaways:true,rightLeftThrough:true} as MotionCapabilities;
const reviewed=()=>{const interpretation={rows:{'contradb:1972:row:4':{rollawayPhaseBeats:[4,4] as const},'contradb:1972:row:6':{rightLeftThrough:{hand:'right' as const,courtesyReceiver:'neighbor' as const,courtesyLeader:'lark' as const,crossingRelation:'partner' as const}}}};return{interpretation,result:importContraDb(input,{capabilities,interpretation})};};
const source=()=>{const r=reviewed().result;assert.deepEqual(r.errors,[]);assert.ok(r.dance);return r.dance;};
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
const angle=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));
const corners=(poses:Pose[])=>[...poses].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);

test('actual Isaac Banner1972 retains its source wording, simultaneous eight-count return and archived choices',()=>{
 const review=reviewed(),r=review.result,d=source(),record=readContraDbSource(input).record!;assert.equal(d.title,'I Drove to Portland for Tacos');assert.equal(d.author,'Isaac Banner');assert.equal(d.sourceUrl,'https://contradb.com/dances/1972');assert.equal(d.sourceRows.length,8);assert.equal(d.sourceRecord.original,record.original);assert.equal(d.sourceRows[4].text,'long lines forward & back, ladles roll away partners left to right on the way back');assert.equal(d.sourceRows[4].beats,8);assert.equal(record.notes,'');
 assert.deepEqual(d.figures.map(f=>[f.kind,f.beats]),[['do-si-do',8],['swing',8],['allemande',8],['swing',8],['long-lines-rollaway',8],['circle',8],['right-left-through',8],['star',8]]);
 const f=d.figures[4] as any;assert.deepEqual([f.who,f.rollRole,f.sashayRole,f.rollRelation,f.rollDirection,f.rollPhase,f.rollHalfSashay,f.phaseBeats],['all','lark','robin','partner','left-to-right','return',true,[4,4]]);
 const through=d.figures[6];assert.deepEqual([through.direction,through.courtesyLeader,through.who,through.crossingRelation],['right','lark','neighbor','partner']);assert.equal(d.figures.at(-1)!.progression,true);
 for(const gate of['longLinesRollaways','rightLeftThrough'])assert.equal(importContraDb(input,{capabilities:{...capabilities,[gate]:false},interpretation:review.interpretation}).coverage.executable,false);
 const restored=importContraDb(d.sourceText,{capabilities});assert.deepEqual(restored.errors,[]);assert.deepEqual(restored.dance!.figures,d.figures);assert.deepEqual(restored.dance!.contraDbInterpretation,review.interpretation);assert.equal(restored.dance!.sourceText,d.sourceText);assert.equal(restored.record!.original,r.record!.original);assert.equal(prepareContraDbReview(d.sourceText,[],capabilities).savedArchive,true);
});

test('1972 cannot hide changed timing, actor direction, missing half sashay or stale source choices',()=>{
 const review=reviewed(),d=source(),choice=review.interpretation.rows!['contradb:1972:row:4'] as any;assert.deepEqual(choice.rollawayPhaseBeats,[4,4]);
 for(const phase of[[4,8],[8,4],[4,4,4],[],[3,5]]){const interpretation=structuredClone(review.interpretation);(interpretation.rows!['contradb:1972:row:4'] as any).rollawayPhaseBeats=phase;assert.equal(importContraDb(input,{capabilities,interpretation}).coverage.executable,false);}
 const missing=structuredClone(review.interpretation);delete (missing.rows!['contradb:1972:row:4'] as any).rollawayPhaseBeats;assert.equal(importContraDb(input,{capabilities,interpretation:missing}).coverage.executable,false);
 for(const replacement of['right to left on the way back','left to right on the way forward','left to right after going back','left to right on the way back without a half sashay']){const raw=JSON.parse(input);raw.html=raw.html.replace('left to right on the way back',replacement);assert.equal(importContraDb(JSON.stringify(raw),{capabilities,interpretation:review.interpretation}).coverage.executable,false,replacement);}
 const archive=JSON.parse(d.sourceText);archive.snapshot.html=archive.snapshot.html.replace('left to right on the way back','right to left on the way back');assert.equal(importContraDb(JSON.stringify(archive),{capabilities}).coverage.executable,false);
});

test('1972 quick review exposes the unique whole-dance-valid RLT relation and retains it in the saved archive',()=>{
 const p=prepareContraDbReview(input,[],capabilities);assert.equal(p.result.coverage.executable,true);assert.deepEqual(p.interpretation,reviewed().interpretation);assert.ok(p.suggestions.some(s=>s.rowId==='contradb:1972:row:6'&&s.kind==='conventional-rlt'&&/only relation assignment/.test(s.message)));assert.ok(p.suggestions.some(s=>s.rowId==='contradb:1972:row:4'&&s.kind==='conventional-rollaway'));assert.deepEqual(importContraDb(p.result.dance!.sourceText,{capabilities}).dance!.contraDbInterpretation,p.interpretation);
});

test('actual1972 follows independently derived named corner permutations through every finite set size',()=>{
 const dance=source(),two=compileChoreography(dance,2,capabilities);for(const[beat,expected]of[[16,[2,3,0,1]],[32,[2,1,0,3]],[40,[3,0,1,2]],[48,[0,1,2,3]],[56,[2,3,0,1]],[64-1e-7,[2,3,0,1]]] as const)assert.deepEqual(corners((two.formationSample??two.sample)(beat).poses),expected,`corner permutation at ${beat}`);
 for(let couples=2;couples<=12;couples++){const c=compileChoreography(dance,couples,capabilities),identity=c.dancers.map(d=>[d.id,d.role,d.couple]);assert.ok(c.repeatable);assert.equal(c.totalBeats,64);assert.deepEqual(c.starts,[0,8,16,24,32,40,48,56]);
  for(let repeat=0;repeat<2*couples;repeat++)for(const b of[...c.starts,36,38,64]){const beat=repeat*64+b;if(!beat)continue;const a=c.sample(beat-1e-7),z=c.sample(beat);assert.equal(z.poses.length,couples*2);for(const p of z.poses){assert.ok(gap(p,a.poses[p.id])<2e-5,`root ${couples}/${beat}/${p.id}`);assert.ok(angle(p,a.poses[p.id])<2e-5,`yaw ${couples}/${beat}/${p.id}`);}}
  const a=c.sample(1.25),b=c.sample(2*couples*64+1.25);for(const p of a.poses){assert.ok(gap(p,b.poses[p.id])<1e-8);assert.ok(angle(p,b.poses[p.id])<1e-8);}assert.deepEqual(c.dancers.map(d=>[d.id,d.role,d.couple]),identity);
  for(let repeat=0;repeat<2*couples;repeat++)for(const local of[34,36,37,38,39,39.75]){const f=c.sample(repeat*64+local);for(const h of f.contacts){assert.equal(c.dancers[h.a].couple,c.dancers[h.b].couple);assert.equal(c.dancers[h.a].role,'lark');assert.equal(c.dancers[h.b].role,'robin');assert.equal(h.kind,'joined');assert.equal(h.underId,undefined);}for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)assert.ok(gap(f.poses[a],f.poses[b])>.60-1e-7,`global rollaway root ${couples}/${repeat}/${local}/${a}/${b}`);}
 }
});

test('actual1972 larks roll once on the return, robins half-sashay, and circle prepares the stated RLT without extra time',()=>{
 const c=compileChoreography(source(),2,capabilities),entry=c.sample(32),forward=c.sample(36),exit=c.sample(40-1e-7);
 for(const p of entry.poses){assert.ok(angle(p,forward.poses[p.id])<1e-7);assert.ok(gap(exit.poses[p.id],entry.poses[p.id%2?p.id-1:p.id+1])<1e-6);const delta=exit.poses[p.id].yaw-forward.poses[p.id].yaw;assert.ok(Math.abs(delta-(p.id%2?0:-Math.PI*2))<1e-6,`rolling actor yaw ${p.id}/${delta}`);}
 for(const h of c.sample(36.25).contacts)assert.deepEqual([h.handA,h.handB],['right','left']);assert.equal(c.sample(38).contacts.length,0);for(const h of c.sample(39).contacts)assert.deepEqual([h.handA,h.handB],['left','right']);
 const before=c.sample(48-1e-7),after=c.sample(48);for(const p of after.poses){assert.ok(angle(p,before.poses[p.id])<1e-5);assert.ok(Math.abs(Math.sin(p.yaw)-Math.sign(-p.position.x))<1e-7);assert.ok(Math.abs(Math.cos(p.yaw))<1e-7);}
});

test('actual1972 complete-round Avatar preserves cadence and has no new rollaway reach error',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=source(),c=compileChoreography(dance,6,capabilities),avatars=c.dancers.map(d=>new Avatar(d)),residuals:Record<string,number>={};let maxWrist=0,held=0;
 for(let i=0;i<=1280;i++){const beat=i/20,f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,{dance,showLabels:false} as StudioState,b=>c.sample(b));const g=a.root.userData.gait,kind=dance.figures[f.figureIndex].kind;assert.equal(g.phase,beat);assert.equal(g.steps,dance.figures[f.figureIndex].beats);assert.equal(g.maxRate,1);residuals[kind]=Math.max(residuals[kind]??0,g.maxClampDistance);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}}
  const corrected=applyBodyContactAnchors(avatars,f);avatars.forEach(a=>a.root.updateMatrixWorld(true));if(beat>=32&&beat<40)for(const h of corrected.contacts)if(h.strength>=1-1e-10)for(const[id,hand]of[[h.a,h.handA],[h.b,h.handB]] as const){held++;const arm=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!,actual=arm.hand.getWorldPosition(new Vector3());maxWrist=Math.max(maxWrist,actual.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z)));assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}
 }avatars.forEach(a=>a.dispose());assert.equal(residuals['long-lines-rollaway'],0);assert.ok(held>0);assert.ok(maxWrist<1e-7,`full-strength rollaway wrist ${maxWrist}`);for(const[kind,value]of Object.entries(residuals))assert.ok(value<=(kind==='allemande'?.0046:kind==='star'?.0114:0),`inherited ${kind} reach changed to ${value}`);t.diagnostic(`Complete1972 inherited maximum leg corrections by figure: ${JSON.stringify(residuals)}. Rollaway wrist error ${maxWrist}; no new rollaway leg correction.`);
});

test('actual1972 Avatar rollaways clear opposite rollers and adjacent minor sets with the real engine body poses',t=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=source(),c=compileChoreography(dance,6,capabilities),avatars=c.dancers.map(d=>new Avatar(d));
 const rings=[[.91,.197],[.97,.195],[1.11,.17],[1.27,.225],[1.34,.245],[1.40,.18],[1.42,.11]],radius=(y:number)=>{if(y<.91||y>1.42)return 0;let i=1;while(i<rings.length-1&&rings[i][0]<y)i++;return rings[i-1][1]+(rings[i][1]-rings[i-1][1])*(y-rings[i-1][0])/(rings[i][0]-rings[i-1][0]);},parts=(a:Avatar)=>a.arms.flatMap(arm=>[{mesh:arm.upper,hand:arm.side===1?'left':'right',upper:true},{mesh:arm.lower,hand:arm.side===1?'left':'right',upper:false},{mesh:arm.hand,hand:arm.side===1?'left':'right',upper:false}]);
 const penetration=(A:any,B:any)=>{const inv=B.matrixWorld.clone().invert(),p=A.geometry.attributes.position,scale=B.getWorldScale(new Vector3()),factor=Math.min(scale.x,scale.y,scale.z);let minimum=Infinity;for(let i=0;i<p.count;i++){const v=new Vector3().fromBufferAttribute(p,i).applyMatrix4(A.matrixWorld).applyMatrix4(inv),q=B.geometry.type==='CapsuleGeometry'?Math.hypot(v.x,v.z,Math.max(0,Math.abs(v.y)-.5)):v.length();minimum=Math.min(minimum,(q-1)*factor);}return minimum;};
 let own=Infinity,other=Infinity,unrelated=Infinity;
 for(const repeat of[0,1])for(let i=0;i<80;i++){const beat=repeat*64+32+i/10,frame=c.sample(beat);for(const a of avatars){a.update(frame.poses[a.dancer.id],frame,{dance,showLabels:false} as StudioState,b=>c.sample(b));a.root.updateMatrixWorld(true);}
  for(const a of avatars)for(const b of avatars){if(frame.poses[a.dancer.id].activity==='waiting'||a.root.position.distanceTo(b.root.position)>1.5)continue;const inv=b.body.matrixWorld.clone().invert();for(const part of parts(a)){if(a===b&&part.upper)continue;const vertices=part.mesh.geometry.attributes.position;for(let j=0;j<vertices.count;j++){const v=new Vector3().fromBufferAttribute(vertices,j).applyMatrix4(part.mesh.matrixWorld).applyMatrix4(inv),r=radius(v.y);if(!r)continue;const margin=(Math.hypot(v.x,v.z/.7)-r)*.7;if(a===b)own=Math.min(own,margin);else other=Math.min(other,margin);}}
   if(a.dancer.id>=b.dancer.id)continue;for(const A of parts(a))for(const B of parts(b)){const held=frame.contacts.some(c=>c.strength>0&&((c.a===a.dancer.id&&c.b===b.dancer.id&&c.handA===A.hand&&c.handB===B.hand)||(c.a===b.dancer.id&&c.b===a.dancer.id&&c.handA===B.hand&&c.handB===A.hand)));if(!held)unrelated=Math.min(unrelated,penetration(A.mesh,B.mesh),penetration(B.mesh,A.mesh));}
  }
 }avatars.forEach(a=>a.dispose());t.diagnostic(`Actual1972 sampled arm mesh clearance: own ${own}, other ${other}, unrelated ${unrelated}. Small inherited own-arm styling is measured separately.`);assert.ok(own>-.01);assert.ok(other>0);assert.ok(unrelated>0);
});
