import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {SOURCE_LIBRARY,sourceLibraryUrl} from './source-library.ts';import {readContraDbSource} from './contradb-source.ts';
test('every featured source link preserves measured source identity and author; source variants are not merged by title',()=>{
 for(const item of SOURCE_LIBRARY){const record=readContraDbSource(readFileSync(new URL(`../test-data/contradb/${item.id}.json`,import.meta.url),'utf8')).record;assert.ok(record);assert.equal(item.title,record.title);assert.equal(item.author,record.author);assert.equal(sourceLibraryUrl(item),record.sourceUrl);}
});
