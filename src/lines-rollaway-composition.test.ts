import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import {linesRollawaySource} from './source-lines-rollaway.ts';
const raw=(id:number)=>readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
function reviewed(id:number){const text=raw(id),p=prepareContraDbReview(text),i=structuredClone(p.interpretation);i.rows![p.result.record!.rows[0].id].linesRollaway={phase:'return',direction:id===2243?'left-to-right':'right-to-left'};for(const r of p.result.record!.rows)if(/^ladles chain/.test(r.text))(i.rows![r.id]??={}).chainReceiver=id===2243?'neighbor':'partner';const r=readContraDbImport(text,{interpretation:i});assert.ok(r.dance,r.errors.join('; '));return{text,i,r};}
const gap=(a:{position:{x:number;z:number}},b:{position:{x:number;z:number}})=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
test('source composition rejects changed counts, progression, omitted half sashay and unrelated relations',()=>{
 const original=reviewed(2243).r.record!;assert.ok(linesRollawaySource(original,0));
 for(const edit of[{index:0,beats:3},{index:1,beats:5},{index:0,progression:true},{index:1,progression:true},{index:1,text:'gentlespoons roll away shadows with a half sashay'},{index:1,text:'gentlespoons roll away partners with a half sashay'},{index:1,text:'gentlespoons roll away neighbors without a half sashay'},{index:1,text:'gentlespoons roll away neighbors with a half sashay, then turn alone'}]){const r=structuredClone(original);Object.assign(r.rows[edit.index],edit);assert.equal(linesRollawaySource(r,0),undefined);}
 const literal=structuredClone(original);literal.rows[1].text+=' (roll right to left)';assert.equal(linesRollawaySource(literal,0)?.sourceDirection,'right-to-left');
});
test('source composition does not dispatch by title, source identity or whole sequence',()=>{
 const s=JSON.parse(raw(2243));s.sourceUrl='https://contradb.com/dances/999989';s.html=s.html.replaceAll('/dances/2243','/dances/999989').replaceAll("Ann's Roll-Away Hey",'Arbitrary Return');const p=prepareContraDbReview(JSON.stringify(s));assert.ok(p.result.dance,p.result.errors.join('; '));assert.match(p.result.record!.snapshotId,/contradb:999989:/);assert.equal(p.result.dance.figures[0].kind,'long-lines-rollaway');
});
for(const id of[2243,2322]){
 test(`${id} keeps distinct source rows and explicit removable return/direction/receiver choices`,()=>{
  const{text,i,r}=reviewed(id),d=r.dance!;assert.equal(d.figures[0].kind,'long-lines-rollaway');assert.equal(d.figures[0].beats,8);assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(r.record!.rows[0].beats,4);assert.equal(r.record!.rows[1].beats,4);assert.equal(r.rows[1].figures.length,0);assert.deepEqual(r.rows[0].compound?.sourceRowIds,r.record!.rows.slice(0,2).map(r=>r.id));assert.deepEqual(r.rows[1].compound,r.rows[0].compound);assert.deepEqual(readContraDbImport(d.sourceText!).dance,d);
  for(const change of['remove','wrong-direction','duplicate','wrong-receiver']){const choice=structuredClone(i),first=choice.rows![r.record!.rows[0].id];if(change==='remove')delete first.linesRollaway;if(change==='wrong-direction')first.linesRollaway!.direction=id===2243?'right-to-left':'left-to-right';if(change==='duplicate')(choice.rows![r.record!.rows[1].id]??={}).rollaway={direction:'left-to-right'};if(change==='wrong-receiver')for(const row of r.record!.rows)if(/^ladles chain/.test(row.text))choice.rows![row.id].chainReceiver=id===2243?'partner':'neighbor';assert.equal(readContraDbImport(text,{interpretation:choice}).dance,undefined,change);}
 });
 for(const couples of[3,4])test(`${id} ${couples}-couple period carries actual rollaway pairs and all source boundaries`,()=>{
  const c=compileChoreography(reviewed(id).r.dance!,couples) as CompiledStateSequence;let proofs=0,rollContacts=0,courtesies=0,minClearance=Infinity,maxSpeed=0;const encounters=new Set<string>();
  for(let repeat=0;repeat<c.periodRepeats;repeat++){
   const base=repeat*64,top=c.topology(base),neighbor=new Map(top.neighbors.flatMap(([a,b])=>[[a,b],[b,a]])),partner=new Map(top.partners.flatMap(([a,b])=>[[a,b],[b,a]]));assert.equal(top.epoch,repeat);assert.deepEqual(c.topology(base+64-1e-7),top);assert.equal(c.topology(base+64).epoch,repeat+1);for(const[a,b]of top.neighbors)encounters.add([c.dancers[a].couple,c.dancers[b].couple].sort((a,b)=>a-b).join(':'));
   for(const p of c.sequenceBoundaries(repeat).filter(p=>p.adapterId==='carried-lines-rollaway')){proofs++;assert.equal(p.contactPolicy,'strict-carried');assertSequenceHandoff(p.incoming,p.entry);assert.equal(p.exit.sourceBeat,8);assert.equal(p.exit.relationshipEpoch,repeat);assert.deepEqual(p.entry.neighbor,p.exit.neighbor);assert.deepEqual(p.entry.partner,p.exit.partner);for(const[a,b]of p.entry.neighbor){assert.ok(gap(p.exit.poses.find(q=>q.id===a)!,p.entry.poses.find(q=>q.id===b)!)<1e-8);}}
   for(const local of[...c.starts,4,8,64]){if(base+local===0)continue;const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-a.poses[p.id].yaw),Math.cos(p.yaw-a.poses[p.id].yaw)))<1e-5);}}
   let prior=c.sample(base);for(let k=1;k<=4096;k++){const local=k/64,f=c.sample(base+local);for(const p of f.poses)maxSpeed=Math.max(maxSpeed,gap(p,prior.poses[p.id])*64);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minClearance=Math.min(minClearance,gap(f.poses[a],f.poses[b]));for(const h of f.contacts){if(local<8){assert.equal(neighbor.get(h.a),h.b);if(h.strength>.999)rollContacts++;}if(h.kind==='courtesy'&&((id===2243&&local>56)||(id===2322&&local>8&&local<16))){assert.equal((id===2243?neighbor:partner).get(h.a),h.b);if(h.strength>.999)courtesies++;}}prior=f;}
  }
  assert.ok(proofs>0&&rollContacts>0&&courtesies>0);assert.equal(encounters.size,couples*(couples-1)/2);assert.ok(minClearance>.38);assert.ok(maxSpeed<2.4);for(const p of c.sample(0).poses){const q=c.sample(c.periodRepeats*64).poses[p.id];assert.ok(gap(p,q)<1e-8);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-q.yaw),Math.cos(p.yaw-q.yaw)))<1e-8);}assert.deepEqual(c.sample(0).contacts,c.sample(c.periodRepeats*64).contacts);console.log(JSON.stringify({id,couples,proofs,rollContacts,courtesies,minClearance,maxSpeed}));
 });
}
