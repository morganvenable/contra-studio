export interface BeatLoop {start:number;end:number;}
export interface TransportSnapshot {beat:number;playing:boolean;bpm:number;speed:number;}
const finite=(n:number)=>Number.isFinite(n);
interface ClockSegment {time:number;beat:number;running:boolean;bpm:number;speed:number;loop:BeatLoop|null;stopBeat:number|null;}

/** An authoritative beat clock. Inject AudioContext.currentTime in the browser;
 * tests use a controllable clock instead of animation-frame elapsed increments. */
export class BeatTransport {
  private now:()=>number;
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
  private value(time:number){
    let beat=this.anchorBeat+(this.running?Math.max(0,time-this.anchorTime)*this.bpm*this.speed/60:0);
    if(this.loop&&beat>=this.loop.end)beat=this.loop.start+(beat-this.loop.start)%(this.loop.end-this.loop.start);
    return beat;
  }
  snapshot():TransportSnapshot {
    const time=this.now();let beat=this.value(time);
    if(this.running&&!this.loop&&this.stopBeat!==null&&beat>=this.stopBeat){const endTime=this.anchorTime+Math.max(0,this.stopBeat-this.anchorBeat)*60/(this.bpm*this.speed);beat=this.stopBeat;this.anchorBeat=beat;this.anchorTime=endTime;this.running=false;this.remember();}
    return{beat,playing:this.running,bpm:this.bpm,speed:this.speed};
  }
  /** Presentation queries use the historical tempo/seek segment at the output
   * device's time. They never reschedule audio or mutate the authoritative clock. */
  snapshotAt(time:number):TransportSnapshot {
    if(!finite(time))throw new Error('Presentation time must be finite.');
    const s=this.history.findLast(segment=>segment.time<=time)??this.history[0];
    let beat=s.beat+(s.running?Math.max(0,time-s.time)*s.bpm*s.speed/60:0),playing=s.running;
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
  setStopBeat(beat:number|null){if(beat!==null&&(!finite(beat)||beat<0||beat>Number.MAX_SAFE_INTEGER))throw new Error('Stop beat must be finite and nonnegative.');const current=this.snapshot();this.anchorBeat=current.beat;this.anchorTime=this.now();this.stopBeat=beat;this.remember();this.snapshot();}
}

export interface RecordingGrid {bpm:number;offsetSeconds:number;}
export function recordingPosition(beat:number,grid:RecordingGrid){
  if(!finite(beat)||beat<0||!finite(grid.bpm)||grid.bpm<30||grid.bpm>240||!finite(grid.offsetSeconds)||grid.offsetSeconds<0)throw new Error('The recording needs a valid manual tempo and first-downbeat offset.');
  return grid.offsetSeconds+beat*60/grid.bpm;
}
export function recordingBeatLimit(durationSeconds:number,grid:RecordingGrid){
  recordingPosition(0,grid);
  if(!finite(durationSeconds)||durationSeconds<=grid.offsetSeconds)throw new Error('The first downbeat must be inside the decoded recording.');
  return(durationSeconds-grid.offsetSeconds)*grid.bpm/60;
}
