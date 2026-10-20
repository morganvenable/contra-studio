/** Whole reviewed-source timing guard. Explicitly reviewed moving handoffs
 * are bounded within their source swing; an unclassified delay is rejected. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {REVIEWED_SOURCE_IDS} from './source-library.ts';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import type {Frame} from './types.ts';
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
const angle=(frame:Frame,a:number,b:number)=>Math.atan2(frame.poses[a].position.z-frame.poses[b].position.z,frame.poses[a].position.x-frame.poses[b].position.x);
const edges=(frame:Frame,a:number,b:number)=>frame.contacts.filter(h=>h.kind==='swing-frame'&&(h.a===a&&h.b===b||h.a===b&&h.b===a));
test('every reviewed swing has a bounded, truthfully acquired frame and musical transition across all finite repeats',()=>{
 let checked=0,prepared=0,connecting=0,wave=0,pullByConnecting=0;
 for(const id of REVIEWED_SOURCE_IDS){
  const raw=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8');
  const imported=id==='94'?readContraDbImport(raw,{interpretation:{circulation:'cw',rows:{'contradb:94:row:4':{chainReceiver:'partner'},'contradb:94:row:6':{balanceBeats:4}}}}):prepareContraDbReview(raw).result;
  assert.ok(imported.dance,`${id}: ${JSON.stringify(imported.errors)}`);const dance=imported.dance;
  for(const couples of[3,6]){
   const c=compileChoreography(dance,couples);
   for(let repeat=0;repeat<2*couples;repeat++)for(const[fi,figure]of dance.figures.entries()){
    if(figure.kind!=='swing')continue;
    const previous=dance.figures[fi-1],at=repeat*c.totalBeats+c.starts[fi],start=c.sample(at),settled=c.sample(at+Math.min(3,figure.beats*.4)),seen=new Set<number>();
    // These are semantic transition contracts, never source-ID exemptions.
    // The existing eight-count do-si-do/swing ingress connects over 1.12 counts
    // and acquires its frame by 1.6. The short-wave exit rotates immediately
    // while closing a horizontal pair into the frame over 1.5 counts.
    const inwardConnection=previous?.kind==='do-si-do'&&figure.entry===undefined;
    // The reviewed four-count larks-left pull-by finishes at exact corner
    // slots. Its twelve-count partner swing connects over 1.68 counts and
    // acquires the full frame by 2.4, inside the unchanged source interval.
    const pullByConnection=previous?.kind==='pull-by'&&previous.who==='larks'&&previous.hands==='left'&&previous.beats===4&&!previous.progression&&figure.who==='partner'&&figure.beats===12&&!figure.progression&&figure.entry===undefined&&figure.exit===undefined;
    if(pullByConnection){assert.equal(c.totalBeats,64);assert.equal(c.starts[fi+1]-c.starts[fi],12,'The connecting step cannot add musical counts.');}
    const waveConnection=previous?.kind==='allemande'&&previous.entry==='short-wave'&&previous.exit==='partner-swing'&&figure.entry==='short-wave-partners';
    if(inwardConnection)assert.equal(figure.beats,8,'A longer unprepared swing requires review instead of scaling its gathering delay.');
    const fullAt=inwardConnection?1.6:waveConnection?1.5:pullByConnection?2.4:0,turnAt=inwardConnection?1.25:pullByConnection?2:.25;
    for(const p of start.poses){
     if(p.activity!=='swing'||seen.has(p.id))continue;
     const hold=settled.contacts.find(h=>h.kind==='swing-frame'&&(h.a===p.id||h.b===p.id));
     assert.ok(hold,`${id}/${couples}/${at}/${p.id}: no actual settled swing pair`);
     const other=hold.a===p.id?hold.b:hold.a;seen.add(p.id);seen.add(other);
     assert.equal(c.dancers[p.id].couple===c.dancers[other].couple,figure.who==='partner',`${id}/${at}: source relationship`);
     const label=`${id}/${couples}/${at}/${p.id}-${other}`;
     const full=edges(c.sample(at+fullAt),p.id,other);
     assert.equal(full.length,3,`${label}: complete joined/back/support frame`);
     assert.ok(full.every(h=>h.strength>=1-1e-8),`${label}: full frame by ${fullAt}`);
     const turned=c.sample(at+turnAt),rotation=Math.abs(wrap(angle(turned,p.id,other)-angle(start,p.id,other)));
     assert.ok(rotation>(inwardConnection?.005:pullByConnection?.03:.05),`${label}: no unreviewed angular dead time, measured ${rotation}`);
     if(inwardConnection||pullByConnection){const a=start.poses[p.id].position,b=start.poses[other].position,mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2},q=c.sample(at+.5).poses[p.id].position;assert.ok(Math.hypot(q.x-mid.x,q.z-mid.z)<Math.hypot(a.x-mid.x,a.z-mid.z)-.05,`${label}: ingress must move into connection`);assert.equal(edges(start,p.id,other).length,0,`${label}: do not invent an already-held frame`);if(pullByConnection){
       for(const local of[3,6,8.4]){const held=edges(c.sample(at+local),p.id,other);assert.equal(held.length,3,`${label}: full frame in middle of swing`);assert.ok(held.every(h=>h.strength>=1-1e-8));}
       let last=angle(c.sample(at+2.4),p.id,other),sweep=0;for(let step=1;step<=24;step++){const next=angle(c.sample(at+2.4+step*.25),p.id,other);sweep+=wrap(next-last);last=next;}assert.ok(sweep>Math.PI,`${label}: held middle must actually swing`);pullByConnecting++;
      }else connecting++;}
     else if(waveConnection){assert.ok(edges(start,p.id,other).every(h=>h.strength<1),`${label}: wave handoff must retain gradual acquisition`);wave++;}else prepared++;
     checked++;
    }
   }
  }
 }
 assert.ok(checked>7000);assert.ok(prepared>0&&connecting>0&&wave>0&&pullByConnecting>0);
 console.log(JSON.stringify({checked,prepared,inwardConnections:connecting,rotatingWaveConnections:wave,pullByConnections:pullByConnecting}));
});
