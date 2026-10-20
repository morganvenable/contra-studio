/** Actual retained source through the staged public production compiler. */
import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{prepareContraDbReview}from'./source-review.ts';
import{readContraDbImport}from'./contradb-import.ts';
import{compileChoreography}from'./choreography.ts';
import{REGISTERED_MOTION_CAPABILITIES}from'./capabilities.ts';
import{distance,turn}from'./ring-twirl-contract.ts';
import type{Figure}from'./types.ts';
const caps=REGISTERED_MOTION_CAPABILITIES;
const raw=readFileSync(new URL('../test-data/contradb/3496.json',import.meta.url),'utf8');
const reviewed=()=>{const review=prepareContraDbReview(raw,[],caps);assert.ok(review.result.dance,review.result.errors.join('; '));return{review,dance:review.result.dance};};
const near=(a:number,b:number)=>Math.abs(a-b)<1e-6;

test('actual3496 source and archive preserve the literal named order, sole event,8counts and removable4+2+2 interpretation',()=>{
 const{review,dance}=reviewed();assert.equal(dance.title,'Fair and Square');assert.equal(dance.author,'John Coffman');assert.equal(dance.figures.reduce((n,f)=>n+f.beats,0),64);assert.equal(dance.sourceRows.length,7);assert.equal(dance.figures.filter(f=>f.progression).length,1);
 const last=dance.figures.at(-1)!;assert.deepEqual([last.kind,last.who,last.amount,last.hands,last.beats,last.entry,last.exit,last.progression],['square-through','all',2,'right-left',8,'partners-facing-across','progressed-neighbors',true]);assert.deepEqual(last.phaseBeats,[4,2,2]);assert.deepEqual((review.interpretation.rows!['contradb:3496:row:6']as any).squareThrough,{phaseBeats:[4,2,2]});
 assert.match(review.result.rows[6].interpretations.join(' '),/source states eight total counts.*omits the internal split/);
 const replay=readContraDbImport(dance.sourceText,{capabilities:caps});assert.ok(replay.dance,replay.errors.join('; '));assert.deepEqual(replay.dance.figures,dance.figures);assert.deepEqual(replay.interpretation,review.interpretation);assert.equal(replay.record!.original,review.result.record!.original);
 const cleared=structuredClone(review.interpretation);delete(cleared.rows!['contradb:3496:row:6']as any).squareThrough;assert.equal(readContraDbImport(raw,{interpretation:cleared,capabilities:caps}).dance,undefined);
 for(const capabilities of[{...caps,squareThroughs:false},{...caps,namedPullBys:false}]){assert.equal(readContraDbImport(raw,{interpretation:review.interpretation,capabilities}).dance,undefined);assert.equal(readContraDbImport(dance.sourceText,{capabilities}).dance,undefined);assert.throws(()=>compileChoreography(dance,2,capabilities));}
 const forged={...JSON.parse(dance.sourceText),capabilities:{squareThroughs:true}};assert.equal(readContraDbImport(JSON.stringify(forged),{capabilities:{...caps,squareThroughs:false}}).dance,undefined);
 const renamed=structuredClone(dance);renamed.id='opaque-identity';renamed.title='Unrelated title';renamed.author='Unrelated author';assert.equal(compileChoreography(renamed,2,caps).repeatable,true);
});

test('actual3496 all2–12couple finite periods prove balance, ordered handed gates, late epoch, waits, reentry and physical closure',t=>{
 const{dance}=reviewed();let minimum=Infinity,terminalMinimum=Infinity,maxRootJump=0,maxYawJump=0,maxVelocity=0;const summary=[];
 for(let count=2;count<=12;count++){
  const c=compileChoreography(dance,count,caps),slots=Array.from({length:count},(_,couple)=>({couple,rank:couple,direction:couple%2?-1:1})),initial=c.sample(0),encounters=Array.from({length:count},()=>new Set<number>());assert.equal(c.repeatable,true);assert.equal(c.totalBeats,64);assert.deepEqual(c.starts,[0,4,8,16,20,32,40,48,56]);
  for(let round=0;round<2*count;round++){
   const sorted=[...slots].sort((a,b)=>a.rank-b.rank),groups:Array<[typeof slots[number],typeof slots[number]]>=[],waiting:typeof slots=[];
   for(let i=0;i<sorted.length;){const a=sorted[i],b=sorted[i+1];if(b&&a.direction===1&&b.direction===-1){groups.push([a,b]);i+=2;}else{waiting.push(a);i++;}}
   for(const[a,b]of groups){
    encounters[a.couple].add(b.couple);encounters[b.couple].add(a.couple);const ids=[a.couple*2,a.couple*2+1,b.couple*2,b.couple*2+1],center=((a.rank+b.rank)/2-(count-1)/2)*1.8;
    for(const[local,width,order]of[[56,.9,[0,1,2,3]],[60,.55,[0,1,2,3]],[62,.55,[1,0,3,2]],[64-1e-7,.9,[2,3,0,1]]]as const){const frame=c.formationSample!(round*64+local);[[-1,-1],[1,-1],[1,1],[-1,1]].forEach(([sx,sz],k)=>{const p=frame.poses[ids[order[k]]];assert.ok(near(p.position.x,sx*width)&&near(p.position.z,center+sz*.9),`Named phase corner ${count}/${round}/${local}/${p.id}`);});}
    for(const local of[59.999999,60,60.000001]){const frame=c.sample(round*64+local);for(const[A,B]of[[ids[0],ids[1]],[ids[2],ids[3]]]){const hand=frame.contacts.find(h=>h.a===A&&h.b===B||h.a===B&&h.b===A);assert.ok(hand);assert.equal(hand.handA,'right');assert.equal(hand.handB,'right');assert.ok(hand.strength>.99,'Continuous held partner right-hand balance-to-pull');}}
    for(const[local,pairs,axis,hand]of[[61,[[ids[0],ids[1]],[ids[2],ids[3]]],'x','right'],[63,[[ids[0],ids[3]],[ids[1],ids[2]]],'z','left']]as const){const frame=c.sample(round*64+local),before=c.sample(round*64+local-.001),after=c.sample(round*64+local+.001);for(const[A,B]of pairs){const p=frame.poses[A],q=frame.poses[B],d={x:q.position.x-p.position.x,z:q.position.z-p.position.z};assert.ok(Math.abs(d.x*Math.sin(p.yaw)+d.z*Math.cos(p.yaw))<1e-7);assert.ok((hand==='right'?1:-1)*(-d.x*Math.cos(p.yaw)+d.z*Math.sin(p.yaw))>.69999);assert.ok((before.poses[A].position[axis]-before.poses[B].position[axis])*(after.poses[A].position[axis]-after.poses[B].position[axis])<0,'Actual source-named passage');const contact=frame.contacts.find(h=>h.a===A&&h.b===B||h.a===B&&h.b===A)!;assert.ok(contact);assert.equal(contact.handA,hand);assert.equal(contact.handB,hand);assert.ok(contact.strength>.99);}}
    const oldNeighbor=new Map([[ids[0],ids[3]],[ids[3],ids[0]],[ids[1],ids[2]],[ids[2],ids[1]]]);
    for(let n=0;n<=32;n++){const local=62+n/16,frame=c.sample(round*64+Math.min(local,64-1e-7));for(const h of frame.contacts.filter(h=>h.handA==='left'&&(ids.includes(h.a)||ids.includes(h.b)))){assert.equal(oldNeighbor.get(h.a),h.b,'Old-neighbor binding owns every left passage contact');assert.equal(h.handB,'left');assert.ok(local<63.5+1e-7,'Old left hand is released before next-neighbor right-hand acquisition');}}
   }
   for(const slot of waiting){assert.ok(slot.rank===0||slot.rank===count-1);for(const id of[slot.couple*2,slot.couple*2+1]){const before=c.sample(round*64+13).poses[id],after=c.sample(round*64+63).poses[id];assert.equal(before.activity,'waiting');assert.equal(after.activity,'waiting');assert.ok(distance(before.position,after.position)<1e-8);assert.ok(near(before.position.z,(slot.rank-(count-1)/2)*1.8),'Waiter stays at its same end');}slot.direction*=-1;}
   for(const[a,b]of groups)[a.rank,b.rank]=[b.rank,a.rank];
   const nextNeighbors=new Map<number,number>(),nextActive=new Set<number>(),nextSorted=[...slots].sort((a,b)=>a.rank-b.rank);for(let i=0;i<nextSorted.length;){const a=nextSorted[i],b=nextSorted[i+1];if(b&&a.direction===1&&b.direction===-1){nextActive.add(a.couple);nextActive.add(b.couple);for(const[A,B]of[[a.couple*2,b.couple*2+1],[a.couple*2+1,b.couple*2]]){nextNeighbors.set(A,B);nextNeighbors.set(B,A);}i+=2;}else i++;}
   for(const local of[63,63.25,63.5,63.75,63.99]){const frame=c.sample(round*64+local);assert.equal(frame.repeat,round);assert.equal(frame.figureIndex,8);for(const h of frame.contacts.filter(h=>h.handA==='right')){assert.equal(h.handB,'right');assert.equal(nextNeighbors.get(h.a),h.b,'Only the already-determined next-neighbor pair may prepare its opening right hand');assert.ok(local>63.5,'Next-hand acquisition follows the old left-hand release');}}
   assert.equal(c.sample((round+1)*64).repeat,round+1);
   const end=c.sample((round+1)*64-1e-7),logical=c.formationSample!((round+1)*64-1e-7);for(const slot of slots)for(const[id,role]of[[slot.couple*2,1],[slot.couple*2+1,-1]]){const p=end.poses[id],q=logical.poses[id],z=(slot.rank-(count-1)/2)*1.8,offset=nextActive.has(slot.couple)?.35*slot.direction:0;assert.ok(near(q.position.x,.9*role*slot.direction)&&near(q.position.z,z),'Exact complete progression slots');assert.ok(near(p.position.x,.9*role*slot.direction)&&near(p.position.z,z+offset),'Explicit final-three-quarter-count preparation within source counts');assert.ok(Math.abs(turn(p.yaw,slot.direction===1?0:Math.PI))<1e-6);}
   for(const local of[...c.starts,60,61,62,63,63.25,63.5,64]){const beat=round*64+local;if(!beat)continue;const a=c.sample(beat-1e-6),b=c.sample(beat);for(const p of a.poses){const root=distance(p.position,b.poses[p.id].position),yaw=Math.abs(turn(p.yaw,b.poses[p.id].yaw));maxRootJump=Math.max(maxRootJump,root);maxYawJump=Math.max(maxYawJump,yaw);assert.ok(root<1e-5);assert.ok(yaw<1e-5);}}
   for(let tick=0;tick<=256;tick++){const local=tick/4,frame=c.sample(round*64+local),hands=new Set<string>();for(let a=0;a<frame.poses.length;a++)for(let b=a+1;b<frame.poses.length;b++){const d=distance(frame.poses[a].position,frame.poses[b].position);minimum=Math.min(minimum,d);if(local>=56&&local<64)terminalMinimum=Math.min(terminalMinimum,d);}for(const h of frame.contacts)for(const wrist of[h.a+':'+h.handA,...(!h.target||h.target==='hands'?[h.b+':'+h.handB]:[])]){assert.ok(!hands.has(wrist),'No duplicated wrist ownership');hands.add(wrist);}}
   for(let tick=0;tick<=320;tick++){const local=56+tick/40,h=1e-4,a=c.sample(round*64+local-h),b=c.sample(round*64+local+h);for(const p of a.poses)maxVelocity=Math.max(maxVelocity,distance(p.position,b.poses[p.id].position)/(2*h));}
  }
  for(let couple=0;couple<count;couple++){assert.equal(encounters[couple].size,count-1);assert.deepEqual(slots[couple],{couple,rank:couple,direction:couple%2?-1:1});}
  const physicalEnd=c.sample(2*count*64-1e-7);for(const p of initial.poses){assert.ok(distance(p.position,physicalEnd.poses[p.id].position)<1e-5);assert.ok(Math.abs(turn(p.yaw,physicalEnd.poses[p.id].yaw))<1e-5);}
  summary.push({couples:count,repeats:2*count});
 }
 assert.ok(minimum>=.49);assert.ok(terminalMinimum>=.64);assert.ok(maxVelocity<2);t.diagnostic(JSON.stringify({source:3496,summary,minimum,terminalMinimum,maxRootJump,maxYawJump,maxVelocity}));
});

test('actual3496 source edits cannot waive counts,marker,ordered hand roles or unproved variants',()=>{
 const{review,dance}=reviewed(),snapshot=JSON.parse(raw),literal='square through two - partners balance &amp;  pull by right, then neighbors pull by left ⁋';assert.ok(snapshot.html.includes(literal));
 for(const replacement of[literal.replace('two','four'),literal.replace(' ⁋',''),literal+' ⁋',literal.replace(' - ',' ⁋ - ').replace(/ ⁋$/,''),literal.replace('pull by right','pull by left'),literal.replace('then neighbors','then partners'),literal+' then turn around']){const changed={...snapshot,html:snapshot.html.replace(literal,replacement)};assert.equal(prepareContraDbReview(JSON.stringify(changed),[],caps).result.dance,undefined,replacement);}
 const noMarker={...snapshot,html:snapshot.html.replace(literal,literal.replace(' ⁋',''))};assert.equal(readContraDbImport(JSON.stringify(noMarker),{interpretation:{...review.interpretation,progression:'end-of-cycle'},capabilities:caps}).dance,undefined);
 for(const change of[{amount:4},{hands:'left-right'},{phaseBeats:[2,3,3]},{progression:false},{exit:undefined},{entry:'ring'},{direction:'left'},{beats:16}]){const bad=structuredClone(dance);Object.assign(bad.figures.at(-1)!,change);assert.throws(()=>compileChoreography(bad,2,caps));}
 const archive=JSON.parse(dance.sourceText);archive.snapshot.html=archive.snapshot.html.replace('square through two','square through four');assert.ok(readContraDbImport(JSON.stringify(archive),{capabilities:caps}).diagnostics.some(d=>d.code==='snapshot-binding'));
});

test('the registered square-through capability leaves established families numerically unchanged',()=>{
 for(const id of[24,410,1450,2355,2964]){
  const source=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),review=prepareContraDbReview(source,[],caps),dance=review.result.dance;assert.ok(dance,`${id}: ${review.result.errors.join('; ')}`);
  for(const count of[2,3,6,12]){const a=compileChoreography(dance,count,{...caps,squareThroughs:false}),b=compileChoreography(dance,count,caps);for(let round=0;round<2*count;round++)for(const local of[0,.25,4,8,16,20,32,40,48,56,60,61,62,63,63.25,63.5,63.999999])assert.deepEqual(a.sample(round*64+local),b.sample(round*64+local),`Unchanged old-family frame ${id}/${count}/${round}/${local}`);}
 }
});
