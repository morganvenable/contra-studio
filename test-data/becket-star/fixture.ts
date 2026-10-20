/** Source2446 is an exact retained public-readable sketchbook transcription.
 * Its publication label is not a redistribution licence. The separate end
 * choice below is an explicit test reviewer interpretation, not source text. */
import {readFileSync} from 'node:fs';
import {readContraDbSource} from '../../src/contradb-source.ts';
import type {Dance,Figure} from '../../src/types.ts';
export function reviewedBecketStar():Dance{
 const record=readContraDbSource(readFileSync(new URL('../contradb/2446.json',import.meta.url),'utf8')).record!;
 const values:Omit<Figure,'id'|'label'>[]=[{kind:'long-lines',beats:8,who:'all'},{kind:'allemande',beats:8,who:'larks',direction:'left',amount:1.5},{kind:'balance',beats:4,who:'neighbor'},{kind:'swing',beats:12,who:'neighbor'},{kind:'star',beats:8,who:'all',direction:'left',amount:1,progression:true},{kind:'do-si-do',beats:8,who:'neighbor',direction:'right',amount:1},{kind:'circle',beats:8,who:'all',direction:'left',amount:.75},{kind:'swing',beats:8,who:'partner'}],rows=[0,1,2,2,3,4,5,6],figures=values.map((f,i)=>({...f,id:`${record.sourceId}:figure:${i}`,label:record.rows[rows[i]].text}));
 return{id:'contradb-2446-reviewed-star',title:record.title,author:record.author,sourceUrl:record.sourceUrl,formation:'becket',circulation:'ccw',description:'Source-explicit counterclockwise Becket with separate reviewed finite-end interpretation.',figures,progressionEvents:[{afterFigureId:figures[4].id,count:1,waitingRoleArrangement:'lark-left',source:{sourceId:record.sourceId,url:record.sourceUrl,clause:record.rows[3].text+'; '+record.rows[4].text,basis:'source-explicit'}}],endPolicy:{waitingRoleArrangement:'lark-left',sameEndTurnBeats:8,reentryPreparationBeats:0,source:{sourceId:record.sourceId,url:record.sourceUrl,clause:'Reviewed finite-end choice: exchange across the same physical end for eight counts after the source star; wait still lark-left, then enter with the next neighbors at the following star boundary. The source omits end choreography.',basis:'reviewed-interpretation'}}};
}
