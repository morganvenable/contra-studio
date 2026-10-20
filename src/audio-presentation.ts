/** Web Audio's render clock leads the physical output. Prefer the timestamp
 * mapping defined by the Web Audio spec; latency fallback is only an estimate.
 * https://www.w3.org/TR/webaudio-1.1/#dom-audiocontext-getoutputtimestamp */
export interface OutputClock {currentTime:number;baseLatency?:number;outputLatency?:number;getOutputTimestamp?:()=>{contextTime?:number;performanceTime?:number};}
export interface AudioPresentationTime {time:number;method:'output-timestamp'|'latency-estimate'|'render-clock';estimatedLag:number;}
export function audioPresentationTime(context:OutputClock,performanceTime:number):AudioPresentationTime {
 const now=context.currentTime;if(!Number.isFinite(now)||!Number.isFinite(performanceTime))throw new Error('Audio presentation clocks must be finite.');
 try{const stamp=context.getOutputTimestamp?.();if(stamp&&Number.isFinite(stamp.contextTime)&&Number.isFinite(stamp.performanceTime)&&stamp.contextTime!>=0&&stamp.performanceTime!>0&&Math.abs(performanceTime-stamp.performanceTime!)<1000){const time=Math.max(0,Math.min(now,stamp.contextTime!+(performanceTime-stamp.performanceTime!)/1000));return{time,method:'output-timestamp',estimatedLag:now-time};}}catch{/* Unsupported device timestamp; use its explicit latency estimate. */}
 const latency=[context.baseLatency,context.outputLatency].reduce<number>((sum,value)=>sum+(Number.isFinite(value)&&value!>0?value!:0),0),time=Math.max(0,now-Math.min(latency,2));
 return{time,method:latency>0?'latency-estimate':'render-clock',estimatedLag:now-time};
}
