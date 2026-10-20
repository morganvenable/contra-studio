import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Vector3} from 'three';
import {importContraDb,type ContraDbInterpretation} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import {Avatar,applyBodyContactAnchors} from './scene.ts';
import type {MotionCapabilities,StudioState} from './types.ts';

const snapshot=readFileSync(new URL('../test-data/contradb/3490.json',import.meta.url),'utf8');
const capabilities:MotionCapabilities={hallTravel:true};
const interpretation:ContraDbInterpretation={rows:{'contradb:3490:row:2':{hallPhaseBeats:[4,4,4,4]},'contradb:3490:row:7':{nextNeighborQualifier:'after-figure'}}};
const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const angle=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
function imported(){const r=importContraDb(snapshot,{interpretation,capabilities});assert.ok(r.dance,JSON.stringify(r.diagnostics));assert.equal(r.coverage.executable,true);return r;}

test('Forgotten Treasure retains all eight source rows, down-facing instruction and chain-to-new-neighbors progression',()=>{
 const r=imported(),d=r.dance!;assert.equal(d.title,'Forgotten Treasure');assert.equal(d.author,'Beth Parkes & Mike Head');assert.equal(r.rows.length,8);assert.ok(r.rows.every(row=>row.resolved));assert.equal(d.figures.reduce((n,f)=>n+f.beats,0),64);
 assert.deepEqual(d.figures.map(f=>[f.kind,f.beats]),[['balance',4],['swing',12],['hall-travel',16],['circle',8],['swing',8],['long-lines',8],['robins-chain',8]]);
 assert.match(d.sourceRows[1].text,/End facing down the hall\. Now with your neighbor go/);assert.equal(d.figures[1].who,'neighbor');assert.equal(d.figures[1].exit,'face-down-line');assert.equal(d.figures[2].hallTurn,'couples');assert.equal(d.figures[2].hallPairRelation,'neighbor');assert.deepEqual(d.figures[2].hallPhaseBeats,[4,4,4,4]);assert.equal(d.sourceRows[2].beats,8);assert.equal(d.sourceRows[3].beats,8);assert.deepEqual(r.rows[2].compound?.sourceRowIds,['contradb:3490:row:2','contradb:3490:row:3']);assert.deepEqual(r.rows[3].compound,r.rows[2].compound);assert.equal(r.rows[3].figures.length,0);
 assert.match(d.sourceRows[7].text,/chain to new neighbors/);assert.equal(d.figures[6].who,'neighbor');assert.equal(d.figures[6].progression,true);assert.equal(d.sourceRows[7].progression,true);
 const again=importContraDb(d.sourceText,{capabilities});assert.ok(again.dance);assert.equal(again.record!.original,r.record!.original);assert.deepEqual(again.dance.figures,d.figures);assert.equal(again.interpretation!.rows!['contradb:3490:row:7'].nextNeighborQualifier,'after-figure');assert.ok(again.warnings.some(w=>w.includes('current neighbors')&&w.includes('outgoing progression')));assert.equal(importContraDb(snapshot,{interpretation,capabilities:{hallTravel:false}}).dance,undefined);
 const unresolved=importContraDb(snapshot,{capabilities,interpretation:{rows:{'contradb:3490:row:2':{hallPhaseBeats:[4,4,4,4]}}}});assert.equal(unresolved.dance,undefined);assert.ok(unresolved.diagnostics.some(d=>d.code==='next-neighbor-chain-choice'));
 const conflict=importContraDb(snapshot,{capabilities,interpretation:{rows:{...interpretation.rows,'contradb:3490:row:7':{nextNeighborQualifier:'after-figure',chainReceiver:'partner'}}}});assert.equal(conflict.dance,undefined);assert.ok(conflict.diagnostics.some(d=>d.code==='chain-choice-conflict'));
});

test('Forgotten Treasure completes every 2–12-couple finite period with stable identities, same-end waits and continuous source boundaries',()=>{
 const dance=imported().dance!;
 for(let count=2;count<=12;count++){
  const c=compileChoreography(dance,count,capabilities),period=count*2*64,initial=c.sample(0);assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);assert.deepEqual(c.starts,[0,4,16,32,40,48,56]);
  const waitEnds=new Map<number,{end:number;seen:boolean}>();
  for(let beat=0;beat<=period;beat+=.5){const f=c.sample(beat),hands=new Set<string>();assert.deepEqual(f.poses.map(p=>p.id),c.dancers.map(d=>d.id));for(let a=0;a<f.poses.length;a++){const p=f.poses[a];assert.ok([p.position.x,p.position.z,p.yaw].every(Number.isFinite));for(let b=a+1;b<f.poses.length;b++)assert.ok(distance(p.position,f.poses[b].position)>.48,`${count} couples / ${beat} / ${a},${b}`);}for(let couple=0;couple<count;couple++){const a=f.poses[couple*2],b=f.poses[couple*2+1];if(a.activity==='waiting'&&b.activity==='waiting'){const end=Math.sign(a.position.z+b.position.z),previous=waitEnds.get(couple);if(previous?.seen)assert.equal(end,previous.end,`waiting couple crossed finite ends: ${count}/${beat}/${couple}`);waitEnds.set(couple,{end,seen:true});}else if(waitEnds.has(couple))waitEnds.get(couple)!.seen=false;}for(const h of f.contacts){const owners=[`${h.a}:${h.handA}`];if(!h.target||h.target==='hands')owners.push(`${h.b}:${h.handB}`);for(const owner of owners){assert.ok(!hands.has(owner),`duplicate named hand ${count}/${beat}/${owner}`);hands.add(owner);}}}
  for(let repeat=0;repeat<=2*count;repeat++)for(const local of[...c.starts,20,24,28]){const beat=repeat*64+local;if(!beat||beat>period)continue;const A=c.sample(beat-1e-6),B=c.sample(beat+1e-6);for(let id=0;id<count*2;id++){assert.ok(distance(A.poses[id].position,B.poses[id].position)<1e-4,`root boundary ${count}/${beat}/${id}`);assert.ok(angle(A.poses[id].yaw,B.poses[id].yaw)<1e-3,`facing boundary ${count}/${beat}/${id}`);}}
  const closed=c.sample(period);for(let id=0;id<count*2;id++)assert.ok(distance(initial.poses[id].position,closed.poses[id].position)<1e-6,`finite closure ${count}/${id}`);const expected=c.sample(24.25);c.sample(period-.5);assert.deepEqual(c.sample(24.25),expected);
 }
});

test('Forgotten Treasure distinguishes current-neighbor courtesy identity from the next-neighbor progression endpoint',()=>{
 // Beth Parkes's own 2008 calling notes specify an ordinary "chain across":
 // https://library.unh.edu/special/forms/rpdlw/syllabus2008.pdf, printed p40.
 // The retained ContraDB row instead says "to new neighbors". Its reviewed
 // interpretation must preserve that distinction rather than relabel actors.
 const c=compileChoreography(imported().dance!,6,capabilities),pairs=(beat:number,kind?:string)=>[...new Set(c.sample(beat).contacts.filter(h=>!kind||h.kind===kind).map(h=>[h.a,h.b].sort((a,b)=>a-b).join('/')))].sort();
 const old=['0/3','1/2','4/7','5/6','8/11','9/10'].sort(),next=['0/7','1/6','4/11','5/10'].sort();assert.deepEqual(pairs(0),old);assert.deepEqual(pairs(61,'courtesy'),old);assert.deepEqual(pairs(64),next);assert.ok(next.every(p=>!old.includes(p)));assert.deepEqual(c.sample(64).poses.filter(p=>p.activity==='waiting').map(p=>p.id),[2,3,8,9]);
 for(const frame of[c.sample(61),c.sample(64)])assert.deepEqual(frame.poses.map(p=>p.id),Array.from({length:12},(_,id)=>id));
});

test('Forgotten Treasure actual hall, incoming swing and outgoing circle keep fixed limbs, musical steps and continuous held wrists',()=>{
 globalThis.document={createElement:()=>({getContext:()=>new Proxy({},{get:()=>()=>{},set:()=>true})})} as unknown as Document;
 const dance=imported().dance!;
 for(const count of[2,6]){const c=compileChoreography(dance,count,capabilities),avatars=c.dancers.map(d=>new Avatar(d)),state={dance,showLabels:false} as StudioState;
  const update=(beat:number)=>{const f=c.sample(beat);for(const a of avatars){a.update(f.poses[a.dancer.id],f,state,b=>c.sample(b));const gait=a.root.userData.gait;assert.equal(gait.phase,beat);assert.equal(gait.maxRate,1);assert.equal(gait.steps,dance.figures[f.figureIndex].beats);assert.equal(gait.reachClamps,0,`new hall/handoff reach correction ${count}/${beat}/${a.dancer.id}`);}
   const corrected=applyBodyContactAnchors(avatars,f);for(const a of avatars){a.root.updateMatrixWorld(true);for(const leg of a.legs){assert.ok(Math.abs(leg.upper.scale.y*3-.43)<1e-7);assert.ok(Math.abs(leg.lower.scale.y*3-.43)<1e-7);}for(const arm of a.arms){assert.ok(Math.abs(arm.upper.scale.y*3-.325)<1e-7);assert.ok(Math.abs(arm.lower.scale.y*3-.325)<1e-7);}}
   for(const h of corrected.contacts)if(h.strength>=1-1e-10){const owners:[number,'left'|'right'][]=[[h.a,h.handA]];if(!h.target||h.target==='hands')owners.push([h.b,h.handB]);for(const[id,hand]of owners){const wrist=avatars[id].arms.find(a=>a.side===(hand==='left'?1:-1))!.hand.getWorldPosition(new Vector3());assert.ok(wrist.distanceTo(new Vector3(h.point.x,h.point.y,h.point.z))<1e-7,`held wrist ${count}/${beat}/${id}`);}}
   return avatars.flatMap(a=>[...a.arms.flatMap(p=>[p.hand,p.elbow]),...a.legs.flatMap(p=>[p.foot,p.knee])].map(p=>p.getWorldPosition(new Vector3())));
  };
  for(let i=14*120;i<42*120;i++)update(i/120);
  for(const beat of[16,20,24,28,32,40]){const before=update(beat-1e-5),after=update(beat+1e-5);for(let i=0;i<before.length;i++)assert.ok(before[i].distanceTo(after[i])<.002,`articulated join ${count}/${beat}/${i}`);}
  const A=c.sample(32-1e-6),B=c.sample(32+1e-6),key=(h:typeof A.contacts[number])=>[`${h.a}:${h.handA}`,`${h.b}:${h.handB}`].sort().join('/');assert.equal(A.contacts.length,2*count);assert.equal(B.contacts.length,A.contacts.length);for(const a of A.contacts){const b=B.contacts.find(b=>key(a)===key(b));assert.ok(b);assert.ok(a.strength>.99999&&b.strength>.99999);assert.ok(Math.hypot(a.point.x-b.point.x,a.point.y-b.point.y,a.point.z-b.point.z)<1e-5);}
  avatars.forEach(a=>a.dispose());
 }
});
