import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compilePromenadeFigure} from './promenade-adapter.ts';
import {readContraDbSource} from './contradb-source.ts';
import type {FigureContext} from './extended-figures.ts';
import type {Dancer,Figure,Pose} from './types.ts';
const dancers:Dancer[]=Array.from({length:4},(_,id)=>({id,name:['L1','R1','L2','R2'][id],role:id%2?'robin':'lark',couple:Math.floor(id/2),direction:1,color:'#438b86'}));
const pair=(pairs:number[][])=>new Map(pairs.flatMap(([a,b])=>[[a,b],[b,a]]));
const source=()=>readContraDbSource(readFileSync(new URL('../test-data/contradb/1616.json',import.meta.url),'utf8')).record!;
function context():FigureContext {
 const corners=[0,3,2,1],points=[[-.9,-.34],[.9,-.34],[.9,.34],[-.9,.34]],start:Pose[]=[];
 for(let i=0;i<4;i++){const[x,z]=points[i],id=corners[i];start[id]={id,position:{x,z},yaw:x<0?Math.PI/2:-Math.PI/2,stride:0,lean:0,bounce:0,turn:0,activity:'waiting'};}
 return{ids:[0,1,2,3],start,dancers:structuredClone(dancers),relations:{epoch:3,partner:pair([[0,1],[2,3]]),neighbor:pair([[0,3],[1,2]])},bindingEpoch:3};
}
function figure():Figure {const row=source().rows[3];return{id:row.id,kind:'promenade',beats:row.beats!,label:row.text,who:'partner',entry:'side-couples',amount:.5,direction:'left',hands:'both',courtesyLeader:'lark',promenadeRoute:'across-set',passingShoulder:'left',promenadeHold:'skaters',confidence:'approximate'};}
test('retained Patience source binds eight-count same-partner half promenade with canonical logical exit',()=>{
 const r=source(),f=figure(),c=context(),p=compilePromenadeFigure(f,c);assert.equal(r.title,'Patience');assert.equal(r.author,'Chris Page');assert.equal(r.rows.length,6);assert.equal(r.rows.reduce((n,r)=>n+r.beats!,0),64);assert.equal(r.rows[3].text,'partners promenade');assert.equal(f.beats,8);assert.equal(f.progression,undefined);
 for(const id of c.ids){const e=p.position(id,1);assert.ok(Math.abs(e.x+c.start[id].position.x)<1e-8);assert.ok(Math.abs(e.z+Math.sign(c.start[id].position.z)*.9)<1e-8);}
 for(const beat of[1,2,3,4,5,6,7]){const poses=c.start.map(a=>({...a,position:p.position(a.id,beat/8),yaw:p.facing(a.id,beat/8,[])})),contacts=p.contacts(beat/8,poses);assert.equal(contacts.length,4);for(const h of contacts){assert.equal(c.relations.partner.get(h.a),h.b);assert.equal(dancers[h.a].couple,dancers[h.b].couple);assert.equal(h.handA,h.handB);assert.equal(h.strength,1);}}
 assert.deepEqual([...c.relations.neighbor],[[0,3],[3,0],[1,2],[2,1]]);
});
test('a label cannot select partners or fill an omitted promenade interpretation',()=>{
 const f=figure(),c=context(),p=compilePromenadeFigure(f,c),q=compilePromenadeFigure({...f,label:'Neighbor promenade / opposite hands'},c);for(const id of c.ids)assert.deepEqual(p.position(id,.75),q.position(id,.75));
 for(const changes of[{beats:16},{who:'neighbor'},{amount:1},{amount:undefined},{hands:'right'},{direction:'right'},{courtesyLeader:'robin'},{entry:undefined},{promenadeRoute:undefined},{passingShoulder:'right'},{promenadeHold:undefined},{underRole:'robin'},{notation:'ignored'},{exit:'face-down-line'},{progression:true},{confidence:'unsupported'},{crossingRelation:'neighbor'},{hallTurn:'alone'},{unknownSemanticQualifier:true}])assert.throws(()=>compilePromenadeFigure({...f,...changes}as Figure,c));
 assert.throws(()=>compilePromenadeFigure(f,{...c,bindingEpoch:4}),/stale/);const bad=context();bad.dancers[0].couple=1;assert.throws(()=>compilePromenadeFigure(f,bad),/relationships/);
});
