/** Actual retained source with explicit removable neutral-half-hey interpretation.
 * No Ready admission, generated archives, or choreography rewriting occurs here. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {makeContraDbSnapshot} from './contradb-source.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {compileChoreography} from './choreography.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
const caps={...REGISTERED_MOTION_CAPABILITIES,stateCarryingHalfHeys:true};
const raw=readFileSync(new URL('../test-data/contradb/3260.json',import.meta.url),'utf8');
function reviewed(){const p=prepareContraDbReview(raw,[],caps),interpretation=structuredClone(p.interpretation);interpretation.rows??={};interpretation.rows['contradb:3260:row:4']={ordinaryHey:{sidePair:'neighbor',exit:'opposite-slots-facing-across'}};const result=readContraDbImport(raw,{interpretation,capabilities:caps});assert.ok(result.dance,result.errors.join('; '));return{result,interpretation,dance:result.dance};}
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
test('3260 preserves exact source, counts, chain receivers and removable neutral-half interpretation',()=>{
 const {result,interpretation,dance}=reviewed(),record=result.record!;
 const suggested=prepareContraDbReview(raw,[],caps);assert.ok(suggested.result.dance);assert.deepEqual(suggested.interpretation.rows!['contradb:3260:row:4'].ordinaryHey,{sidePair:'neighbor',exit:'opposite-slots-facing-across'});
 assert.equal(record.snapshotId,'contradb:3260:5162a6243ca11440');assert.deepEqual(JSON.parse(dance.sourceText!).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(record))));
 assert.deepEqual(dance.figures.map(f=>f.beats),[4,12,8,8,8,8,8,6,2]);assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);
 assert.deepEqual(dance.figures.filter(f=>f.kind==='robins-chain').map(f=>f.who),['neighbor','partner']);
 const hey=dance.figures[5];assert.deepEqual([hey.kind,hey.amount,hey.who,hey.heyStartRole,hey.centerShoulder,hey.endShoulder,hey.exit],['hey',.5,'neighbor','robin','right','left','opposite-slots-facing-across']);
 assert.equal(record.rows[4].text,'ladles start a half hey - rights in center, lefts on ends');assert.equal(record.rows[4].progression,false);
 assert.equal(readContraDbImport(raw,{interpretation,capabilities:{...caps,stateCarryingHalfHeys:false}}).dance,undefined);
 delete interpretation.rows!['contradb:3260:row:4'].ordinaryHey;assert.equal(readContraDbImport(raw,{interpretation,capabilities:caps}).dance,undefined);
 const remembered=prepareContraDbReview(raw,[{sourceSnapshotId:record.snapshotId,interpretation}],caps);assert.equal(remembered.result.dance,undefined);assert.deepEqual(remembered.interpretation,interpretation);assert.deepEqual(remembered.suggestions.map(s=>s.kind),['remembered']);
});
for(const couples of[3,4])test(`3260 actual whole source carries ${couples}-couple finite period without resets`,()=>{
 const {dance}=reviewed(),p=compileChoreography(dance,couples,caps) as CompiledStateSequence;assert.equal(p.totalBeats,64);assert.equal(p.periodRepeats,2*couples);
 const partners=p.topology(0).partners;let heys=0,maxHeySpeed=0,maxHeyYaw=0,minHeyGap=Infinity,maxChainSpeed=0,maxChainYaw=0;const dt=1/64;
 for(let repeat=0;repeat<p.periodRepeats;repeat++){
  const base=repeat*64,proofs=p.sequenceBoundaries(repeat);assert.equal(p.topology(base).epoch,repeat);assert.equal(p.topology(base+64-1e-8).epoch,repeat);assert.equal(p.topology(base+64).epoch,repeat+1);assert.deepEqual(p.topology(base).partners,partners);
  for(const h of proofs.filter(x=>x.adapterId==='neutral-half-hey')){
   heys++;assert.equal(h.contactPolicy,'strict-carried');assertSequenceHandoff(h.incoming,h.entry);assert.deepEqual([h.entry.sourceBeat,h.exit.sourceBeat],[40,48]);assert.equal(h.entry.relationshipEpoch,repeat);assert.equal(h.exit.relationshipEpoch,repeat);assert.deepEqual(h.exit.actors,h.entry.actors);assert.deepEqual(h.exit.partner,h.entry.partner);assert.deepEqual(h.exit.neighbor,h.entry.neighbor);assert.deepEqual(h.exit.heldContacts,[]);
   const sameGroup=(q:typeof h)=>q.entry.actors[0].id===h.entry.actors[0].id;
   const before=proofs.find(q=>q.exit.sourceBeat===40&&sameGroup(q))!,after=proofs.find(q=>q.entry.sourceBeat===48&&sameGroup(q))!;assert.ok(before&&after);assertSequenceHandoff(before.exit,h.entry);assertSequenceHandoff(h.exit,after.entry);
   for(const [beat,relations] of [[38,new Map(h.entry.neighbor)],[54,new Map(h.entry.partner)]] as const){const ids=new Set(h.entry.actors.map(a=>a.id)),contacts=p.sample(base+beat).contacts.filter(c=>ids.has(c.a)&&ids.has(c.b)&&c.kind==='courtesy');assert.equal(contacts.length,4);for(const c of contacts){assert.equal(relations.get(c.a),c.b);assert.ok(c.strength>.999);}}
   const roles=new Map(h.entry.actors.map(a=>[a.id,a.role]));for(const pose of h.exit.poses){const station=h.entry.poses.find(q=>gap(q.position,pose.position)<1e-8);assert.ok(station);assert.notEqual(station.id,pose.id);assert.equal(roles.get(station.id),roles.get(pose.id));}
  }
  for(const local of [...p.starts,64]){const beat=base+local;if(!beat)continue;const a=p.sample(beat-1e-7),b=p.sample(beat);for(const q of b.poses){assert.ok(gap(q.position,a.poses[q.id].position)<2e-5,`root ${repeat}/${local}/${q.id}`);assert.ok(turn(q.yaw,a.poses[q.id].yaw)<2e-5,`yaw ${repeat}/${local}/${q.id}`);}}
  let prior=p.sample(base+32);
  for(let i=1;i<=24/dt;i++){
   const local=32+i*dt,current=p.sample(base+local),hey=local>40&&local<=48;
   for(const q of current.poses){const speed=gap(q.position,prior.poses[q.id].position)/dt,yaw=turn(q.yaw,prior.poses[q.id].yaw)/dt;assert.ok(Number.isFinite(speed)&&Number.isFinite(yaw));if(hey){maxHeySpeed=Math.max(maxHeySpeed,speed);maxHeyYaw=Math.max(maxHeyYaw,yaw);}else{maxChainSpeed=Math.max(maxChainSpeed,speed);maxChainYaw=Math.max(maxChainYaw,yaw);}}
   if(hey){for(let a=0;a<current.poses.length;a++)for(let b=a+1;b<current.poses.length;b++)minHeyGap=Math.min(minHeyGap,gap(current.poses[a].position,current.poses[b].position));assert.equal(current.contacts.length,0);}
   for(const c of current.contacts)assert.ok(Number.isFinite(c.strength)&&c.strength>=0&&c.strength<=1);prior=current;
  }
 }
 assert.ok(heys>0);assert.ok(maxHeySpeed<=1.3);assert.ok(maxHeyYaw<=4);assert.ok(minHeyGap>=.5);
 assert.deepEqual(p.sample(p.periodRepeats*64).poses,p.sample(0).poses);assert.deepEqual(p.sample(p.periodRepeats*64).contacts,p.sample(0).contacts);
 console.log(JSON.stringify({source:3260,couples,repeats:p.periodRepeats,heys,sampleInterval:dt,maxHeySpeed,maxHeyYaw,minHeyGap,maxChainSpeed,maxChainYaw,scope:'sampled whole-group roots/facing and contacts; no GPU/body/audio certification'}));
});
