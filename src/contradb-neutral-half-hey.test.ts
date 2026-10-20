import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeContraDbRow} from './contradb-import.ts';
import type {ContraDbRow} from './contradb-source.ts';
const row:ContraDbRow={id:'independent-half-hey',index:2,phrase:'A2',beatsText:'8',beats:8,text:'ladles start a half hey - rights in center, lefts on ends',progression:false,span:{start:0,end:0}};
const caps={ordinaryHalfHeys:true,stateCarryingSequences:true,stateCarryingHalfHeys:true};
const choice={ordinaryHey:{sidePair:'neighbor' as const,exit:'opposite-slots-facing-across' as const}};
test('explicit neutral half-hey interpretation retains counts, roles, shoulders and no progression',()=>{
 const r=normalizeContraDbRow(row,'duple-improper',choice,caps);
 assert.equal(r.resolved,true,JSON.stringify(r.diagnostics));assert.equal(r.figures.length,1);
 const f=r.figures[0];assert.deepEqual([f.kind,f.beats,f.amount,f.who,f.heyStartRole,f.centerShoulder,f.endShoulder,f.exit],['hey',8,.5,'neighbor','robin','right','left','opposite-slots-facing-across']);assert.equal(f.progression,undefined);
});
test('neutral half-hey choice cannot waive capability, timing, formation, shoulder or progression evidence',()=>{
 for(const flag of ['ordinaryHalfHeys','stateCarryingSequences','stateCarryingHalfHeys'])assert.equal(normalizeContraDbRow(row,'duple-improper',choice,{...caps,[flag]:false}).resolved,false);
 for(const patch of [{beats:16},{progression:true},{text:'ladles start a half hey - rights in center, rights on ends'}])assert.equal(normalizeContraDbRow({...row,...patch},'duple-improper',choice,caps).resolved,false);
 assert.equal(normalizeContraDbRow(row,'becket',choice,caps).resolved,false);
 assert.equal(normalizeContraDbRow(row,'duple-improper',{},caps).resolved,false);
});

test('Becket accepts only the neutral choice with its separately validated carried wrapper',()=>{
 assert.equal(normalizeContraDbRow(row,'becket',choice,{...caps,stateCarryingBecketSlices:true}).resolved,true);
 assert.equal(normalizeContraDbRow(row,'becket',{ordinaryHey:{sidePair:'neighbor',exit:'opposite-paired-swing'}},{...caps,stateCarryingBecketSlices:true,ordinaryHeySwingExits:true}).resolved,false);
});
