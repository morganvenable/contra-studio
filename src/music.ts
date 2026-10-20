/** Original synthesized practice music, composed for this simulator. No external
 * recording or traditional melody is bundled. One reel phrase is 16 dance beats. */
export const REEL_BEATS=64;
export const REEL_BPM=112;
export const REEL_TITLE='Studio Practice Reel · original synthesis';
export interface MusicNote {beat:number;duration:number;midi:number;velocity:number;voice:'lead'|'bass'|'chord';pan:number;}
const A=[
 [62,66,69,66,64,66,67,69], [71,69,67,66,64,62,64,66],
 [69,66,62,66,69,71,73,69], [68,69,71,69,66,64,61,64],
 [62,64,66,69,74,73,71,69], [67,71,74,71,69,67,66,64],
 [64,67,71,67,66,64,62,64], [66,69,64,61,62,66,64,62]
];
const B=[
 [74,73,71,69,71,74,78,76], [74,71,67,71,74,76,74,71],
 [69,73,76,73,74,73,71,69], [68,71,76,71,69,66,64,61],
 [71,74,78,74,76,74,73,71], [74,71,67,69,71,69,67,66],
 [64,68,71,74,73,71,69,64], [66,69,74,73,71,69,66,62]
];
const harmoniesA=[[50,54,57],[43,47,50],[50,54,57],[45,49,52],[50,54,57],[43,47,50],[40,43,47],[45,49,52]];
const harmoniesB=[[47,50,54],[43,47,50],[50,54,57],[45,49,52],[47,50,54],[43,47,50],[45,49,52],[50,54,57]];
export function practiceReelNotes():MusicNote[]{
  const notes:MusicNote[]=[];
  for(let phrase=0;phrase<4;phrase++){
    const melody=phrase<2?A:B,harmonies=phrase<2?harmoniesA:harmoniesB,offset=phrase*16;
    for(let bar=0;bar<8;bar++){
      const start=offset+bar*2;
      melody[bar].forEach((midi,i)=>notes.push({beat:start+i*.25,duration:.235,midi,velocity:i%4===0?.68:i%2===0?.54:.47,voice:'lead',pan:-.05}));
      const chord=harmonies[bar];
      notes.push({beat:start,duration:.72,midi:chord[0]-12,velocity:.64,voice:'bass',pan:-.18});
      chord.forEach((midi,i)=>notes.push({beat:start+1+i*.025,duration:.54,midi:midi+12,velocity:.19,voice:'chord',pan:.24}));
      // A quiet offbeat fifth gives a cut-time pulse without replacing the tune.
      notes.push({beat:start+1.5,duration:.29,midi:chord[0]-5,velocity:.26,voice:'bass',pan:-.18});
    }
  }
  return notes;
}
export interface StereoPCM {sampleRate:number;duration:number;channels:[Float32Array,Float32Array];peak:number;}
export function synthesizePracticeReel(sampleRate=22050,bpm=REEL_BPM):StereoPCM {
  if(!Number.isFinite(sampleRate)||sampleRate<8000||sampleRate>96000||!Number.isInteger(sampleRate)||!Number.isFinite(bpm)||bpm<30||bpm>240)throw new Error('Choose a supported sample rate and reel tempo.');
  const secondsPerBeat=60/bpm,duration=REEL_BEATS*secondsPerBeat,size=Math.ceil(duration*sampleRate),left=new Float32Array(size),right=new Float32Array(size);
  for(const note of practiceReelNotes()){
    const start=Math.round(note.beat*secondsPerBeat*sampleRate),length=Math.round(note.duration*secondsPerBeat*sampleRate),frequency=440*2**((note.midi-69)/12);
    const panLeft=Math.cos((note.pan+1)*Math.PI/4),panRight=Math.sin((note.pan+1)*Math.PI/4);
    for(let i=0;i<length&&start+i<size;i++){
      const time=i/sampleRate,u=i/length,attack=Math.min(1,time/.006),release=Math.min(1,(1-u)/.10);
      const phase=2*Math.PI*frequency*time+(note.voice==='lead'?.012*Math.sin(2*Math.PI*5.1*time):0);
      let wave:number,envelope:number;
      if(note.voice==='lead'){wave=Math.sin(phase)+.30*Math.sin(2*phase)+.15*Math.sin(3*phase)+.06*Math.sin(4*phase);envelope=(.68+.32*Math.exp(-7*u))*attack*release;}
      else if(note.voice==='bass'){wave=Math.sin(phase)+.18*Math.sin(2*phase);envelope=Math.exp(-4.2*u)*attack*release;}
      else{wave=Math.sin(phase)+.25*Math.sin(2*phase)+.1*Math.sin(3*phase);envelope=Math.exp(-3.8*u)*attack*release;}
      const value=wave*envelope*note.velocity*.25;
      left[start+i]+=value*panLeft;right[start+i]+=value*panRight;
    }
  }
  // Short, low-level room reflections, followed by a fixed peak ceiling.
  const d1=Math.round(.037*sampleRate),d2=Math.round(.071*sampleRate);
  for(let i=size-1;i>=d2;i--){left[i]+=.055*right[i-d1]+.025*left[i-d2];right[i]+=.055*left[i-d1]+.025*right[i-d2];}
  let peak=0;for(let i=0;i<size;i++)peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
  const gain=peak>0?.72/peak:1;
  for(let i=0;i<size;i++){const edge=Math.min(1,i/(sampleRate*.003),(size-1-i)/(sampleRate*.006));left[i]*=gain*Math.max(0,edge);right[i]*=gain*Math.max(0,edge);}
  return{sampleRate,duration,channels:[left,right],peak:.72};
}
