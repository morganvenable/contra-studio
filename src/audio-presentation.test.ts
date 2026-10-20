import test from 'node:test';import assert from 'node:assert/strict';
import {audioPresentationTime} from './audio-presentation.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('physical output timestamp maps to presentation time without double-subtracting latency',()=>{
 const clock={currentTime:10,baseLatency:.02,outputLatency:.08,getOutputTimestamp:()=>({contextTime:9.84,performanceTime:1000})};
 const out=audioPresentationTime(clock,1060);near(out.time,9.9);near(out.estimatedLag,.1);assert.equal(out.method,'output-timestamp');
 near(audioPresentationTime({...clock,getOutputTimestamp:()=>({contextTime:10,performanceTime:1000})},1060).time,10);
});
test('invalid or stale output timestamps fall back to explicit latency estimates',()=>{
 for(const stamp of [{contextTime:0,performanceTime:0},{contextTime:NaN,performanceTime:1000},{contextTime:9,performanceTime:1}]){
  const out=audioPresentationTime({currentTime:10,baseLatency:.02,outputLatency:.08,getOutputTimestamp:()=>stamp},1060);near(out.time,9.9);assert.equal(out.method,'latency-estimate');
 }
 const fallback=audioPresentationTime({currentTime:.04,baseLatency:.1,getOutputTimestamp:()=>{throw new Error('unsupported');}},2000);near(fallback.time,0);
 assert.equal(audioPresentationTime({currentTime:10},1000).method,'render-clock');
 assert.throws(()=>audioPresentationTime({currentTime:NaN},1000),/finite/);
});
