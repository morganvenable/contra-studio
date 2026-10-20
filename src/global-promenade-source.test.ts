/** Actual-source public motion, finite topology, and strict policy contract tests. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileStagedOval as compileOvalImproper,OVAL_TEST_CAPABILITIES} from '../test-data/global-promenade/compiled-fixture.ts';
import {reviewedOvalSource} from '../test-data/global-promenade/fixture.ts';
import {compileChoreography} from './choreography.ts';
import {compileDance} from './engine.ts';
import type {Pose} from './types.ts';
const gap=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z),angle=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw)));
const corners=(poses:Pose[])=>[...poses].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);
const pairs=(a:readonly (readonly[number,number])[])=>a.map(p=>[...p].sort((a,b)=>a-b).join(':')).sort();
test('actual source2373 keeps its raw RLT glyph and every reviewed convention explicit',()=>{
 const raw=JSON.parse(readFileSync(new URL('../test-data/contradb/2373.json',import.meta.url),'utf8')),d=reviewedOvalSource();
 assert.equal(raw.sourceUrl,d.sourceUrl);assert.ok(raw.html.includes('bicycle'));assert.ok(raw.html.includes('Tony Parkes'));const rows=[...raw.html.matchAll(/<div class="show-figure">([\s\S]*?)<\/div>/g)].map((m:any)=>m[1]);assert.equal(rows.length,9);assert.deepEqual(rows.map((r:string,i:number)=>r.includes('⁋')?i:-1).filter((i:number)=>i>=0),[7]);assert.match(rows[7],/right left through/);assert.match(rows[8],/ladles chain/);assert.deepEqual([...raw.html.matchAll(/class=dance-show-beats>(\d+)</g)].map((m:any)=>Number(m[1])),[8,8,6,4,6,8,8,8,8]);assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);
 assert.equal(d.ovalPolicy.source.sourceId,'contradb:2373:8484ab5ffaf95417');assert.equal(d.ovalPolicy.source.basis,'reviewed-interpretation');assert.equal(d.ovalPolicy.progressionScope,'closing-phrase-after-chain');assert.deepEqual(d.ovalPolicy.phaseBeats,[6,4,6]);assert.equal(d.figures[5].progression,undefined);assert.equal(d.figures[6].progression,true);
});
test('every source modifier, source binding and timing convention is consumed strictly',()=>{
 const edits=[(d:any)=>d.ovalPolicy.source.basis='source-explicit',(d:any)=>d.ovalPolicy.source.sourceId='',(d:any)=>d.sourceRecord={snapshotId:'wrong',sourceUrl:d.sourceUrl},(d:any)=>d.ovalPolicy.source.unknown=true,(d:any)=>d.sourceUrl='https://contradb.com/dances/470',(d:any)=>d.ovalPolicy.distance=3.2,(d:any)=>d.ovalPolicy.geometry.trackRadius=1.4,(d:any)=>d.ovalPolicy.geometry.partnerPreparationBow=0,(d:any)=>d.ovalPolicy.timing.allemandePreparationBeats=1,(d:any)=>d.ovalPolicy.waitingParticipation='with-next-neighbor',(d:any)=>d.ovalPolicy.progressionScope='after-rlt',(d:any)=>d.ovalPolicy.unknown=true,(d:any)=>d.endPolicy={},(d:any)=>d.progressionEvents=[],(d:any)=>d.circulation='cw',(d:any)=>d.figures[0].amount=.5,(d:any)=>d.figures[0].direction='left',(d:any)=>d.figures[1].exit='face-down-line',(d:any)=>d.figures[2].promenadeRoute='across-set',(d:any)=>delete d.figures[2].promenadeRoute,(d:any)=>d.figures[2].promenadeHold='skaters',(d:any)=>delete d.figures[2].promenadeHold,(d:any)=>d.figures[2].amount=1,(d:any)=>d.figures[2].hands='both',(d:any)=>d.figures[3].entry='ring',(d:any)=>d.figures[3].amount=.5,(d:any)=>d.figures[4].entry='side-couples',(d:any)=>d.figures[5].crossingRelation='partner',(d:any)=>d.figures[5].progression=true,(d:any)=>d.figures[6].direction='left',(d:any)=>delete d.figures[6].progression];
 for(const edit of edits){const d=reviewedOvalSource();edit(d);assert.throws(()=>compileOvalImproper(d,2),String(edit));}
 for(let i=0;i<7;i++){const d=reviewedOvalSource();(d.figures[i]as any).unownedModifier=true;assert.throws(()=>compileOvalImproper(d,2));}
});
test('omitted chain direction consumes the established conventional right-hand semantics',()=>{
 const d=reviewedOvalSource(),implicit=compileOvalImproper(d,2);assert.equal(d.figures[6].direction,undefined);d.figures[6].direction='right';const explicit=compileOvalImproper(d,2);for(const beat of[56,57.25,60,63.5,64]){assert.deepEqual(implicit.sample(beat).poses,explicit.sample(beat).poses);assert.deepEqual(implicit.sample(beat).contacts,explicit.sample(beat).contacts);}d.figures[6].direction='left';assert.throws(()=>compileOvalImproper(d,2));
});
test('literal source corner oracle retains old neighbors through RLT and final chain',()=>{
 const c=compileOvalImproper(reviewedOvalSource(),2);for(const[b,ids]of[[0,[1,0,3,2]],[48,[0,3,2,1]],[56,[2,1,0,3]],[64-1e-7,[2,3,0,1]]]as const)assert.deepEqual(corners(c.sample(b).poses),ids,`corners ${b}`);
 for(const b of[16,22,26,32,40,48,56,63.999])assert.deepEqual(pairs(c.topology(b).neighbors),['0:3','1:2']);assert.equal(c.topology(64).epoch,1);assert.deepEqual(c.topology(64).neighbors,[]);
 const start=c.sample(16),end=c.sample(32);for(const[l,r]of[[0,3],[2,1]]){assert.ok(Math.abs(start.poses[l].position.x)>Math.abs(start.poses[r].position.x),'robins inside outbound');assert.ok(Math.abs(end.poses[l].position.x)<Math.abs(end.poses[r].position.x),'larks inside return');}
});
test('all 2–12-couple full periods close continuously, preserve participants and visit every other couple',t=>{
 let minimum=Infinity,maximum=0;
 for(let n=2;n<=12;n++){
  const c=compileOvalImproper(reviewedOvalSource(),n),encounters=new Set<string>(),actorEncounters=Array.from({length:n*2},()=>new Set<number>());assert.equal(c.period,2*n);assert.equal(c.periodStart,0);
  for(let repeat=0;repeat<c.period;repeat++){
   const origin=repeat*64,top=c.topology(origin+1),neighbor=new Map(top.neighbors.flatMap(([a,b])=>[[a,b],[b,a]] as [number,number][]));assert.equal(top.epoch,repeat);
   for(const[a,b]of top.neighbors){actorEncounters[a].add(b);actorEncounters[b].add(a);assert.notEqual(c.dancers[a].couple,c.dancers[b].couple);encounters.add([c.dancers[a].couple,c.dancers[b].couple].sort((a,b)=>a-b).join(':'));}
   for(const local of[...c.starts,22,26,38,64]){const beat=origin+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<2e-5,`root ${n}/${beat}/${p.id}`);assert.ok(angle(p,a.poses[p.id])<2e-5,`yaw ${n}/${beat}/${p.id}`);}}
   const oval=c.topology(origin+20);assert.equal(oval.ovalPairs!.length,n);assert.deepEqual(oval.ovalPairs!.flatMap(p=>[p.larkId,p.robinId]).sort((a,b)=>a-b),c.dancers.map(d=>d.id));
   for(const p of oval.ovalPairs!){assert.equal(p.relationship,top.waitingIds.includes(p.larkId)?'partner':'neighbor');assert.equal(c.dancers[p.larkId].couple===c.dancers[p.robinId].couple,p.relationship==='partner');}
   for(const id of top.waitingIds){const before=c.sample(origin).poses[id],after=c.sample(origin+63.999999).poses[id];assert.ok(Math.abs(before.position.z-after.position.z)<1e-8,`same physical end ${n}/${repeat}/${id}`);assert.ok(Math.abs(before.position.x+after.position.x)<1e-8);}
   let previous=c.sample(origin);
   for(let step=1;step<=64*8;step++){
    const f=c.sample(origin+step/8),occupied=new Set<string>();assert.deepEqual(f.poses.map(p=>p.id),c.dancers.map(d=>d.id));
    for(const h of f.contacts){assert.ok(h.strength>=0&&h.strength<=1);if(f.figureIndex===1)assert.equal(neighbor.get(h.a),h.b,'neighbor swing preserves the named epoch');if(f.figureIndex===2){assert.equal(top.waitingIds.includes(h.a)?h.a^1:neighbor.get(h.a),h.b,'whole-set travel preserves active neighbors and waiting partners');assert.equal(h.handA,'right');assert.equal(h.handB,'left');}if(f.figureIndex===4||f.figureIndex===3&&f.localBeat>38)assert.equal(h.a^1,h.b,'partner swing preparation preserves persistent partners');if(f.figureIndex===3&&f.localBeat<=38){assert.equal(c.dancers[h.a].role,'lark');assert.equal(c.dancers[h.b].role,'lark');assert.equal((neighbor.get(h.a)!)^1,h.b,'same-role allemande stays within its current named minor set');}for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])]as const){const key=`${id}:${hand}`;assert.ok(!occupied.has(key),`double hand ${n}/${f.beat}/${key}`);occupied.add(key);}}
    for(let a=0;a<f.poses.length;a++){const p=f.poses[a];maximum=Math.max(maximum,gap(p,previous.poses[a])*8);for(let b=a+1;b<f.poses.length;b++)minimum=Math.min(minimum,gap(p,f.poses[b]));}previous=f;
   }
   assert.equal(c.topology(origin+63.999999).epoch,repeat);assert.equal(c.topology(origin+64).epoch,repeat+1);
  }
  assert.equal(encounters.size,n*(n-1)/2,`full set encounters ${n}`);for(const [id,seen]of actorEncounters.entries()){assert.equal(seen.size,n-1,`every opposite-role nonpartner ${n}/${id}`);for(const other of seen){assert.notEqual(c.dancers[id].role,c.dancers[other].role);assert.notEqual(c.dancers[id].couple,c.dancers[other].couple);}}
  for(const b of[0,7,15.8,20,24,31.4,39,55,63.99]){const a=c.sample(b),z=c.sample(c.period*64+b);for(const p of a.poses){assert.ok(gap(p,z.poses[p.id])<1e-8);assert.ok(angle(p,z.poses[p.id])<1e-8);}}
 }
 assert.ok(minimum>=.45);assert.ok(maximum<1.8);t.diagnostic(`full period root clearance ${minimum}, maximum sampled speed ${maximum}`);
});
test('compiled source owns input and is deterministic under backward seeking',()=>{
 const d=reviewedOvalSource(),c=compileOvalImproper(d,3),beats=[0,16,20.25,24.7,31.8,39.2,56.3,63.99,64,144.75,384],frames=beats.map(b=>c.sample(b));d.ovalPolicy.distance=0 as never;d.figures[0].amount=100;
 for(const b of[...beats].reverse())assert.deepEqual(c.sample(b),frames[beats.indexOf(b)]);assert.ok(Object.isFrozen(c.starts));assert.ok(Object.isFrozen(c.warnings));assert.ok(Object.isFrozen(c.sample(20).warnings));assert.throws(()=>c.starts.push(99));assert.throws(()=>c.warnings.push('forged'));assert.throws(()=>c.sample(20).warnings.push('forged'));assert.throws(()=>c.sample(NaN));assert.throws(()=>compileOvalImproper(reviewedOvalSource(),1));assert.throws(()=>compileOvalImproper(reviewedOvalSource(),13));
});

test('opening DSD-to-neighbor swing retains the disclosed moving connection inside its eight source counts',()=>{
 const c=compileOvalImproper(reviewedOvalSource(),2),a=c.sample(8).poses[0],b=c.sample(8.5).poses[0],gathered=c.sample(9.12).poses[0],turning=c.sample(9.25).poses[0];assert.ok(gap(a,b)>.2,'the connection is moving, not an idle hold');assert.ok(Math.abs(gathered.position.x-.9)<1e-8);assert.ok(Math.abs(gathered.position.z+.31)<1e-8);assert.ok(Math.abs(turning.position.x-.9)>.001,'orbit starts after the 1.12-count connection');assert.ok(c.sample(9.6).contacts.every(h=>h.strength===1),'full frame at 1.6 counts');assert.equal(c.starts[2],16,'no extra source counts');
});

test('semantic admission survives renamed source metadata while evidence must match a supplied immutable record',()=>{
 const d=reviewedOvalSource() as ReturnType<typeof reviewedOvalSource>&{sourceRecord?:{snapshotId:string;sourceUrl:string}};d.id='renamed';d.title='Independent semantic fixture';d.author='Fixture';d.sourceUrl='https://example.org/renamed-source';d.ovalPolicy.source.url=d.sourceUrl;d.ovalPolicy.source.sourceId='independent:snapshot:v1';d.sourceRecord={snapshotId:'independent:snapshot:v1',sourceUrl:d.sourceUrl};const c=compileOvalImproper(d,2),expected=compileOvalImproper(reviewedOvalSource(),2);assert.equal(c.period,expected.period);for(const beat of[0,20,39,56,64,80]){assert.deepEqual(c.sample(beat).poses,expected.sample(beat).poses);assert.deepEqual(c.sample(beat).contacts,expected.sample(beat).contacts);}
 d.sourceRecord.snapshotId='stale';assert.throws(()=>compileOvalImproper(d,2),/source record/);d.sourceRecord.snapshotId=d.ovalPolicy.source.sourceId;d.sourceRecord.sourceUrl='https://example.org/other';assert.throws(()=>compileOvalImproper(d,2),/source record/);
});

test('registered public dispatch requires the independent oval capability and cannot silently ignore or forge a policy',()=>{
 const d=reviewedOvalSource();assert.equal(compileChoreography(d,3).totalBeats,64);for(const flag of['wholeSetOvalPromenades','promenades','rightLeftThrough'])assert.throws(()=>compileChoreography(d,3,{...OVAL_TEST_CAPABILITIES,[flag]:false}));
 const forged=structuredClone(d) as typeof d&{motionCapabilities:typeof OVAL_TEST_CAPABILITIES};forged.motionCapabilities=OVAL_TEST_CAPABILITIES;assert.throws(()=>compileChoreography(forged,3,{...OVAL_TEST_CAPABILITIES,wholeSetOvalPromenades:false}));assert.throws(()=>compileDance(d,3,OVAL_TEST_CAPABILITIES),/oval|formation/);
 const missing=structuredClone(d);delete (missing as any).ovalPolicy;assert.throws(()=>compileChoreography(missing,3,OVAL_TEST_CAPABILITIES));const mismatch=structuredClone(d);mismatch.figures[2].promenadeRoute='across-set';assert.throws(()=>compileChoreography(mismatch,3,OVAL_TEST_CAPABILITIES));
});


test('actual imported source matches the independently reviewed seven-figure motion fixture exactly',()=>{
 const imported=reviewedOvalSource(),reference=structuredClone(imported);reference.figures=[
 {id:'0',kind:'do-si-do',beats:8,label:'Neighbor do-si-do',who:'neighbor',amount:1,direction:'right'},
 {id:'1',kind:'swing',beats:8,label:'Neighbor swing, robins inside',who:'neighbor'},
 {id:'2',kind:'promenade',promenadeRoute:'whole-set-oval',promenadeHold:'inside-hand',beats:16,label:'Whole-set oval 6; couple turn 4; return 6',who:'neighbor'},
 {id:'3',kind:'allemande',beats:8,label:'Larks allemande left 1½',who:'larks',amount:1.5,direction:'left'},
 {id:'4',kind:'swing',beats:8,label:'Partner swing',who:'partner'},
 {id:'5',kind:'right-left-through',beats:8,label:'Right and left through',who:'partner',direction:'right',courtesyLeader:'lark',crossingRelation:'neighbor'},
 {id:'6',kind:'robins-chain',beats:8,label:'Robins chain',who:'neighbor',direction:'right',progression:true}];
 for(const count of[2,3,6]){const a=compileOvalImproper(imported,count),b=compileOvalImproper(reference,count);assert.equal(a.period,b.period);for(let step=0;step<=a.period*64*4;step++){const x=a.sample(step/4),y=b.sample(step/4);assert.deepEqual(x.poses,y.poses);assert.deepEqual(x.contacts,y.contacts);assert.deepEqual(a.topology(step/4),b.topology(step/4));}}
});
