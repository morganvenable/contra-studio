import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
// Reviewed literal choices, frozen independently from future suggestion changes.
const candidates = [{"id":"188","interpretation":{"rows":{"contradb:188:row:0":{"gyreSwing":{"meaning":"gyre-then-swing","phaseBeats":[4,12],"passingShoulder":"right","amount":1}},"contradb:188:row:2":{"hallEntry":"paired-sidelines-facing-down"},"contradb:188:row:3":{"hallPhaseBeats":[4,4,4,4]},"contradb:188:row:7":{"californiaTwirl":{"hands":"right-left","underRole":"robin","direction":"right","amount":0.5}}}}},{"id":"2062","interpretation":{"rows":{"contradb:2062:row:6":{"chainReceiver":"neighbor"}}}},{"id":"2063","interpretation":{"rows":{"contradb:2063:row:0":{"balanceBeats":4},"contradb:2063:row:5":{"chainReceiver":"neighbor"}}}},{"id":"2213","interpretation":{"rows":{"contradb:2213:row:0":{"balanceBeats":4},"contradb:2213:row:4":{"rightLeftThrough":{"hand":"right","courtesyReceiver":"partner","courtesyLeader":"lark","crossingRelation":"neighbor"}},"contradb:2213:row:5":{"chainReceiver":"neighbor"}}}},{"id":"2409","interpretation":{"rows":{"contradb:2409:row:2":{"balanceBeats":4}}}},{"id":"2605","interpretation":{"rows":{"contradb:2605:row:1":{"hallEntry":"paired-sidelines-facing-down"},"contradb:2605:row:2":{"hallPhaseBeats":[4,4,4,4]},"contradb:2605:row:6":{"promenade":{"route":"across-set","amount":0.5,"passingShoulder":"left","turnDirection":"left","hold":"skaters","leader":"lark","hands":"both"}},"contradb:2605:row:7":{"chainReceiver":"neighbor"}}}},{"id":"2701","interpretation":{"rows":{"contradb:2701:row:0":{"balanceBeats":4,"hallEntry":"paired-sidelines-facing-down"},"contradb:2701:row:1":{"hallPhaseBeats":[4,4,4,4]},"contradb:2701:row:6":{"chainReceiver":"neighbor"}}}},{"id":"2966","interpretation":{"rows":{"contradb:2966:row:0":{"balanceBeats":4},"contradb:2966:row:1":{"rightLeftThrough":{"hand":"right","courtesyReceiver":"neighbor","courtesyLeader":"lark","crossingRelation":"partner"}},"contradb:2966:row:3":{"balanceBeats":4},"contradb:2966:row:6":{"californiaTwirl":{"hands":"right-left","underRole":"robin","direction":"right","amount":0.5}}}}},{"id":"3402","interpretation":{"rows":{"contradb:3402:row:0":{"balanceBeats":4},"contradb:3402:row:2":{"rightLeftThrough":{"hand":"right","courtesyReceiver":"neighbor","courtesyLeader":"lark","crossingRelation":"partner"}},"contradb:3402:row:5":{"promenade":{"route":"across-set","amount":0.5,"passingShoulder":"left","turnDirection":"left","hold":"skaters","leader":"lark","hands":"both"}},"contradb:3402:row:6":{"chainReceiver":"neighbor"}}}},{"id":"3510","interpretation":{"rows":{"contradb:3510:row:8":{"californiaTwirl":{"hands":"right-left","underRole":"robin","direction":"right","amount":0.5}},"contradb:3510:row:1":{"chainReceiver":"neighbor"}}}},{"id":"933","interpretation":{"rows":{"contradb:933:row:1":{"chainReceiver":"partner"}}}}];
for(const candidate of candidates){
 const {id}=candidate;
 const raw=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
 test(`${id} retains the reviewed choices and original 64 source counts`,()=>{
  const prepared=prepareContraDbReview(raw);
  assert.deepEqual(prepared.interpretation,candidate.interpretation);
  const result=readContraDbImport(raw,{interpretation:prepared.interpretation});
  assert.ok(result.dance,result.errors.join('; '));
  assert.equal(result.record!.notes,'');
  assert.equal(result.record!.rows.reduce((n,row)=>n+row.beats,0),64);
  assert.equal(result.dance.figures.reduce((n,figure)=>n+figure.beats,0),64);
  assert.equal(result.record!.rows.filter(row=>row.progression).length,1);
 });
 for(const couples of [3,4])test(`${id} preserves finite ${couples}-couple periods and figure joins`,()=>{
  const result=prepareContraDbReview(raw).result;assert.ok(result.dance);
  const p=compileChoreography(result.dance,couples),period=couples*2*64;
  assert.equal(p.totalBeats,64);assert.equal(p.repeatable,true);
  const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
  const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
  for(let beat=0;beat<=period;beat+=.5){
   const frame=p.sample(beat);assert.equal(frame.poses.length,couples*2);
   assert.equal(new Set(frame.poses.map(q=>q.id)).size,couples*2);
   for(const q of frame.poses)assert.ok(Number.isFinite(q.position.x+q.position.z+q.yaw));
   for(const contact of frame.contacts)assert.ok(Number.isFinite(contact.strength)&&contact.strength>=0&&contact.strength<=1);
  }
  for(let repeat=0;repeat<2*couples;repeat++)for(const local of [...p.starts,64]){
   const beat=repeat*64+local;if(!beat)continue;
   const before=p.sample(beat-1e-6),after=p.sample(beat);
   for(const pose of after.poses){const prior=before.poses.find(q=>q.id===pose.id)!;
    assert.ok(gap(pose.position,prior.position)<2e-5,`root seam ${beat}/${pose.id}`);
    assert.ok(turn(pose.yaw,prior.yaw)<2e-5,`facing seam ${beat}/${pose.id}`);
   }
  }
  assert.deepEqual(p.sample(period).poses,p.sample(0).poses);
  assert.deepEqual(p.sample(period).contacts,p.sample(0).contacts);
 });
}
