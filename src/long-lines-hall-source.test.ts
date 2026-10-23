import {compileBecketLongLinesStep} from './becket-long-lines-step.ts';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';import {readContraDbImport} from './contradb-import.ts';import {lowerHallLineSource,lowerHallLinePolicy} from './source-hall-line.ts';import {compileHallLineSequence} from './hall-line-sequence.ts';import {compileHallLinePolicyDance} from './hall-line-policy.ts';import {compileChoreography} from './choreography.ts';import {REGISTERED_MOTION_CAPABILITIES} from './capabilities.ts';
const raw=readFileSync(new URL('../test-data/contradb/257.json',import.meta.url),'utf8'),review=prepareContraDbReview(raw),dance=review.result.dance!;
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z),wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));
for(const count of[3,4,6])test(`257 actual line, carried ring, counted event and independent ${count}-couple finite people`,()=>{
 const p=compileHallLineSequence(lowerHallLinePolicy(dance.hallLinePolicy!).program,count),pairs=Math.floor(count/2),slots=Array.from({length:count},(_,id)=>({id,side:id%2?-1:1,rank:2*Math.floor(id/2)-(pairs-1)}));if(count%2){slots[count-1].side=-1;slots[count-1].rank=pairs+1;}
 const bind=()=>{const neighbors=new Map<number,number>(),groups:number[][]=[],active=new Set<number>();for(const a of slots.filter(s=>s.side===1)){const b=slots.find(s=>s.side===-1&&s.rank===a.rank);if(b){groups.push([2*a.id,2*a.id+1,2*b.id,2*b.id+1]);for(const[x,y]of[[2*a.id,2*b.id+1],[2*a.id+1,2*b.id]]){neighbors.set(x,y);neighbors.set(y,x);}active.add(a.id);active.add(b.id);}}return{neighbors,groups,waiting:slots.filter(s=>!active.has(s.id)).flatMap(s=>[2*s.id,2*s.id+1]).sort((a,b)=>a-b)};};
 let minGap=Infinity,maxSpeed=0,maxYaw=0,maxReach=0,heldTurns=0,longLineHands=0,swingFrames=0,carriedRings=0,roleHands=0;let prior=p.sample(0);
 for(let repeat=0;repeat<2*count;repeat++){
  const before=bind(),base=repeat*64,initial=p.sample(base);
  for(const group of before.groups){const zs=group.map(id=>initial.poses[id].position.z);assert.ok(Math.max(...zs)-Math.min(...zs)<1e-7,'source starts in a real straight line');for(let i=0;i<4;i++){assert.ok(Math.abs(initial.poses[group[i]].position.x-(1.5-i)*.9)<1e-7);assert.ok(Math.abs(wrap(initial.poses[group[i]].yaw))<1e-7);}const at16=p.sample(base+16);assert.equal(at16.contacts.filter(h=>group.includes(h.a)).length,4);for(const id of group){const contact=at16.contacts.filter(h=>h.a===id||h.b===id);assert.equal(contact.length,2);}carriedRings++;}
  for(const s of slots)s.rank+=s.side;const after=bind();for(const s of slots)if(after.waiting.includes(2*s.id))s.side*=-1;
  for(let tick=repeat?0:1;tick<4096;tick++){
   const local=tick/64,f=p.sample(base+local),want=local<40?before:after,top=p.topology(base+local);assert.equal(top.epoch,repeat+Number(local>=40));assert.deepEqual([...top.waitingIds].sort((a,b)=>a-b),want.waiting);assert.equal(top.neighbor.length,want.neighbors.size);for(const[a,b]of top.neighbor)assert.equal(b,want.neighbors.get(a));
   for(const q of f.poses){maxSpeed=Math.max(maxSpeed,gap(q.position,prior.poses[q.id].position)*64);maxYaw=Math.max(maxYaw,Math.abs(wrap(q.yaw-prior.poses[q.id].yaw))*64);}for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minGap=Math.min(minGap,gap(f.poses[a].position,f.poses[b].position));
   const hands=new Set<string>();for(const h of f.contacts){assert.ok(!want.waiting.includes(h.a)&&!want.waiting.includes(h.b));for(const[id,hand]of[[h.a,h.handA],...(!h.target||h.target==='hands'?[[h.b,h.handB]]:[])] as [number,string][]){const key=id+':'+hand;assert.ok(!hands.has(key),'no duplicated hand');hands.add(key);const q=f.poses[id],side=hand==='left'?1:-1;maxReach=Math.max(maxReach,Math.hypot(h.point.x-q.position.x-side*.235*Math.cos(q.yaw),h.point.y-1.355,h.point.z-q.position.z+side*.235*Math.sin(q.yaw)));}
    if(h.strength>.99){if(local>4&&local<8){assert.equal(h.b,h.a^1);heldTurns++;}if(local>=33&&local<37){assert.ok(Math.abs(f.poses[h.a].position.x-f.poses[h.b].position.x)<1e-7);longLineHands++;}if(local>48&&local<54&&h.kind==='joined'){assert.equal(h.a%2,1);assert.equal(h.b%2,1);assert.notEqual(h.a^1,h.b);assert.equal(h.handA,'right');assert.equal(h.handB,'right');assert.equal(want.neighbors.get(h.a),h.b^1);roleHands++;}if(h.kind==='swing-frame'){assert.equal(h.b,local>=55? h.a^1:want.neighbors.get(h.a));swingFrames++;}}
   }prior=f;
  }
  
  for(const local of[16,24,32,40,48,56,64]){const a=p.sample(base+local-1e-7),b=p.sample(base+local);for(const q of b.poses){assert.ok(gap(q.position,a.poses[q.id].position)<1e-5);assert.ok(Math.abs(wrap(q.yaw-a.poses[q.id].yaw))<1e-5);}const key=(h:any)=>h.kind==='joined'?[`${h.a}:${h.handA}`,`${h.b}:${h.handB}`].sort().join(':'):[h.a,h.handA,h.b,h.handB,h.kind,h.target??'hands'].join(':');const A=new Map(a.contacts.map((h:any)=>[key(h),h])),B=new Map(b.contacts.map((h:any)=>[key(h),h]));for(const k of new Set([...A.keys(),...B.keys()])){const x=A.get(k) as any,y=B.get(k) as any;assert.ok(Math.abs((x?.strength??0)-(y?.strength??0))<1e-5,`contact strength seam ${local} ${k}`);if(x&&y&&Math.max(x.strength,y.strength)>1e-5)assert.ok(Math.hypot(x.point.x-y.point.x,x.point.y-y.point.y,x.point.z-y.point.z)<1e-5,`contact target seam ${local} ${k}`);}}
 }
 assert.ok(heldTurns&&longLineHands&&swingFrames&&carriedRings&&roleHands);assert.ok(minGap>.45,String(minGap));assert.ok(maxSpeed<1.8,String(maxSpeed));assert.ok(maxYaw<4,String(maxYaw));assert.ok(maxReach<=.64,String(maxReach));const end=p.sample(128*count),first=p.sample(0);for(const q of end.poses){assert.ok(gap(q.position,first.poses[q.id].position)<1e-7);assert.ok(Math.abs(wrap(q.yaw-first.poses[q.id].yaw))<1e-7);}console.log({count,minGap,maxSpeed,maxYaw,maxReach,heldTurns,longLineHands,swingFrames,roleHands});
 const publicPlan=compileChoreography(dance,count);for(const beat of[0,16,24,32,56,64,128*count])for(const q of publicPlan.sample(beat).poses)assert.ok(gap(q.position,p.sample(beat).poses[q.id].position)<1e-7);
});

test('257 retains counted source and removable explicit ordered-line interpretation',()=>{
 assert.ok(dance,review.result.errors.join(';'));
 assert.deepEqual(dance.sourceRecord.rows.map(r=>r.beats),[8,8,8,8,8,8,8,8]);assert.deepEqual(dance.figures.map(f=>f.beats),[16,8,8,8,8,8,8]);
 assert.equal(dance.progressionEvents?.[0].afterFigureId,dance.figures[3].id);
 assert.equal(readContraDbImport(raw).dance,undefined);
 const archive=readFileSync(new URL('../test-data/reviewed-interpretations/257.json',import.meta.url),'utf8');assert.deepEqual(JSON.parse(archive).snapshot,JSON.parse(raw));assert.deepEqual(readContraDbImport(archive).dance,dance);
 for(const change of[(r:any)=>r.preamble='',(r:any)=>r.preamble=r.preamble.replace('ladle one','ladle two'),(r:any)=>r.notes+=' Change places.',(r:any)=>r.hook='Two swings',(r:any)=>r.rows[4].progression=false,(r:any)=>r.rows[4].beats=4]){const r=structuredClone(dance.sourceRecord);change(r);assert.throws(()=>lowerHallLineSource(r,review.interpretation.hallLine!));}
 const c=structuredClone(review.interpretation);delete c.hallLine;assert.equal(readContraDbImport(raw,{interpretation:c}).dance,undefined);
});

test('long-lines endpoint owns actual boundary and rejects unconsumed declarations or held ingress',()=>{
 const program=lowerHallLinePolicy(dance.hallLinePolicy!).program,p=compileHallLineSequence(program,3),round=p.rounds[0],event=round.event;
 const figure=program.figures.find(f=>f.kind==='long-lines')!,{preparation,...options}=program.eventOptions,entry=structuredClone(event.entryState);
 const make=(f:any=figure,e:any=entry,o:any=options)=>compileBecketLongLinesStep(f,e,round.before,o);
 assert.deepEqual(make().exitState,event.exitState);
 for(const patch of[{direction:'right'},{amount:.5},{who:'partner'},{beats:4},{progression:false},{hands:'both'}])assert.throws(()=>make({...figure,...patch}));
 assert.throws(()=>make(figure,entry,{...options,preparation}));assert.throws(()=>make(figure,entry,{...options,endTurnBeats:4}));
 const bad=structuredClone(entry);bad.poses[0].position.x+=.1;assert.throws(()=>make(figure,bad));
 const facing=structuredClone(entry);facing.poses[0].yaw+=.1;assert.throws(()=>make(figure,facing));
 const held=structuredClone(entry);held.heldContacts=[{a:0,b:3,handA:'left',handB:'right',kind:'joined',point:{x:0,y:1,z:0},strength:1}];assert.throws(()=>make(figure,held));
 const shifted=structuredClone(entry);for(const q of shifted.poses){q.position.x+=3;q.position.z-=5;}const moved=make(figure,shifted);
 for(const beat of[32,34,36,38,40]){const a=event.sample(beat),b=moved.sample(beat);for(const q of a.poses){assert.ok(Math.abs(b.poses[q.id].position.x-q.position.x-3)<1e-7);assert.ok(Math.abs(b.poses[q.id].position.z-q.position.z+5)<1e-7);}}
 assert.deepEqual([...moved.endBinding.relations.neighbor],[...event.endBinding.relations.neighbor]);
});
