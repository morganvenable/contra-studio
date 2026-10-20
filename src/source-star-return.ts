import type {ContraDbRecord,ContraDbRow} from './contradb-source.ts';
/** Local marker attachment, not a complete-program or title recognizer. */
export function starReturnFootnote(record:ContraDbRecord):ContraDbRow|undefined {
 const rows=record.rows.filter(row=>row.text==='star right - wrist grip - 4 places +'&&row.beats===8&&!row.progression);
 if(rows.length!==1||record.rows.filter(row=>row.text.includes('+')).length!==1)return;
 const row=rows[0],previous=record.rows[row.index-1];
 if(!previous||previous.beats!==8||previous.progression||!/^(partners|neighbors) right hand balance & box the gnat$/.test(previous.text))return;
 const note=record.notes.match(/^(?:Variation of (https:\/\/contradb\.com\/dances\/\d+) eliminates do-si-do for use outdoors )?\/\+ star back where you came from Collected from Liz Burkhart at MMiSL 2018\.$/);
 if(!note||(note[1]&&record.rows.some(r=>/do[ -]si[ -]do/i.test(r.text))))return;
 const html=record.original.match(/<div class="dance-show-notes">[\s\S]*/)?.[0]??'',links=[...html.matchAll(/<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([^<]*)<\/a>/g)];
 if(!note[1])return links.length===0?row:undefined;
 if(links.length!==1||links[0][2]!==note[1])return;
 const attrs:Record<string,string>=Object.create(null);
 for(const token of links[0][1].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){
  const key=token[1].toLowerCase();if(Object.hasOwn(attrs,key))return;attrs[key]=token[2]??token[3]??token[4]??'';
 }
 if(attrs.href!==note[1])return;
 return row;
}
export const STAR_RETURN_CHOICE_DESCRIPTION='Review the + marker as attaching “star back where you came from” to this full wrist-grip star: return to the star’s own post-box entry slots. The source’s four places and eight counts stay unchanged; no extra rotation or return to the pre-box slots is inferred.';
export const STAR_RETURN_PROVENANCE_DESCRIPTION='Review the retained variation link, outdoor rationale and Liz Burkhart / MMiSL 2018 collection credit as attributed context. The current table contains no do-si-do, but the linked variant and collection history have not been independently verified. The star-return instruction remains a separate removable row choice.';

export function starReturnProvenanceDescription(record:ContraDbRecord):string {
 return record.notes.startsWith('Variation of ')?STAR_RETURN_PROVENANCE_DESCRIPTION:'Review the retained Liz Burkhart / MMiSL 2018 collection credit as attributed context; the collection history has not been independently verified. The star-return instruction remains a separate removable row choice.';
}
