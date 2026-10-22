import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
const raw=readFileSync(new URL('../test-data/contradb/3195.json',import.meta.url),'utf8'), review=prepareContraDbReview(raw), dance=review.result.dance!;
test('3195 retains source counts and a removable explicit left-hand neighbor chain',()=>{
 assert.equal(review.result.coverage.executable,true,review.result.errors.join('\n'));
 const chain=dance.figures.find(f=>f.kind==='larks-chain')!;
 assert.equal(chain.hands,'left');assert.equal(chain.who,'neighbor');assert.equal(chain.courtesyLeader,'robin');assert.equal(chain.beats,8);
 assert.equal(dance.figures.reduce((a,f)=>a+f.beats,0),64);
 assert.equal(readContraDbImport(raw).coverage.executable,false);
 const choice=structuredClone(review.interpretation);delete choice.rows!['contradb:3195:row:4'].chainHand;
 assert.equal(readContraDbImport(raw,{interpretation:choice}).coverage.executable,false);
 assert.equal(prepareContraDbReview(dance.sourceText).result.coverage.executable,true);
});
for(const couples of [3,4])test(`3195 exact neighbor courtesy contacts and finite ${couples}-couple closure`,()=>{
 const p=compileChoreography(dance,couples),slots=Array.from({length:couples},(_,id)=>({id,rank:id,direction:id%2?-1:1}));
 for(let round=0;round<2*couples;round++){
  const pairs:Array<[number,number]>=[];for(const a of slots.filter(a=>a.direction===1)){const b=slots.find(b=>b.rank===a.rank+1&&b.direction===-1);if(b)pairs.push([a.id,b.id]);}
  const neighbors=new Map<number,number>();for(const[a,b]of pairs)for(const[x,y]of[[2*a,2*b+1],[2*a+1,2*b]]){neighbors.set(x,y);neighbors.set(y,x);}
  const waiters=p.dancers.filter(d=>!neighbors.has(d.id)).map(d=>d.id);
  for(const local of [4,20,28,36,44,52,60]){const frame=p.sample(round*64+local);for(const id of waiters){assert.equal(frame.poses.find(q=>q.id===id)!.activity,'waiting');assert.ok(!frame.contacts.some(h=>h.a===id||h.b===id));}}
  const key=(h:any)=>h.a<h.b?`${h.a}:${h.handA}:${h.b}:${h.handB}`:`${h.b}:${h.handB}:${h.a}:${h.handA}`;
  for(const local of [...p.starts.slice(1),64]){const beat=round*64+local,before=p.sample(beat-.0001),after=p.sample(beat+.0001);for(const q of before.poses){const r=after.poses.find(r=>r.id===q.id)!;assert.ok(Math.hypot(q.position.x-r.position.x,q.position.z-r.position.z)<.0004,`root seam ${beat}`);assert.ok(Math.abs(Math.atan2(Math.sin(q.yaw-r.yaw),Math.cos(q.yaw-r.yaw)))<.0007,`yaw seam ${beat}`);}for(const[a,b]of[[before,after],[after,before]])for(const h of a.contacts){const other=b.contacts.find(c=>key(c)===key(h));assert.ok(other?Math.abs(h.strength-other.strength)<.005:h.strength<.005,`contact seam ${beat}`);}}
  const crossed=new Set<number>(),received=new Set<number>();
  for(let tick=0;tick<=512;tick++)for(const h of p.sample(round*64+32+tick/64).contacts){if(h.strength<.99)continue;
   if(h.kind==='courtesy'){assert.equal(neighbors.get(h.a),h.b);received.add(h.a);received.add(h.b);}
   if(h.kind==='joined'&&h.handA==='left'&&h.handB==='left'&&h.a%2===0&&h.b%2===0){crossed.add(h.a);crossed.add(h.b);}
  }
  assert.equal(crossed.size,pairs.length*2);assert.equal(received.size,pairs.length*4);
  const crossing=p.sample(round*64+50.25).contacts;assert.equal(crossing.length,pairs.length*2);for(const h of crossing){assert.equal(h.b,h.a^1);assert.equal(h.handA,'right');assert.equal(h.handB,'right');assert.ok(h.strength>.99);}
  const courtesy=p.sample(round*64+54).contacts;assert.equal(courtesy.length,pairs.length*4);for(const h of courtesy){assert.equal(h.kind,'courtesy');assert.equal(neighbors.get(h.a),h.b);assert.ok(h.strength>0);}
  for(const a of slots){if(pairs.some(pair=>pair.includes(a.id)))a.rank+=a.direction;else a.direction*=-1;}
 }
 let prev=p.sample(0),gap=Infinity,speed=0;
 for(let tick=1;tick<=couples*128*32;tick++){const f=p.sample(tick/32);for(const q of f.poses){const old=prev.poses.find(p=>p.id===q.id)!;speed=Math.max(speed,32*Math.hypot(q.position.x-old.position.x,q.position.z-old.position.z));}for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)gap=Math.min(gap,Math.hypot(f.poses[a].position.x-f.poses[b].position.x,f.poses[a].position.z-f.poses[b].position.z));prev=f;}
 assert.ok(gap>=.45,`clearance ${gap}`);assert.ok(speed<=2.0,`speed ${speed}`);
 const first=p.sample(0),last=p.sample(couples*128);
 for(const q of first.poses){const r=last.poses.find(r=>r.id===q.id)!;assert.ok(Math.hypot(q.position.x-r.position.x,q.position.z-r.position.z)<1e-7);assert.ok(Math.abs(Math.atan2(Math.sin(q.yaw-r.yaw),Math.cos(q.yaw-r.yaw)))<1e-7);}
 assert.deepEqual(last.contacts,first.contacts);
});

test('role-chain dispatch is independent of source title and identity',()=>{
 const renamed=JSON.parse(raw);renamed.sourceUrl='https://contradb.com/dances/987650';renamed.html=renamed.html.replaceAll('Opus 4.6.1','Independent role-chain composition');
 const r=prepareContraDbReview(JSON.stringify(renamed));assert.equal(r.result.coverage.executable,true,r.result.errors.join('\n'));
 const a=compileChoreography(dance,3),b=compileChoreography(r.result.dance!,3);
 for(const beat of [0,16,24,32,34,37,40,48,56,64,100,128]){assert.deepEqual(a.sample(beat).poses,b.sample(beat).poses);assert.deepEqual(a.sample(beat).contacts,b.sample(beat).contacts);}
});
