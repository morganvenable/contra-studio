import test from 'node:test';import assert from 'node:assert/strict';
import {compileChoreography} from './choreography.ts';import {DANCES} from './catalog.ts';
const dist=(a:any,b:any)=>Math.hypot(a.x-b.x,a.z-b.z);
test('finite end exchanges finish in eight beats, then wait without creeping across the phrase',()=>{
 for(const dance of DANCES)for(const count of [2,3,6,12]){
  const c=compileChoreography(dance,count),begin=dance.formation==='becket'?6:4,end=begin+8;
  for(let round=0;round<2*count;round++){
   const offset=round*c.totalBeats,waiting=c.sample(offset+begin).poses.filter(p=>p.activity==='waiting').map(p=>p.id);
   for(const id of waiting){const start=c.sample(offset+begin).poses[id],finish=c.sample(offset+end).poses[id];assert.ok(dist(start.position,finish.position)>1,`${dance.title}: an end dancer must actually exchange sides`);
    for(const beat of [begin-.1,begin-1])assert.ok(dist(c.sample(offset+beat).poses[id].position,start.position)<1e-8);
    for(const beat of [end+.1,32,48,60])assert.ok(dist(c.sample(offset+beat).poses[id].position,finish.position)<1e-8,`${dance.title}: waiting dancer ${id} creeps after beat ${end}`);
    for(const boundary of [begin,end]){const a=c.sample(offset+boundary-1e-6).poses[id],b=c.sample(offset+boundary+1e-6).poses[id];assert.ok(dist(a.position,b.position)<1e-6);}
   }
  }
 }
});
test('stored balances are four dance beats: 2.143 seconds at 112 bpm, immediately followed by swing',()=>{
 for(const dance of DANCES){const c=compileChoreography(dance);for(const [i,f] of dance.figures.entries())if(f.kind==='balance'){
  assert.equal(f.beats,4);assert.equal(dance.figures[i+1]?.kind,'swing');assert.ok(Math.abs(f.beats*60/112-2.142857142857143)<1e-12);
  assert.equal(c.sample(c.starts[i]+3.999).figureIndex,i);assert.equal(c.sample(c.starts[i]+4).figureIndex,i+1);
 }}
});
