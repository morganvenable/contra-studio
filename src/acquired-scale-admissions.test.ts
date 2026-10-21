import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbImport} from './contradb-import.ts';
import {prepareContraDbReview} from './source-review.ts';
import {makeContraDbSnapshot} from './contradb-source.ts';
import {compileChoreography} from './choreography.ts';
import type {ContraDbInterpretation} from './contradb-import.ts';
const choices:Record<string,ContraDbInterpretation>={
 '8':{rows:{'contradb:8:row:0':{balanceBeats:4},'contradb:8:row:3':{balanceBeats:4},'contradb:8:row:4':{chainReceiver:'neighbor'}}},
 '2194':{rows:{'contradb:2194:row:0':{balanceBeats:4},'contradb:2194:row:2':{balanceBeats:4},'contradb:2194:row:5':{promenade:{route:'across-set',amount:.5,passingShoulder:'left',turnDirection:'left',hold:'skaters',leader:'lark',hands:'both'}}},progression:'end-of-cycle'},
};
const gap=(a:{position:{x:number;z:number}},b:{position:{x:number;z:number}})=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
for(const id of Object.keys(choices)){
 const raw=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
 test(`${id} literal source and independent reviewed choices replay unchanged`,()=>{
  const p=prepareContraDbReview(raw);assert.deepEqual(p.interpretation,choices[id]);const r=readContraDbImport(raw,{interpretation:choices[id]});assert.ok(r.dance,r.errors.join('; '));
  assert.equal(r.record!.notes,'');assert.equal(r.record!.preamble,'');assert.equal(r.record!.hook,'');assert.equal(r.record!.rows.reduce((n,q)=>n+q.beats,0),64);assert.equal(r.record!.rows.filter(q=>q.progression).length,id==='8'?1:0);
  assert.deepEqual(JSON.parse(r.dance.sourceText!).snapshot,JSON.parse(JSON.stringify(makeContraDbSnapshot(r.record!))));assert.deepEqual(readContraDbImport(r.dance.sourceText!).dance,r.dance);
  const archive=readFileSync(new URL(`../test-data/reviewed-interpretations/${id}.json`,import.meta.url),'utf8');assert.deepEqual(JSON.parse(archive),JSON.parse(r.dance.sourceText!));assert.deepEqual(readContraDbImport(archive).dance,r.dance);
  const wrong=structuredClone(choices[id]);if(id==='8')wrong.rows!['contradb:8:row:4'].chainReceiver='partner';else delete wrong.progression;assert.equal(readContraDbImport(raw,{interpretation:wrong}).dance,undefined);
 });
 for(const couples of [3,4])test(`${id} complete ${couples}-couple periods retain named contacts and physical joins`,()=>{
  const r=readContraDbImport(raw,{interpretation:choices[id]});assert.ok(r.dance,r.errors.join('; '));const c=compileChoreography(r.dance,couples),period=2*couples*64;assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);
  let minGap=Infinity,maxSpeed=0,neighborContacts=0,partnerContacts=0,courtesy=0;const encountered=new Set<string>();
  for(let repeat=0;repeat<2*couples;repeat++){
   const base=repeat*64,first=c.sample(base),rows=c.dancers.filter(d=>d.role==='lark').sort((a,b)=>first.poses[a.id].position.z-first.poses[b.id].position.z),neighbors=new Map<number,number>();
   for(let i=0;i<rows.length;){const a=rows[i],b=rows[i+1];if(b&&first.poses[a.id].position.x>0&&first.poses[b.id].position.x<0){neighbors.set(a.id,b.id+1);neighbors.set(b.id+1,a.id);neighbors.set(a.id+1,b.id);neighbors.set(b.id,a.id+1);encountered.add([a.couple,b.couple].sort((x,y)=>x-y).join(':'));i+=2;}else i++;}
   for(const local of [...c.starts,64]){if(!base&&!local)continue;const before=c.sample(base+local-1e-7),after=c.sample(base+local);for(const p of after.poses){assert.ok(gap(p,before.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-before.poses[p.id].yaw),Math.cos(p.yaw-before.poses[p.id].yaw)))<1e-5);}}
   let prior=first;
   for(let k=1;k<=2048;k++){
    const frame=c.sample(base+k/32),f=c.dance.figures[frame.figureIndex];for(const p of frame.poses){assert.ok(Number.isFinite(p.position.x+p.position.z+p.yaw));maxSpeed=Math.max(maxSpeed,gap(p,prior.poses[p.id])*32);}
    for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minGap=Math.min(minGap,gap(frame.poses[a],frame.poses[b]));
    // Skip exact endpoints: next-cycle topology has changed there.
    if(k<2048)for(const h of frame.contacts){assert.ok(h.strength>0&&h.strength<=1);
     if(['balance','swing','promenade','box-the-gnat'].includes(f.kind)&&['partner','neighbor'].includes(f.who??'')){
      if(f.who==='partner'){assert.equal(Math.floor(h.a/2),Math.floor(h.b/2));if(h.strength>.999)partnerContacts++;}else{assert.equal(neighbors.get(h.a),h.b,`${id}/${repeat}/${k/32}/${f.kind}`);if(h.strength>.999)neighborContacts++;}
     }
     if(f.kind==='robins-chain'&&h.kind==='courtesy'){assert.equal(neighbors.get(h.a),h.b);if(h.strength>.999)courtesy++;}
    }
    prior=frame;
   }
  }
  assert.equal(encountered.size,couples*(couples-1)/2);assert.ok(neighborContacts>0&&partnerContacts>0);if(id==='8')assert.ok(courtesy>0);
  assert.ok(minGap>=.5,`root clearance ${minGap}`);assert.ok(maxSpeed<=1.3,`root speed ${maxSpeed}`);
  assert.deepEqual(c.sample(period).poses,c.sample(0).poses);assert.deepEqual(c.sample(period).contacts,c.sample(0).contacts);
  console.log(JSON.stringify({id,couples,minGap,maxSpeed,neighborContacts,partnerContacts,courtesy,scope:'whole-period roots/contact identities, no body/GPU/audio certification'}));
 });
}
