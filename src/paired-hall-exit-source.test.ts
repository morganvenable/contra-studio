import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizePairedHallExit} from './source-paired-hall-exit.ts';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
const raw=readFileSync(new URL('../test-data/contradb/133.json',import.meta.url),'utf8');
function reviewed(){const p=prepareContraDbReview(raw);(p.interpretation.rows!['contradb:133:row:5']??={}).chainReceiver='neighbor';const r=readContraDbImport(raw,{interpretation:p.interpretation});assert.ok(r.dance,r.errors.join('; '));return{p,r};}
const gap=(a:{position:{x:number;z:number}},b:{position:{x:number;z:number}})=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z);
test('paired hall qualifier consumes exact direction and pair, preserving unknown modifiers',()=>{
 for(const prefix of['neighbors swing','partners swing','neighbors balance & swing','partners long swing'])for(const end of[', end facing down the hall',' and end facing down',' finish facing down the hall',', end in a line of four facing down',', end in a line of 4 facing down the hall'])assert.equal(normalizePairedHallExit(prefix+end),prefix+' end facing down the hall');
 for(const text of['neighbors swing, end facing up the hall','partners swing and end facing down then trade','ones swing and end facing down','neighbors swing, end in a line','neighbors swing, end facing down the hall, clap'])assert.equal(normalizePairedHallExit(text),text);
});
test('133 retains source wording, count boundaries and removable terminal neighbor identification scope',()=>{
 const{p,r}=reviewed(),d=r.dance!;assert.equal(r.record!.rows[0].text,'neighbors balance & swing, end facing down the hall');assert.equal(r.record!.rows.at(-1)!.text,'long lines forward & back - ID next neighbors ⁋');assert.deepEqual(d.figures.map(f=>f.beats),[4,12,16,8,8,8,8]);assert.equal(d.figures[1].exit,'face-down-line');assert.equal(d.figures[2].hallTurn,'couples');assert.equal(d.figures[2].hallPairRelation,'neighbor');assert.deepEqual(readContraDbImport(d.sourceText!).dance,d);
 const removed=structuredClone(p.interpretation);delete removed.rows!['contradb:133:row:6'].nextNeighborQualifier;assert.equal(readContraDbImport(raw,{interpretation:removed}).dance,undefined);
 const wrong=structuredClone(p.interpretation);wrong.rows!['contradb:133:row:5'].chainReceiver='partner';assert.equal(readContraDbImport(raw,{interpretation:wrong}).dance,undefined);
 const snap=JSON.parse(raw);snap.html=snap.html.replace('ID <u>next neighbors</u>','ID <u>next neighbors</u> and move forward');assert.equal(readContraDbImport(JSON.stringify(snap),{interpretation:p.interpretation}).dance,undefined);
});
for(const couples of[3,4])test(`133 completes ${couples}-couple finite periods with correct named contacts`,()=>{
 const c=compileChoreography(reviewed().r.dance!,couples);let neighborFrames=0,partnerFrames=0,courtesies=0,minClearance=Infinity,maxSpeed=0;const encounters=new Set<string>();assert.ok(c.repeatable);
 for(let repeat=0;repeat<couples*2;repeat++){
  const base=repeat*64,first=c.sample(base),rows=c.dancers.filter(a=>a.role==='lark').sort((a,b)=>first.poses[a.id].position.z-first.poses[b.id].position.z),neighbor=new Map<number,number>(),partner=new Map(c.dancers.map(a=>[a.id,a.id%2?a.id-1:a.id+1]));
  for(let i=0;i<rows.length;){const a=rows[i],b=rows[i+1];if(b&&first.poses[a.id].position.x>0&&first.poses[b.id].position.x<0){neighbor.set(a.id,b.id+1);neighbor.set(b.id+1,a.id);neighbor.set(a.id+1,b.id);neighbor.set(b.id,a.id+1);encounters.add([a.couple,b.couple].sort((a,b)=>a-b).join(':'));i+=2;}else i++;}
  for(const local of[...c.starts,20,24,28,32,64]){if(base+local===0)continue;const a=c.sample(base+local-1e-7),b=c.sample(base+local);for(const p of b.poses){assert.ok(gap(p,a.poses[p.id])<1e-5);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-a.poses[p.id].yaw),Math.cos(p.yaw-a.poses[p.id].yaw)))<1e-5);}}
  let prior=first;for(let k=1;k<=4096;k++){const local=k/64,f=c.sample(base+local);for(const p of f.poses)maxSpeed=Math.max(maxSpeed,gap(p,prior.poses[p.id])*64);for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minClearance=Math.min(minClearance,gap(f.poses[a],f.poses[b]));for(const h of f.contacts){if(h.kind==='swing-frame'&&h.strength>.999){if(local>4&&local<16){assert.equal(neighbor.get(h.a),h.b);neighborFrames++;}if(local>40&&local<48){assert.equal(partner.get(h.a),h.b);partnerFrames++;}}if(h.kind==='courtesy'&&local>48&&local<56){assert.equal(neighbor.get(h.a),h.b);if(h.strength>.999)courtesies++;}}prior=f;}
 }
 assert.ok(neighborFrames>0&&partnerFrames>0&&courtesies>0);assert.equal(encounters.size,couples*(couples-1)/2);assert.ok(minClearance>.38);assert.ok(maxSpeed<2.4);for(const p of c.sample(0).poses){const q=c.sample(couples*2*64).poses[p.id];assert.ok(gap(p,q)<1e-8);assert.ok(Math.abs(Math.atan2(Math.sin(p.yaw-q.yaw),Math.cos(p.yaw-q.yaw)))<1e-8);}assert.deepEqual(c.sample(0).contacts,c.sample(couples*2*64).contacts);console.log(JSON.stringify({id:133,couples,minClearance,maxSpeed,neighborFrames,partnerFrames,courtesies}));
});
