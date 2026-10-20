import {KNOWN_SOURCE_CREDITS} from './known-source-credits.ts';
import {contraDbRecordUrl,type ContraDbRecord} from './contradb-source.ts';

export interface OptionalTableAlternative {sourceRowId:string;reason:string;}
const completeImproper=(record:ContraDbRecord)=>record.formation==='improper'&&record.rows.reduce((sum,row)=>sum+(row.beats??NaN),0)===64;
const preambleHtml=(record:ContraDbRecord)=>record.original.match(/<div class="dance-show-preamble">[\s\S]*?(?=<table)/)?.[0]??'';
/** Read real attribute tokens; data-href and href-like text inside a quoted
 * attribute cannot establish a source link. This never follows a URL. */
function sourceLinks(html:string):Array<{href:string;text:string}>|undefined {
 const links:Array<{href:string;text:string}>=[];
 for(const match of html.matchAll(/<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([^<]*)<\/a>/g)){
  const attrs:Record<string,string>=Object.create(null);
  for(const token of match[1].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){
   const key=token[1].toLowerCase();if(Object.hasOwn(attrs,key))return;
   attrs[key]=token[2]??token[3]??token[4]??'';
  }
  if(!Object.hasOwn(attrs,'href'))return;
  links.push({href:attrs.href,text:match[2]});
 }
 if(links.length!==[...html.matchAll(/<a\b/g)].length)return;
 return links;
}
export const sourceAnnotationLinks=(record:ContraDbRecord,section:'preamble'|'notes')=>sourceLinks(section==='preamble'?preambleHtml(record):record.original.match(/<div class="dance-show-notes">[\s\S]*?(?=<p class="dance-show-publish")/)?.[0]??'');
const preambleLinks=(record:ContraDbRecord)=>sourceAnnotationLinks(record,'preamble');
/** The alternate remains source text. This only offers an explicit selection of
 * the current table, never a generic waiver for optional-looking instructions. */
export function optionalTableAlternative(record:ContraDbRecord,section:'preamble'|'notes'='preamble'):OptionalTableAlternative|undefined {
 if(!completeImproper(record))return;
 if(section==='notes'){
  if(record.notes==='Optional: last time B1) Long lines forward & back, Gentlespoons allemande left 1 1/2 B2) Partners balance & swing Inspired by Cherokee Shuffle https://contradb.com/dances/509'){
   const tail=record.rows.filter(row=>row.phrase==='B1'||row.phrase==='B2'),expected=[[8,'gentlespoons allemande left 1½'],[8,'partners swing'],[8,'balance & petronella'],[4,'balance the ring'],[4,'partners California twirl ⁋']] as const;
   if(tail.length!==expected.length||tail.some((row,i)=>row.beats!==expected[i][0]||row.text!==expected[i][1]||row.progression!==(i===4))||record.rows.at(-1)!==tail[4]||record.rows.filter(row=>row.progression).length!==1)return;
   const links=sourceAnnotationLinks(record,'notes');
   if(!links||links.length!==1||links[0].href!=='https://contradb.com/dances/509'||links[0].text!==links[0].href)return;
   return{sourceRowId:tail[0].id,reason:'Review selects the retained current B1/B2 table: larks left allemande 1½ for eight counts, partner swing eight, balance-and-petronella eight, ring balance four and partner California twirl four with the sole terminal progression. The optional last-time long-lines/allemande and partner balance-and-swing ending stays visible and unselected; it is not modeled or inserted. The Cherokee Shuffle inspiration claim and exact linked source remain attributed, unverified provenance.'};
  }
  if(record.notes==="Essentially the same dance as Concertina Chair by Ted Crane, but Ted's dance has the gentlespoons start the hey passing by the right shoulder, with an allemande by the right 1½ in the B1."){
   const heys=record.rows.filter(row=>/\bhey\b/i.test(row.text));
   if(heys.length!==1)return;
   const hey=heys[0],turn=record.rows[hey.index+1];
   if(hey.text!=='gentlespoons start a full hey - lefts in center, rights on ends'||hey.beats!==16||hey.progression||!turn||turn.text!=='gentlespoons allemande left 1½'||turn.beats!==8||turn.phrase!=='B1'||turn.progression)return;
   return{sourceRowId:hey.id,reason:'Review selects the current table’s lark-start full hey with left center/right end shoulders and its following eight-count lark left allemande one-and-a-half in B1. The note attributes a right-shoulder/right-allemande version to Concertina Chair by Ted Crane; that comparison remains visible and unselected, and its history or alternative motion has not been verified.'};
  }
  if(record.notes!=='Alt. B2-- Circle left 3 place and pass through to new neighbors do si do new neighbors')return;
  const tail=record.rows.slice(-3);
  if(tail.length!==3||tail.some(row=>row.phrase!=='B2')||record.rows.filter(row=>row.phrase==='B2').length!==3||record.rows.filter(row=>row.progression).length!==1)return;
  if(tail[0].text!=='circle left 3 places'||tail[0].beats!==8||tail[0].progression||tail[1].text!=='balance the ring'||tail[1].beats!==4||tail[1].progression||tail[2].text!=='pass through ⁋'||tail[2].beats!==4||!tail[2].progression)return;
  return{sourceRowId:tail[0].id,reason:'Review selects the current B2 table: circle left three places for eight counts, ring balance for four, then pass through for four with its single terminal progression. The alternative circle/pass/new-neighbor do-si-do remains visible and unselected; its timing, motion and progression are not claimed to have been validated.'};
 }
 if(record.preamble==='Could change right and left through to promenade to make the dance easier.'){
  const mentioned=record.rows.filter(row=>/\b(?:right(?: and)? left through|promenades?)\b/i.test(row.text));
  if(mentioned.length!==1)return;
  const row=mentioned[0];
  if(row.beats!==8||row.progression||!/^right(?: and)? left through$/.test(row.text))return;
  return{sourceRowId:row.id,reason:'Review selects the current table’s eight-count right-and-left-through. The preamble’s optional promenade substitution stays visible as an unselected alternative; no promenade is inserted, and the alternative’s exact movement or ease is not claimed to have been validated.'};
 }
 if(record.preamble==='Common variation is for long lines forward and back instead of do si do. That version can be found here.'){
  const mentioned=record.rows.filter(row=>/\b(?:do si do|long lines)\b/i.test(row.text)),links=preambleLinks(record);
  if(mentioned.length!==1||mentioned[0].text!=='gentlespoons do si do once'||mentioned[0].beats!==8||mentioned[0].progression||!links||links.length!==1||links[0].text!=='here')return;
  const linked=contraDbRecordUrl(links[0].href);if(!linked||linked===record.sourceUrl)return;
  return{sourceRowId:mentioned[0].id,reason:'Review selects the current table’s eight-count larks do-si-do once. The long-lines substitution and its exact linked variant remain visible and unselected; no long lines are inserted, and the linked version or the claim that it is common has not been verified.'};
 }
}
/** A pre-floor walkthrough and feedback request is retained separately from the
 * timed table. The exact anchored grammar cannot absorb added dance commands. */
export function preDanceWalkthroughFeedback(record:ContraDbRecord):string|undefined {
 const match=record.preamble.match(/^Please walk this dance thru before taking to the dance floor, any feed back would be appreciate you can E-mail ([A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9.-]*[A-Za-z0-9])?\.[A-Za-z]{2,24}) thanks (.+)$/);
 if(!match||match[2]!==record.author||!Object.hasOwn(KNOWN_SOURCE_CREDITS,match[2]))return;
 const links=preambleLinks(record);
 if(!links||links.length!==1||links[0].href!==`mailto:${match[1]}`||links[0].text!==match[1])return;
 return 'Review classifies the explicit walkthrough request as preparation before taking the dance to the floor, outside the timed choreography. The attributed feedback request and contact address remain source text; no contact is made and no walkthrough counts or extra movement are inserted.';
}
