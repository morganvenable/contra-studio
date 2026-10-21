import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareContraDbReview} from './source-review.ts';
import {readContraDbImport} from './contradb-import.ts';
import {compileChoreography} from './choreography.ts';
import {compileChainFigure,type ChainContext} from './chain.ts';
import {compilePromenadeFigure} from './promenade-adapter.ts';
import {createDancers} from './engine.ts';
import type {Figure} from './types.ts';
function reviewed(id:string){const raw=readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8'),p=prepareContraDbReview(raw);p.interpretation.notesReview='corroborated-history';p.interpretation.rows??={};p.interpretation.rows[`contradb:${id}:row:4`]={chainReceiver:'neighbor'};const r=readContraDbImport(raw,{interpretation:p.interpretation});assert.ok(r.dance,r.errors.join('; '));return r.dance;}
const gap=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
for(const id of ['2266','3142'])for(const couples of [3,4])test(`${id} chain-promenade carries actual neighbors through ${couples}-couple finite periods`,()=>{
 const dance=reviewed(id),p=compileChoreography(dance,couples),end=couples*2*64;
 assert.equal(p.totalBeats,64);assert.equal(p.repeatable,true);let maxChain=0,maxPromenade=0,minGap=Infinity,contacts=0;
 for(let repeat=0;repeat<couples*2;repeat++){
  const base=repeat*64,first=p.sample(base),rows=p.dancers.filter(d=>d.role==='lark').sort((a,b)=>first.poses[a.id].position.z-first.poses[b.id].position.z),neighbors=new Map<number,number>();
  for(let row=0;row<rows.length;){const a=rows[row],b=rows[row+1];if(b&&first.poses[a.id].position.x>0&&first.poses[b.id].position.x<0){neighbors.set(a.id,b.id+1);neighbors.set(b.id+1,a.id);neighbors.set(b.id,a.id+1);neighbors.set(a.id+1,b.id);row+=2;}else row++;}
  for(let local=0;local<64;local+=.5){const f=p.sample(base+local);assert.equal(f.poses.length,couples*2);for(const q of f.poses)assert.ok(Number.isFinite(q.position.x+q.position.z+q.yaw));}
  for(const local of [...p.starts,64]){if(!base&&!local)continue;const a=p.sample(base+local-1e-6),b=p.sample(base+local);for(const q of b.poses){const prior=a.poses.find(x=>x.id===q.id)!;assert.ok(gap(q.position,prior.position)<2e-5);assert.ok(Math.abs(Math.atan2(Math.sin(q.yaw-prior.yaw),Math.cos(q.yaw-prior.yaw)))<2e-5);}}
  let prior=p.sample(base+40);
  for(let k=1;k<=1024;k++){
   const local=40+k/64,f=p.sample(base+local);
   for(const q of f.poses){const old=prior.poses.find(x=>x.id===q.id)!;const speed=gap(q.position,old.position)*64;if(k<=512)maxChain=Math.max(maxChain,speed);else maxPromenade=Math.max(maxPromenade,speed);}
   for(let a=0;a<f.poses.length;a++)for(let b=a+1;b<f.poses.length;b++)minGap=Math.min(minGap,gap(f.poses[a].position,f.poses[b].position));
   if(local>44&&local<56)for(const c of f.contacts){assert.equal(neighbors.get(c.a),c.b,`${id}/${repeat}/${local} actual receiver`);assert.ok(c.strength>=0&&c.strength<=1);contacts++;}
   prior=f;
  }
 }
 assert.ok(contacts>0);assert.ok(maxChain<=1.3);assert.ok(maxPromenade<=1.2);assert.ok(minGap>=.5);
 assert.deepEqual(p.sample(end).poses,p.sample(0).poses);assert.deepEqual(p.sample(end).contacts,p.sample(0).contacts);
 console.log(JSON.stringify({id,couples,maxChain,maxPromenade,minGap,scope:'whole-period roots, facing, actual contact partners; no body/GPU/audio certification'}));
});

for(const receiver of ['partner','neighbor'] as const)test(`chain prepares the actual ${receiver} promenade pair in translated geometry`,()=>{
 const dancers=createDancers(2),partner=new Map([[0,1],[1,0],[2,3],[3,2]]),neighbor=new Map([[0,3],[3,0],[1,2],[2,1]]);
 const points=receiver==='partner'?[[.9,.9],[-.9,.9],[-.9,-.9],[.9,-.9]]:[[.9,.9],[.9,-.9],[-.9,-.9],[-.9,.9]];
 const next:Figure={id:'unrelated-promenade',label:'reviewed paired promenade',kind:'promenade',beats:8,who:receiver,entry:'side-couples',courtesyLeader:'lark',promenadeRoute:'across-set',promenadeHold:'skaters',amount:.5,direction:'left',passingShoulder:'left',hands:'both'};
 const chain:Figure={id:'unrelated-chain',label:'reviewed chain',kind:'robins-chain',beats:8,who:receiver};
 const c:ChainContext={ids:[0,1,2,3],dancers,bindingEpoch:17,relations:{epoch:17,partner,neighbor},next,start:points.map(([x,z],id)=>({id,position:{x:x+3,z:z-6},yaw:x>0?-Math.PI/2:Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'}))};
 const prepared=compileChainFigure(chain,c),plain=compileChainFigure(chain,{...c,next:undefined});
 for(const id of c.ids){assert.deepEqual(prepared.position(id,0),plain.position(id,0));assert.ok(Math.abs(Math.abs(prepared.position(id,1).z+6)-.55)<1e-8);assert.ok(Math.abs(Math.abs(plain.position(id,1).z+6)-.9)<1e-8);}
 const arrival=c.start.map(p=>({...p,position:prepared.position(p.id,1),yaw:prepared.facing(p.id,1)}));
 const promenade=compilePromenadeFigure(next,{...c,start:arrival,next:undefined});
 for(const q of arrival)assert.ok(gap(q.position,promenade.position(q.id,0))<1e-8);
 for(const t of [.25,.5,.75]){const poses=arrival.map(p=>({...p,position:promenade.position(p.id,t),yaw:promenade.facing(p.id,t,[])}));for(const h of promenade.contacts(t,poses))assert.equal(c.relations[receiver].get(h.a),h.b);}
 const different=compileChainFigure(chain,{...c,next:{...next,who:receiver==='partner'?'neighbor':'partner'}});for(const id of c.ids)assert.deepEqual(different.position(id,1),plain.position(id,1));
 const nonstandard=compileChainFigure(chain,{...c,next:{...next,courtesyLeader:'robin'}});for(const id of c.ids)assert.deepEqual(nonstandard.position(id,1),plain.position(id,1));
});
