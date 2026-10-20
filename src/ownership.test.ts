import test from 'node:test';import assert from 'node:assert/strict';
import {compileChoreography}from'./choreography.ts';import{DANCES}from'./catalog.ts';
test('compiled public identity, source and start metadata cannot mutate future scrubs',()=>{
 for(const dance of DANCES){const source=structuredClone(dance),compiled=compileChoreography(source),expected=compiled.sample(130);
  source.figures[0].beats=999;source.figures[0].who='robins';source.title='Changed input';
  assert.throws(()=>{compiled.dancers[0].couple=999;},TypeError);assert.throws(()=>{compiled.dancers[0].role='robin';},TypeError);assert.throws(()=>{compiled.starts[0]=44;},TypeError);assert.throws(()=>{compiled.dance.figures[0].beats=1;},TypeError);
  compiled.sample(800);assert.deepEqual(compiled.sample(130),expected);assert.notEqual(compiled.dance.title,source.title);
  const output=compiled.sample(130);output.poses[0].position.x=1000;output.poses[0].yaw=NaN;output.contacts.length=0;assert.deepEqual(compiled.sample(130),expected);
 }
});
