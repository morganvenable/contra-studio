import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';import {readContraDbImport,normalizeContraDbRow} from './contradb-import.ts';import {compileChoreography} from './choreography.ts';import {descriptiveSourceNote} from './source-descriptive-note.ts';
const raw=readFileSync(new URL('../test-data/contradb/1021.json',import.meta.url),'utf8');
const gap=(a:any,b:any)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
test('textual full-star endpoint preserves absent glyph and removable descriptive and endpoint choices',()=>{
 const p=prepareContraDbReview(raw);assert.ok(p.result.dance,p.result.errors.join('; '));const r=p.result.record!,last=r.rows.at(-1)!;
 assert.equal(last.progression,false);assert.equal(last.text,'star left 4 places to next neighbors');assert.equal(p.result.rows.at(-1)!.progressionFromText,true);
 assert.equal(p.interpretation.notesReview,'descriptive-only');assert.deepEqual(r.rows.map(r=>r.beats),[16,6,10,8,8,8,8]);
 assert.deepEqual(readContraDbImport(p.result.dance.sourceText!).dance,p.result.dance);
 for(const field of ['notes','endpoint','chain']){const i=structuredClone(p.interpretation);if(field==='notes')delete i.notesReview;else if(field==='endpoint')delete i.rows![last.id].nextNeighborQualifier;else delete i.rows![r.rows[4].id].chainReceiver;assert.equal(readContraDbImport(raw,{interpretation:i}).dance,undefined);}
 assert.equal(descriptiveSourceNote({notes:r.notes+' Turn around at the end.'}),undefined);
 const wrong=structuredClone(r);wrong.rows.at(-1)!.beats=6;assert.equal(normalizeContraDbRow(wrong.rows.at(-1)!,'duple-improper',p.interpretation.rows![last.id]).resolved,false);
});
for(const count of [3,4])test(`textual-star source retains people, seams and closure over ${count}-couple periods`,t=>{
 const p=prepareContraDbReview(raw),c=compileChoreography(p.result.dance!,count);let min=Infinity,max=0,partnerFrames=0,neighborFrames=0,courtesy=0;
 const repeats=2*count;assert.equal(c.totalBeats,64);
 for(let r=0;r<repeats;r++){
  let previous=c.sample(64*r);
  for(let k=1;k<4096;k++){const local=k/64,f=c.sample(64*r+local);for(const a of f.poses){max=Math.max(max,gap(a,previous.poses[a.id])*64);for(const b of f.poses.filter(b=>b.id>a.id))min=Math.min(min,gap(a,b));}
   for(const h of f.contacts.filter(h=>h.strength>.999)){if(h.kind==='swing-frame'){if(local<16){assert.notEqual(h.a^1,h.b);neighborFrames++;}else if(local<32){assert.equal(h.a^1,h.b);partnerFrames++;}}if(h.kind==='courtesy'){assert.notEqual(h.a^1,h.b);courtesy++;}}
   previous=f;
  }
  for(const local of [...c.starts,64]){if(!r&&!local)continue;const a=c.sample(64*r+local-1e-7),b=c.sample(64*r+local);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-a.poses[p.id].yaw),Math.cos(p.yaw-a.poses[p.id].yaw)))<1e-5);}}
 }
 assert.ok(partnerFrames&&neighborFrames&&courtesy);assert.ok(min>=.45);assert.ok(max<2);
 for(const p of c.sample(0).poses){const q=c.sample(repeats*64).poses[p.id];assert.ok(gap(p,q)<1e-7);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-q.yaw),Math.cos(p.yaw-q.yaw)))<1e-7);}
 t.diagnostic(JSON.stringify({count,min,max,partnerFrames,neighborFrames,courtesy}));
});
