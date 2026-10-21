/** Whole reviewed-source timing guard. Explicitly reviewed moving handoffs
 * are bounded within their source swing; an unclassified delay is rejected. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {READY_LIBRARY} from './ready-library.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import {assertSequenceHandoff} from './sequence-boundary.ts';
import type {SequenceStepProof} from './engine.ts';
import type {Frame} from './types.ts';
const wrap=(x:number)=>Math.atan2(Math.sin(x),Math.cos(x));
const angle=(frame:Frame,a:number,b:number)=>Math.atan2(frame.poses[a].position.z-frame.poses[b].position.z,frame.poses[a].position.x-frame.poses[b].position.x);
const edges=(frame:Frame,a:number,b:number)=>frame.contacts.filter(h=>h.kind==='swing-frame'&&(h.a===a&&h.b===b||h.a===b&&h.b===a));
test('every reviewed swing has a bounded, truthfully acquired frame and musical transition across all finite repeats',()=>{
 let checked=0,prepared=0,connecting=0,wave=0,pullByConnecting=0,activeConnecting=0,releasedConnecting=0,hallConnecting=0;
 for(const {id,archive} of READY_LIBRARY){
  // Exercise the actual saved review, including removable choices that cannot
  // safely be inferred again from an unreviewed source snapshot.
  const imported=readContraDbImport(archive);
  assert.ok(imported.dance,`${id}: ${JSON.stringify(imported.errors)}`);const dance=imported.dance;
  for(const couples of[3,6]){
   const c=compileChoreography(dance,couples) as ReturnType<typeof compileChoreography>&{sequenceBoundaries?:(repeat:number)=>readonly SequenceStepProof[]};
   for(let repeat=0;repeat<2*couples;repeat++)for(const[fi,figure]of dance.figures.entries()){
    if(figure.kind!=='swing')continue;
    const previous=dance.figures[fi-1],at=repeat*c.totalBeats+c.starts[fi],start=c.sample(at),settled=c.sample(at+Math.min(3,figure.beats*.4)),seen=new Set<number>();
    const releasedProofs=c.sequenceBoundaries?.(repeat).filter(proof=>proof.figureId===figure.id&&proof.adapterId==='released-pair-swing')??[];
    for(const proof of releasedProofs){assert.equal(proof.contactPolicy,'strict-carried');assertSequenceHandoff(proof.incoming,proof.entry);assert.deepEqual(proof.incoming.heldContacts,[]);assert.deepEqual(proof.entry.heldContacts,[]);assert.equal(proof.exit.sourceBeat-proof.entry.sourceBeat,figure.beats);}
    // These are semantic transition contracts, never source-ID exemptions.
    // The existing eight-count do-si-do/swing ingress connects over 1.12 counts
    // and acquires its frame by 1.6. The short-wave exit rotates immediately
    // while closing a horizontal pair into the frame over 1.5 counts.
    const next=dance.figures[fi+1];
    // The established hall entry also has an actual released inward approach:
    // long lines return before this eight-count swing, which must finish down
    // the hall with the same explicitly named pair. Preserve its existing
    // 1.12-count approach and 1.6-count frame, rather than asserting a held
    // frame at source count zero.
    const hallConnection=previous?.kind==='long-lines'&&figure.beats===8&&figure.entry===undefined&&figure.exit==='face-down-line'&&!figure.progression&&next?.kind==='hall-travel'&&next.entry==='paired-sidelines-facing-down'&&next.hallPairRelation===figure.who&&JSON.stringify(next.hallPhaseBeats)==='[4,4,4,4]';
    const legacyInwardConnection=(previous?.kind==='do-si-do'||hallConnection)&&figure.entry===undefined;
    // The reviewed four-count larks-left pull-by finishes at exact corner
    // slots. Its twelve-count partner swing connects over 1.68 counts and
    // acquires the full frame by 2.4, inside the unchanged source interval.
    const legacyPullByConnection=previous?.kind==='pull-by'&&previous.who==='larks'&&previous.hands==='left'&&previous.beats===4&&!previous.progression&&figure.who==='partner'&&figure.beats===12&&!figure.progression&&figure.entry===undefined&&figure.exit===undefined;
    const waveConnection=previous?.kind==='allemande'&&previous.entry==='short-wave'&&previous.exit==='partner-swing'&&figure.entry==='short-wave-partners';
    // Current ones swing persistent partners after the registered 1.25-count
    // approach. This rank selection does not turn their partners into neighbors.
    const activeConnection=figure.who==='ones';
    if(activeConnection){assert.equal(figure.beats,8);assert.ok(figure.exit==='face-down-line'||figure.exit==='progressed-neighbors');}
    for(const p of start.poses){
     if(p.activity!=='swing'||seen.has(p.id))continue;
     const hold=settled.contacts.find(h=>h.kind==='swing-frame'&&(h.a===p.id||h.b===p.id));
     assert.ok(hold,`${id}/${couples}/${at}/${p.id}: no actual settled swing pair`);
     const other=hold.a===p.id?hold.b:hold.a;seen.add(p.id);seen.add(other);
     const releasedProof=releasedProofs.find(proof=>proof.entry.actors.some(actor=>actor.id===p.id)&&proof.entry.actors.some(actor=>actor.id===other)),releasedConnection=!!releasedProof;
     if(releasedProof){assert.ok(figure.who==='partner'||figure.who==='neighbor');assert.equal(new Map(figure.who==='partner'?releasedProof.entry.partner:releasedProof.entry.neighbor).get(p.id),other,'Released swing retains the actual named relationship.');}
     const inwardConnection=legacyInwardConnection&&!releasedConnection,pullByConnection=legacyPullByConnection&&!releasedConnection;
     if(inwardConnection)assert.equal(figure.beats,8,'A longer unprepared swing requires review instead of scaling its gathering delay.');
     if(pullByConnection){assert.equal(c.totalBeats,64);assert.equal(c.starts[fi+1]-c.starts[fi],12,'The connecting step cannot add musical counts.');}
     const fullAt=releasedConnection?1.75:inwardConnection?1.6:waveConnection?1.5:pullByConnection?2.4:activeConnection?1.25:0,turnAt=releasedConnection?.25:inwardConnection?1.25:pullByConnection?2:activeConnection?1.75:.25;
     assert.equal(c.dancers[p.id].couple===c.dancers[other].couple,figure.who==='partner'||activeConnection,`${id}/${at}: source relationship`);
     const label=`${id}/${couples}/${at}/${p.id}-${other}`;
     const full=edges(c.sample(at+fullAt),p.id,other);
     assert.equal(full.length,3,`${label}: complete joined/back/support frame`);
     assert.ok(full.every(h=>h.strength>=1-1e-8),`${label}: full frame by ${fullAt}`);
     const turned=c.sample(at+turnAt),rotation=Math.abs(wrap(angle(turned,p.id,other)-angle(start,p.id,other)));
     assert.ok(rotation>(inwardConnection?.005:pullByConnection?.03:.05),`${label}: no unreviewed angular dead time, measured ${rotation}`);
     if(inwardConnection||pullByConnection){const a=start.poses[p.id].position,b=start.poses[other].position,mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2},q=c.sample(at+.5).poses[p.id].position;assert.ok(Math.hypot(q.x-mid.x,q.z-mid.z)<Math.hypot(a.x-mid.x,a.z-mid.z)-.05,`${label}: ingress must move into connection`);assert.equal(edges(start,p.id,other).length,0,`${label}: do not invent an already-held frame`);if(pullByConnection){
       for(const local of[3,6,8.4]){const held=edges(c.sample(at+local),p.id,other);assert.equal(held.length,3,`${label}: full frame in middle of swing`);assert.ok(held.every(h=>h.strength>=1-1e-8));}
       let last=angle(c.sample(at+2.4),p.id,other),sweep=0;for(let step=1;step<=24;step++){const next=angle(c.sample(at+2.4+step*.25),p.id,other);sweep+=wrap(next-last);last=next;}assert.ok(sweep>Math.PI,`${label}: held middle must actually swing`);pullByConnecting++;
      }else{connecting++;if(hallConnection){hallConnecting++;const exit=c.sample(at+figure.beats);for(const actor of[p.id,other])assert.ok(Math.abs(wrap(exit.poses[actor].yaw))<1e-7,`${label}: hall entry must actually face down`);}}}
     else if(releasedConnection){
      assert.equal(edges(start,p.id,other).length,0,`${label}: released spiral cannot invent an initial frame`);
      const a=start.poses[p.id].position,b=start.poses[other].position,mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2},q=c.sample(at+.5).poses[p.id].position;
      assert.ok(Math.hypot(q.x-mid.x,q.z-mid.z)<Math.hypot(a.x-mid.x,a.z-mid.z)-.05,`${label}: released spiral must close while already turning`);
      releasedConnecting++;
     }else if(activeConnection){
      assert.equal(edges(start,p.id,other).length,0,`${label}: active partners begin without an invented frame`);
      const a=start.poses[p.id].position,b=start.poses[other].position,mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2},q=c.sample(at+.5).poses[p.id].position;
      assert.ok(Math.hypot(q.x-mid.x,q.z-mid.z)<Math.hypot(a.x-mid.x,a.z-mid.z)-.05,`${label}: active partners approach within their source swing`);
      assert.equal(edges(c.sample(at+6.5),p.id,other).length,0,`${label}: active frame releases before final preparation`);
      activeConnecting++;
     }else if(waveConnection){assert.ok(edges(start,p.id,other).every(h=>h.strength<1),`${label}: wave handoff must retain gradual acquisition`);wave++;}else prepared++;
     checked++;
    }
   }
  }
 }
 assert.ok(checked>7000);assert.ok(prepared>0&&connecting>0&&wave>0&&pullByConnecting>0&&activeConnecting>0&&releasedConnecting>0);
 console.log(JSON.stringify({checked,prepared,inwardConnections:connecting,hallConnections:hallConnecting,rotatingWaveConnections:wave,pullByConnections:pullByConnecting,activeConnections:activeConnecting,releasedConnections:releasedConnecting}));
});
