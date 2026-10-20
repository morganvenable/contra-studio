import test from'node:test';import assert from'node:assert/strict';
import{reviewedCrossTrails,CROSS_TRAILS_CAPABILITIES as caps}from'../test-data/cross-trails/source-fixture.ts';
import{readContraDbImport,normalizeContraDbRow}from'./contradb-import.ts';import{compileChoreography}from'./choreography.ts';import{distance,turn}from'./ring-twirl-contract.ts';import type{Figure}from'./types.ts';
const corners=[[-1,-1],[1,-1],[1,1],[-1,1]],near=(a:number,b:number)=>Math.abs(a-b)<1e-6;
test('actual2964 retains source attribution,64counts, ordered source passages and removable4+4 review/archive choice',()=>{
 const{raw,review,dance}=reviewedCrossTrails();assert.equal(dance.title,'Pure Ingredients');assert.equal(dance.author,'Yoyo Zhou');assert.equal(dance.formation,'duple-improper');assert.equal(dance.sourceRows.length,7);assert.deepEqual(dance.figures.map(f=>f.beats),[8,8,4,12,8,8,8,8]);assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);
 const last=dance.figures.at(-1)!;assert.equal(last.kind,'cross-trails');assert.equal(last.progression,true);assert.deepEqual(last.passages,[{relation:'partner',axis:'across',shoulder:'right'},{relation:'neighbor',axis:'along',shoulder:'left'}]);assert.deepEqual(last.phaseBeats,[4,4]);assert.deepEqual(review.interpretation.rows?.['contradb:2964:row:6'].crossTrails,{phaseBeats:[4,4]});
 const reread=readContraDbImport(dance.sourceText,{capabilities:caps});assert.deepEqual(reread.dance?.figures,dance.figures);assert.deepEqual(reread.interpretation,review.interpretation);assert.equal(reread.record?.original,review.result.record?.original);
 const choice=structuredClone(review.interpretation);delete choice.rows!['contradb:2964:row:6'].crossTrails;assert.equal(readContraDbImport(raw,{interpretation:choice,capabilities:caps}).dance,undefined);
 assert.equal(readContraDbImport(dance.sourceText,{capabilities:{...caps,crossTrails:false}}).dance,undefined);
 const forged={...JSON.parse(dance.sourceText),capabilities:{crossTrails:true},crossTrails:true};assert.equal(readContraDbImport(JSON.stringify(forged),{capabilities:{...caps,crossTrails:false}}).dance,undefined,'Untrusted archive fields cannot override the caller’s disabled gate');
 for(const change of[{phaseBeats:[3,5]},{phaseBeats:[4,4],extraTurn:true}]){const selected=structuredClone(review.interpretation);selected.rows!['contradb:2964:row:6'].crossTrails=change as any;assert.equal(readContraDbImport(raw,{interpretation:selected,capabilities:caps}).dance,undefined);}
 for(const text of['cross trails - partners across the set left shoulders, neighbors along the set right shoulders ⁋','cross trails - neighbors across the set right shoulders, partners along the set left shoulders ⁋',dance.sourceRows[6].text+' then swing'])assert.equal(normalizeContraDbRow({...dance.sourceRows[6],text},'duple-improper',review.interpretation.rows!['contradb:2964:row:6'],caps).resolved,false);
 const original=JSON.parse(raw),clause='cross trails - partners across the set right shoulders, neighbors along the set left shoulders ⁋';assert.ok(original.html.includes(clause));
 for(const replacement of[clause.replace(' ⁋',''),clause+' ⁋',clause.replace('cross trails - ','cross trails ⁋ - ').replace(/ ⁋$/,''),clause+' then swing',clause.replace('partners across','neighbors across'),clause.replace('left shoulders','right shoulders')]){const changed=structuredClone(original);changed.html=changed.html.replace(clause,replacement);const reread=readContraDbImport(JSON.stringify(changed),{interpretation:review.interpretation,capabilities:caps});assert.equal(reread.dance,undefined,`Fresh source mutation: ${replacement}`);assert.notEqual(reread.record?.snapshotId,review.result.record?.snapshotId,'Edited raw source must receive a different snapshot identity');}
 for(const change of[{kind:'pass-through'},{phaseBeats:[3,5]},{passingShoulder:'right'},{direction:'left'},{who:'partner'},{entry:'ring'},{exit:'ring'},{beats:4}]){const bad=structuredClone(dance);Object.assign(bad.figures.at(-1)!,change);assert.throws(()=>compileChoreography(bad,2));}
 const renamed=structuredClone(dance);renamed.id='unrelated-public-fixture';renamed.title='Unrelated title';renamed.author='Different author';assert.equal(compileChoreography(renamed,2).repeatable,true,'Source admission must not be title/author/ID keyed');
});

test('actual2964 full2–12couple periods satisfy independent named corners, both real shoulder encounters, finite-end waits and exact physical closure',t=>{
 const{dance}=reviewedCrossTrails(),summary=[];
 for(let count=2;count<=12;count++){
  const c=compileChoreography(dance,count),slots=Array.from({length:count},(_,couple)=>({couple,rank:couple,direction:couple%2?-1:1})),initial=c.sample(0),encounters=Array.from({length:count},()=>new Set<number>());let minimum=Infinity;
  assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);assert.deepEqual(c.starts,[0,8,16,20,32,40,48,56]);
  for(let round=0;round<2*count;round++){
   const sorted=[...slots].sort((a,b)=>a.rank-b.rank),groups:Array<[typeof slots[number],typeof slots[number]]>=[],waiting:typeof slots=[];
   for(let i=0;i<sorted.length;){const a=sorted[i],b=sorted[i+1];if(b&&a.direction===1&&b.direction===-1){groups.push([a,b]);i+=2;}else{waiting.push(a);i++;}}
   for(const[a,b]of groups){encounters[a.couple].add(b.couple);encounters[b.couple].add(a.couple);const ids=[a.couple*2,a.couple*2+1,b.couple*2,b.couple*2+1],center=((a.rank+b.rank)/2-(count-1)/2)*1.8;
    for(const[local,order]of[[56,[0,1,2,3]],[60,[1,0,3,2]],[64-1e-7,[2,3,0,1]]]as const){const frame=c.formationSample!(round*64+local);corners.forEach(([sx,sz],k)=>{const p=frame.poses[ids[order[k]]];assert.ok(near(p.position.x,sx*.9)&&near(p.position.z,center+sz*.9),`named corner ${count}/${round}/${local}/${p.id}`);});}
    for(const[local,pairs,axis,sign]of[[58,[[ids[0],ids[1]],[ids[2],ids[3]]],'x',1],[62,[[ids[0],ids[3]],[ids[1],ids[2]]],'z',-1]]as const){const frame=c.sample(round*64+local);for(const pair of pairs)for(const[id,other]of[pair,[...pair].reverse()]){const p=frame.poses[id],q=frame.poses[other];assert.ok(near(p.position[axis],q.position[axis]));assert.ok(sign*((q.position.x-p.position.x)*-Math.cos(p.yaw)+(q.position.z-p.position.z)*Math.sin(p.yaw))>.87999,`literal shoulder ${count}/${round}/${local}/${id}/${other}`);const before=c.sample(round*64+local-.01),after=c.sample(round*64+local+.01);assert.ok((before.poses[id].position[axis]-before.poses[other].position[axis])*(after.poses[id].position[axis]-after.poses[other].position[axis])<0);}}
   }
   for(const slot of waiting){assert.ok(slot.rank===0||slot.rank===count-1,'No interior waiter');const before=c.sample(round*64+12),after=c.sample(round*64+55);for(const id of[slot.couple*2,slot.couple*2+1]){assert.equal(before.poses[id].activity,'waiting');assert.ok(distance(before.poses[id].position,after.poses[id].position)<1e-8,'End exchange finishes, then waits');assert.ok(near(before.poses[id].position.z,(slot.rank-(count-1)/2)*1.8));}slot.direction*=-1;}
   for(const[a,b]of groups)[a.rank,b.rank]=[b.rank,a.rank];
   const end=c.sample((round+1)*64-1e-7);for(const slot of slots)for(const[id,role]of[[slot.couple*2,1],[slot.couple*2+1,-1]]){const p=end.poses[id];assert.ok(near(p.position.x,.9*role*slot.direction)&&near(p.position.z,(slot.rank-(count-1)/2)*1.8),`actual physical rank exchange ${count}/${round}/${id}`);}
   for(const local of[...c.starts,60,64]){const beat=round*64+local;if(!beat)continue;const a=c.sample(beat-1e-7),b=c.sample(beat);for(const p of a.poses){assert.ok(distance(p.position,b.poses[p.id].position)<1e-5);assert.ok(Math.abs(turn(p.yaw,b.poses[p.id].yaw))<1e-5);}}
   for(let tick=0;tick<128;tick++){const frame=c.sample(round*64+tick/2),hands=new Set<string>();for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++)minimum=Math.min(minimum,distance(frame.poses[a].position,frame.poses[b].position));for(const h of frame.contacts)for(const key of[h.a+':'+h.handA,...(!h.target||h.target==='hands'?[h.b+':'+h.handB]:[])]){assert.ok(!hands.has(key),'No duplicate wrist ownership');hands.add(key);}}
  }
  assert.ok(minimum>.48);for(let couple=0;couple<count;couple++){assert.equal(encounters[couple].size,count-1,`Every actual other couple encountered ${count}/${couple}`);assert.deepEqual(slots[couple],{couple,rank:couple,direction:couple%2?-1:1});}
  // Test the physical left limit, before the runtime's repeat cache can wrap.
  const end=c.sample(2*count*64-1e-7);for(const p of initial.poses){assert.ok(distance(p.position,end.poses[p.id].position)<1e-5);assert.ok(Math.abs(turn(p.yaw,end.poses[p.id].yaw))<1e-5);}
  summary.push({couples:count,repeats:2*count,minimum});
 }
 t.diagnostic(JSON.stringify(summary));
});
