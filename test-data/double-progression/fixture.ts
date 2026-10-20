/** Review fixture for the exact retained public ContraDB928 snapshot.
 * The executable family is selected by semantic contracts, never this ID. */
import {readFileSync} from 'node:fs';
import {readContraDbSource} from '../../src/contradb-source.ts';
import type {Dance,Figure} from '../../src/types.ts';
import type {DoubleProgressionPolicy} from '../../src/double-progression-improper.ts';
export const raw928=()=>readFileSync(new URL('./contradb-928.json',import.meta.url),'utf8');
export function reviewed928():{dance:Dance;policy:DoubleProgressionPolicy}{
 const record=readContraDbSource(raw928()).record!;
 const values:Omit<Figure,'id'|'label'>[]=[{kind:'balance',beats:4,who:'neighbor'},{kind:'swing',beats:12,who:'neighbor'},{kind:'circle',beats:6,who:'all',direction:'left',amount:.75},{kind:'swing',beats:10,who:'partner'},{kind:'circle',beats:6,who:'all',direction:'left',amount:.75},{kind:'do-si-do',beats:10,who:'neighbor',direction:'right',amount:1.5,progression:true},{kind:'balance',beats:4,who:'neighbor',hands:'right'},{kind:'box-the-gnat',beats:4,who:'neighbor',hands:'right',underRole:'robin'},{kind:'star',beats:8,who:'all',direction:'right',amount:1,progression:true}],rows=[0,0,1,2,3,4,5,5,6],figures=values.map((f,i)=>({...f,id:`${record.sourceId}:figure:${i}`,label:record.rows[rows[i]].text}));
 const evidence=(clause:string,basis:'source-explicit'|'reviewed-interpretation')=>({sourceId:record.sourceId,url:record.sourceUrl,clause,basis});
 const result:{dance:Dance;policy:DoubleProgressionPolicy}={dance:{id:'contradb-928-reviewed-double-progression',title:record.title,author:record.author,sourceUrl:record.sourceUrl,formation:'duple-improper',description:'Literal two-event source interpretation with an explicit reviewed finite-end choice.',figures,notes:[record.notes],progressionEvents:[{afterFigureId:figures[5].id,count:1,waitingRoleArrangement:'lark-left',source:evidence(record.rows[4].text,'source-explicit')},{afterFigureId:figures[8].id,count:1,waitingRoleArrangement:'lark-left',source:evidence(record.rows[6].text,'source-explicit')}]},policy:{waitingRoleArrangement:'lark-left',sameEndTurnBeats:8,reentryPreparationBeats:2,source:evidence('Reviewed finite-end interpretation: exchange across the same physical end in the first eight beats of each waiting interval; wait still, then prepare a reachable balance stance in the final two counts before re-entry at the next source-bound progression event.','reviewed-interpretation')}};
 return{dance:{...result.dance,endPolicy:structuredClone(result.policy)},policy:result.policy};
}
