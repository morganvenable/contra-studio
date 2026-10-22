import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import type {CompiledStateSequence} from './state-sequence.ts';
const raw=readFileSync(new URL('../test-data/contradb/3261.json',import.meta.url),'utf8');
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const turn=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function reviewed(){const p=prepareContraDbReview(raw);assert.ok(p.result.dance,p.result.errors.join('; '));return p;}
test('3261 preserves explicit across route, exact role/shoulders and removable conventions',()=>{
 const p=reviewed(),r=p.result,d=r.dance!;
 const saved=readFileSync(new URL('../test-data/reviewed-interpretations/3261.json',import.meta.url),'utf8');assert.deepEqual(JSON.parse(saved).snapshot,JSON.parse(raw));assert.deepEqual(readContraDbImport(saved).dance,d);
 assert.deepEqual(d.figures.map(f=>f.beats),[4,4,8,8,8,8,8,8,6,2]);
 assert.deepEqual(r.record!.rows.map(q=>q.beats),[8,8,8,8,8,8,8,6,2]);
 assert.deepEqual(r.record!.rows.filter(q=>q.progression).map(q=>q.index),[8]);
 assert.equal(r.record!.rows[6].text,'partners promenade across');
 assert.equal(d.figures[7].promenadeRoute,'across-set');
 assert.deepEqual([d.figures[2].who,d.figures[2].heyStartRole,d.figures[2].centerShoulder,d.figures[2].endShoulder,d.figures[2].exit],['neighbor','lark','left','right','opposite-slots-facing-across']);
 assert.deepEqual(d.figures.filter(f=>f.kind==='robins-chain').map(f=>f.who),['neighbor','partner']);
 for(const [row,key]of [[1,'ordinaryHey'],[6,'promenade']]as const){const interpretation=structuredClone(p.interpretation);delete interpretation.rows![`contradb:3261:row:${row}`][key];assert.equal(readContraDbImport(raw,{interpretation}).dance,undefined);const remembered=prepareContraDbReview(raw,[{sourceSnapshotId:r.record!.snapshotId,interpretation}]);assert.equal(remembered.result.dance,undefined);assert.deepEqual(remembered.interpretation,interpretation);}
 const altered=JSON.parse(raw);altered.html=altered.html.replace('partners promenade across','partners promenade along');assert.equal(prepareContraDbReview(JSON.stringify(altered)).result.dance,undefined);
 const renamed=JSON.parse(raw);renamed.html=renamed.html.replace('Opus 4.6.10','Independent composition probe');const renamedResult=prepareContraDbReview(JSON.stringify(renamed));assert.ok(renamedResult.result.dance,renamedResult.result.errors.join('; '));compileChoreography(renamedResult.result.dance,3);
});
for(const couples of[3,4])test(`3261 actual ${couples}-couple period preserves people, contacts and carried endpoints`,()=>{
 const p=compileChoreography(reviewed().result.dance!,couples)as CompiledStateSequence,period=2*couples,partners=p.topology(0).partners;assert.equal(p.periodRepeats,period);
 let heys=0,maxSpeed=0,maxYaw=0,maxHeyYaw=0,minGap=Infinity,promenadeContacts=0;let order=Array.from({length:couples},(_,i)=>i);const direction=order.map(i=>i%2?-1:1);
 for(let repeat=0;repeat<period;repeat++){
  const base=repeat*64,proofs=p.sequenceBoundaries(repeat),top=p.topology(base);
  const neighbors=new Map<number,number>(),waiting:number[]=[],next=[...order];for(let rank=0;rank<couples;){const a=order[rank],b=order[rank+1];if(b!==undefined&&direction[a]===1&&direction[b]===-1){for(const[x,y]of [[2*a,2*b+1],[2*a+1,2*b]]){neighbors.set(x,y);neighbors.set(y,x);}next[rank]=b;next[rank+1]=a;rank+=2;}else{assert.ok(rank===0||rank===couples-1);waiting.push(2*a,2*a+1);direction[a]*=-1;rank++;}}
  const nextNeighbors=new Map<number,number>();for(let rank=0;rank<couples-1;rank++){const a=next[rank],b=next[rank+1];if(direction[a]===1&&direction[b]===-1)for(const[x,y]of[[2*a,2*b+1],[2*a+1,2*b]]){nextNeighbors.set(x,y);nextNeighbors.set(y,x);}}
  assert.equal(top.neighbors.length*2,neighbors.size);for(const[a,b]of top.neighbors)assert.equal(b,neighbors.get(a));assert.deepEqual([...top.waitingIds].sort((a,b)=>a-b),waiting.sort((a,b)=>a-b));
  assert.equal(top.epoch,repeat);assert.equal(p.topology(base+64-1e-8).epoch,repeat);assert.equal(p.topology(base+64).epoch,repeat+1);assert.deepEqual(top.partners,partners);
  for(const h of proofs.filter(q=>q.adapterId==='neutral-half-hey')){
   heys++;assert.equal(h.contactPolicy,'strict-carried');assertSequenceHandoff(h.incoming,h.entry);assert.deepEqual([h.entry.sourceBeat,h.exit.sourceBeat],[8,16]);assert.equal(h.exit.relationshipEpoch,repeat);assert.deepEqual(h.entry.actors,h.exit.actors);assert.deepEqual(h.entry.neighbor,h.exit.neighbor);assert.deepEqual(h.entry.partner,h.exit.partner);assert.deepEqual(h.exit.heldContacts,[]);
   const roles=new Map(h.entry.actors.map(q=>[q.id,q.role]));for(const pose of h.exit.poses){const station=h.entry.poses.find(q=>gap(q.position,pose.position)<1e-8);assert.ok(station);assert.notEqual(station.id,pose.id);assert.equal(roles.get(station.id),roles.get(pose.id));}
  }
  for(const local of [...p.starts,64]){if(!base&&!local)continue;const a=p.sample(base+local-1e-7),b=p.sample(base+local);for(const q of b.poses){assert.ok(gap(q.position,a.poses[q.id].position)<2e-5,`root ${repeat}/${local}/${q.id}`);assert.ok(turn(q.yaw,a.poses[q.id].yaw)<2e-5,`yaw ${repeat}/${local}/${q.id}`);}}
  for(const [local,relation,kind]of[[29,'partners','swing-frame'],[38,'neighbors','courtesy'],[46,'partners','courtesy']]as const){const pairs=new Set((relation==='partners'?Array.from({length:couples},(_,i)=>[2*i,2*i+1]):[...neighbors]).map(([a,b])=>`${Math.min(a,b)}:${Math.max(a,b)}`));const contacts=p.sample(base+local).contacts.filter(c=>c.kind===kind&&c.strength>.99);assert.ok(contacts.length>0);for(const c of contacts)assert.ok(pairs.has(`${Math.min(c.a,c.b)}:${Math.max(c.a,c.b)}`),`${local} wrong ${relation}`);}
  const dt=1/64;let prior=p.sample(base);for(let local=dt;local<=64;local+=dt){const current=p.sample(base+local);for(const q of current.poses){maxSpeed=Math.max(maxSpeed,gap(q.position,prior.poses[q.id].position)/dt);maxYaw=Math.max(maxYaw,turn(q.yaw,prior.poses[q.id].yaw)/dt);if(local>8&&local<=16)maxHeyYaw=Math.max(maxHeyYaw,turn(q.yaw,prior.poses[q.id].yaw)/dt);}for(let a=0;a<current.poses.length;a++)for(let b=a+1;b<current.poses.length;b++)minGap=Math.min(minGap,gap(current.poses[a].position,current.poses[b].position));for(const c of current.contacts.filter(c=>c.strength>1e-8)){if(local<62)assert.ok(!waiting.includes(c.a)&&!waiting.includes(c.b));else if(local>=62){assert.equal(c.b,nextNeighbors.get(c.a),'late balance contact uses independently predicted next neighbor');assert.equal(p.topology(base+local).epoch,repeat+Number(local===64),'physical acquisition does not rebind before endpoint');}if(local>48&&local<56){assert.equal(c.b,c.a^1);if(c.strength>.99)promenadeContacts++;}}prior=current;}
  order=next;
 }
 assert.ok(heys>0);assert.ok(maxSpeed<2);assert.ok(maxHeyYaw<4);assert.ok(promenadeContacts>0);assert.ok(minGap>.5);assert.deepEqual(p.sample(period*64).poses,p.sample(0).poses);assert.deepEqual(p.sample(period*64).contacts,p.sample(0).contacts);
 console.log(JSON.stringify({source:3261,couples,maxSpeed,maxYaw,maxHeyYaw,minGap,promenadeContacts,scope:'whole-period logical motion, no body/GPU/audio certification'}));
});



