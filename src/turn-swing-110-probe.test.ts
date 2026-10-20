import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbImport} from './contradb-import.ts';
import {createDancers,initialPoses,compilePrimitiveFigure} from './engine.ts';
import type {Figure} from './types.ts';
const smooth=(t:number)=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
test('retained 110 collapses only the literal expanded swing basis; actual held-radius endpoints remain distinct',t=>{
 const r=readContraDbImport(readFileSync(new URL('../test-data/contradb/110.json',import.meta.url),'utf8'));
 assert.equal(r.record!.snapshotId,'contradb:110:9c3093c28056616f');assert.equal(r.dance,undefined);
 const f=r.rows[0].figures[0];assert.deepEqual([f.kind,f.who,f.amount,f.beats],['allemande','robins',.75,6]);
 const dancers=createDancers(2),start=initialPoses(dancers),ids=[0,1,2,3],directions=[1,-1];
 assert.throws(()=>compilePrimitiveFigure(f,ids,start,dancers,directions,{circleExit:'neighbor'}),/degenerate named swing frame/);
 const expanded=compilePrimitiveFigure(f,ids,start,dancers,directions),held=compilePrimitiveFigure(f,ids,start,dancers,directions,{heldAllemandeExit:true});
 const pairs=[[0,3],[2,1]],dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
 const expandedEnds=ids.map(id=>expanded.position(id,1)),heldEnds=ids.map(id=>held.position(id,1));
 for(const[a,b]of pairs){assert.ok(dist(expandedEnds[a],expandedEnds[b])<1e-12);assert.ok(Math.abs(dist(heldEnds[a],heldEnds[b])-.7227922061357856)<1e-12);}
 // Analysis-only candidate: derive the final swing basis from actual held roots,
 // retaining the existing one-count preparation window. No engine changes.
 const targets=heldEnds.map(p=>({...p}));
 for(const[a,b]of pairs){const mid={x:(heldEnds[a].x+heldEnds[b].x)/2,z:(heldEnds[a].z+heldEnds[b].z)/2},center={x:Math.sign(mid.x)*.9,z:mid.z};for(const id of[a,b])targets[id]={x:center.x,z:center.z+Math.sign(heldEnds[id].z-mid.z)*.31};}
 const position=(id:number,beat:number)=>{const raw=held.position(id,beat/6),u=smooth(beat-5);return{x:raw.x+(targets[id].x-raw.x)*u,z:raw.z+(targets[id].z-raw.z)*u};};
 let minimumClearance=Infinity,maximumSpeed=0;for(let n=0;n<=720;n++){const beat=n/120;for(const id of ids){const p=position(id,beat);for(const other of ids.filter(j=>j>id))minimumClearance=Math.min(minimumClearance,dist(p,position(other,beat)));if(n)maximumSpeed=Math.max(maximumSpeed,dist(p,position(id,(n-1)/120))*120);}}
 assert.ok(minimumClearance>.5);assert.ok(maximumSpeed<1.5);
 const entry=start.map(p=>{const other=pairs.find(pair=>pair.includes(p.id))!.find(id=>id!==p.id)!,center={x:(targets[p.id].x+targets[other].x)/2,z:(targets[p.id].z+targets[other].z)/2};return{...p,position:targets[p.id],yaw:Math.atan2(center.x-targets[p.id].x,center.z-targets[p.id].z)+Math.PI/3};});
 const swing:Figure=r.rows[1].figures[0],next=compilePrimitiveFigure(swing,ids,entry,dancers,directions,{swingEntry:'prepared-circle'});
 for(const id of ids)assert.ok(dist(next.position(id,0),targets[id])<1e-12);
 // Independent semantic audit: a clear corridor alone does not prove the
 // authored three-quarter hand turn. Measure winding around the actual turn
 // center while applying the candidate roots to the inherited raw contacts.
 const center={x:(start[1].position.x+start[3].position.x)/2,z:(start[1].position.z+start[3].position.z)/2};
 const angle=(p:{x:number;z:number})=>Math.atan2(p.z-center.z,p.x-center.x),wrap=(a:number)=>Math.atan2(Math.sin(a),Math.cos(a));
 const contactsAt=(beat:number)=>{const poses=start.map(p=>({...p,position:position(p.id,beat)}));return held.contacts(beat/6,poses);};
 let winding=0,lastHeldBeat=0,lastHeldTurns=0,reachedAuthoredBeat=0,contactStrengthAtAuthoredTurn=0;
 for(let n=1;n<=720;n++){
  const beat=n/120;winding+=wrap(angle(position(1,beat))-angle(position(1,(n-1)/120)));
  const contacts=contactsAt(beat);
  if(contacts.length){lastHeldBeat=beat;lastHeldTurns=winding/(2*Math.PI);}
  if(!reachedAuthoredBeat&&winding>=2*Math.PI*.75){reachedAuthoredBeat=beat;contactStrengthAtAuthoredTurn=Math.max(0,...contacts.map(c=>c.strength));}
 }
 const candidateTurns=winding/(2*Math.PI);
 assert.ok(Math.abs(candidateTurns-.818372584386471)<1e-10,'candidate adds angular travel beyond the authored three-quarter turn');
 assert.ok(lastHeldTurns>.81,'inherited same-role hold remains after the authored turn is reached');
 assert.ok(reachedAuthoredBeat<lastHeldBeat&&contactStrengthAtAuthoredTurn>.1);
 assert.deepEqual(contactsAt(6),[]);
 assert.ok(next.contacts(0,entry).length>0,'consumer begins held; root-only candidate has not supplied matching incoming swing contacts');
 t.diagnostic(JSON.stringify({expandedEnds,heldEnds,targets,minimumClearance,maximumSpeed,candidateTurns,reachedAuthoredBeat,contactStrengthAtAuthoredTurn,lastHeldBeat,lastHeldTurns,scope:'root-only candidate; winding/contact audit rejects using inherited contacts as a complete figure fix; facing, repeat/finite ends unproven'}));
});
