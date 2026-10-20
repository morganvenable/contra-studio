import test from'node:test';
import assert from'node:assert/strict';
import{readFileSync}from'node:fs';
import{prepareContraDbReview}from'./source-review.ts';
import{balancedSquareThroughSource,squareThroughDescription,isBalancedSquareThroughTwoClause,isBalancedSquareThroughTwoSource,isSquareThroughChoice,squareThroughChoiceForSource,CONVENTIONAL_SQUARE_THROUGH}from'./source-square-through.ts';
const raw=readFileSync(new URL('../test-data/contradb/3496.json',import.meta.url),'utf8');
test('actual3496 square-through source keeps literal ordered hands and terminal glyph separate from a removable4+2+2 choice',()=>{
 const r=prepareContraDbReview(raw),record=r.result.record!;assert.equal(record.title,'Fair and Square');assert.equal(record.author,'John Coffman');assert.equal(record.rows.length,7);assert.equal(record.rows.reduce((n,r)=>n+r.beats!,0),64);
 const row=record.rows[6];assert.equal(row.text,'square through two - partners balance & pull by right, then neighbors pull by left ⁋');assert.equal(row.progression,true);assert.equal(row.beats,8);assert.equal(record.rows.filter(r=>r.progression).length,1);
 assert.equal(isBalancedSquareThroughTwoSource(row),true);assert.equal(squareThroughChoiceForSource(record)!.rowId,row.id);assert.deepEqual(squareThroughChoiceForSource(record)!.choice,{phaseBeats:[4,2,2]});assert.match(squareThroughChoiceForSource(record)!.description,/source states eight total counts.*omits the internal split/);assert.equal(isSquareThroughChoice(CONVENTIONAL_SQUARE_THROUGH),true);assert.equal(isSquareThroughChoice(undefined),false);
 for(const choice of[{phaseBeats:[2,3,3]},{phaseBeats:[4,2,2],amount:2},{phaseBeats:[4,2,2,0]},{phaseBeats:'4,2,2'}])assert.equal(isSquareThroughChoice(choice),false);
 const hidden={phaseBeats:[4,2,2]};Object.defineProperty(hidden,'extraTurn',{value:1});assert.equal(isSquareThroughChoice(hidden),false);
 for(const text of[row.text.replace('two','four'),row.text.replace('partners balance & ','neighbors balance & '),row.text.replace('pull by right','pull by left'),row.text.replace('then neighbors','then partners'),row.text.replace(' ⁋',''),row.text+' ⁋',row.text.replace(' - ',' ⁋ - ').replace(/ ⁋$/,''),row.text+' then turn around'])assert.equal(isBalancedSquareThroughTwoSource({...row,text}),false,text);
 assert.equal(isBalancedSquareThroughTwoSource({...row,beats:16}),false);assert.equal(isBalancedSquareThroughTwoSource({...row,progression:false}),false);assert.equal(isBalancedSquareThroughTwoClause('square through four'),false);
 const renamed=structuredClone(record);renamed.sourceId='unrelated';renamed.title='Unrelated title';renamed.author='Unrelated author';assert.ok(squareThroughChoiceForSource(renamed));
 const extra=structuredClone(record);extra.rows[0].progression=true;assert.ok(squareThroughChoiceForSource(extra),'A row timing suggestion does not authorize the whole program or an extra progression event.');
 const nonterminal=structuredClone(record);nonterminal.rows=[...nonterminal.rows].reverse();assert.equal(squareThroughChoiceForSource(nonterminal),undefined);
});

test('row-local square grammar preserves unmarked units and literal repeated four without a complete-program signature',()=>{
 const rows=[896,146,2364].map(id=>prepareContraDbReview(readFileSync(new URL(`../test-data/contradb/${id}.json`,import.meta.url),'utf8')).result.record!);
 assert.deepEqual(balancedSquareThroughSource(rows[0].rows[5]),{units:1,progression:false});assert.deepEqual(balancedSquareThroughSource(rows[0].rows[6]),{units:1,progression:true});assert.deepEqual(balancedSquareThroughSource(rows[1].rows[5]),{units:2,progression:true});assert.deepEqual(balancedSquareThroughSource(rows[2].rows[5]),{units:1,progression:true});
 for(const record of rows)for(const row of record.rows.filter(r=>/^square through/.test(r.text))){assert.deepEqual(squareThroughChoiceForSource(record,row.id)?.choice,{phaseBeats:[4,2,2]});assert.ok(squareThroughDescription(row));}
 const repeated=rows[1].rows[5];for(const text of[repeated.text.replace(', then repeat',''),repeated.text.replace('then repeat','then swing'),repeated.text.replace('four','two'),repeated.text+' then clap',repeated.text.replace('partners balance','neighbors balance'),repeated.text.replace('pull by right','pull by left')])assert.equal(balancedSquareThroughSource({...repeated,text}),undefined,text);
 assert.equal(balancedSquareThroughSource({...repeated,beats:8}),undefined);assert.equal(balancedSquareThroughSource({...repeated,progression:false}),undefined);
});
