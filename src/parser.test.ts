import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDanceText, callersBoxExportUrl, fetchRecord } from './parser.ts';
import { DEMO_TEXT } from './catalog.ts';

test('complete explicit card preserves source and exact counts', () => {
  const r = parseDanceText(DEMO_TEXT);
  assert.deepEqual(r.errors, []);
  assert.ok(r.dance);
  assert.equal(r.dance.figures.reduce((n, f) => n + f.beats, 0), 64);
  assert.equal(r.record?.original, DEMO_TEXT);
  assert.equal(r.dance.verified, false);
  assert.equal(r.clauses?.length, 8);
});

test('unrecognized tails, alternatives, simultaneous actions and modifiers are never discarded', () => {
  for (const unsupported of [
    'Neighbor swing through',
    'Men allemande left 1 & 1/2 while women orbit clockwise',
    'Partner swing // neighbor swing',
    'Hey 3/4 (N3R;WL;PR;ML;N3R;WL)',
    'Women slide right (past W); face next; form diamond',
    'Circle left 3/4 [with N2]',
    'N2 neighbor do-si-do',
    'Circle left 1/0',
    'Circle left 0/0',
    'Partner do-si-do 1/2',
    'Balance ring',
    'Pass through along (NR)',
    'Petronella turn',
    'Right and left through with partner',
    'Men swing',
    'Robins chain to partner',
  ]) {
    const r = parseDanceText(DEMO_TEXT.replace('Neighbor swing', unsupported));
    assert.equal(r.dance, undefined, unsupported);
    assert.ok(r.errors.length > 0);
    assert.ok(r.clauses?.some(c => c.source.includes(unsupported)), unsupported);
  }
});

test('rejects unknown formation, timing, progression, and missing phrase labels', () => {
  for (const text of [
    DEMO_TEXT.replace('Duple Minor - Improper', 'Duple Minor - Becket'),
    DEMO_TEXT.replace('(12) Neighbor swing', '(8) Neighbor swing'),
    DEMO_TEXT.replace('Progression: Single', 'Progression: Double'),
    DEMO_TEXT.replace('Progression: Single\n', ''),
    DEMO_TEXT.replace('A1\n', ''),
    DEMO_TEXT.replace('Progression: Single', 'Progression: Single\nPhraseStructure: 4*8*3'),
  ]) assert.equal(parseDanceText(text).dance, undefined);
});

test('official JSON schema and unknown metadata are preserved', () => {
  const text = JSON.stringify({ ID:'12345',Name:'Fixture',Authors:['A'],Permission:'full',Status:'',FormationBase:'Duple Minor - Improper',Progression:'Single',PhraseStructure:'',UnrecognizedField:{a:1},phrases:[
    {name:'A1',figures:['(4) Neighbor balance','(12) Neighbor swing']},
    {name:'A2',figures:['(8) Circle left 3/4','(8) Partner do-si-do']},
    {name:'B1',figures:['(4) Partner balance','(12) Partner swing']},
    {name:'B2',figures:['(8) Ladies chain to neighbor','(8) Star left 1']},
  ]});
  const r = parseDanceText(text);
  assert.ok(r.dance);
  assert.deepEqual(r.record?.fields.UnrecognizedField,{a:1});
  assert.equal(r.dance.sourceUrl,'https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=12345');
  assert.equal(parseDanceText(text.replace('"Permission":"full"','"Permission":"search"')).dance,undefined);
  assert.equal(parseDanceText(text.replace('"Permission":"full",','')).dance,undefined);
  assert.equal(parseDanceText(text.replace('"Permission":"full"','"Permission":true')).dance,undefined);
  assert.equal(parseDanceText(text.replace('"Status":""','"Status":"broken"')).dance,undefined);
  const reordered = JSON.parse(text);
  [reordered.phrases[0],reordered.phrases[2]]=[reordered.phrases[2],reordered.phrases[0]];
  assert.equal(parseDanceText(JSON.stringify(reordered)).dance,undefined);
  assert.equal(parseDanceText(JSON.stringify({...JSON.parse(text),Direction:'Reverse'})).dance,undefined);
  assert.equal(parseDanceText(JSON.stringify({...JSON.parse(text),'Mixer?':true})).dance,undefined);
  assert.equal(parseDanceText(JSON.stringify({...JSON.parse(text),CallingNotes:'Start offset.'})).dance,undefined);
});

test('source URL allowlist resists unrelated hosts, ambiguous ids and credentials', async () => {
  for (const s of [
    'https://evil.test/contradance/thecallersbox/dance.php?id=123',
    'https://www.ibiblio.org.evil.test/contradance/thecallersbox/dance.php?id=123',
    'https://user@www.ibiblio.org/contradance/thecallersbox/dance.php?id=123',
    'https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=1&id=2',
    'https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=-1',
    'javascript:alert(1)',
  ]) assert.equal(callersBoxExportUrl(s),undefined);
  const url='https://www.ibiblio.org/contradance/thecallersbox/dance.php?id=10273';
  assert.equal(callersBoxExportUrl(url),url+'&format=JSON');
  assert.match((await fetchRecord(url)).errors[0],/cross-origin/);
});
