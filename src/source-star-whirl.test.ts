import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readContraDbSource,type ContraDbRecord} from './contradb-source.ts';
import {hasStarWhirlSource,isStarPromenadeChoice,isButterflyWhirlChoice,CONVENTIONAL_STAR_PROMENADE,CONVENTIONAL_BUTTERFLY_WHIRL,STAR_PROMENADE_CHOICE_DESCRIPTION,BUTTERFLY_WHIRL_CHOICE_DESCRIPTION} from './source-star-whirl.ts';
const raw=readFileSync(new URL('../test-data/star-promenade-whirl/2531.json',import.meta.url),'utf8');
const source=()=>readContraDbSource(raw).record!;
const reparse=(original:string,url='https://contradb.com/dances/2531')=>readContraDbSource(original,{sourceUrl:url}).record!;

test('star/whirl source helper matches the complete retained ten-row envelope without hardcoded source identity',()=>{
 const record=source();assert.equal(hasStarWhirlSource(record),true);assert.equal(record.rows.length,10);assert.equal(record.rows.reduce((sum,row)=>sum+row.beats!,0),64);assert.deepEqual(record.rows.filter(row=>row.progression).map(row=>row.index),[9]);
 const renamed=reparse(record.original.replace('I Wish They All Could be California Twirls','A different supplied title').replace('Jim Kitch','Another credited author'),'https://contradb.com/dances/999999');assert.equal(hasStarWhirlSource(renamed),true);assert.notEqual(renamed.snapshotId,record.snapshotId);
 const reordered=Object.fromEntries(Object.entries(record).reverse())as unknown as ContraDbRecord;assert.equal(hasStarWhirlSource(reordered),true);
});

test('star/whirl source helper binds all projected fields and exact rows to retained original before suggesting choices',()=>{
 for(const mutate of[
  (r:any)=>r.rows[3].text='star promenade right ½',(r:any)=>r.rows[3].beats=8,(r:any)=>r.rows[3].html='forged',
  (r:any)=>r.rows[3].span.start++,(r:any)=>r.rows[3].id='foreign-row',(r:any)=>r.rows[3].index=4,(r:any)=>r.rows[3].phrase='B1',
  (r:any)=>r.rows[4].progression=true,(r:any)=>r.rows[9].progression=false,(r:any)=>r.rows.pop(),
  (r:any)=>r.snapshotId='borrowed-snapshot',(r:any)=>r.sourceUrl='https://contradb.com/dances/999999',(r:any)=>r.sourceId='999999',
  (r:any)=>r.title='unbound title',(r:any)=>r.author='unbound credit',(r:any)=>r.hook='unbound hook',(r:any)=>r.preamble='unbound preamble',(r:any)=>r.notes='unbound note',
  (r:any)=>r.original=r.original.replace('butterfly whirl','butterfly whirl twice'),(r:any)=>r.phaseBeats=undefined
 ]){const changed=structuredClone(source());mutate(changed);assert.equal(hasStarWhirlSource(changed),false);}
 const record=source();
 for(const[before,after]of[['star promenade left ½','star promenade left ¾'],['butterfly whirl','butterfly whirl 1'],['gentlespoons allemande left 1½','gentlespoons allemande right 1½'],['ladles gyre once','gentlespoons gyre once'],['partners California twirl ⁋','partners California twirl'],['partners California twirl ⁋','partners California twirl ⁋ ⁋'],['neighbors swing','neighbors swing ⁋'],['circle left 2 places','circle left 3 places'],['dance-show-beats>4','dance-show-beats>5']])assert.equal(hasStarWhirlSource(reparse(record.original.replace(before,after))),false,after);
});

test('star/whirl source helper retains genuine annotations without resolving or erasing their separate review',()=>{
 const record=source(),annotated=reparse(record.original.replace('<table','<p class="dance-show-hook">Hook: A retained hook</p>\n<table').replace("<div class=\"dance-show-preamble\"><div class='contra-markdown-block'></div></div>","<div class=\"dance-show-preamble\"><div class='contra-markdown-block'>A retained preamble</div></div>").replace("<div class=\"dance-show-notes\"><div class='contra-markdown-block'></div></div>","<div class=\"dance-show-notes\"><div class='contra-markdown-block'>A retained note</div></div>"));
 assert.deepEqual([annotated.hook,annotated.preamble,annotated.notes],['A retained hook','A retained preamble','A retained note']);const before=JSON.stringify(annotated);assert.equal(hasStarWhirlSource(annotated),true);assert.equal(JSON.stringify(annotated),before);
 for(const key of['hook','preamble','notes']){const changed=structuredClone(annotated);(changed as any)[key]='';assert.equal(hasStarWhirlSource(changed),false);}
});

test('star/whirl review choices are exact removable constants with conditional fraction and in-budget timing explanations',()=>{
 for(const[validate,choice]of[[isStarPromenadeChoice,CONVENTIONAL_STAR_PROMENADE],[isButterflyWhirlChoice,CONVENTIONAL_BUTTERFLY_WHIRL]]as const){assert.equal(validate(choice),true);assert.equal(validate(structuredClone(choice)),true);assert.equal(validate(undefined),false);assert.equal(validate({...choice,unused:undefined}),false);for(const key of Object.keys(choice)){const changed:any={...choice};delete changed[key];assert.equal(validate(changed),false);changed[key]='unreviewed';assert.equal(validate(changed),false);}const hidden={...choice};Object.defineProperty(hidden,'extra',{value:1});assert.equal(validate(hidden),false);}
 assert.equal(isStarPromenadeChoice({...CONVENTIONAL_STAR_PROMENADE,pickupPreparationBeats:3}),false);assert.equal(isButterflyWhirlChoice({...CONVENTIONAL_BUTTERFLY_WHIRL,releaseBeats:1}),false);for(const amount of[.375,1,2.375])assert.equal(isButterflyWhirlChoice({...CONVENTIONAL_BUTTERFLY_WHIRL,amount}),false);
 assert.match(STAR_PROMENADE_CHOICE_DESCRIPTION,/two-and-a-half/);assert.match(BUTTERFLY_WHIRL_CHOICE_DESCRIPTION,/conditional on the chosen entry and exit, not universal or author-stated/);assert.match(BUTTERFLY_WHIRL_CHOICE_DESCRIPTION,/separately removable/);
});

test('star/whirl source and choice boundaries reject getters without invoking them',()=>{
 let reads=0;const record=structuredClone(source());Object.defineProperty(record,'original',{enumerable:true,get(){reads++;return source().original;}});assert.equal(hasStarWhirlSource(record),false);
 const star={...CONVENTIONAL_STAR_PROMENADE};Object.defineProperty(star,'pickupPreparationBeats',{enumerable:true,get(){reads++;return 2.5;}});assert.equal(isStarPromenadeChoice(star),false);
 const whirl={...CONVENTIONAL_BUTTERFLY_WHIRL};Object.defineProperty(whirl,'amount',{enumerable:true,get(){reads++;return 1.375;}});assert.equal(isButterflyWhirlChoice(whirl),false);assert.equal(reads,0);
});
