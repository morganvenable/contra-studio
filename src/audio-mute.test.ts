import test from 'node:test';
import assert from 'node:assert/strict';
import {StudioAudioTransport} from './audio.ts';

// Deterministic WebAudio graph model: real app-generated PCM travels through
// the actual source -> voice gain -> master -> destination connections. This
// does not claim browser/device audio latency or physical speaker verification.
type Event={kind:'set'|'ramp'|'target';time:number;value:number;constant?:number;order:number};
class Param {
 private base=1;private events:Event[]=[];private sequence=0;
 private context:Context;constructor(context:Context){this.context=context;}
 get value(){return this.at(this.context.currentTime);}
 set value(value:number){this.base=value;}
 setValueAtTime(value:number,time:number){this.events.push({kind:'set',time,value,order:this.sequence++});}
 linearRampToValueAtTime(value:number,time:number){this.events.push({kind:'ramp',time,value,order:this.sequence++});}
 setTargetAtTime(value:number,time:number,constant:number){this.events.push({kind:'target',time,value,constant,order:this.sequence++});}
 cancelScheduledValues(time:number){this.events=this.events.filter(event=>event.time<time);}
 at(time:number){
  const events=[...this.events].sort((a,b)=>a.time-b.time||a.order-b.order);let value=this.base,start=0,target:Event|undefined;
  const evolve=(end:number)=>target?target.value+(value-target.value)*Math.exp(-(end-start)/target.constant!):value;
  for(const event of events){if(event.time>time){if(event.kind==='ramp'&&!target)return value+(event.value-value)*(time-start)/(event.time-start);break;}value=evolve(event.time);start=event.time;if(event.kind==='target')target=event;else{value=event.value;target=undefined;}}
  return evolve(time);
 }
}
class Node {outputs:Node[]=[];connect(node:Node){this.outputs.push(node);}disconnect(){this.outputs=[];}}
class Gain extends Node {gain:Param;constructor(context:Context){super();this.gain=new Param(context);}}
class Buffer {channels:Float32Array[];duration:number;numberOfChannels:number;length:number;sampleRate:number;constructor(numberOfChannels:number,length:number,sampleRate:number){this.numberOfChannels=numberOfChannels;this.length=length;this.sampleRate=sampleRate;this.channels=Array.from({length:numberOfChannels},()=>new Float32Array(length));this.duration=length/sampleRate;}getChannelData(index:number){return this.channels[index];}}
class Source extends Node {
 buffer?:Buffer;playbackRate:Param;loop=false;loopStart=0;loopEnd=0;onended?:()=>void;startTime=Infinity;offset=0;stopTime=Infinity;
 constructor(context:Context){super();this.playbackRate=new Param(context);}
 start(time:number,offset=0){this.startTime=time;this.offset=offset;}stop(time:number){this.stopTime=time;}
 sample(time:number){if(!this.buffer||time<this.startTime||time>=this.stopTime)return 0;let position=this.offset+(time-this.startTime)*this.playbackRate.at(time);if(this.loop&&position>=this.loopEnd)position=this.loopStart+(position-this.loopStart)%(this.loopEnd-this.loopStart);return this.buffer.getChannelData(0)[Math.floor(position*this.buffer.sampleRate)]??0;}
}
class Context {
 currentTime=0;state='suspended';sampleRate=22050;destination=new Node();sources:Source[]=[];gains:Gain[]=[];resumeWait?:Promise<void>;
 async resume(){await this.resumeWait;this.state='running';}close(){this.state='closed';return Promise.resolve();}
 createGain(){const node=new Gain(this);this.gains.push(node);return node;}
 createBuffer(channels:number,length:number,rate:number){return new Buffer(channels,length,rate);}
 createBufferSource(){const node=new Source(this);this.sources.push(node);return node;}
 async decodeAudioData(){const buffer=new Buffer(1,40*this.sampleRate,this.sampleRate);buffer.getChannelData(0).fill(.25);return buffer;}
 output(time:number){const route=(node:Node):number=>node===this.destination?1:node.outputs.reduce((sum,next)=>sum+route(next),0)*(node instanceof Gain?node.gain.at(time):1);return this.sources.reduce((sum,source)=>sum+source.sample(time)*route(source),0);}
 rms(start=this.currentTime,seconds=.02){let sum=0,count=0;for(let time=start;time<start+seconds;time+=1/this.sampleRate){sum+=this.output(time)**2;count++;}return Math.sqrt(sum/count);}
}
const setup=()=>{const context=new Context();const audio=new StudioAudioTransport({createContext:()=>context as unknown as AudioContext,now:()=>context.currentTime,inspectRecording:async()=>({duration:40,channels:1})});return{context,audio};};
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
const file={name:'local.wav',size:100,arrayBuffer:async()=>new ArrayBuffer(100)};

test('master mute silences already-playing reel and metronome PCM without stopping or rescheduling',async()=>{
 const {context,audio}=setup();audio.setMetronome(true);await audio.play();context.currentTime=.1;assert.ok(context.rms()>.001);assert.equal(context.sources.length,2);
 const beat=audio.snapshot().beat,sources=context.sources.length;audio.setMuted(true);assert.equal(audio.info().muted,true);assert.equal(audio.info().volume,.35);assert.equal(context.gains[0].gain.at(context.currentTime),0);assert.equal(context.rms(),0);assert.equal(context.rms(1),0);assert.equal(context.rms(5),0);assert.equal(context.sources.length,sources);near(audio.snapshot().beat,beat);assert.equal(audio.snapshot().playing,true);
 context.currentTime=1;near(audio.snapshot().beat,112/60);const before=audio.snapshot().beat;audio.setMuted(false);assert.equal(context.rms()>.001,true);near(context.gains[0].gain.at(context.currentTime),.35);near(audio.snapshot().beat,before);assert.equal(context.sources.length,sources);
});

test('mute cancels pending volume automation and preserves chosen volume across rapid toggles',async()=>{
 const {context,audio}=setup();await audio.play();context.currentTime=.1;audio.setVolume(.8);context.currentTime+=.001;audio.setMuted(true);
 assert.equal(context.rms(),0);assert.equal(context.rms(2),0);assert.equal(audio.info().volume,.8);audio.setVolume(.6);assert.equal(context.rms(),0);assert.equal(context.rms(2),0);
 for(let i=0;i<6;i++){audio.setMuted(false);near(context.gains[0].gain.at(context.currentTime),.6);audio.setMuted(true);assert.equal(context.rms(),0);}
 audio.setMuted(false);near(context.gains[0].gain.at(context.currentTime),.6);assert.ok(context.rms()>.001);
});

test('mute before context creation survives a pending resume, play, pause, seek, tempo, loop and source changes',async()=>{
 const {context,audio}=setup();audio.setMuted(true);let resume!:()=>void;context.resumeWait=new Promise(resolve=>resume=resolve);const pending=audio.play();resume();await pending;context.currentTime=.1;assert.equal(context.rms(),0);
 for(const change of[()=>audio.seek(16),()=>audio.setTempo(120,.5),()=>audio.setLoop({start:16,end:24}),()=>audio.setMetronome(true),()=>audio.setMode('off'),()=>audio.setMode('reel')]){change();assert.equal(context.rms(),0);assert.equal(context.rms(context.currentTime+.1),0);assert.equal(audio.info().muted,true);}
 audio.pause();await audio.play();context.currentTime+=.1;assert.equal(context.rms(),0);assert.equal(audio.info().muted,true);audio.setMuted(false);assert.ok(context.rms()>.001);
});

test('local recording and its metronome, including retiring voices after seek, share the muted master',async()=>{
 const {context,audio}=setup();await audio.loadRecording(file);audio.setMetronome(true);await audio.play();context.currentTime=.1;assert.ok(context.rms()>.01);audio.seek(4);audio.setMuted(true);assert.equal(context.rms(),0);assert.equal(context.rms(.103),0);assert.equal(context.rms(2),0);
 await audio.loadRecording({...file,name:'replacement.wav'});assert.equal(audio.info().muted,true);await audio.play();context.currentTime+=.1;assert.equal(context.rms(),0);audio.setMode('reel');assert.equal(context.rms(),0);audio.setMode('recording');assert.equal(context.rms(),0);audio.setMuted(false);assert.ok(context.rms()>.01);
});

test('volume zero and music-off are independent from mute; an enabled click cannot bypass mute',async()=>{
 const {context,audio}=setup();audio.setVolume(0);await audio.play();context.currentTime=.1;assert.equal(audio.info().muted,false);assert.equal(context.rms(),0);audio.setMuted(true);audio.setMuted(false);assert.equal(audio.info().volume,0);assert.equal(context.rms(),0);
 audio.setVolume(.35);audio.setMode('off');audio.setMetronome(true);context.currentTime=.535;assert.ok(context.rms()>.001);audio.setMuted(true);assert.equal(context.rms(),0);assert.equal(audio.info().audioMode,'off');audio.setMuted(false);assert.ok(context.rms()>.001);
});
