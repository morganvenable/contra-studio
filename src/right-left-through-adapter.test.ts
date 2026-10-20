import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compileRightLeftThroughFigure} from './right-left-through-adapter.ts';
import {readContraDbSource} from './contradb-source.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Dancer,Figure,Pose} from './types.ts';
const dancers:Dancer[]=Array.from({length:4},(_,id)=>({id,name:['L1','R1','L2','R2'][id],role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:1,color:'#438b86'}));
const pair=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const source=(id:number)=>readContraDbSource(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8')).record!;
function context(reversed=false):FigureContext {
 // Source2259 B2 after partner swing: corners NW,NE,SE,SW = L1,R2,L2,R1.
 // Source3004 A2 after partner box: corners NW,NE,SE,SW = R1,L1,R2,L2.
 const corners=reversed?[1,0,3,2]:[0,3,2,1],points=[[-.9,-.9],[.9,-.9],[.9,.9],[-.9,.9]],start:Pose[]=[];
 for(let i=0;i<4;i++){const[x,z]=points[i],id=corners[i];start[id]={id,position:{x,z},yaw:x<0?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'};}
 return{ids:[0,1,2,3],start,dancers:structuredClone(dancers),relations:{epoch:3,partner:pair([[0,1],[2,3]]),neighbor:pair([[0,3],[1,2]])},bindingEpoch:3};
}
function figure(reversed=false):Figure {const r=source(reversed?3004:2259),row=r.rows[reversed?2:5];return{id:row.id,kind:'right-left-through',beats:row.beats!,label:row.text,who:reversed?'neighbor':'partner',direction:'right',crossingRelation:reversed?'partner':'neighbor',courtesyLeader:reversed?'robin':'lark',confidence:'approximate'};}
const cornerIds=(poses:Pose[])=>[...poses].sort((a,b)=>{const slot=(p:Pose)=>p.position.z<0?(p.position.x<0?0:1):(p.position.x>0?2:3);return slot(a)-slot(b);}).map(p=>p.id);
for(const reversed of[false,true])test(`source-backed ${reversed?'Pandora reversed same-neighbor':'2259 ordinary partner'} binder preserves explicit receivers and exact nonprogressing endpoint permutation`,()=>{
 const c=context(reversed),f=figure(reversed),p=compileRightLeftThroughFigure(f,c),end=c.start.map(a=>({...a,position:p.position(a.id,1),yaw:p.facing(a.id,1,[])}));
 assert.deepEqual(cornerIds(end),reversed?[3,2,1,0]:[2,1,0,3]);assert.equal(f.beats,8);assert.equal(f.progression,undefined);
 const held=c.start.map(a=>({...a,position:p.position(a.id,6/8),yaw:p.facing(a.id,6/8,[])})),contacts=p.contacts(6/8,held);assert.equal(contacts.length,4);
 for(const h of contacts){assert.equal(dancers[h.a].role,reversed?'robin':'lark');assert.equal(c.relations[reversed?'neighbor':'partner'].get(h.a),h.b);assert.equal(h.handA,h.handB);assert.equal(h.strength,1);}
 const atGate=c.start.map(a=>({...a,position:p.position(a.id,.25),yaw:p.facing(a.id,.25,[])}));for(const h of p.contacts(.25,atGate)){assert.equal(c.relations[reversed?'partner':'neighbor'].get(h.a),h.b);assert.equal(h.handA,'right');assert.equal(h.handB,'right');}
 assert.deepEqual([...c.relations.neighbor],[[0,3],[3,0],[1,2],[2,1]],'this figure must not rebind neighbors');
});
test('source identities and qualifiers remain distinct from display labels and conventional role defaults',()=>{
 const pandora=source(3004),ordinary=source(2259);assert.equal(ordinary.author,'Becky Hill');assert.equal(ordinary.rows[5].text,'right left through');assert.match(ordinary.rows[6].text,/chain.*neighbor.*⁋/);assert.match(pandora.rows[2].text,/ladles courtesy turn this same neighbor gentlespoon/);
 const f=figure(true),c=context(true),a=compileRightLeftThroughFigure(f,c),b=compileRightLeftThroughFigure({...f,label:'Robins lead larks / women turn men / second-role turns first-role'},c);for(const id of c.ids)assert.deepEqual(a.position(id,.8),b.position(id,.8));
 assert.throws(()=>compileRightLeftThroughFigure({...f,courtesyLeader:'lark'},c),/left slot/);assert.throws(()=>compileRightLeftThroughFigure({...f,who:'partner'},c),/left slot/);
});
test('wrong crossing/courtesy relations, stale identities, ambiguous modifiers and compact logical exits cannot pass the wrapper',()=>{
 const f=figure(),c=context();for(const changes of[{beats:16},{direction:'left'},{direction:undefined},{courtesyLeader:undefined},{crossingRelation:undefined},{amount:1},{hands:'right'},{underRole:'robin'},{notation:'ignored'},{entry:'side-couples'},{exit:'same-slots-partner-balance'},{progression:true},{confidence:'unsupported'},{hallTurn:'alone'},{unknownSemanticQualifier:true}])assert.throws(()=>compileRightLeftThroughFigure({...f,...changes} as Figure,c));
 assert.throws(()=>compileRightLeftThroughFigure({...f,crossingRelation:'partner'},c),/lane/);assert.throws(()=>compileRightLeftThroughFigure(f,{...c,bindingEpoch:4}),/stale/);
 let bad=context();bad.start[0].id=99;assert.throws(()=>compileRightLeftThroughFigure(f,bad),/identities/);bad=context();bad.dancers[0].couple=1;assert.throws(()=>compileRightLeftThroughFigure(f,bad),/relationships/);bad=context();for(const a of bad.start)a.position.x*=.55/.9;assert.throws(()=>compileRightLeftThroughFigure(f,bad),/exit slots/);
});
