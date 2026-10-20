import test from 'node:test';
import assert from 'node:assert/strict';
import {createDancers,initialPoses,compilePrimitiveFigure,figureContinuity} from './engine.ts';
import {compileEventSection} from './event-section.ts';
import {bindDirectedCoupleSlots} from './progression-topology.ts';
import {sampleFormationEndpoint,assertFormationHandoff} from './formation-handoff.ts';
import {compileAllemandeStarPickup,compileStarPromenadeFigure,compileButterflyWhirlFigure,compileWhirlRobinGyre,assertCarriedFormationHandoff,type StarPromenadeFigure,type ButterflyWhirlFigure} from './star-promenade-whirl.ts';
import {compileStarWhirlImproper} from './star-promenade-whirl-sequence.ts';
import {starWhirlSource,isolatedStarWhirlDance} from '../test-data/star-promenade-whirl/source-fixture.ts';
import type {Figure,Pose,Vec2} from './types.ts';
import type {FigureContext} from './extended-figures.ts';
const gap=(a:Vec2,b:Vec2)=>Math.hypot(a.x-b.x,a.z-b.z),angle=(a:number,b:number)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
function sourcePlans(){
 const {figures}=starWhirlSource(),dancers=createDancers(2),binding=bindDirectedCoupleSlots(dancers,0,[{coupleId:0,rank:0,direction:1},{coupleId:1,rank:1,direction:-1}]);
 const beginning=compileEventSection({dancers,initial:initialPoses(dancers),binding,totalBeats:16,steps:(figures.slice(0,2)as Figure[]).map((figure,i)=>({figure,entryFacingBeats:i===0?.48:0,compile(context){return compilePrimitiveFigure(figure,context.ids,context.start,dancers,[1,-1],figureContinuity(figures as Figure[],i));}}))});
 const entry:FigureContext={ids:[0,1,2,3],start:structuredClone(beginning.end)as Pose[],dancers,relations:binding.relations,bindingEpoch:0};
 const pickup=compileAllemandeStarPickup(figures[2]as Figure,entry,16),starContext={...entry,start:sampleFormationEndpoint(entry,pickup,1)},star=compileStarPromenadeFigure(figures[3]as StarPromenadeFigure,starContext,pickup.exitState,24),whirlContext={...entry,start:sampleFormationEndpoint(starContext,star,1)},whirl=compileButterflyWhirlFigure(figures[4]as ButterflyWhirlFigure,whirlContext,star.exitState,28),gyreContext={...entry,start:sampleFormationEndpoint(whirlContext,whirl,1),next:figures[6]as Figure},gyre=compileWhirlRobinGyre(figures[5]as Figure,gyreContext,whirl.exitState,32);
 return{figures,entry,pickup,starContext,star,whirlContext,whirl,gyreContext,gyre};
}
function winding(samples:Vec2[],center:Vec2){let total=0;for(let i=1;i<samples.length;i++)total+=angle(Math.atan2(samples[i].z-center.z,samples[i].x-center.x),Math.atan2(samples[i-1].z-center.z,samples[i-1].x-center.x));return total/(2*Math.PI);}

test('actual2531 preserves ten rows and64 counts; explicit-disabled review cannot admit its two-row convention',()=>{
 const {record,review,figures}=starWhirlSource();assert.equal(record.sourceId,'2531');assert.equal(record.title,'I Wish They All Could be California Twirls');assert.equal(record.author,'Jim Kitch');assert.equal(record.rows.length,10);assert.equal(record.rows.reduce((s,r)=>s+r.beats!,0),64);assert.deepEqual(review.result.rows.filter(r=>!r.resolved).map(r=>r.source.index),[3,4]);assert.equal(review.result.dance,undefined);assert.equal(review.result.coverage.executable,false);assert.deepEqual(figures.map(f=>[f.kind,f.beats]),[['circle',4],['swing',12],['allemande',8],['star-promenade',4],['butterfly-whirl',4],['gyre',8],['swing',8],['ring-balance',4],['petronella',4],['ring-balance',4],['california-twirl',4]]);assert.equal(figures.filter(f=>f.progression).length,1);assert.equal(figures.at(-1)!.progression,true);assert.equal(record.rows[3].text,'star promenade left ½');assert.equal(record.rows[4].text,'butterfly whirl');assert.equal(record.rows[9].text,'partners California twirl ⁋');
});

test('independent unwrapped orbit measurements retain1½ allemande,½ star,1⅜ butterfly and full robin gyre',()=>{
 const {pickup,star,whirl,gyre}=sourcePlans(),center={x:0,z:0};
 for(const id of[0,2])assert.ok(Math.abs(winding(Array.from({length:801},(_,i)=>pickup.position(id,i/800)),center)+1.5)<1e-10);
 for(const id of[0,1,2,3])assert.ok(Math.abs(winding(Array.from({length:401},(_,i)=>star.position(id,i/400)),center)+.5)<1e-10);
 for(const[id,other]of[[0,1],[1,0],[2,3],[3,2]]){const relative=Array.from({length:401},(_,i)=>{const a=whirl.position(id,i/400),b=whirl.position(other,i/400);return{x:(a.x-b.x)/2,z:(a.z-b.z)/2};});assert.ok(Math.abs(winding(relative,center)+1.375)<1e-10);}
 for(const id of[1,3])assert.ok(Math.abs(winding(Array.from({length:801},(_,i)=>gyre.position(id,i/800)),center)-1)<1e-10);
 // A partial3/8 turn reaches the same heading, but does not contain the
 // complete coupled revolution used by this explicit conventional candidate.
 const endpoint=Math.PI*2*1.375;assert.ok(Math.abs(angle(-Math.PI/4+endpoint,Math.PI/2))<1e-10);assert.ok(Math.abs(angle(-Math.PI/4+Math.PI*2,Math.PI/2))>1);
});

test('star travels as two rigid named couples; whirl keeps lark backing and robin advancing in world space',()=>{
 const {star,whirl,whirlContext}=sourcePlans();let largestLarkForward=-Infinity,smallestRobinForward=Infinity;
 for(let i=0;i<=800;i++){const t=i/800;for(const[a,b]of[[0,1],[2,3]]){assert.ok(Math.abs(gap(star.position(a,t),star.position(b,t))-.62)<1e-10);assert.ok(Math.abs(gap(whirl.position(a,t),whirl.position(b,t))-.62)<1e-10);assert.ok(Math.abs(angle(star.facing(a,t,[]),star.facing(b,t,[])))<1e-10);assert.ok(Math.abs(angle(whirl.facing(a,t,[]),whirl.facing(b,t,[])))<1e-10);}
  if(i&&i<800)for(const id of[0,1,2,3]){const a=whirl.position(id,t-1e-5),b=whirl.position(id,t+1e-5),yaw=whirl.facing(id,t,[]),forward=((b.x-a.x)*Math.sin(yaw)+(b.z-a.z)*Math.cos(yaw))/(8e-5);if(id%2)smallestRobinForward=Math.min(smallestRobinForward,forward);else largestLarkForward=Math.max(largestLarkForward,forward);}
 }
 assert.ok(largestLarkForward<0);assert.ok(smallestRobinForward>0);
 const boundary=sampleFormationEndpoint(whirlContext,whirl,1);for(const pair of[[0,1],[2,3]]){assert.ok(Math.abs(boundary[pair[0]].position.x-boundary[pair[1]].position.x)<1e-10);const side=Math.sign(boundary[pair[0]].position.x);assert.ok(Math.abs(angle(boundary[pair[0]].yaw,-side*Math.PI/2))<1e-10);}
});

test('typed radial boundaries preserve source clock, epoch, persistent pairs and directed hand ownership',()=>{
 const p=sourcePlans();assertCarriedFormationHandoff(p.pickup.exitState,p.star.entryState);assertCarriedFormationHandoff(p.star.exitState,p.whirl.entryState);assertFormationHandoff(p.whirl.exitState,p.whirl.exitState);assert.deepEqual([p.pickup.entryState.sourceBeat,p.pickup.exitState.sourceBeat,p.star.exitState.sourceBeat,p.whirl.exitState.sourceBeat],[16,24,28,32]);
 const h=p.star.entryState.heldContacts;assert.equal(h.length,5);assert.deepEqual(h.filter(c=>c.target==='hands').map(c=>[c.a,c.b,c.handA,c.handB]),[[0,2,'left','left']]);assert.deepEqual(h.filter(c=>c.target==='waist').map(c=>[c.a,c.b,c.handA]),[[0,1,'right'],[2,3,'right']]);assert.deepEqual(h.filter(c=>c.target==='upper-arm').map(c=>[c.a,c.b,c.handA]),[[1,0,'left'],[3,2,'left']]);assert.equal(p.whirl.exitState.heldContacts.length,0);
 for(const mutate of[(x:any)=>x.sourceBeat++,(x:any)=>x.relationshipEpoch++,(x:any)=>x.pairs[0].carriedId=3,(x:any)=>x.pairs[0].carriedSide='left',(x:any)=>x.geometry.innerRadius=.35,(x:any)=>x.orderedSlots[0].position.x+=.01,(x:any)=>x.orderedSlots[0].facing+=.1,(x:any)=>x.heldContacts[0].target='back',(x:any)=>x.heldContacts[0].strength=.5,(x:any)=>x.heldContacts[0].bodyPoint.x+=.01,(x:any)=>Object.defineProperty(x,'hidden',{value:1})]){const bad=structuredClone(p.star.entryState);mutate(bad);assert.throws(()=>assertCarriedFormationHandoff(bad,p.star.entryState));}
});

test('candidate declarations reject mirrors, neighbor carriage, turn overrides, hidden modifiers and stale bindings',()=>{
 const p=sourcePlans(),star=p.figures[3]as StarPromenadeFigure,whirl=p.figures[4]as ButterflyWhirlFigure;
 for(const edit of[{who:'neighbor'},{centerRole:'robin'},{hands:'right'},{direction:'right'},{amount:1},{beats:8},{progression:true},{notation:'star'},{phaseBeats:[2,2]}])assert.throws(()=>compileStarPromenadeFigure({...star,...edit}as any,p.starContext,p.pickup.exitState,24));
 for(const edit of[{amount:.375},{amount:1},{direction:'right'},{hands:'both'},{who:'neighbor'},{centerRole:'robin'},{progression:true}])assert.throws(()=>compileButterflyWhirlFigure({...whirl,...edit}as any,p.whirlContext,p.star.exitState,28));
 const hidden={...star};Object.defineProperty(hidden,'amount2',{value:2});assert.throws(()=>compileStarPromenadeFigure(hidden,p.starContext,p.pickup.exitState,24));assert.throws(()=>compileStarPromenadeFigure(star,{...p.starContext,bindingEpoch:1},p.pickup.exitState,24));assert.throws(()=>compileStarPromenadeFigure(star,p.starContext,p.pickup.exitState,25));
 for(const plan of[p.pickup,p.star,p.whirl,p.gyre]){assert.throws(()=>plan.position(999,.5));assert.throws(()=>plan.position(0,NaN));assert.throws(()=>plan.facing(0,NaN,[]));}
});

test('owned candidate declarations and contexts cannot change deterministic scrubbing after compilation',()=>{
 const p=sourcePlans(),input=structuredClone(p.figures[4])as ButterflyWhirlFigure,c={...p.whirlContext,start:structuredClone(p.whirlContext.start),dancers:structuredClone(p.whirlContext.dancers),relations:{epoch:p.whirlContext.relations.epoch,partner:new Map(p.whirlContext.relations.partner),neighbor:new Map(p.whirlContext.relations.neighbor)}},boundary=structuredClone(p.star.exitState),plan=compileButterflyWhirlFigure(input,c,boundary,28),before=Array.from({length:17},(_,i)=>[plan.position(0,i/16),plan.facing(0,i/16,[])]);
 (input as any).amount=.375;c.start[0].position.x=400;c.dancers[0].couple=90;c.relations.partner.set(0,3);(boundary as any).pairs[0].carriedId=3;plan.position(1,.99);assert.deepEqual(Array.from({length:17},(_,i)=>[plan.position(0,i/16),plan.facing(0,i/16,[])]),before);assert.ok(Object.isFrozen(plan.exitState));assert.ok(Object.isFrozen(plan.entryState.pairs[0]));
});

test('whole source is independent of its title and source record ID; no unauthorized extra event or figure is accepted',()=>{
 const {dance}=isolatedStarWhirlDance(),renamed=structuredClone(dance);renamed.id='not2531';renamed.title='Different supplied title';renamed.sourceUrl='https://contradb.com/dances/999999';for(const f of renamed.figures)f.id='renamed:'+f.id;renamed.progressionEvents[0].afterFigureId=renamed.figures.at(-1)!.id;renamed.progressionEvents[0].source.url=renamed.sourceUrl;renamed.endPolicy.source.url=renamed.sourceUrl;renamed.progressionEvents[0].source.sourceId='snapshot-other';renamed.endPolicy.source.sourceId='snapshot-other';const c=compileStarWhirlImproper(renamed,2);assert.equal(c.periodRepeats,4);
 for(const mutate of[(x:any)=>x.figures[3].progression=true,(x:any)=>x.figures[3].amount=.75,(x:any)=>x.figures[4].amount=1,(x:any)=>x.figures[5].who='larks',(x:any)=>x.figures[5].amount=1.5,(x:any)=>x.figures[9].beats=3,(x:any)=>x.endPolicy.reentryPreparationBeats=4,(x:any)=>x.progressionEvents[0].afterFigureId=x.figures[3].id]){const bad=structuredClone(dance);mutate(bad);assert.throws(()=>compileStarWhirlImproper(bad,2));}
});

test('all2–12-couple complete finite periods retain named identities, terminal-only events, same-end waits and continuous roots',t=>{
 const {dance}=isolatedStarWhirlDance();let minimum=Infinity,maximumSpeed=0;const periods:number[]=[];
 for(let count=2;count<=12;count++){
  const c=compileStarWhirlImproper(dance,count),period=2*count*64,first=c.sample(0),partners=Array.from({length:count},(_,i)=>[i*2,i*2+1]);assert.equal(c.periodRepeats,count*2);periods.push(c.periodRepeats);assert.deepEqual(c.starts,[0,4,16,24,28,32,40,48,52,56,60]);let previous=first;
  for(let beat=0;beat<=period;beat+=.25){const frame=c.sample(beat);assert.deepEqual(frame.poses.map(p=>p.id),c.dancers.map(d=>d.id));assert.deepEqual(c.topology(beat).partners,partners);for(const p of frame.poses){assert.ok([p.position.x,p.position.z,p.yaw].every(Number.isFinite));if(beat)maximumSpeed=Math.max(maximumSpeed,gap(p.position,previous.poses[p.id].position)*4);for(const q of frame.poses)if(q.id>p.id)minimum=Math.min(minimum,gap(p.position,q.position));}const hands=new Set<string>();for(const h of frame.contacts)for(const key of[`${h.a}:${h.handA}`,...(!h.target||h.target==='hands'?[`${h.b}:${h.handB}`]:[])]){assert.ok(!hands.has(key),`duplicate ${count}/${beat}/${key}`);hands.add(key);}previous=frame;}
  for(let r=0;r<2*count;r++){const topology=c.topology(r*64);for(const local of[0,16,24,28,32,48,60,63.999999]){assert.equal(c.topology(r*64+local).epoch,r);assert.deepEqual(c.topology(r*64+local).neighbors,topology.neighbors);}for(const id of topology.waitingIds){const p0=c.sample(r*64).poses[id],p4=c.sample(r*64+4).poses[id],p12=c.sample(r*64+12).poses[id],p63=c.sample(r*64+63).poses[id];assert.ok(gap(p0.position,p4.position)<1e-7);assert.ok(Math.abs(p12.position.z-p0.position.z)<1e-7,'end exchange remains at the same end');assert.ok(gap(p12.position,p63.position)<1e-7);}
   for(const local of[...c.starts,64]){const beat=r*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);for(const p of b.poses){assert.ok(gap(p.position,a.poses[p.id].position)<1e-5,`root ${count}/${beat}/${p.id}`);assert.ok(Math.abs(angle(p.yaw,a.poses[p.id].yaw))<1e-5,`facing ${count}/${beat}/${p.id}`);}}
  }
  const final=c.sample(period);for(const p of first.poses){assert.ok(gap(p.position,final.poses[p.id].position)<1e-7);assert.ok(Math.abs(angle(p.yaw,final.poses[p.id].yaw))<1e-7);}const saved=c.sample(29.25);c.sample(Number.MAX_SAFE_INTEGER);assert.deepEqual(c.sample(29.25),saved);
 }
 assert.ok(minimum>.5);assert.ok(maximumSpeed<1.8);t.diagnostic(JSON.stringify({minimumCentreClearance:minimum,maximumQuarterBeatSpeed:maximumSpeed,finitePeriods:periods}));
});


test('plain-data capture rejects accessors before executing them and preserves every declared source modifier',()=>{
 const p=sourcePlans();let reads=0;const figure={...p.figures[3]};Object.defineProperty(figure,'amount',{enumerable:true,get(){reads++;return .5;}});assert.throws(()=>compileStarPromenadeFigure(figure as StarPromenadeFigure,p.starContext,p.pickup.exitState,24));assert.equal(reads,0);
 const context={...p.starContext};Object.defineProperty(context,'start',{enumerable:true,get(){reads++;return p.starContext.start;}});assert.throws(()=>compileStarPromenadeFigure(p.figures[3]as StarPromenadeFigure,context,p.pickup.exitState,24));assert.equal(reads,0);
 const {dance}=isolatedStarWhirlDance();Object.defineProperty(dance.figures[0],'amount',{enumerable:true,get(){reads++;return .5;}});assert.throws(()=>compileStarWhirlImproper(dance,2));assert.equal(reads,0);
 assert.throws(()=>compileWhirlRobinGyre(p.figures[5]as Figure,p.gyreContext,p.whirl.exitState,33));
});

test('literal complete-source corner oracle arrives at the terminal progressed persistent-partner rows',()=>{
 const c=compileStarWhirlImproper(isolatedStarWhirlDance().dance,2),slot=(p:Pose)=>p.position.z<0?p.position.x<0?0:1:p.position.x>0?2:3;
 for(const[beat,expected]of[[0,[1,0,3,2]],[16,[0,1,2,3]],[32,[0,3,2,1]],[40,[0,3,2,1]],[48,[0,3,2,1]],[56,[3,2,1,0]],[60,[3,2,1,0]],[63.999999,[2,3,0,1]]]as const)assert.deepEqual([...c.sample(beat).poses].sort((a,b)=>slot(a)-slot(b)).map(p=>p.id),expected,`source endpoint${beat}`);
});


test('radial handoff compares every relation/contact identity and discrete declaration exactly below positional epsilon',()=>{
 const p=sourcePlans(),state=p.star.entryState,changes:Array<[string,(x:any)=>void]>=[];
 for(const relation of['partner','neighbor'])for(let row=0;row<4;row++)for(const col of[0,1])changes.push([`${relation}[${row}][${col}]`,x=>x[relation][row][col]+=1e-8]);
 for(let i=0;i<4;i++){for(const key of['id','couple'])changes.push([`actors[${i}].${key}`,x=>x.actors[i][key]+=1e-8]);changes.push([`orderedSlots[${i}].id`,x=>x.orderedSlots[i].id+=1e-8]);}
 for(let i=0;i<state.heldContacts.length;i++)for(const key of['a','b'])changes.push([`heldContacts[${i}].${key}`,x=>x.heldContacts[i][key]+=1e-8]);
 for(let i=0;i<2;i++)for(const key of['carrierId','carriedId'])changes.push([`pairs[${i}].${key}`,x=>x.pairs[i][key]+=1e-8]);
 for(const key of['sourceBeat','relationshipEpoch'])changes.push([key,x=>x[key]+=1e-8]);
 for(const key of['innerRadius','pairGap'])changes.push([`geometry.${key}`,x=>x.geometry[key]+=1e-8]);
 for(const[label,mutate]of changes){const bad=structuredClone(state);mutate(bad);assert.throws(()=>assertCarriedFormationHandoff(bad,state),undefined,label);assert.throws(()=>assertCarriedFormationHandoff(state,bad),undefined,`actual ${label}`);if(label!=='sourceBeat')assert.throws(()=>assertCarriedFormationHandoff(bad,bad),undefined,`identical malformed ${label}`);}
 const held=structuredClone(state)as any;held.heldContacts[0].underId=0;const wrongUnder=structuredClone(held);wrongUnder.heldContacts[0].underId+=1e-8;assert.throws(()=>assertCarriedFormationHandoff(held,wrongUnder));
 // Actual consumer calls must reject fractional IDs rather than normalize them
 // away by regenerating the next state's own integer actor/contact identities.
 for(const mutate of[(x:any)=>x.partner[0][1]+=1e-8,(x:any)=>x.neighbor[0][1]+=1e-8,(x:any)=>x.heldContacts[0].a+=1e-8,(x:any)=>x.heldContacts[0].b+=1e-8]){const bad=structuredClone(p.pickup.exitState);mutate(bad);assert.throws(()=>compileStarPromenadeFigure(p.figures[3]as StarPromenadeFigure,p.starContext,bad,24));}
 const near=structuredClone(state)as any;near.orderedSlots[0].position.x+=1e-8;near.orderedSlots[0].facing+=2*Math.PI+1e-8;near.geometry.origin.z+=1e-8;near.heldContacts[0].point.x+=1e-8;near.heldContacts[0].bodyPoint.x+=1e-8;near.heldContacts[0].strength-=1e-8;assert.doesNotThrow(()=>assertCarriedFormationHandoff(state,near));
 near.orderedSlots[0].position.x+=1e-5;assert.throws(()=>assertCarriedFormationHandoff(state,near));
});

test('radial handoff validates both states rather than accepting identical malformed identity tables',()=>{
 const state=sourcePlans().star.entryState;
 for(const mutate of[
  (x:any)=>x.actors[0].id=Number.MAX_SAFE_INTEGER+1,(x:any)=>x.actors[0].role='unknown',(x:any)=>x.actors[0].couple=99,
  (x:any)=>x.actors[1].id=x.actors[0].id,(x:any)=>x.actors.pop(),(x:any)=>x.relationshipEpoch=-1,
  (x:any)=>x.partner[0][1]=999,(x:any)=>x.partner[0][1]=0,(x:any)=>x.partner[0][1]=3,(x:any)=>x.partner[1][0]=0,
  (x:any)=>x.neighbor[0][1]=999,(x:any)=>x.neighbor[0][1]=1,(x:any)=>x.neighbor.pop(),
  (x:any)=>x.orderedSlots[0].id=999,(x:any)=>x.orderedSlots[1].id=x.orderedSlots[0].id,
  (x:any)=>x.pairs[1]=structuredClone(x.pairs[0]),(x:any)=>x.pairs[0].carriedSide='left',(x:any)=>x.pairs[0].relationship='neighbor',
  (x:any)=>x.heldContacts[0].a=999,(x:any)=>x.heldContacts[0].b=999,(x:any)=>x.heldContacts[0].underId=999,
  (x:any)=>x.heldContacts[0].kind='arch',(x:any)=>x.heldContacts[0].handA='left',(x:any)=>x.heldContacts[0].target='back',
  (x:any)=>x.heldContacts[1]=structuredClone(x.heldContacts[0]),(x:any)=>x.heldContacts.pop(),
  (x:any)=>x.geometry.kind='paired-sidelines',(x:any)=>x.geometry.centerRole='robin',(x:any)=>x.geometry.centerHand='right'
 ]){const bad=structuredClone(state);mutate(bad);assert.throws(()=>assertCarriedFormationHandoff(bad,bad));}
 assert.doesNotThrow(()=>assertCarriedFormationHandoff(state,structuredClone(state)));
});

test('whole source binds retained snapshot identity to both evidence records and rejects foreign policy or count declarations',()=>{
 const {dance,record}=isolatedStarWhirlDance(),retained={...structuredClone(dance),sourceRecord:structuredClone(record)},base=compileStarWhirlImproper(dance,2),withRecord=compileStarWhirlImproper(retained,2);
 for(const beat of[0,16,24,28,29.5,32,40,64,137,256])assert.deepEqual(withRecord.sample(beat),base.sample(beat));
 for(const mutate of[
  (x:any)=>x.sourceRecord.snapshotId='different-snapshot',(x:any)=>x.sourceRecord.sourceUrl='https://contradb.com/dances/999999',
  (x:any)=>delete x.sourceRecord.snapshotId,(x:any)=>delete x.sourceRecord.sourceUrl,(x:any)=>x.sourceRecord=null,(x:any)=>x.sourceRecord=undefined,
  (x:any)=>{x.progressionEvents[0].source.sourceId='different-snapshot';x.endPolicy.source.sourceId='different-snapshot';},
  (x:any)=>{x.sourceUrl='https://contradb.com/dances/999999';x.progressionEvents[0].source.url=x.sourceUrl;x.endPolicy.source.url=x.sourceUrl;},
  (x:any)=>x.progressionEvents[0].count=0,(x:any)=>x.progressionEvents[0].count=2,(x:any)=>x.progressionEvents[0].count=1+1e-8,
  (x:any)=>x.progressionEvents[0].waitingRoleArrangement='lark-right',
  (x:any)=>x.endPolicy.source.modifier='unconsumed',(x:any)=>x.progressionEvents[0].source.modifier='unconsumed'
 ]){const bad=structuredClone(retained);mutate(bad);assert.throws(()=>compileStarWhirlImproper(bad,2));}
 for(const key of['starWhirlPolicy','phaseBeats','progression','centerRole','circulation','ovalPolicy','sixTwoPassPolicy','diagonalHeyPolicy','ringTwirlPolicy'])for(const value of[undefined,{},'ignored'])assert.throws(()=>compileStarWhirlImproper({...dance,[key]:value},2),undefined,key);
 for(const[index,key,value]of[[1,'entry','closed-neighbor-frame'],[1,'exit','partner-swing'],[6,'entry','circle-exit'],[6,'exit','ring'],[2,'phaseBeats',[2,6]],[2,'inwardRole','lark'],[2,'outwardRole','robin'],[2,'entry','short-wave'],[2,'exit','partner-swing'],[10,'phaseBeats',[2,2]],[0,'unconsumed',undefined]]as const){const bad=structuredClone(dance);(bad.figures[index]as any)[key]=value;assert.throws(()=>compileStarWhirlImproper(bad,2),undefined,`${index}:${key}`);}
});

test('direct source clocks retain exact four/eight-count deltas and permit representable fractional local clocks',()=>{
 const p=sourcePlans();
 for(const sourceBeat of[Number.MAX_VALUE,2**56,Infinity,NaN,-1]){
  const radial={...p.pickup.exitState,sourceBeat},paired={...p.whirl.exitState,sourceBeat};
  assert.throws(()=>assertCarriedFormationHandoff(radial,radial));
  assert.throws(()=>compileAllemandeStarPickup(p.figures[2]as Figure,p.entry,sourceBeat));
  assert.throws(()=>compileStarPromenadeFigure(p.figures[3]as StarPromenadeFigure,p.starContext,radial,sourceBeat));
  assert.throws(()=>compileButterflyWhirlFigure(p.figures[4]as ButterflyWhirlFigure,p.whirlContext,radial,sourceBeat));
  assert.throws(()=>compileWhirlRobinGyre(p.figures[5]as Figure,p.gyreContext,paired,sourceBeat));
 }
 const pickup=compileAllemandeStarPickup(p.figures[2]as Figure,p.entry,16.25),star=compileStarPromenadeFigure(p.figures[3]as StarPromenadeFigure,p.starContext,pickup.exitState,24.25),whirl=compileButterflyWhirlFigure(p.figures[4]as ButterflyWhirlFigure,p.whirlContext,star.exitState,28.25),gyre=compileWhirlRobinGyre(p.figures[5]as Figure,p.gyreContext,whirl.exitState,32.25);
 assert.deepEqual([pickup.entryState.sourceBeat,pickup.exitState.sourceBeat,star.exitState.sourceBeat,whirl.exitState.sourceBeat],[16.25,24.25,28.25,32.25]);
 for(const[actual,expected]of[[pickup,p.pickup],[star,p.star],[whirl,p.whirl],[gyre,p.gyre]])for(const t of[0,.25,.5,.75,1])for(const id of[0,1,2,3]){assert.deepEqual(actual.position(id,t),expected.position(id,t));assert.equal(actual.facing(id,t,[]),expected.facing(id,t,[]));}
});

test('whole-source metadata rejects nontext identity and unrecognized confidence without changing a valid path',()=>{
 const{dance}=isolatedStarWhirlDance();for(const mutate of[(d:any)=>d.title=42,(d:any)=>d.author={},(d:any)=>d.verified='yes',(d:any)=>d.notes=[42],(d:any)=>d.figures[1].id=42,(d:any)=>d.figures[1].label=42,(d:any)=>d.figures[1].confidence='imagined',(d:any)=>d.figures[1].notes=[]]){const d=structuredClone(dance);mutate(d);assert.throws(()=>compileStarWhirlImproper(d,2));}
});
