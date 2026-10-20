import {audioPresentationTime} from './audio-presentation.ts';
import {BeatTransport,recordingBeatLimit,recordingPosition} from './transport.ts';
import type {BeatLoop,RecordingGrid,TransportSnapshot} from './transport.ts';
import {REEL_BEATS,REEL_BPM,synthesizePracticeReel} from './music.ts';
import type {AudioMode} from './types.ts';
import {assertRecordingBudget,inspectLocalRecording,RECORDING_DECODE_RATE,RECORDING_MAX_FILE_BYTES,RECORDING_MAX_PCM_BYTES} from './recording.ts';
import type {LocalRecordingFile,RecordingMetadata} from './recording.ts';

export interface AudioInfo {audioMode:AudioMode;volume:number;muted:boolean;audioStatus:'idle'|'ready'|'loading'|'error';audioError?:string;recordingName?:string;recordingDuration?:number;recordingBpm:number;recordingOffsetSeconds:number;}
export interface SourcePlan {offset:number;rate:number;loop:boolean;loopStart:number;loopEnd:number;}
const modulo=(x:number,n:number)=>((x%n)+n)%n;
/** Source positions are derived from the same beat clock as the dancers, not a
 * second animation-frame timer. Recording beat 0 is its manually chosen downbeat. */
export function audioSourcePlan(snapshot:TransportSnapshot,kind:'reel'|'recording',grid:RecordingGrid,loop:BeatLoop|null,duration:number):SourcePlan {
 if(!Number.isFinite(snapshot.beat)||snapshot.beat<0||!Number.isFinite(snapshot.bpm)||snapshot.bpm<=0||!Number.isFinite(snapshot.speed)||snapshot.speed<=0||!Number.isFinite(duration)||duration<=0)throw new Error('Audio scheduling requires a finite beat, tempo, speed, and source duration.');
 const bpm=kind==='reel'?REEL_BPM:grid.bpm,secondsPerBeat=60/bpm;
 const beat=kind==='reel'?modulo(snapshot.beat,REEL_BEATS):snapshot.beat;
 const offset=kind==='reel'?beat*secondsPerBeat:recordingPosition(beat,grid);
 let loopStart=0,loopEnd=duration,shouldLoop=kind==='reel';
 if(loop){const first=kind==='reel'?modulo(loop.start,REEL_BEATS):loop.start,last=first+loop.end-loop.start;
  loopStart=kind==='reel'?first*secondsPerBeat:recordingPosition(first,grid);loopEnd=kind==='reel'?last*secondsPerBeat:recordingPosition(last,grid);shouldLoop=true;
  if(loopEnd>duration+1e-5)throw new Error('This loop extends beyond the available music. Choose a shorter loop or turn music off.');
 }
 if(offset>=duration)throw new Error('The playhead is past the end of this recording. Seek earlier to play.');
 return{offset,rate:snapshot.bpm*snapshot.speed/bpm,loop:shouldLoop,loopStart,loopEnd:Math.min(duration,loopEnd)};
}
interface Voice {source:AudioBufferSourceNode;gain:GainNode;retiring:boolean;}
/** Local-only audio transport. It owns one musical voice and an optional click
 * track. Speed uses playbackRate (and changes pitch); this is not time stretching. */
export class StudioAudioTransport {
 readonly clock:BeatTransport;
 private context?:AudioContext;
 private master?:GainNode;
 private reel?:AudioBuffer;
 private clicks?:AudioBuffer;
 private recording?:AudioBuffer;
 private voices=new Set<Voice>();
 private mode:AudioMode='reel';
 private volume=.35;
 private muted=false;
 private metronome=false;
 private grid:RecordingGrid={bpm:112,offsetSeconds:0};
 private name?:string;
 private status:AudioInfo['audioStatus']='idle';
 private error?:string;
 private playRequest=0;
 private clockOnAudio=false;
 private manuallyPaused=true;
 private loadRequest=0;
 private loadingRecording=false;
 private decodeQueue:Promise<void>=Promise.resolve();
 private stopBeat:number|null=null;
 private factory:()=>AudioContext;
 private performanceTime:()=>number;
 private inspectRecording:(file:LocalRecordingFile)=>Promise<RecordingMetadata>;
 constructor(options:{now?:()=>number;performanceTime?:()=>number;createContext?:()=>AudioContext;inspectRecording?:(file:LocalRecordingFile)=>Promise<RecordingMetadata>}={}){
  this.performanceTime=options.performanceTime??(()=>performance.now());
  this.clock=new BeatTransport(options.now??(()=>performance.now()/1000));
  this.factory=options.createContext??(()=>{try{return new AudioContext({sampleRate:RECORDING_DECODE_RATE,latencyHint:'interactive'});}catch{return new AudioContext();}});
  this.inspectRecording=options.inspectRecording??inspectLocalRecording;
 }
 info():AudioInfo{return{audioMode:this.mode,volume:this.volume,muted:this.muted,audioStatus:this.status,audioError:this.error,recordingName:this.name,recordingDuration:this.recording?.duration,recordingBpm:this.grid.bpm,recordingOffsetSeconds:this.grid.offsetSeconds};}
 private fail(error:unknown){this.status='error';this.error=error instanceof Error?error.message:'Audio could not start in this browser.';}
 private clearError(){this.error=undefined;this.status=this.context?'ready':'idle';}
 private create(){if(!this.context){this.context=this.factory();this.master=this.context.createGain();this.master.gain.value=this.muted?0:this.volume;this.master.connect(this.context.destination);}return this.context;}
 /** Call only from a user gesture: the browser may require permission to resume. */
 async enable(){try{const context=this.create();await context.resume();if(context.state!=='running')throw new Error('Audio is suspended. Press Play again, or choose music off.');if(!this.clockOnAudio){this.clock.useTimeSource(()=>context.currentTime);this.clockOnAudio=true;}this.clearError();}catch(error){this.fail(error);throw error;}}
 async play(){if(this.loadingRecording)throw new Error('Wait for the local recording to finish loading, or choose another music source.');const request=++this.playRequest;
  if(this.mode!=='off'||this.metronome){this.status='loading';await this.enable();}
  if(request!==this.playRequest)return;
  this.clearError();this.updateStop();if(this.mode==='recording'&&this.recording&&this.clock.snapshot().beat>=recordingBeatLimit(this.recording.duration,this.grid)){const error=new Error('This recording has ended. Seek earlier or restart the dance.');this.fail(error);throw error;}if(this.mode==='reel')this.reelBuffer();if(this.metronome)this.clickBuffer();this.clock.play();this.manuallyPaused=false;
  try{this.reschedule();}catch(error){this.clock.pause();this.fail(error);throw error;}
 }
 pause(){++this.playRequest;const heard=this.presentationSnapshot();this.manuallyPaused=true;this.clock.pause();this.clock.seek(heard.beat);this.retireVoices();}
 snapshot(){const snapshot=this.clock.snapshot();if(!snapshot.playing&&this.voices.size)this.retireVoices();return snapshot;}
 timingInfo(){return this.context?audioPresentationTime(this.context,this.performanceTime()):{time:0,method:'render-clock' as const,estimatedLag:0};}
 presentationSnapshot(){const current=this.clock.snapshot();if(this.manuallyPaused||!this.context||this.context.state!=='running'||(this.mode==='off'&&!this.metronome))return current;const heard=this.clock.snapshotAt(this.timingInfo().time);return current.playing||heard.playing?heard:current;}
 seek(beat:number){this.clock.seek(beat);this.reschedule();}
 setTempo(bpm:number,speed:number){this.clock.setTempo(bpm,speed);this.reschedule();}
 setLoop(loop:BeatLoop|null){
  if(loop&&this.mode==='recording'&&this.recording)audioSourcePlan({...this.clock.snapshot(),beat:loop.start},'recording',this.grid,loop,this.recording.duration);
  this.clock.setLoop(loop);this.updateStop();this.reschedule();
 }
 setStopBeat(beat:number|null){this.stopBeat=beat;this.updateStop();this.reschedule();}
 private updateStop(){const recordingLimit=this.mode==='recording'&&this.recording?recordingBeatLimit(this.recording.duration,this.grid):null;this.clock.setStopBeat(recordingLimit===null?this.stopBeat:this.stopBeat===null?recordingLimit:Math.min(recordingLimit,this.stopBeat));}
 setMode(mode:AudioMode){
  if(!['off','reel','recording'].includes(mode))throw new Error('Choose a supported music source.');
  if(mode==='recording'&&!this.recording)throw new Error('Choose a local recording first.');
  if(mode==='recording'&&this.recording&&this.clock.getLoop())audioSourcePlan(this.clock.snapshot(),'recording',this.grid,this.clock.getLoop(),this.recording.duration);
  if(this.loadingRecording){++this.loadRequest;this.loadingRecording=false;}this.mode=mode;this.updateStop();this.clearError();this.reschedule();
 }
 setVolume(value:number){if(!Number.isFinite(value)||value<0||value>1)throw new Error('Volume must be between 0 and 1.');this.volume=value;if(this.master&&this.context){const time=this.context.currentTime;this.master.gain.cancelScheduledValues(time);if(this.muted)this.master.gain.setValueAtTime(0,time);else this.master.gain.setTargetAtTime(value,time,.012);}}
 /** Mute the common output, including already-playing/retiring voices, without
  * pausing or rescheduling the shared beat clock. Keep the chosen volume intact. */
 setMuted(muted:boolean){this.muted=muted;if(this.master&&this.context){const time=this.context.currentTime;this.master.gain.cancelScheduledValues(time);this.master.gain.setValueAtTime(muted?0:this.volume,time);}}
 setMetronome(enabled:boolean){this.metronome=enabled;this.reschedule();}
 setRecordingGrid(bpm:number,offsetSeconds:number){
  const grid={bpm,offsetSeconds};recordingPosition(0,grid);if(this.recording)recordingBeatLimit(this.recording.duration,grid);
  if(this.recording&&this.mode==='recording'&&this.clock.getLoop())audioSourcePlan(this.clock.snapshot(),'recording',grid,this.clock.getLoop(),this.recording.duration);
  this.grid=grid;this.clock.setTempo(bpm,this.clock.snapshot().speed);this.updateStop();this.clearError();this.reschedule();
 }
 async loadRecording(file:LocalRecordingFile):Promise<boolean>{
  if(!Number.isFinite(file.size)||file.size<=0||file.size>RECORDING_MAX_FILE_BYTES)throw new Error('Choose a recording smaller than 32 MB.');
  const request=++this.loadRequest;this.loadingRecording=true;this.pause();this.status='loading';this.error=undefined;
  try{const context=this.create(),metadata=await this.inspectRecording(file);assertRecordingBudget(metadata,context.sampleRate??RECORDING_DECODE_RATE);if(request!==this.loadRequest)return false;
   // decodeAudioData cannot be cancelled. Serialize it so rapid replacement
   // never accumulates several full PCM allocations or encoded ArrayBuffers.
   const job=this.decodeQueue.then(async()=>{if(request!==this.loadRequest)return undefined;const bytes=await file.arrayBuffer();if(request!==this.loadRequest)return undefined;return context.decodeAudioData(bytes);});
   this.decodeQueue=job.then(()=>undefined,()=>undefined);const decoded=await job;
   if(request!==this.loadRequest||!decoded)return false;
   assertRecordingBudget({duration:decoded.duration,channels:decoded.numberOfChannels},decoded.sampleRate);
   if(decoded.length*decoded.numberOfChannels*4>RECORDING_MAX_PCM_BYTES)throw new Error('Decoded audio exceeds the 64 MB memory budget. Choose a shorter excerpt.');
   if(decoded.numberOfChannels!==metadata.channels)throw new Error('Decoded channels differ from the preflight header. Use a standard mono or stereo excerpt.');
   this.recording=decoded;this.name=file.name;this.grid={bpm:this.clock.snapshot().bpm,offsetSeconds:0};this.mode='recording';this.clock.setLoop(null);this.clock.seek(0);this.updateStop();this.loadingRecording=false;this.clearError();return true;
  }catch(error){if(request===this.loadRequest){this.loadingRecording=false;this.fail(error);}throw error;}
 }
 private reelBuffer(){if(!this.reel){const pcm=synthesizePracticeReel();const buffer=this.context!.createBuffer(2,pcm.channels[0].length,pcm.sampleRate);pcm.channels.forEach((channel,index)=>buffer.getChannelData(index).set(channel));this.reel=buffer;}return this.reel;}
 private clickBuffer(){if(!this.clicks){const rate=22050,duration=REEL_BEATS*60/REEL_BPM,buffer=this.context!.createBuffer(1,Math.ceil(duration*rate),rate),pcm=buffer.getChannelData(0);
  for(let beat=0;beat<REEL_BEATS;beat++){const start=Math.round(beat*60/REEL_BPM*rate),freq=beat%16===0?980:beat%4===0?680:420;for(let i=0;i<.045*rate&&start+i<pcm.length;i++){const t=i/rate;pcm[start+i]=.24*Math.sin(2*Math.PI*freq*t)*Math.exp(-t*100)*Math.min(1,t/.001);}}
  this.clicks=buffer;}return this.clicks;}
 private retireVoices(){if(!this.context)return;const time=this.context.currentTime;for(const voice of this.voices){if(voice.retiring)continue;voice.retiring=true;voice.gain.gain.cancelScheduledValues(time);voice.gain.gain.setValueAtTime(voice.gain.gain.value,time);voice.gain.gain.linearRampToValueAtTime(0,time+.005);try{voice.source.stop(time+.006);}catch{/* Already ended. */}}}
 private startVoice(buffer:AudioBuffer,plan:SourcePlan,time:number,snapshot:TransportSnapshot,level=1){
  const context=this.context!,source=context.createBufferSource(),gain=context.createGain();
  source.buffer=buffer;source.playbackRate.value=plan.rate;source.loop=plan.loop;source.loopStart=plan.loopStart;source.loopEnd=plan.loopEnd;
  gain.gain.setValueAtTime(0,time);gain.gain.linearRampToValueAtTime(level,time+.005);source.connect(gain);gain.connect(this.master!);
  const voice:Voice={source,gain,retiring:false};this.voices.add(voice);
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);};source.start(time,plan.offset);
  let end=this.stopBeat;
  if(this.mode==='recording'&&this.recording){const limit=recordingBeatLimit(this.recording.duration,this.grid);end=end===null?limit:Math.min(end,limit);}
  if(!this.clock.getLoop()&&end!==null)source.stop(time+Math.max(0,(end-snapshot.beat)*60/(snapshot.bpm*snapshot.speed)));
 }
 private reschedule(){try{
  this.retireVoices();if(!this.clock.snapshot().playing)return;
  if((this.mode!=='off'||this.metronome)&&(!this.context||this.context.state!=='running'))return;
  // Synthesis can take longer than a render quantum. Prepare buffers BEFORE
  // reading the clock so the source never starts at a stale pre-synthesis beat.
  const music=this.mode==='reel'?this.reelBuffer():this.mode==='recording'?this.recording:undefined,clicks=this.metronome?this.clickBuffer():undefined;
  if(!music&&!clicks)return;
  const time=this.context!.currentTime,snapshot=this.clock.snapshotAt(time),loop=this.clock.getLoop();
  if(music)this.startVoice(music,audioSourcePlan(snapshot,this.mode==='reel'?'reel':'recording',this.grid,loop,music.duration),time,snapshot);
  if(clicks)this.startVoice(clicks,audioSourcePlan(snapshot,'reel',this.grid,loop,clicks.duration),time,snapshot,.5);
 }catch(error){this.clock.pause();this.retireVoices();this.fail(error);throw error;}}
 dispose(){this.pause();++this.loadRequest;for(const voice of this.voices){voice.source.disconnect();voice.gain.disconnect();}this.voices.clear();this.master?.disconnect();void this.context?.close();}
}
