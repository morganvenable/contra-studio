import test from 'node:test';import assert from 'node:assert/strict';
import {recordingChannels,assertRecordingBudget,RECORDING_MAX_PCM_BYTES} from './recording.ts';
test('known local audio headers provide channel counts instead of assuming stereo',()=>{
 const wave=new Uint8Array(44),view=new DataView(wave.buffer);wave.set(new TextEncoder().encode('RIFF'),0);wave.set(new TextEncoder().encode('WAVE'),8);wave.set(new TextEncoder().encode('fmt '),12);view.setUint32(16,16,true);view.setUint16(22,2,true);assert.equal(recordingChannels(wave),2);
 assert.equal(recordingChannels(Uint8Array.from([255,251,144,192,0,0])),1);assert.equal(recordingChannels(Uint8Array.from([255,251,144,0,0,0])),2);
 const mp4=new Uint8Array(64),m=new DataView(mp4.buffer);mp4.set(new TextEncoder().encode('mp4a'),4);m.setUint32(0,36);m.setUint16(24,2);assert.equal(recordingChannels(mp4),2);
 const opus=new Uint8Array(64);opus.set(new TextEncoder().encode('OggS'));opus.set(new TextEncoder().encode('OpusHead'),28);opus[37]=2;assert.equal(recordingChannels(opus),2);
 assert.equal(recordingChannels(new Uint8Array(100)),undefined);assert.equal(recordingChannels(Uint8Array.from([255,255,255,255,255])),undefined);
});
test('preflight budgets actual sample rate, channels and duration before PCM allocation',()=>{
 assert.ok(assertRecordingBudget({duration:360,channels:2},22050)<RECORDING_MAX_PCM_BYTES);
 assert.throws(()=>assertRecordingBudget({duration:361,channels:1},22050),/6 minutes/);
 assert.throws(()=>assertRecordingBudget({duration:360,channels:2},48000),/64 MB/);
 assert.throws(()=>assertRecordingBudget({duration:300,channels:6},22050),/64 MB/);
 assert.throws(()=>assertRecordingBudget({duration:60,channels:0},22050),/layout/);
});
