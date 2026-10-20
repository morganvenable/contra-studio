import test from 'node:test';import assert from 'node:assert/strict';
import {KNOWN_SOURCE_CREDITS,isKnownSourceCredit} from './known-source-credits.ts';
test('retained public credit index admits exact choreographer strings without uploader or fuzzy inference',()=>{
 assert.ok(Object.keys(KNOWN_SOURCE_CREDITS).length>=400);assert.deepEqual(KNOWN_SOURCE_CREDITS['Maia McCormick'],[177]);assert.equal(isKnownSourceCredit('Chris Page'),true);
 for(const name of ['Maia Mccormick','Maia McCormick; then clap','Maia PivotAround','Jog Slowly','Alice Unknown','__proto__'])assert.equal(isKnownSourceCredit(name),false,name);
 for(const [name,ids]of Object.entries(KNOWN_SOURCE_CREDITS)){assert.equal(typeof name,'string');assert.ok(ids.length>0);assert.ok(ids.every(id=>Number.isSafeInteger(id)&&id>0));}
});
