import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {halfRicochetChoice} from './source-ricochet-ui.ts';import {prepareContraDbReview} from './source-review.ts';import {readContraDbImport} from './contradb-import.ts';
test('cleared half ricochet remains offerable with its exact count, direction and named pairs',()=>{
 const raw=readFileSync(new URL('../test-data/contradb/3199.json',import.meta.url),'utf8'),review=prepareContraDbReview(raw),record=review.result.record!,row=record.rows[2],expected=review.interpretation.rows![row.id].ricochetHey;
 const choice=structuredClone(review.interpretation);delete choice.rows![row.id].ricochetHey;
 const cleared=readContraDbImport(raw,{interpretation:choice});assert.equal(cleared.coverage.executable,false);
 const offered=halfRicochetChoice(cleared.record!,row.id);assert.deepEqual(offered,expected);assert.equal(offered!.amount,.5);assert.equal(offered!.bounceDirection,'back-right');
 choice.rows![row.id].ricochetHey=offered;const restored=readContraDbImport(raw,{interpretation:choice});assert.equal(restored.coverage.executable,true,restored.errors.join('; '));assert.deepEqual(restored.dance?.figures,review.result.dance?.figures);
 const upper=structuredClone(record);upper.rows[1].text=upper.rows[1].text.toUpperCase();upper.rows[3].text=upper.rows[3].text.toUpperCase();assert.deepEqual(halfRicochetChoice(upper,row.id),offered);
 const wrong=structuredClone(record);wrong.rows[2].beats=16;assert.equal(halfRicochetChoice(wrong,row.id),undefined);
});
test('existing full ricochet keeps its sixteen-count review contract',()=>{
 const raw=readFileSync(new URL('../test-data/contradb/1067.json',import.meta.url),'utf8'),review=prepareContraDbReview(raw),record=review.result.record!;
 const row=record.rows.find(r=>review.interpretation.rows?.[r.id]?.ricochetHey)!;assert.ok(row);assert.equal(halfRicochetChoice(record,row.id),undefined);assert.equal(review.interpretation.rows![row.id].ricochetHey!.amount,1);assert.equal(review.interpretation.rows![row.id].ricochetHey!.bounceDirection,'back-left');
});
