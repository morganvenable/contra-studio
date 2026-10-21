import type {ContraDbRecord,ContraDbRow} from './contradb-source.ts';

export interface CorroboratedSourceHistory {kind:'phrase-variation'|'terminal-replacement'|'phrase-summary';reason:string;sourceRowIds:readonly string[];}
const clean=(s:string)=>s.replace(/\s+/g,' ').trim().toLowerCase();
/** Match actual phrase boundaries, not merely a label attached to a later row. */
function phraseRows(record:ContraDbRecord,phrase:'A1'|'A2'|'B1'|'B2'):ContraDbRow[]|undefined {
 const starts={A1:0,A2:16,B1:32,B2:48},selected:ContraDbRow[]=[];let beat=0;
 for(const row of record.rows){if(!Number.isFinite(row.beats)||!row.beats)return;const end=beat+row.beats!;
  const expected=Object.entries(starts).find(([,start])=>beat>=start&&beat<start+16);
  if(!expected||row.phrase!==expected[0]||end>expected[1]+16)return;
  if(row.phrase===phrase)selected.push(row);beat=end;
 }
 return beat===64&&selected.length?selected:undefined;
}

/** A bounded current-version/history distinction. This does not discard prose:
 * it offers a separately removable review of exact current table evidence. */
export function corroboratedSourceHistory(record:ContraDbRecord):CorroboratedSourceHistory|undefined {
 if(record.notes==="B2 Circle L 3/4 (8), Balance the ring (4), Calif Twir Bill Olson notes: The A part of this dance came from Vermont fiddler, Amy Cann. The rest kind of came together before a Concord (MA) Scouthouse gig on Feb 23, 2004. I used this easy dance to start off the evening that night. It is dedicated to my good friends from the venerable Boston area band, Yankee Ingenuity: Peter Barnes (who always enjoys a good pun), Mary Lea, Jack O'Conner and Cal Howard."){
  const b2=phraseRows(record,'B2');if(!b2||b2.length!==3)return;const[circle,ring,twirl]=b2;
  if(circle.text!=='circle left 3 places'||circle.beats!==8||circle.progression||ring.text!=='balance the ring'||ring.beats!==4||ring.progression||twirl.text!=='partners California twirl ⁋'||twirl.beats!==4||!twirl.progression||record.rows.at(-1)!==twirl||record.rows.filter(row=>row.progression).length!==1)return;
  return{kind:'phrase-summary',sourceRowIds:b2.map(row=>row.id),reason:'The B2 summary is corroborated only by the current table’s circle left three places for eight counts, ring balance four and partner California twirl four, with the sole terminal progression. Its truncated “Calif Twir” remains unchanged; the complete table, not a repaired note, supplies the twirl and duration. The following Bill Olson history, Amy Cann attribution, performance account and dedication are retained as attributed, unverified provenance. The note’s perceived ease supplies no movement or teaching guarantee.'};
 }
 const variation=record.notes.match(/^A variation on ([^\n.;:]{1,160}) obtained from ([A-Z][a-zA-Z'-]*(?: [A-Z][a-zA-Z'-]*){1,4})\. Longer swing in A1 and allemande (RIGHT|LEFT) in A2\.$/);
 if(variation){
  // The cited original title must be the current title's variation stem.
  // No title is itself a choreography admission list.
  const stem=clean(record.title).replace(/\s+\(?variation\)?$/,'');
  const a1=phraseRows(record,'A1'),a2=phraseRows(record,'A2');
  if(clean(variation[1])!==stem||!a1||!a2||a1.length!==1||a2.length!==2)return;
  if(a1[0].beats!==16||a1[0].text!=='neighbors long swing'||a1[0].progression)return;
  const [lines,turn]=a2;
  if(lines.beats!==8||lines.text!=='long lines forward & back'||lines.progression)return;
  const hand=variation[3].toLowerCase();
  if(turn.beats!==8||!new RegExp(`^(?:ladles|robins) allemande ${hand} 1½$`).test(turn.text)||turn.progression)return;
  return{kind:'phrase-variation',sourceRowIds:[a1[0].id,lines.id,turn.id],reason:`The current table explicitly has a 16-count neighbor long swing filling A1, then long lines 8 and robins allemande ${hand} 1½ for 8 filling A2. The cited original/obtained-from credit is retained as provenance. “Longer” remains a historical comparison; it does not supply an inferred duration or assert that the original version was checked.`};
 }
 const replacement=record.notes.match(/^(?:[A-Z][a-zA-Z'-]*(?: [A-Z][a-zA-Z'-]*){1,4} Notes: )?Originally, the last figure of this dance was a neighbor do-si-do 1 1\/2, but I usually swap it for the ring balance and pass through to make the progression as simple as possible for inexperienced dancers\.$/);
 if(replacement){
  const b2=phraseRows(record,'B2');if(!b2||b2.length!==3)return;
  const[circle,ring,pass]=b2;
  if(circle.beats!==8||circle.text!=='circle left 3 places'||circle.progression||ring.beats!==4||ring.text!=='balance the ring'||ring.progression||pass.beats!==4||!/^pass through(?: to (?:new|next) neighbors)? ⁋$/.test(pass.text)||!pass.progression||record.rows.at(-1)!==pass||record.rows.filter(row=>row.progression).length!==1)return;
  return{kind:'terminal-replacement',sourceRowIds:b2.map(row=>row.id),reason:'Review selects the current table’s final circle-left 8, ring balance 4 and pass-through 4, with one terminal progression. The original neighbor do-si-do 1½ remains visible as version history; it is not inserted into the current dance or silently erased. The note’s “usually swap” alternative is resolved explicitly in favor of this retained table.'};
 }
}

/** Explicitly reviewed comparison; not used to suggest provenance automatically. */
export function corroboratedPromenadeComparison(record:ContraDbRecord):CorroboratedSourceHistory|undefined {
 if(record.notes!=="According to The Caller's Box, this dance has never been written. I have a very hard time believing that, hence the name. After publishing this dance here, Chris Page contacted me to let me know that it is, in fact, extremely similar to Bob Isaacs's dance Easy Street. The difference is that Bob's dance has a right and left through instead of a promenade. I'm still leaving the title, since the sequence with the promenade remains, to the best of my knowledge, unique, which is still surprising to me.")return;
 const promenade=record.rows.filter(row=>row.text==='neighbors promenade');
 if(promenade.length!==1||promenade[0].beats!==8||promenade[0].progression||record.rows.some(row=>/right[ -]?(?:and[ -]?)?left[ -]?through/i.test(row.text))||record.rows.reduce((n,row)=>n+(row.beats??NaN),0)!==64)return;
 return {kind:'phrase-variation',sourceRowIds:[promenade[0].id],reason:'The retained table contains one eight-count neighbor promenade and no right-and-left-through. The note explicitly keeps that promenade while comparing an attributed earlier dance containing right-and-left-through. Review selects the current table; the historical comparison and originality claims remain attributed and unverified, and no earlier figure is inserted.'};
}
