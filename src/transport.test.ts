import test from 'node:test';import assert from 'node:assert/strict';
import {BeatTransport,recordingPosition,recordingBeatLimit} from './transport.ts';
import {practiceReelNotes,synthesizePracticeReel,REEL_BEATS,REEL_BPM} from './music.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
test('one beat clock preserves phase across pause, tempo, speed, seek and audio clock migration',()=>{
 let time=0;const clock=new BeatTransport(()=>time);clock.setTempo(120);clock.play();time=2;near(clock.snapshot().beat,4);clock.pause();time=20;near(clock.snapshot().beat,4);clock.setTempo(60,2);clock.play();time=21;near(clock.snapshot().beat,6);clock.seek(32);time=22;near(clock.snapshot().beat,34);let audioTime=100;clock.useTimeSource(()=>audioTime);near(clock.snapshot().beat,34);audioTime=101;near(clock.snapshot().beat,36);
});
test('figure loops, exact stops and caller mutation cannot desynchronize the clock',()=>{
 let time=0;const clock=new BeatTransport(()=>time);clock.setTempo(120);const loop={start:4,end:16};clock.setLoop(loop);loop.end=999;clock.play();time=6;near(clock.snapshot().beat,4);time=7;near(clock.snapshot().beat,6);clock.setLoop(null);clock.setStopBeat(8);time=8;near(clock.snapshot().beat,8);assert.equal(clock.snapshot().playing,false);time=100;near(clock.snapshot().beat,8);assert.throws(()=>clock.setTempo(NaN),/range/);assert.throws(()=>clock.seek(Infinity),/finite/);
});
test('recording alignment is an explicit manual grid and rejects invalid offsets',()=>{
 near(recordingPosition(64,{bpm:120,offsetSeconds:3.5}),35.5);near(recordingBeatLimit(35.5,{bpm:120,offsetSeconds:3.5}),64);assert.throws(()=>recordingBeatLimit(3,{bpm:120,offsetSeconds:4}),/inside/);
});
test('original practice reel has exact AABB melodic phrases, subdivisions, bass and chords',()=>{
 const notes=practiceReelNotes();assert.equal(REEL_BEATS,64);assert.ok(notes.every(n=>n.beat>=0&&n.beat+n.duration<=64));
 const melody=(start:number)=>notes.filter(n=>n.voice==='lead'&&n.beat>=start&&n.beat<start+16).map(n=>({midi:n.midi,beat:n.beat-start}));
 assert.equal(melody(0).length,64);assert.deepEqual(melody(0),melody(16));assert.deepEqual(melody(32),melody(48));assert.notDeepEqual(melody(0),melody(32));assert.ok(notes.some(n=>n.voice==='bass'));assert.ok(notes.some(n=>n.voice==='chord'));
 const pcm=synthesizePracticeReel(8000);near(pcm.duration,64*60/REEL_BPM);let sum=0,peak=0;for(const n of pcm.channels[0]){assert.ok(Number.isFinite(n));sum+=n*n;peak=Math.max(peak,Math.abs(n));}assert.ok(peak<=.721);assert.ok(Math.sqrt(sum/pcm.channels[0].length)>.03);assert.equal(pcm.channels[0][0],0);assert.equal(pcm.channels[0].at(-1),0);
});

test('output-time queries preserve old tempo, seek and loop segments without moving the render clock',()=>{
 let time=10;const c=new BeatTransport(()=>time);c.setTempo(120);c.play();time=11;c.setTempo(60);near(c.snapshotAt(10.9).beat,1.8);near(c.snapshotAt(11.1).beat,2.1);
 time=12;c.seek(32);near(c.snapshotAt(11.9).beat,2.9);near(c.snapshotAt(12.1).beat,32.1);near(c.snapshot().beat,32);
 time=13;c.setLoop({start:32,end:36});near(c.snapshotAt(12.9).beat,32.9);near(c.snapshotAt(16.2).beat,32.2);
 time=14;c.pause();assert.equal(c.snapshotAt(13.9).playing,true);assert.equal(c.snapshotAt(14).playing,false);
});
test('natural stops retain the last audible interval even after a late render frame detects the end',()=>{
 let time=0;const c=new BeatTransport(()=>time);c.setTempo(120);c.setStopBeat(4);c.play();time=3;assert.equal(c.snapshot().playing,false);near(c.snapshot().beat,4);near(c.snapshotAt(1.9).beat,3.8);assert.equal(c.snapshotAt(1.9).playing,true);assert.equal(c.snapshotAt(2).playing,false);
});
