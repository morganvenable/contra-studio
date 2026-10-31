export interface BeatLoop {start:number;end:number;}
export interface TransportSnapshot {beat:number;playing:boolean;bpm:number;speed:number;}
const finite=(n:number)=>Number.isFinite(n);
interface ClockSegment {time:number;beat:number;running:boolean;bpm:number;speed:number;loop:BeatLoop|null;stopBeat:number|null;}

/** An authoritative beat clock. Inject AudioContext.currentTime in the browser;
 * tests use a controllable clock instead of animation-frame elapsed increments. */
/**
 * A recording with a beat map drives the clock: time runs through the
 * recording's seconds (at bpm*speed/warp.bpm, as the audio plays), and the
 * beat is read off the map, so the dance follows the player's tempo.
 */
export interface ClockWarp {bpm:number;toSeconds(beat:number):number;toBeat(seconds:number):number;}

export class BeatTransport {
  private now:()=>number;
  private warp:ClockWarp|null=null;
  private anchorTime=0;
  private anchorBeat=0;
  private running=false;
  private bpm=112;
  private speed=1;
  private loop:BeatLoop|null=null;
  private stopBeat:number|null=null;
  private history:ClockSegment[]=[];
  constructor(now:()=>number){this.now=now;this.anchorTime=now();this.remember();}
  private remember(){const value:ClockSegment={time:this.anchorTime,beat:this.anchorBeat,running:this.running,bpm:this.bpm,speed:this.speed,loop:this.loop?{...this.loop}:null,stopBeat:this.stopBeat};if(this.history.at(-1)?.time===value.time)this.history.pop();this.history.push(value);if(this.history.length>256)this.history.shift();}
  /** The beat `elapsed` seconds of clock time after `beat`, at this tempo. */
  private advance(beat:number,elapsed:number,bpm:number,speed:number){
    if(!this.warp)return beat+elapsed*bpm*speed/60;
    return this.warp.toBeat(this.warp.toSeconds(beat)+elapsed*bpm*speed/this.warp.bpm);
  }
  /** Clock seconds from `from` to `to` beats, at this tempo. */
  private span(from:number,to:number){
    if(!this.warp)return Math.max(0,to-from)*60/(this.bpm*this.speed);
    return Math.max(0,this.warp.toSeconds(to)-this.warp.toSeconds(from))*this.warp.bpm/(this.bpm*this.speed);
  }
  private value(time:number){
    let beat=this.running?this.advance(this.anchorBeat,Math.max(0,time-this.anchorTime),this.bpm,this.speed):this.anchorBeat;
    if(this.loop&&beat>=this.loop.end)beat=this.loop.start+(beat-this.loop.start)%(this.loop.end-this.loop.start);
    return beat;
  }
  snapshot():TransportSnapshot {
    const time=this.now();let beat=this.value(time);
    if(this.running&&!this.loop&&this.stopBeat!==null&&beat>=this.stopBeat){const endTime=this.anchorTime+this.span(this.anchorBeat,this.stopBeat);beat=this.stopBeat;this.anchorBeat=beat;this.anchorTime=endTime;this.running=false;this.remember();}
    return{beat,playing:this.running,bpm:this.bpm,speed:this.speed};
  }
  /** Presentation queries use the historical tempo/seek segment at the output
   * device's time. They never reschedule audio or mutate the authoritative clock. */
  snapshotAt(time:number):TransportSnapshot {
    if(!finite(time))throw new Error('Presentation time must be finite.');
    const s=this.history.findLast(segment=>segment.time<=time)??this.history[0];
    let beat=s.running?this.advance(s.beat,Math.max(0,time-s.time),s.bpm,s.speed):s.beat,playing=s.running;
    if(s.loop&&beat>=s.loop.end)beat=s.loop.start+(beat-s.loop.start)%(s.loop.end-s.loop.start);
    if(playing&&!s.loop&&s.stopBeat!==null&&beat>=s.stopBeat){beat=s.stopBeat;playing=false;}
    return{beat,playing,bpm:s.bpm,speed:s.speed};
  }
  useTimeSource(now:()=>number){const {beat}=this.snapshot();const time=now();if(!finite(time))throw new Error('Clock time must be finite.');this.now=now;this.anchorTime=time;this.anchorBeat=beat;this.history=[];this.remember();}
  play(){const current=this.snapshot();if(this.stopBeat!==null&&!this.loop&&current.beat>=this.stopBeat)return;this.anchorBeat=current.beat;this.anchorTime=this.now();this.running=true;this.remember();}
  pause(){const current=this.snapshot();this.anchorBeat=current.beat;this.anchorTime=this.now();this.running=false;this.remember();}
  seek(beat:number){if(!finite(beat)||beat<0||beat>Number.MAX_SAFE_INTEGER)throw new Error('Choose a finite nonnegative beat within the precise timeline range.');this.anchorBeat=this.loop?Math.max(this.loop.start,Math.min(this.loop.end,beat)):beat;this.anchorTime=this.now();this.remember();}
  setTempo(bpm:number,speed=this.speed){if(!finite(bpm)||bpm<30||bpm>240||!finite(speed)||speed<.125||speed>4)throw new Error('Tempo and speed are outside the supported transport range.');const current=this.snapshot();this.anchorBeat=current.beat;this.anchorTime=this.now();this.bpm=bpm;this.speed=speed;this.remember();}
  setLoop(loop:BeatLoop|null){
    if(loop&&(!finite(loop.start)||!finite(loop.end)||loop.start<0||loop.end<=loop.start||loop.end>Number.MAX_SAFE_INTEGER))throw new Error('A loop needs an ordered, finite beat range.');
    const current=this.snapshot();this.loop=loop?{...loop}:null;this.anchorBeat=loop&&!(current.beat>=loop.start&&current.beat<loop.end)?loop.start:current.beat;this.anchorTime=this.now();this.remember();
  }
  getLoop():BeatLoop|null{return this.loop?{...this.loop}:null;}
  /** Follow a recording's beat map (or, null, a steady tempo again). */
  setWarp(warp:ClockWarp|null){const current=this.snapshot();this.warp=warp;this.anchorBeat=current.beat;this.anchorTime=this.now();this.remember();}
  setStopBeat(beat:number|null){if(beat!==null&&(!finite(beat)||beat<0||beat>Number.MAX_SAFE_INTEGER))throw new Error('Stop beat must be finite and nonnegative.');const current=this.snapshot();this.anchorBeat=current.beat;this.anchorTime=this.now();this.stopBeat=beat;this.remember();this.snapshot();}
}

/**
 * Where dance beats fall in a recording: a steady tempo from the first
 * downbeat, or (beatTimes) every beat the recording actually plays, tracked
 * from the audio (scripts/music-beats.py), so the dance follows a live
 * player's tempo. With beatTimes, dance beat 0 is the tracked beat nearest
 * offsetSeconds, and bpm is the recording's average tempo.
 */
export interface RecordingGrid {bpm:number;offsetSeconds:number;beatTimes?:readonly number[];}
/** The tracked beats from dance beat 0 on, if the grid has a beat map. */
function mappedBeats(grid:RecordingGrid):readonly number[]|undefined{
  const times=grid.beatTimes;if(!times||times.length<2)return undefined;
  let first=0;for(let i=1;i<times.length;i++)if(Math.abs(times[i]-grid.offsetSeconds)<Math.abs(times[first]-grid.offsetSeconds))first=i;
  return times.length-first>=2?times.slice(first):undefined;
}
export function recordingPosition(beat:number,grid:RecordingGrid){
  if(!finite(beat)||beat<0||!finite(grid.bpm)||grid.bpm<30||grid.bpm>240||!finite(grid.offsetSeconds)||grid.offsetSeconds<0)throw new Error('The recording needs a valid manual tempo and first-downbeat offset.');
  const map=mappedBeats(grid);
  if(!map)return grid.offsetSeconds+beat*60/grid.bpm;
  const i=Math.floor(beat),last=map.length-1;
  if(i<last)return map[i]+(map[i+1]-map[i])*(beat-i);
  return map[last]+(beat-last)*(map[last]-map[last-1]);
}
/** The dance beat playing at `seconds` into the recording (the inverse of recordingPosition). */
export function recordingBeatAt(seconds:number,grid:RecordingGrid){
  const map=mappedBeats(grid);
  if(!map)return Math.max(0,(seconds-grid.offsetSeconds)*grid.bpm/60);
  if(seconds<=map[0])return Math.max(0,(seconds-map[0])/(map[1]-map[0]));
  const last=map.length-1;
  if(seconds>=map[last])return last+(seconds-map[last])/(map[last]-map[last-1]);
  let lo=0,hi=last;while(hi-lo>1){const mid=(lo+hi)>>1;if(map[mid]<=seconds)lo=mid;else hi=mid;}
  return lo+(seconds-map[lo])/(map[lo+1]-map[lo]);
}
export function recordingBeatLimit(durationSeconds:number,grid:RecordingGrid){
  const start=recordingPosition(0,grid);
  if(!finite(durationSeconds)||durationSeconds<=start)throw new Error('The first downbeat must be inside the decoded recording.');
  return recordingBeatAt(durationSeconds,grid);
}
