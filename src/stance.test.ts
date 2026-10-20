import test from 'node:test';
import assert from 'node:assert/strict';
import {compileChoreography} from './choreography.ts';
import {DANCES} from './catalog.ts';
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const delta=(a:number,b:number)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));

test('balance starts joined, places two counts inward and two outward, then closes before swing count one',()=>{
 for(const dance of DANCES){const c=compileChoreography(dance,6);assert.ok(c.formationSample);
  for(let repeat=0;repeat<4;repeat++)for(const[fi,f]of dance.figures.entries())if(f.kind==='balance'&&dance.figures[fi+1]?.kind==='swing'){
   const start=repeat*64+c.starts[fi],entry=c.sample(start),reference=c.formationSample(start);
   for(const p of entry.poses){const id=p.balance?.otherId;if(id===undefined||id<p.id)continue;
    assert.ok(Math.abs(gap(p.position,entry.poses[id].position)-1.18)<1e-8);
    assert.ok(Math.abs(gap(reference.poses[p.id].position,reference.poses[id].position)-1.8)<1e-8);
    let previous=1.18;for(let sample=0;sample<160;sample++){const count=sample/40;const frame=c.sample(start+count),d=gap(frame.poses[p.id].position,frame.poses[id].position);assert.ok(count<=2||count>3.25?d<=previous+1e-8:d>=previous-1e-8);previous=d;
     const hands=frame.contacts.filter(h=>(h.a===p.id&&h.b===id)||(h.a===id&&h.b===p.id));assert.equal(hands.length,count<3.25?2:3);assert.ok(hands.every(h=>h.strength>(count<3.25?.99:.8)),`${dance.title} count ${count}`);
    }
    assert.ok(Math.abs(gap(c.sample(start+2).poses[p.id].position,c.sample(start+2).poses[id].position)-.92)<1e-8);
   }
  }
 }
});
test('prepared balance entries have no positional or facing jumps over full finite circulation',()=>{
 for(const dance of DANCES)for(const couples of [2,3,6,12]){const c=compileChoreography(dance,couples);
  for(let repeat=0;repeat<=couples*2;repeat++)for(const start of c.starts){const b=repeat*64+start;if(!b)continue;const a=c.sample(b-1e-6),z=c.sample(b);for(const p of a.poses){assert.ok(gap(p.position,z.poses[p.id].position)<1e-5,`${dance.title} ${couples} ${b} ${p.id}`);assert.ok(delta(p.yaw,z.poses[p.id].yaw)<1e-4);}}
 }
});
test('actual stance sampling preserves identities, torso clearance and unique hand assignments',()=>{
 for(const dance of DANCES)for(const couples of [2,3,6,12]){const c=compileChoreography(dance,couples);
  for(let beat=0;beat<256;beat+=.125){const f=c.sample(beat);assert.equal(new Set(f.poses.map(p=>p.id)).size,couples*2);
   for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)assert.ok(gap(f.poses[a].position,f.poses[b].position)>.38,`${dance.title} ${couples} beat ${beat} ${a}/${b}`);
   const seen=new Set<string>();for(const h of f.contacts){const hands=[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])];for(const[id,hand]of hands){const key=`${id}:${hand}`;assert.ok(!seen.has(key),`${dance.title} ${beat} ${key}`);seen.add(key);}}
  }
 }
});
test('stance scrubbing is deterministic after cache eviction and huge finite seeks',()=>{
 for(const dance of DANCES){const c=compileChoreography(dance),expected=c.sample(1.3);for(let r=0;r<200;r++)c.sample(r*64+1);assert.deepEqual(c.sample(1.3),expected);for(const beat of [1e12,Number.MAX_SAFE_INTEGER])assert.ok(c.sample(beat).poses.every(p=>Number.isFinite(p.position.x)&&Number.isFinite(p.position.z)));}
});
