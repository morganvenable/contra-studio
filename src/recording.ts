/** Conservative local-file preflight. Metadata is read before allocating PCM;
 * unknown channel layouts reject rather than assuming stereo. */
export const RECORDING_MAX_SECONDS=360;
export const RECORDING_MAX_PCM_BYTES=64*1024*1024;
export const RECORDING_MAX_FILE_BYTES=32*1024*1024;
export const RECORDING_DECODE_RATE=22050;
export interface RecordingMetadata {duration:number;channels:number;}
export interface LocalRecordingFile {name:string;size:number;arrayBuffer():Promise<ArrayBuffer>;slice?(start?:number,end?:number):Blob;}
const ascii=(bytes:Uint8Array,start:number,length:number)=>String.fromCharCode(...bytes.subarray(start,start+length));
/** Header checks are format-specific resource estimates, not a hostile-file
 * security boundary. Decoded channel count and memory are checked again. */
export function recordingChannels(bytes:Uint8Array):number|undefined {
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
 if(bytes.length>=12&&ascii(bytes,0,4)==='RIFF'&&ascii(bytes,8,4)==='WAVE'){
  for(let offset=12;offset+8<=bytes.length;){const size=view.getUint32(offset+4,true);if(ascii(bytes,offset,4)==='fmt '&&size>=16&&offset+24<=bytes.length)return view.getUint16(offset+10,true);offset+=8+size+(size%2);}
 }
 if(bytes.length>=26&&ascii(bytes,0,4)==='fLaC')return((bytes[20]>>1)&7)+1;
 for(let i=0;i+28<bytes.length;i++){
  if(bytes[i]===79&&ascii(bytes,i,8)==='OpusHead')return bytes[i+9];
  if(bytes[i]===1&&ascii(bytes,i+1,6)==='vorbis')return bytes[i+11];
  if(bytes[i]===109&&ascii(bytes,i,4)==='mp4a'&&i>=4){const boxSize=view.getUint32(i-4),channels=view.getUint16(i+20);if(boxSize>=36&&channels>=1&&channels<=32)return channels;}
 }
 let start=0;if(bytes.length>=10&&ascii(bytes,0,3)==='ID3')start=10+((bytes[6]&127)<<21)+((bytes[7]&127)<<14)+((bytes[8]&127)<<7)+(bytes[9]&127);
 else if(bytes[0]!==255||(bytes[1]&224)!==224)return undefined;
 for(let i=start;i+4<bytes.length&&i<start+65536;i++){
  const a=bytes[i+1],b=bytes[i+2];if(bytes[i]===255&&(a&224)===224&&(a&6)!==0&&(a&24)!==8&&(b&240)!==0&&(b&240)!==240&&(b&12)!==12)return(bytes[i+3]>>6)===3?1:2;
 }
 return undefined;
}
export function assertRecordingBudget(metadata:RecordingMetadata,sampleRate:number){
 if(!Number.isFinite(metadata.duration)||metadata.duration<=0||metadata.duration>RECORDING_MAX_SECONDS)throw new Error('Choose an audio excerpt no longer than 6 minutes.');
 if(!Number.isInteger(metadata.channels)||metadata.channels<1||metadata.channels>8)throw new Error('This recording has an unsupported channel layout. Use a mono or stereo WAV/MP3 excerpt.');
 if(!Number.isFinite(sampleRate)||sampleRate<8000)throw new Error('The browser reported an invalid audio sample rate.');
 const estimatedBytes=Math.ceil(metadata.duration*sampleRate)*metadata.channels*4;
 if(estimatedBytes>RECORDING_MAX_PCM_BYTES)throw new Error('This recording would exceed the 64 MB decoded-audio budget. Choose a shorter mono or stereo excerpt.');
 return estimatedBytes;
}
export async function inspectLocalRecording(file:LocalRecordingFile):Promise<RecordingMetadata>{
 if(!file.slice)throw new Error('Choose an actual local audio file.');
 const head=new Uint8Array(await file.slice(0,2*1024*1024).arrayBuffer());let channels=recordingChannels(head);
 if(channels===undefined&&file.size>head.length){const tail=new Uint8Array(await file.slice(Math.max(0,file.size-2*1024*1024)).arrayBuffer());channels=recordingChannels(tail);}
 if(channels===undefined)throw new Error('This file’s channel layout could not be verified before decoding. Use a standard mono/stereo WAV, MP3, FLAC, Ogg, or M4A file.');
 const duration=await new Promise<number>((resolve,reject)=>{
  const audio=new Audio(),url=URL.createObjectURL(file as unknown as Blob);let settled=false;
  const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timeout);const value=audio.duration;audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);error?reject(error):resolve(value);};
  const timeout=setTimeout(()=>finish(new Error('The browser could not read local audio metadata in time. Try a WAV or MP3 excerpt.')),12000);
  audio.addEventListener('loadedmetadata',()=>finish(),{once:true});audio.addEventListener('error',()=>finish(new Error('This browser could not read the audio file. Try a WAV or MP3 excerpt.')),{once:true});audio.preload='metadata';audio.src=url;audio.load();
 });
 return{duration,channels};
}
