import test from 'node:test';import assert from 'node:assert/strict';
import {readContraDbSource} from './contradb-source.ts';
import {compileDoubleProgressionImproper,type CompiledDoubleProgression} from './double-progression-improper.ts';
import {compileChoreography} from './choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
import {compileProgressingDoSiDoFigure} from './double-progression-figures.ts';
import {withBalanceStance} from './stance.ts';
import {createDancers,initialPoses} from './engine.ts';
import {bindDirectedCoupleSlots} from './progression-topology.ts';
import {reviewed928,raw928} from '../test-data/double-progression/fixture.ts';
import type {Pose} from './types.ts';
const dist=(a:Pose,b:Pose)=>Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z),angle=(a:Pose,b:Pose)=>Math.abs(Math.atan2(Math.sin(a.yaw-b.yaw),Math.cos(a.yaw-b.yaw))),corners=(poses:Pose[])=>[...poses].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);
const make=(n:number)=>{const{dance,policy}=reviewed928();return compileChoreography(dance,n) as CompiledDoubleProgression;};
const logical=(c:CompiledDoubleProgression)=>c.formationSample??c.sample;

test('actual928 retains exact source credit,64counts, both distinct neighbor clauses and a separately reviewed end choice',()=>{
 const r=readContraDbSource(raw928()).record!,{dance,policy}=reviewed928();assert.equal(r.sourceUrl,'https://contradb.com/dances/928');assert.equal(r.title,'A Summer Night in Seattle');assert.equal(r.author,'Mike Richardson');assert.equal(r.notes,'Double progression');assert.deepEqual(r.rows.map(r=>r.beats),[16,6,10,6,10,8,8]);assert.equal(r.rows[4].text,'neighbors do si do 1½ look for new neighbors');assert.equal(r.rows[4].progression,false);assert.equal(r.rows[6].progression,true);assert.deepEqual(dance.figures.map(f=>f.beats),[4,12,6,10,6,10,4,4,8]);assert.deepEqual(dance.progressionEvents!.map(e=>e.source.clause),[r.rows[4].text,r.rows[6].text]);assert.equal(policy.source.basis,'reviewed-interpretation');assert.match(policy.source.clause,/first eight beats/);
});

test('independent literal source corner oracle fixes both circle amounts and the complete extra DSD half passage',()=>{
 const c=make(2);for(const[beat,expected]of[[0,[1,0,3,2]],[16,[2,3,0,1]],[22,[3,0,1,2]],[32,[2,1,0,3]],[38,[1,0,3,2]],[48,[2,3,0,1]]]as const)assert.deepEqual(corners(logical(c)(beat).poses),expected,`corners at${beat}`);
 const dancers=createDancers(2),start=initialPoses(dancers),binding=bindDirectedCoupleSlots(dancers,0,[{coupleId:0,rank:0,direction:1},{coupleId:1,rank:1,direction:-1}]),f=reviewed928().dance.figures[5],p=compileProgressingDoSiDoFigure(f,{ids:[0,1,2,3],start,dancers,relations:binding.relations,bindingEpoch:0});
 const gates:number[]=[];let old=p.position(0,0).z-p.position(3,0).z;for(let i=1;i<=10000;i++){const t=i/10000,value=p.position(0,t).z-p.position(3,t).z;if(value*old<0){let a=(i-1)/10000,b=t;for(let j=0;j<40;j++){const m=(a+b)/2;if((p.position(0,a).z-p.position(3,a).z)*(p.position(0,m).z-p.position(3,m).z)<=0)b=m;else a=m;}gates.push((a+b)/2);}if(Math.abs(value)>1e-12)old=value;}
 assert.equal(gates.length,3);for(const [i,t]of gates.entries())for(const id of[0,1,2,3]){const other=binding.relations.neighbor.get(id)!,a=p.position(id,t),b=p.position(other,t),yaw=p.facing(id,t,[]),otherRight=-(b.x-a.x)*Math.cos(yaw)+(b.z-a.z)*Math.sin(yaw);assert.equal(Math.sign(otherRight),i===1?-1:1,`actual shoulder${i}/${id}`);assert.ok(Math.abs(otherRight)>.899999);assert.ok(Math.abs(Math.atan2(Math.sin(yaw-start[id].yaw),Math.cos(yaw-start[id].yaw)))<1e-8);}
 for(const id of[0,1,2,3])assert.ok(Math.hypot(p.position(id,1).x-start[binding.relations.neighbor.get(id)!].position.x,p.position(id,1).z-start[binding.relations.neighbor.get(id)!].position.z)<1e-8);
});

/** Independent integer-row exchange oracle. It does not call the production
 * topology helpers, use nearest roots, or copy the adapter's endpoint map. */
function oracle(couples:number){let order=Array.from({length:couples},(_,i)=>i),direction=order.map(i=>i%2?-1:1);return{snapshot(){const neighbors:Array<[number,number]>=[],waiting:number[]=[];for(let r=0;r<couples;){const a=order[r],b=order[r+1];if(b!==undefined&&direction[a]===1&&direction[b]===-1){neighbors.push([2*a,2*b+1],[2*a+1,2*b]);r+=2;}else{waiting.push(2*a,2*a+1);r++;}}return{neighbors:neighbors.map(([a,b])=>[Math.min(a,b),Math.max(a,b)]).sort((a,b)=>a[0]-b[0]),waiting:waiting.sort((a,b)=>a-b),order:[...order],direction:[...direction]};},step(){const next=[...order];for(let r=0;r<couples;){const a=order[r],b=order[r+1];if(b!==undefined&&direction[a]===1&&direction[b]===-1){next[r]=b;next[r+1]=a;r+=2;}else{assert.ok(r===0||r===couples-1);direction[a]*=-1;r++;}}order=next;}};}

test('all2–12couple complete periods match two independent transactions, persistent partners, exact endpoints and every possible encounter',()=>{
 for(let n=2;n<=12;n++){const c=make(n),o=oracle(n),encounters=new Set<string>();assert.equal(c.periodRounds,n);for(let epoch=0;epoch<2*n;epoch++){const repeat=Math.floor(epoch/2),local=epoch%2?48:0,beat=repeat*64+local,expected=o.snapshot(),actual=c.topology(beat);assert.equal(actual.epoch,epoch);assert.deepEqual([...actual.neighbors].sort((a,b)=>a[0]-b[0]),expected.neighbors);assert.deepEqual([...actual.waitingIds].sort((a,b)=>a-b),expected.waiting);assert.deepEqual(actual.partners,Array.from({length:n},(_,i)=>[2*i,2*i+1]));const used=new Set<number>();for(const[a,b]of actual.neighbors){assert.notEqual(Math.floor(a/2),Math.floor(b/2));assert.ok(!used.has(a)&&!used.has(b));used.add(a);used.add(b);encounters.add([Math.floor(a/2),Math.floor(b/2)].sort((x,y)=>x-y).join(':'));}for(let rank=0;rank<n;rank++)for(const id of[2*expected.order[rank],2*expected.order[rank]+1]){const p=logical(c)(beat).poses[id];assert.ok(Math.abs(p.position.z-(rank-(n-1)/2)*1.8)<1e-6);assert.ok(Math.abs(p.position.x-.9*(id%2?-1:1)*expected.direction[Math.floor(id/2)])<1e-6);}o.step();}
 assert.equal(encounters.size,n*(n-1)/2);for(const beat of[0,17,39.5,48,54,63.9])for(const p of logical(c)(beat).poses){assert.ok(dist(p,logical(c)(n*64+beat).poses[p.id])<1e-7);assert.ok(angle(p,logical(c)(n*64+beat).poses[p.id])<1e-7);}
 }
});

test('two-couple missing intermediate neighbors stay absent and each physical-end wait is compact, stationary and contact-free',()=>{
 const two=make(2);assert.deepEqual(two.topology(48).neighbors,[]);assert.equal(two.topology(48).waitingIds.length,4);for(const beat of[48,50,52,56,60,63.999]){const frame=logical(two)(beat);assert.equal(frame.contacts.length,0);assert.ok(frame.poses.every(p=>p.activity==='waiting'));}assert.equal(two.topology(64).neighbors.length,2);assert.ok(two.sample(60).warnings.some(w=>w.includes('Re-enter at the declared neighbor change on count 65.')));
 for(const n of[2,3,6]){const c=make(n);for(let r=0;r<n;r++)for(const local of[0,48]){const at=r*64+local,stop=r*64+(local===0?48:64),binding=c.topology(at);for(const id of binding.waitingIds){const a=logical(c)(at).poses[id],z=a.position.z;for(let beat=at;beat<stop;beat+=.25){const p=logical(c)(beat).poses[id];assert.ok(Math.abs(p.position.z-z)<=1.36);assert.equal(p.activity,'waiting');assert.ok(!logical(c)(beat).contacts.some(h=>h.a===id||h.b===id));}for(const beat of[at+8,at+10,stop-1e-5])assert.ok(dist(logical(c)(at+8).poses[id],logical(c)(beat).poses[id])<1e-8);}}}
});

test('every logical and presented figure/repeat join is continuous across the complete finite periods',()=>{
 for(const n of[2,3,6,12]){const c=withBalanceStance(make(n));for(let r=0;r<n;r++)for(const b of[...c.starts,64]){const at=r*64+b;if(!at)continue;for(const sample of[c.sample,c.formationSample!]){const left=sample(at-1e-7),right=sample(at);for(const p of right.poses){assert.ok(dist(p,left.poses[p.id])<1e-5,`root${n}/${at}/${p.id}`);assert.ok(angle(p,left.poses[p.id])<1e-5,`yaw${n}/${at}/${p.id}`);}}}}
});

test('source counts, event epochs, end choice and every modifier fail closed; input/output mutation cannot change a compiled dance',()=>{
 const{dance,policy}=reviewed928(),c=compileDoubleProgressionImproper(dance,3,policy),before=c.sample(53);dance.figures[5].amount=1;dance.progressionEvents![0].source.clause='mutated';policy.source.clause='mutated';assert.deepEqual(c.sample(53),before);assert.throws(()=>{c.dance.figures[0].beats=6;});assert.throws(()=>{c.progressionBeats[0]=0;});
 for(const mutate of[(d:any)=>d.progressionEvents.pop(),(d:any)=>d.progressionEvents[0].count=2,(d:any)=>d.progressionEvents.reverse(),(d:any)=>d.progressionEvents[0].initialBinding='retain-starting-neighbors',(d:any)=>d.figures[5].amount=1,(d:any)=>d.figures[5].beats=8,(d:any)=>d.figures[2].beats=8,(d:any)=>d.figures[5].direction='left',(d:any)=>delete d.figures[5].progression,(d:any)=>d.figures[0].progression=true,(d:any)=>d.figures[4].newMove=true,(d:any)=>d.figures[8].starGrip='wrist-grip',(d:any)=>d.figures[1].exit='face-down-line',(d:any)=>d.endPolicy.sameEndTurnBeats=4,(d:any)=>d.endPolicy.source.basis='source-explicit',(d:any)=>delete d.endPolicy.reentryPreparationBeats,(d:any)=>d.endPolicy.reentryPreparationBeats=4]){const data=reviewed928();mutate(data.dance);for(const n of[2,3])assert.throws(()=>compileDoubleProgressionImproper(data.dance,n,data.policy));}
 const data=reviewed928();assert.throws(()=>compileDoubleProgressionImproper(data.dance,3,undefined as any));assert.throws(()=>compileDoubleProgressionImproper(data.dance,3,{...data.policy,sameEndTurnBeats:4}as any));assert.throws(()=>compileDoubleProgressionImproper(data.dance,3,{...data.policy,source:{...data.policy.source,basis:'source-explicit'}}));
});

test('public end presentation waits still, then steps through only the declared two-count balance preparation without early rebinding',()=>{
 for(const n of[2,3,6]){const c=make(n);for(let r=0;r<n;r++)for(const local of[0,48]){const start=r*64+local,end=r*64+(local===0?48:64),waiting=c.topology(start).waitingIds;if(!waiting.length)continue;const next=c.topology(end),nextPairs=new Set(next.neighbors.map(([a,b])=>[Math.min(a,b),Math.max(a,b)].join(':')));
  for(const id of waiting){const settled=c.sample(start+8).poses[id];assert.ok(dist(settled,c.sample(end-2).poses[id])<1e-8);const preparing=c.sample(end-1).poses[id];assert.ok(dist(preparing,settled)>.1);assert.ok(preparing.stride>0,'A moving waiting actor must step rather than slide.');assert.equal(preparing.activity,'waiting');assert.ok(c.topology(end-1).waitingIds.includes(id));assert.ok(!next.waitingIds.includes(id));}
  const cues=c.sample(end-1).warnings.filter(w=>w.startsWith('Couple '));assert.equal(cues.length,waiting.length/2);for(const cue of cues){assert.match(cue,/prepare to re-enter/);assert.ok(!cue.includes('compact same-end exchange'));assert.ok(cue.endsWith(`Re-enter at the declared neighbor change on count ${end+1}.`));}
  for(const beat of[end-1,end-.25,end-.01])for(const contact of c.sample(beat).contacts.filter(h=>waiting.includes(h.a)||waiting.includes(h.b)))assert.ok(nextPairs.has([Math.min(contact.a,contact.b),Math.max(contact.a,contact.b)].join(':')),'Preparatory hand pickup must name the actual next-epoch neighbor.');
 }}
});

test('public dispatch rejects an explicitly disabled double-progression capability and missing or changed reentry preparation',()=>{
 const {dance}=reviewed928();
 assert.throws(()=>compileChoreography(dance,3,{...REGISTERED_MOTION_CAPABILITIES,doubleProgressions:false}),/Two physical progressions/);
 for(const change of[(policy:any)=>delete policy.reentryPreparationBeats,(policy:any)=>policy.reentryPreparationBeats=4]){const altered=structuredClone(dance);change(altered.endPolicy);assert.throws(()=>compileChoreography(altered,3),/Two physical progressions/);}
});
