import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
const raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
const source=(id:number)=>{const r=prepareContraDbReview(raw(id));assert.ok(r.result.dance,r.result.errors.join('; '));return r;};
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

test('Hocus Pocus preserves its redundant agreeing shoulder qualifier, source counts and archived choices',()=>{
 const review=source(410),dance=review.result.dance!;
 assert.equal(dance.title,'Hocus Pocus');assert.equal(dance.author,'Lisa Greenleaf');
 assert.equal(review.result.record!.rows[2].text,'ladles start a half hey - rights in center, lefts on ends right shoulder');
 assert.deepEqual(dance.figures.map(f=>[f.kind,f.beats]),[['balance',4],['swing',12],['robins-chain',8],['hey',8],['balance',4],['swing',12],['circle',8],['ring-balance',4],['california-twirl',4]]);
 assert.equal(dance.figures[2].who,'partner');
 assert.deepEqual([dance.figures[3].who,dance.figures[3].heyStartRole,dance.figures[3].centerShoulder,dance.figures[3].endShoulder],['partner','robin','right','left']);
 assert.equal(dance.figures.filter(f=>f.progression).length,1);
 const replay=readContraDbImport(dance.sourceText);assert.deepEqual(replay.dance?.figures,dance.figures);assert.equal(replay.record?.original,review.result.record!.original);
 for(const suffix of['left shoulder','right shoulder and clap']){const snapshot=JSON.parse(raw(410));snapshot.html=snapshot.html.replace('lefts on ends right shoulder',`lefts on ends ${suffix}`);assert.equal(prepareContraDbReview(JSON.stringify(snapshot)).result.dance,undefined);}
});

test('Hocus Pocus composes exact previously reviewed Hay and Easy Peasy paths and contacts',()=>{
 const current=compileChoreography(source(410).result.dance!,6),hay=compileChoreography(source(24).result.dance!,6),easy=compileChoreography(source(1450).result.dance!,6);
 for(let i=0;i<1280;i++){
  const beat=i/20,a=current.sample(beat),b=(beat<48?hay:easy).sample(beat);
  for(const p of a.poses){const q=b.poses[p.id];assert.ok(gap(p.position,q.position)<1e-9);assert.ok(angle(p.yaw,q.yaw)<1e-9);assert.equal(p.activity,q.activity);}
  assert.equal(a.contacts.length,b.contacts.length);
  for(const h of a.contacts){const q=b.contacts.find(q=>q.a===h.a&&q.b===h.b&&q.handA===h.handA&&q.handB===h.handB);assert.ok(q);assert.equal(h.kind,q.kind);assert.equal(h.target,q.target);assert.equal(h.underId,q.underId);assert.ok(Math.abs(h.strength-q.strength)<1e-9);assert.ok(Math.hypot(h.point.x-q.point.x,h.point.y-q.point.y,h.point.z-q.point.z)<1e-9);}
 }
});

test('Hocus Pocus retains continuous finite-line identities for every supported set size',()=>{
 const dance=source(410).result.dance!;
 for(let couples=2;couples<=12;couples++){
  const c=compileChoreography(dance,couples);assert.equal(c.repeatable,true);
  for(let round=0;round<2*couples;round++)for(const local of[...c.starts,64]){
   const beat=round*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);
   for(const p of b.poses){assert.equal(p.id,a.poses[p.id].id);assert.ok(gap(p.position,a.poses[p.id].position)<2e-5);assert.ok(angle(p.yaw,a.poses[p.id].yaw)<2e-5);}
  }
  const a=c.sample(2.5),b=c.sample(2*couples*64+2.5);for(const p of a.poses){assert.ok(gap(p.position,b.poses[p.id].position)<1e-8);assert.ok(angle(p.yaw,b.poses[p.id].yaw)<1e-8);}
 }
});
