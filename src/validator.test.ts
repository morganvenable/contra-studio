import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDance } from './validator.ts';
import { DANCES, DEMO_TEXT } from './catalog.ts';
import { parseDanceText } from './parser.ts';
import type { Dance } from './types.ts';
const copy = (dance: Dance): Dance => JSON.parse(JSON.stringify(dance));

test('both published examples have valid role-preserving progression, independent of title', () => {
  for(const source of DANCES) {
    const dance=copy(source);dance.title='Unrelated test title';dance.id='anything';
    const r=validateDance(dance);
    assert.equal(r.playable,true,JSON.stringify(r.diagnostics));
    assert.equal(r.repeatable,true);
    assert.equal(r.samples,512);
  }
});

test('recognizable figures with an unsupported transition are rejected before Play', () => {
  const d=copy(DANCES[0]);d.figures.find(f=>f.kind==='circle')!.amount=1;
  const r=validateDance(d);
  assert.equal(r.playable,false);
  assert.ok(r.diagnostics.some(d=>d.code==='swing-entry'));
  const parsed=parseDanceText(DEMO_TEXT.replace('Circle left 3/4','Circle left 1'));
  assert.equal(parsed.dance,undefined);
  assert.ok(parsed.errors.some(e=>e.startsWith('Motion check:')));
  assert.equal(parsed.clauses?.every(c=>c.status==='supported'),true);
});

test('chain receiver incompatible with the actual arrival formation is rejected', () => {
  const d=copy(DANCES[0]);d.figures.find(f=>f.kind==='robins-chain')!.who='partner';
  const r=validateDance(d);
  assert.equal(r.playable,false);
  assert.ok(r.diagnostics.some(d=>d.code==='compile'||d.code==='chain-relationship'));
});

test('64 beats of valid individual circles do not masquerade as progression', () => {
  const d=copy(DANCES[0]);d.figures=Array.from({length:8},(_,i)=>({id:`c${i}`,label:'Circle left once',kind:'circle',who:'all',direction:'left',amount:1,beats:8}));
  const r=validateDance(d);
  assert.equal(r.playable,false);
  assert.ok(r.diagnostics.some(d=>d.code==='progression-endpoint'));
});

test('missing semantic parameters and unsupported adapters cannot bypass the validator', () => {
  const d=copy(DANCES[0]);d.figures[0].who=undefined;
  assert.equal(validateDance(d).playable,false);
  const e=copy(DANCES[0]);e.figures[0].kind='hey';
  assert.equal(validateDance(e).playable,false);
});

test('tiny or implausibly fast figures cannot hide between global quarter-beat samples',()=>{
  const d=copy(DANCES[0]);d.figures[0].beats=.001;d.figures[1].beats=15.999;
  assert.equal(validateDance(d).playable,false);
  const e=copy(DANCES[0]);e.figures[0].beats=.5;e.figures[1].beats=15.5;
  const result=validateDance(e);assert.equal(result.playable,false);assert.ok(result.diagnostics.some(d=>d.code==='balance-counts'));
});
