import test from 'node:test';
import assert from 'node:assert/strict';
import {hostingConfiguration} from './hosting.ts';

test('catalogue requests stay under root, project subpath, and relative deployment bases',()=>{
 for(const [base,expected] of [
  ['/','/contradb-index.json'],
  ['/contra-studio/','/contra-studio/contradb-index.json'],
  ['/contra-studio','/contra-studio/contradb-index.json'],
  ['./','./contradb-index.json'],
  ['','contradb-index.json'],
 ])assert.equal(hostingConfiguration({BASE_URL:base}).catalogueUrl,expected);
 assert.equal(hostingConfiguration().catalogueUrl,'./contradb-index.json');
});

test('only explicit Pages builds disable the same-origin source downloader',()=>{
 assert.equal(hostingConfiguration({MODE:'pages'}).sourceDownloaderAvailable,false);
 for(const mode of ['production','development','test',undefined]){
  assert.equal(hostingConfiguration({MODE:mode}).sourceDownloaderAvailable,true);
 }
 assert.equal(hostingConfiguration().sourceDownloaderAvailable,true);
});
