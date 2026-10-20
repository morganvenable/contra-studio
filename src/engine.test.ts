import test from 'node:test';
import assert from 'node:assert/strict';
import {compileDance,compilePrimitiveFigure,createDancers,ROW_GAP} from './engine.ts';
import {DANCES} from './catalog.ts';
const IMPROPER_DANCES=DANCES.filter(d=>d.formation==='duple-improper');
const distance=(a:any,b:any)=>Math.hypot(a.x-b.x,a.z-b.z);

test('both source dances retain stable identities and genuine single progression',()=>{
 for(const dance of IMPROPER_DANCES){const c=compileDance(dance);assert.equal(c.totalBeats,64);assert.equal(c.repeatable,true);const a=c.sample(0),b=c.sample(64);for(const d of c.dancers){assert.equal(b.poses[d.id].id,d.id);assert.ok(Math.abs(b.poses[d.id].position.z-a.poses[d.id].position.z-d.direction*ROW_GAP)<1e-5);}}
});
test('all figure boundaries and end-of-set re-entry remain continuous',()=>{
 for(const dance of IMPROPER_DANCES)for(const couples of [2,3,6,8]){const c=compileDance(dance,couples);for(let r=0;r<2*couples+1;r++)for(const s of [0,...c.starts]){const t=r*64+s;if(!t)continue;const a=c.sample(t-1e-6),b=c.sample(t+1e-6);for(let i=0;i<a.poses.length;i++){assert.ok(distance(a.poses[i].position,b.poses[i].position)<1e-4,`${dance.title}, ${couples} couples, beat ${t}`);assert.ok(Math.abs(Math.atan2(Math.sin(a.poses[i].yaw-b.poses[i].yaw),Math.cos(a.poses[i].yaw-b.poses[i].yaw)))<1e-3);}}}
});
test('sampled torso clearance and hand occupancy remain safe across both source dances',()=>{
 for(const dance of IMPROPER_DANCES){const c=compileDance(dance);for(let beat=0;beat<128;beat+=.125){const frame=c.sample(beat),occupied=new Set<string>();for(let i=0;i<frame.poses.length;i++)for(let j=i+1;j<frame.poses.length;j++)assert.ok(distance(frame.poses[i].position,frame.poses[j].position)>.48,`${dance.title} beat ${beat}, ${i}/${j}`);for(const contact of frame.contacts){const hands=[`${contact.a}:${contact.handA}`];if(!contact.target||contact.target==='hands')hands.push(`${contact.b}:${contact.handB}`);for(const hand of hands){assert.ok(!occupied.has(hand),`Duplicate hand ${hand}, beat ${beat}`);occupied.add(hand);}}}}
});
test('deterministic scrubbing and huge repeat indexes use bounded periodic state',()=>{
 const c=compileDance(DANCES[0]);const expected=c.sample(23.5);c.sample(500);assert.deepEqual(c.sample(23.5),expected);const start=performance.now(),huge=c.sample(1e12+23.5);assert.ok(performance.now()-start<1000);assert.ok(huge.poses.every(p=>Number.isFinite(p.position.x)&&Number.isFinite(p.yaw)));for(let i=0;i<12;i++)assert.ok(distance(c.sample(12*64).poses[i].position,c.sample(0).poses[i].position)<1e-5);
});
test('unsupported figures fail explicitly instead of producing invented motion',()=>{
 assert.throws(()=>compileDance({...DANCES[0],figures:[{id:'bad',kind:'unknown',beats:64,label:'unknown'}]}),/Unsupported/);
});
test('an unspecified pass-through cannot bypass its exact count, current-neighbor shoulder and ring entry',()=>{assert.throws(()=>compileDance({...DANCES[0],figures:[{id:'bad',kind:'pass-through',beats:64,label:'Pass through'}]}),/explicit terminal four-count current-neighbor right-shoulder pass/);});
test('an unspecified right-and-left-through cannot bypass explicit crossing and courtesy identities',()=>{assert.throws(()=>compileDance({...DANCES[0],figures:[{id:'bad',kind:'right-left-through',beats:64,label:'right-left-through'}]}),/requires an explicit right-hand crossing relation/);});

test('an unspecified hey cannot bypass its required pass and boundary contract',()=>{assert.throws(()=>compileDance({...DANCES[0],figures:[{id:'bad',kind:'hey',beats:64,label:'hey'}]}),/partial hey requires/);});

test('a non-progressing sequence is limited to one repeat',()=>{
 const c=compileDance({...DANCES[0],verified:false,figures:[{id:'circle',kind:'circle',beats:64,label:'circle',direction:'left',amount:1}]});assert.equal(c.repeatable,false);assert.equal(c.sample(128).repeat,0);assert.ok(c.warnings.some(w=>w.includes('limited')));
});
test('internal swing releases and courtesy handoffs have no facing branch jumps',()=>{
 for(const dance of IMPROPER_DANCES){const c=compileDance(dance);let previous=c.sample(0);for(let beat=.01;beat<128;beat+=.01){const next=c.sample(beat);for(let id=0;id<next.poses.length;id++){const delta=Math.abs(Math.atan2(Math.sin(next.poses[id].yaw-previous.poses[id].yaw),Math.cos(next.poses[id].yaw-previous.poses[id].yaw)));assert.ok(delta<.1,`${dance.title}, beat ${beat}, dancer ${id}, turn ${delta}`);}previous=next;}}
});

test('near-zero angular offsets cannot add an extra revolution to only one swing dancer',()=>{
 const dancers=createDancers(2),coords=[[.9,.9],[.9+1e-12,-.9],[-.9,-.9],[-.9-1e-12,.9]],poses=coords.map(([x,z],id)=>({id,position:{x,z},yaw:0,stride:0,lean:0,bounce:0,turn:0,activity:'waiting' as const}));
 const plan=compilePrimitiveFigure({id:'s',kind:'swing',beats:12,label:'Partner swing',who:'partner'},[0,1,2,3],poses,dancers,[1,-1]);
 for(let t=0;t<=1;t+=.002)for(const pair of[[0,1],[2,3]])assert.ok(distance(plan.position(pair[0],t),plan.position(pair[1],t))>.48);
});

test('source-grounded Hay in the Barn fragment binds a partner-chain after neighbor swing',()=>{
 // Chart Guthrie, Caller’s Box #10482 A1 and first eight beats of A2.
 // The later half-heys remain unsupported; this is deliberately a section test.
 const dance={...DANCES[0],title:'Hay in the Barn — A1 and first half of A2',figures:[
  {id:'a1-balance',kind:'balance' as const,beats:4,label:'Neighbor balance',who:'neighbor' as const},
  {id:'a1-swing',kind:'swing' as const,beats:12,label:'Neighbor swing',who:'neighbor' as const},
  {id:'a2-chain',kind:'robins-chain' as const,beats:8,label:'Ladies chain to partner',who:'partner' as const}
 ]};
 for(const count of [2,3,6,12]){const c=compileDance(dance,count);assert.equal(c.repeatable,false);const entry=c.sample(16),exit=c.sample(24);
  for(let id=0;id<count*2;id+=4){if(id+3>=count*2)continue;for(const lark of[id,id+2])assert.ok(distance(entry.poses[lark].position,exit.poses[lark].position)<1e-6);assert.ok(distance(entry.poses[id+1].position,exit.poses[id+3].position)<1e-6);assert.ok(distance(entry.poses[id+3].position,exit.poses[id+1].position)<1e-6);}
  for(let beat=20.65;beat<22.2;beat+=.05)for(const hold of c.sample(beat).contacts.filter(h=>h.kind==='courtesy'))assert.equal(Math.floor(hold.a/2),Math.floor(hold.b/2));
 }
 const bad={...dance,figures:[{...dance.figures[2],amount:1}]};assert.throws(()=>compileDance(bad,2),/modifier/);
});

test('unreviewed arch-to-swing compositions reject before an audible swing count is consumed by gathering',async()=>{
 const {compileChoreography}=await import('./choreography.ts');
 for(const who of ['neighbor','partner'] as const){
  const dance={...IMPROPER_DANCES[0],figures:[
   {id:'arch',kind:'box-the-gnat' as const,who:'neighbor' as const,beats:4,label:'Neighbor box the gnat',hands:'right' as const,underRole:'robin' as const,amount:.5},
   {id:'swing',kind:'swing' as const,who,beats:8,label:'Immediate swing'}
  ]};
  for(const compile of[compileDance,compileChoreography])assert.throws(()=>compile(dance,6,{archExchanges:true,archSwingExits:false}),/arch-to-swing.*first swing count/);
  const forged={...dance,capabilities:{archSwingExits:true}};assert.throws(()=>compileChoreography(forged,2,{archExchanges:true,archSwingExits:false}),/arch-to-swing/);
 }
});


test('bare opening swings reject centrally before count one can be spent gathering, including forged source capabilities',async()=>{
 const {compileChoreography}=await import('./choreography.ts');
 const {REGISTERED_MOTION_CAPABILITIES}=await import('./capabilities.ts');
 for(const who of ['neighbor','partner'] as const){
  const dance={...IMPROPER_DANCES[0],figures:[{id:'opening-swing',kind:'swing' as const,who,beats:16,label:'Opening swing'},...IMPROPER_DANCES[0].figures.slice(1)]};
  for(const compile of [compileDance,compileChoreography])for(const couples of [2,3,6,12])assert.throws(()=>compile(dance,couples,REGISTERED_MOTION_CAPABILITIES),/bare opening swing.*initial closed frame.*first swing count/i);
  assert.throws(()=>compileChoreography({...dance,capabilities:{swingStartSequences:true}} as any,6),/bare opening swing/i);
 }
});
