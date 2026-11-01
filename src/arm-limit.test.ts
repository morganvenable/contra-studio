import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {auditCase} from '../qa/arm-limit-audit.ts';
import {backLimit,upperArmBehind} from './arm-limit.ts';
import {LIMIT_SLACK} from '../qa/arm-limit-audit.ts';
import type {ProofCase} from './next/proof.ts';

const cases:ProofCase[]=JSON.parse(readFileSync(new URL('./next/proof-cases.json',import.meta.url),'utf8')).filter((c:ProofCase)=>!c.error);

/** Full-strength holds whose hands already did not meet before the shoulder
 * limit (the figure puts the pair farther apart than two arms reach). The
 * limit may not widen them by more than this much. */
/** Gaps under 5 cm are ignored: real dancers' arms and bodies vary by more than that (2026-11-01). */
const GAP_FLOOR=.05;
const UNMET_HOLDS:Record<string,number>={
  'trio-turn {"hand":"right"}':.43,'trio-turn {"hand":"left"}':.43,'trio-basket':.43,
  'whole-circle {"direction":"left"}':.64,'whole-circle {"direction":"right"}':.64,'place-swing':.83,
  'role-star {"hand":"left"}':.81,'role-star {"hand":"right"}':.81,'role-star {"end":"places","hand":"left"}':.81,
  'role-star {"end":"places","hand":"right"}':.81,'role-star {"end":"center","hand":"right"}':.79,
  'star-wheel {"hand":"left"}':.39,'star-wheel {"hand":"right"}':.39,'star-wheel {"center":"robins","hand":"left"}':.39,
  'star-wheel {"center":"robins","hand":"right"}':.39,'star-wheel {"backing":true,"center":"larks","hand":"left"}':.54,
  'star-whirl':.39,
  // Swing out turns faster since swings turn once every two beats (2026-10-31).
  'swing-out':.69,
};

test('the upper arm angle behind the shoulder is measured in the torso frame',()=>{
  assert.equal(upperArmBehind(1,{x:.235,y:1.03,z:0}),0);
  assert.ok(Math.abs(upperArmBehind(-1,{x:-.235,y:1.355-.325*Math.cos(Math.PI/6),z:-.325*Math.sin(Math.PI/6)})-30)<1e-9);
  assert.ok(Math.abs(upperArmBehind(1,{x:.235+.325*Math.cos(Math.PI/9),y:1.355,z:-.325*Math.sin(Math.PI/9)})-20)<1e-9);
  assert.equal(upperArmBehind(1,{x:.235,y:1.355,z:.325}),0);
});

test('an upper arm goes behind the shoulder only hanging low, then at most 10 degrees',()=>{
  const down=(deg:number)=>Math.sin(deg*Math.PI/180);
  for(const d of [-90,-30,0,30,40])assert.equal(backLimit(down(d)),0,`${d} degrees down`);
  assert.ok(backLimit(down(45))>4&&backLimit(down(45))<6,'easing in round 45 degrees down');
  for(const d of [50,70,90])assert.ok(Math.abs(backLimit(down(d))-10)<1e-9,`${d} degrees down`);
});

test(`no figure in the gallery swings an upper arm behind the shoulder past its allowance (none unless low), and held hands still meet`,()=>{
  const over:string[]=[],apart:string[]=[];
  // 30 samples a beat: every frame at 60 frames a second and 120 beats a minute.
  for(const c of cases){
    const r=auditCase(c,30);
    if(r.worst>LIMIT_SLACK)over.push(`${c.id}: ${r.worst.toFixed(2)} deg past the allowance at beat ${r.at.toFixed(2)} (dancer ${r.dancer}, ${r.hand})`);
    const allowed=UNMET_HOLDS[c.id]??GAP_FLOOR;
    if(r.holdGap>allowed)apart.push(`${c.id}: hands ${r.holdGap.toFixed(3)} m apart at beat ${r.holdAt.toFixed(2)}`);
  }
  assert.deepEqual(over,[]);
  assert.deepEqual(apart,[]);
});
