import test from 'node:test';import assert from 'node:assert/strict';
import {audioSourcePlan,StudioAudioTransport} from './audio.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
class Param {value=1;setValueAtTime(v:number){this.value=v;}linearRampToValueAtTime(v:number){this.value=v;}setTargetAtTime(v:number){this.value=v;}cancelScheduledValues(){}}
class Node {connections=0;disconnected=false;connect(){this.connections++;}disconnect(){this.disconnected=true;}}
class Gain extends Node {gain=new Param();}
class Buffer {numberOfChannels:number;length:number;duration:number;channels:Float32Array[];sampleRate:number;constructor(channelCount:number,length:number,sampleRate:number){this.sampleRate=sampleRate;this.numberOfChannels=channelCount;this.length=length;this.duration=length/sampleRate;this.channels=Array.from({length:channelCount},()=>new Float32Array(length));}getChannelData(i:number){return this.channels[i];}}
class Source extends Node {buffer?:Buffer;playbackRate=new Param();loop=false;loopStart=0;loopEnd=0;onended?:()=>void;startTime?:number;offset?:number;stopTime?:number;start(time:number,offset:number){this.startTime=time;this.offset=offset;}stop(time:number){this.stopTime=time;}finish(){this.onended?.();}}
class Context {currentTime=0;state='suspended';destination={};sources:Source[]=[];gains:Gain[]=[];resumeWait?:Promise<void>;
 async resume(){await this.resumeWait;this.state='running';}createGain(){const x=new Gain();this.gains.push(x);return x;}createBuffer(channels:number,length:number,rate:number){return new Buffer(channels,length,rate);}createBufferSource(){const x=new Source();this.sources.push(x);return x;}async decodeAudioData(){return new Buffer(1,40*8000,8000);}close(){this.state='closed';return Promise.resolve();}}
const setup=()=>{const context=new Context();let now=0;const audio=new StudioAudioTransport({createContext:()=>context as unknown as AudioContext,now:()=>now,inspectRecording:async()=>({duration:40,channels:1})});return{context,audio,tick:(n:number)=>{now+=n;context.currentTime+=n;}};};
test('source plans map AABB repeats and explicit recording grids to one beat phase',()=>{
 const snapshot={beat:68,playing:true,bpm:120,speed:.5},grid={bpm:120,offsetSeconds:3};
 let p=audioSourcePlan(snapshot,'reel',grid,{start:68,end:80},64*60/112);near(p.offset,4*60/112);near(p.rate,60/112);near(p.loopStart,4*60/112);near(p.loopEnd,16*60/112);
 p=audioSourcePlan(snapshot,'recording',grid,null,40);near(p.offset,37);near(p.rate,.5);assert.equal(p.loop,false);
 assert.throws(()=>audioSourcePlan(snapshot,'recording',grid,{start:68,end:80},40),/beyond/);
});
test('WebAudio sources and beat clock stay aligned through pause, seek, speed and figure loop',async()=>{
 const {context,audio,tick}=setup();await audio.play();let source=context.sources.at(-1)!;near(source.offset!,0);assert.equal(source.loop,true);tick(2);near(audio.snapshot().beat,2*112/60);
 audio.pause();assert.equal(audio.snapshot().playing,false);tick(5);near(audio.snapshot().beat,2*112/60);source.finish();assert.equal(source.disconnected,true);
 audio.seek(32);audio.setTempo(120,.5);await audio.play();source=context.sources.at(-1)!;near(source.offset!,32*60/112);near(source.playbackRate.value,60/112);
 audio.setLoop({start:32,end:48});source=context.sources.at(-1)!;near(source.loopStart,32*60/112);near(source.loopEnd,48*60/112);tick(16);near(audio.snapshot().beat,32);
 audio.dispose();assert.equal(context.state,'closed');assert.ok(context.sources.every(x=>x.disconnected));
});
test('a pending user-gesture resume can be cancelled without starting playback',async()=>{
 const {context,audio}=setup();let resume!:()=>void;context.resumeWait=new Promise<void>(resolve=>resume=resolve);const playing=audio.play();audio.pause();resume();await playing;assert.equal(audio.snapshot().playing,false);assert.equal(context.sources.length,0);
});
test('local recording decode, manual offset, end stop and invalid loops are explicit',async()=>{
 const {context,audio,tick}=setup();await audio.loadRecording({name:'local.wav',size:100,arrayBuffer:async()=>new ArrayBuffer(100)});assert.equal(audio.info().recordingName,'local.wav');assert.equal(audio.info().audioMode,'recording');audio.setRecordingGrid(120,3);await audio.play();let source=context.sources.at(-1)!;near(source.offset!,3);near(source.playbackRate.value,1);assert.equal(source.loop,false);near(source.stopTime!,37);
 tick(37);near(audio.snapshot().beat,74);assert.equal(audio.snapshot().playing,false);
 assert.throws(()=>audio.setLoop({start:64,end:80}),/beyond/);assert.throws(()=>audio.setRecordingGrid(120,41),/inside/);
 audio.seek(16);audio.setLoop({start:16,end:32});await audio.play();source=context.sources.at(-1)!;near(source.loopStart,11);near(source.loopEnd,19);assert.equal(source.loop,true);
 await assert.rejects(()=>audio.loadRecording({name:'too-large.wav',size:65*1024*1024,arrayBuffer:async()=>new ArrayBuffer(0)}),/32 MB/);
});
test('optional clicks use the same source offset and rate, while silence requires no AudioContext',async()=>{
 let created=0;const context=new Context(),audio=new StudioAudioTransport({createContext:()=>{created++;return context as unknown as AudioContext;},now:()=>0});audio.setMode('off');await audio.play();assert.equal(created,0);audio.pause();audio.setMode('reel');audio.setMetronome(true);audio.seek(12.5);await audio.play();assert.equal(context.sources.length,2);near(context.sources[0].offset!,context.sources[1].offset!);near(context.sources[0].startTime!,context.sources[1].startTime!);near(context.sources[0].playbackRate.value,context.sources[1].playbackRate.value);
});
test('recording preflight rejects oversize PCM without decoding and keeps the prior recording',async()=>{
 const context=new Context();let metadata={duration:40,channels:1},decodes=0;const decode=context.decodeAudioData.bind(context);context.decodeAudioData=async()=>{decodes++;return decode();};
 const audio=new StudioAudioTransport({createContext:()=>context as unknown as AudioContext,inspectRecording:async()=>metadata});
 const file=(name:string)=>({name,size:100,arrayBuffer:async()=>new ArrayBuffer(100)});await audio.loadRecording(file('good.wav'));metadata={duration:360,channels:8};
 await assert.rejects(()=>audio.loadRecording(file('too-much-pcm.wav')),/64 MB/);assert.equal(decodes,1);assert.equal(audio.info().recordingName,'good.wav');assert.equal(audio.info().recordingDuration,40);
 context.decodeAudioData=async()=>{throw new Error('broken codec');};metadata={duration:40,channels:1};await assert.rejects(()=>audio.loadRecording(file('broken.wav')),/broken codec/);assert.equal(audio.info().recordingName,'good.wav');
});
test('superseded recording loads cannot replace a newer file after asynchronous metadata or decode',async()=>{
 const context=new Context();const resolves=new Map<string,(m:{duration:number;channels:number})=>void>();
 const audio=new StudioAudioTransport({createContext:()=>context as unknown as AudioContext,inspectRecording:file=>new Promise(resolve=>resolves.set(file.name,resolve))});
 const file=(name:string)=>({name,size:100,arrayBuffer:async()=>new ArrayBuffer(100)});const slow=audio.loadRecording(file('slow.wav')),fast=audio.loadRecording(file('fast.wav'));
 resolves.get('fast.wav')!({duration:40,channels:1});await fast;resolves.get('slow.wav')!({duration:40,channels:1});await slow;assert.equal(audio.info().recordingName,'fast.wav');
 let finish!:(buffer:any)=>void;context.decodeAudioData=()=>new Promise(resolve=>finish=resolve);
 const old=audio.loadRecording(file('old-decode.wav'));resolves.get('old-decode.wav')!({duration:40,channels:1});await new Promise(resolve=>setTimeout(resolve,0));
 context.decodeAudioData=async()=>new Buffer(1,40*8000,8000);const current=audio.loadRecording(file('new.wav'));resolves.get('new.wav')!({duration:40,channels:1});finish(new Buffer(1,40*8000,8000));await old;await current;assert.equal(audio.info().recordingName,'new.wav');
});
test('changing music source cancels a pending recording without a late mode switch or timeline reset',async()=>{
 const context=new Context();let finish!:(value:{duration:number;channels:number})=>void;
 const audio=new StudioAudioTransport({createContext:()=>context as unknown as AudioContext,inspectRecording:()=>new Promise(resolve=>finish=resolve)});
 const pending=audio.loadRecording({name:'cancelled.wav',size:100,arrayBuffer:async()=>new ArrayBuffer(100)});
 await assert.rejects(()=>audio.play(),/finish loading/);audio.setMode('off');audio.seek(24);finish({duration:40,channels:1});assert.equal(await pending,false);assert.equal(audio.info().recordingName,undefined);assert.equal(audio.info().audioMode,'off');near(audio.snapshot().beat,24);
});

test('presentation follows audible output through tempo, seek and natural stop without changing source offsets',async()=>{
 const context=new Context() as Context&{outputLatency:number};context.outputLatency=.1;
 const audio=new StudioAudioTransport({createContext:()=>context as unknown as AudioContext,now:()=>0});audio.setTempo(120,1);await audio.play();
 context.currentTime=1;near(audio.snapshot().beat,2);near(audio.presentationSnapshot().beat,1.8);
 audio.setTempo(60,1);near(audio.presentationSnapshot().beat,1.8);context.currentTime=1.2;near(audio.presentationSnapshot().beat,2.1);
 audio.seek(32);near(audio.presentationSnapshot().beat,2.1);audio.setStopBeat(32.1);context.currentTime=1.31;near(audio.presentationSnapshot().beat,32.01);assert.equal(audio.snapshot().playing,false);assert.equal(audio.presentationSnapshot().playing,true);
 const source=context.sources.at(-1)!;near(source.offset!,32*60/112);near(source.startTime!,1.2);
 context.currentTime=1.41;assert.equal(audio.snapshot().playing,false);assert.equal(audio.presentationSnapshot().playing,false);near(audio.presentationSnapshot().beat,32.1);
 audio.seek(0);await audio.play();context.currentTime=2;const heard=audio.presentationSnapshot().beat;audio.pause();near(audio.snapshot().beat,heard);context.currentTime=2.05;near(audio.presentationSnapshot().beat,heard);assert.equal(audio.presentationSnapshot().playing,false);
});
