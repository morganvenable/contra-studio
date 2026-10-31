import test from 'node:test';
import assert from 'node:assert/strict';
import {BeatTransport,recordingBeatAt,recordingBeatLimit,recordingPosition} from './transport.ts';
import type {RecordingGrid} from './transport.ts';

// A player who speeds up: beats 0.5 s apart, then 0.4 s apart.
const beatTimes=[0,.5,1,1.5,2,2.4,2.8,3.2,3.6,4];
const grid:RecordingGrid={bpm:120,offsetSeconds:1,beatTimes};

test('a beat map puts each dance beat on the beat the recording plays',()=>{
  assert.equal(recordingPosition(0,grid),1,'dance beat 0 on the tracked beat nearest the first downbeat');
  assert.equal(recordingPosition(1,grid),1.5);
  assert.ok(Math.abs(recordingPosition(3.5,grid)-2.6)<1e-9,'between beats, in proportion');
  assert.ok(Math.abs(recordingPosition(9,grid)-4.8)<1e-9,'past the last beat, at the last spacing');
  for(const b of [0,.25,1,2.5,3.7,7.9,9])assert.ok(Math.abs(recordingBeatAt(recordingPosition(b,grid),grid)-b)<1e-9,`round trip at ${b}`);
  assert.ok(Math.abs(recordingBeatLimit(4,grid)-7)<1e-9,'the recording ends on dance beat 7');
});

test('the clock follows the beat map: the dance speeds up with the player',()=>{
  let now=0;const clock=new BeatTransport(()=>now);
  clock.setTempo(120,1);
  clock.setWarp({bpm:120,toSeconds:b=>recordingPosition(b,grid),toBeat:s=>recordingBeatAt(s,grid)});
  clock.play();
  now=.5;assert.ok(Math.abs(clock.snapshot().beat-1)<1e-9,'half a second: one beat at 0.5 s a beat');
  now=1.4;assert.ok(Math.abs(clock.snapshot().beat-3)<1e-9,'then 0.4 s a beat');
  clock.setTempo(120,.5);now=2.2;assert.ok(Math.abs(clock.snapshot().beat-4)<1e-9,'half speed: the recording plays half as fast, the beats follow it');
  clock.setWarp(null);now=2.7;assert.ok(Math.abs(clock.snapshot().beat-4.5)<1e-9,'no map: a steady 120 bpm at half speed');
});
