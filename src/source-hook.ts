import type {ContraDbRecord} from './contradb-source.ts';
import {partnerHeyPromenadeRightSummary} from './source-history.ts';
/** ContraDB's official form defines hook as a 50-character niche summary.
 * Retain it as metadata, but do not use that field label to waive a new action.
 * Figure vocabulary is seeded from the public /figures index; cue checks also
 * cover scope, negation, setup, timing and end effects. */
const figureCue=/\b(?:allemandes?|orbits?|arches?|dive|balances?|circulat\w*|box(?:es)?|gnat|butterfl\w*|california|twirls?|chains?|circles?|contra corners|cross trails|do si do|dolphin|hall|stars?|figure eight|waves?|gates?|give|take|gyres?|gypsy|heys?|long lines|mad (?:robin|ladle)|meltdown|pass\w*|petronell\w*|poussett\w*|promenad\w*|pull|revolving|roll\w*|rory\w*|see saw|slices?|slid\w*|square|stand|swat|flea|swings?|turn\w*|zig|zag|ricochet\w*|sashay\w*|cast\w*|weav\w*|clover|pattycake|trade|tunnel|split|march|four changes|clap\w*|stamp\w*|stomp\w*|waltz\w*|polka\w*|mazurka\w*|jig|zigzag\w*|spins?|hops?|jumps?|two step)\b/i;
const modifierCue=/\b(?:larks?|robins?|partners?|neighbors?|shadows?|ones|twos|actives?|inactives?|roles?|hands?|wrists?|arms?|shoulders?|right|left|clockwise|counterclockwise|cw|ccw|up|down|across|diagonal|face|facing|inward|outward|out|progress\w*|indecent|improper|becket|proper|single|double|triple|half|full|once|twice|only|except|without|instead|reverse|alternate|alternating|first time|every time|repeat|wait|before|after|catch\w*|release|walk|step|hold|lift|duck|bend|switch|swap|exchange|connect|disconnect|raise|lower|hop|jump|spin|rotate|cross|return|around|backward|backwards|forward|go|look|omit|skip|end|finish|start|begin|stop|pause|counts?|beats?|bars?|[ab]{3,}|formation|mixer|scatter|triplet|inverted)\b|\d|[¼½¾]/i;
const canonical=(text:string)=>text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\b(?:gentlespoons?|gents?|men|larks?)\b/g,'lark').replace(/\b(?:ladles?|ladies|women|ravens?|robins?)\b/g,'robin').replace(/\bpartners?\b/g,'partner').replace(/\bneighbors?\b/g,'neighbor').replace(/\b(?:new|next) neighbor\b/g,'next neighbor').replace(/do[ -]si[ -]do/g,'do si do').replace(/see[ -]saw/g,'see saw').replace(/\brollaway\b/g,'roll away').replace(/\bthru\b/g,'through').replace(/&/g,' and ').replace(/[“”‘’]/g,"'").replace(/[^a-z0-9¼½¾'\s]/g,' ').replace(/\s+/g,' ').trim();
const contextRestriction=/\b(?:no|not|never|without|unless|except|only|instead|avoid|omit|skip|dont|don't|rather|optional|optionally|if|otherwise)\b/i;
const descriptiveNegation=(text:string)=>text.replace(/\bnot (?:quite |very |too )?(?:symmetrical|symmetric|difficult|hard|easy|simple|challenging)\b/g,'');
const descriptiveWords=new Set('a an the and or but with for of to by very quite not as so more less most rather really somewhat simple easy starter dance dances dancing flowy flowing smooth fun friendly accessible beginner beginners intermediate advanced challenging difficult hard energetic fast paced slow relaxed playful flirty flirtatious asymmetric asymmetrical symmetrical symmetric almost nearly traditional modern contra nice elegant unusual interesting good great intro introductory experienced dancers adventure lively gentle classic elegant exciting rhythmically bouncy glossary opener'.split(' '));
const informational=(text:string)=>{if(figureCue.test(text)||modifierCue.test(text)||contextRestriction.test(descriptiveNegation(text)))return false;if(/^(?:(?:written|composed|created) (?:by [a-z]+(?: [a-z]+){0,3}|for (?:(?:a|the|our|your|their) )?(?:birthday|wedding|anniversary|celebration|festival|workshop|benefit))|dedicated to [a-z]+(?: [a-z]+){0,3}|in (?:memory|honor|honour) of [a-z]+(?: [a-z]+){0,3})$/.test(text))return true;return text.split(' ').every(word=>descriptiveWords.has(word));};
const contains=(source:string,clause:string)=>!contextRestriction.test(source)&&` ${source} `.includes(` ${clause} `);
export interface HookClassification {kind:'informational'|'corroborating'|'review';reason:string;}
/** This is a proposed, removable reading of a named-work comparison. It does
 * not verify the named work's history or silently classify unknown prose. */
export function partnerSwingsForBothSummary(record:Pick<ContraDbRecord,'hook'|'rows'|'formation'>):string|undefined {
 const match=record.hook.match(/^([A-Z][a-z]+(?:['’][A-Z]?[a-z]+)?(?: (?:[A-Z][a-z]+(?:['’][A-Z]?[a-z]+)?|of|the|and|in)){0,4}) with partner swings for both$/);
 if(!match||record.formation!=='improper'||record.rows.reduce((sum,row)=>sum+(row.beats??NaN),0)!==64)return;
 const title=canonical(match[1]);
 // Positive noun-phrase admission avoids treating an unfamiliar imperative as
 // a work name merely because it was title-cased. Unknown prefixes stay review.
 if(!/^(?:broken|mended|hidden|forgotten|golden|silver) /.test(title)||/\b(?:snap\w*|tap\w*|kick\w*|run\w*|crouch\w*|lean\w*|touch\w*|fingers?|feet|elbows?|knees?|toes?|heads?|hips?|waists?|bodies|body|everybody|everyone)\b/.test(title))return;
 if(figureCue.test(title)||modifierCue.test(title)||contextRestriction.test(title)||/\b(?:then|when|while|until|must|should|shall|continue|avoid|do|does|please|unless|if)\b/.test(title))return;
 const partnerSwings=record.rows.filter(row=>/\bpartners?\b/i.test(row.text)&&/\bswings?\b/i.test(row.text));
 if(!partnerSwings.length||!partnerSwings.every(row=>/^(?:partners swing|partners balance & swing)$/.test(row.text)&&!row.progression&&(row.beats===8||row.beats===16)))return;
 return `Review reads “partner swings for both” as the current table's unqualified partner swing for all four dancers in an ordinary improper group. The named-work comparison “${match[1]}” remains visible without claiming its history was verified. “Both” is a source-bound reviewed scope interpretation; it supplies no extra movement or timing.`;
}
export function classifySourceHook(record:Pick<ContraDbRecord,'hook'|'rows'|'notes'|'preamble'|'formation'>):HookClassification {
 const hook=canonical(record.hook);
 if(hook==='simple starter dance w o lines allemande or star'&&record.rows.length>0&&record.rows.every(row=>!/(?:\blines?\b|\ballemandes?\b|\bstars?\b)/i.test(row.text)))return{kind:'corroborating',reason:'The source calls this a simple starter dance and explicitly summarizes the absence of lines, allemandes and stars. None of those figures occurs in the retained table. This does not omit or replace any source row or supply a different movement.'};
 if(hook==='slice yearn'&&/^becket(?: cw)?$/i.test(record.formation)&&record.rows.some(row=>row.text==='slice left and straight back ⁋'&&row.beats===8&&row.progression))return{kind:'corroborating',reason:'The source labels its explicit eight-count left slice and straight-back progression as Slice/Yearn. This retained paired label supplies no additional figure, different return direction or timing; the actual slice and finite event remain separately reviewed.'};
 if(hook==='smooth and flowy hey like figure up down set'&&partnerHeyPromenadeRightSummary(record))return{kind:'corroborating',reason:'The evaluative hook describes the retained eight-count partner-start half hey with right end and left center shoulders. The along-side partner passes account for the up/down description; no different hey, timing or extra travel is inferred.'};
 if(!hook||hook==='smooth transitions'||informational(hook))return{kind:'informational',reason:'Preserved as the source’s descriptive niche summary; the text has clear evaluative or provenance wording and introduces no recognized action, scope, timing or setup cue.'};
 const corroboratedSummary=(summary:string):string|undefined=>{
  const counted=summary.match(/^(a|one|two|three|four|1|2|3|4) (partner|neighbor) swings? and (a|one|two|three|four|1|2|3|4) (partner|neighbor) swings?$/);
  if(counted&&counted[2]!==counted[4]){
   const number=(word:string)=>({a:1,one:1,two:2,three:3,four:4}[word]??Number(word)),expected=new Map([[counted[2],number(counted[1])],[counted[4],number(counted[3])]]),actual=new Map<string,number>();
   const swings=record.rows.filter(row=>/\bswings?\b/.test(canonical(row.text)));
   if(swings.length&&swings.every(row=>{const m=canonical(row.text).match(/^(partner|neighbor) (?:balance and |long )?swing$/);if(!m||typeof row.beats!=='number'||row.beats<=0)return false;actual.set(m[1],(actual.get(m[1])??0)+1);return true;})&&[...expected].every(([who,count])=>actual.get(who)===count))return 'The hook counts exactly the retained unqualified partner and neighbor swing rows. Combined balance-and-swing counts as one swing; no extra swing, duration, actor scope or ordering is supplied.';
  }

  if(/^(?:simple|easy) with (?:simple|easy) progression$/.test(summary)){
   const tail=record.rows.slice(-3),[circle,ring,pass]=tail;
   if(tail.length===3&&circle.phrase==='B2'&&circle.beats===8&&circle.text==='circle left 3 places'&&ring.phrase==='B2'&&ring.beats===4&&ring.text==='balance the ring'&&pass.phrase==='B2'&&pass.beats===4&&/^pass through(?: to (?:new|next) neighbors)? ⁋$/.test(pass.text)&&pass.progression&&record.rows.filter(row=>row.progression).length===1&&record.rows.reduce((n,row)=>n+(row.beats??NaN),0)===64)return 'The hook evaluates the ease of the table’s single terminal ring/pass progression. Its exact circle 8, ring balance 4 and pass-through 4 remain source constraints; “easy” adds no movement or timing and is not a difficulty guarantee.';
  }
  const roleAllemandeSummary=summary.match(/^(right|left) hand allemandes? for all$/);
  if(roleAllemandeSummary){
   const entries=record.rows.map(row=>canonical(row.text)).filter(text=>/\ballemandes?\b/.test(text)),roles=new Set<string>();
   const exact=entries.length>0&&entries.every(text=>{const m=text.match(/^(lark|robin) allemande (right|left) (?:once|twice|[\d¼½¾ ]+)$/);if(!m||m[2]!==roleAllemandeSummary[1])return false;roles.add(m[1]);return true;});
   if(exact&&roles.has('lark')&&roles.has('robin'))return 'Both source role groups have explicit allemandes in the hook’s named hand/direction, with no contrary allemande or extra scope qualifier. The hook summarizes these retained rows without adding a turn.';
  }
  if(/^circles? in both directions$/.test(summary)){
   const entries=record.rows.map(row=>canonical(row.text)).filter(text=>/\bcircles?\b/.test(text)),directions=new Set<string>();
   const exact=entries.length>=2&&entries.every(text=>{const m=text.match(/^circle (left|right) [\d¼½¾ ]+ places?$/);if(!m)return false;directions.add(m[1]);return true;});
   if(exact&&directions.has('left')&&directions.has('right'))return 'The source table explicitly contains circles in both named directions, with no conditional, role-specific or additional circle qualifier. The hook summarizes those exact retained rows.';
  }
 };
 if(record.hook==='circle to circle transition'&&record.rows[0]?.text==='circle left 2 places'&&record.rows[0].beats===4&&!record.rows[0].progression&&record.rows.at(-1)?.text==='circle right 4 places ⁋'&&record.rows.at(-1)?.beats===8&&record.rows.at(-1)?.progression)return{kind:'corroborating',reason:'The hook identifies the literal final right circle and next-repeat opening left circle. The movement-bearing teaching note, partnerward turn and model timing still require their separate review; the hook alone cannot select a hand-contact method.'};
 const coupledRows=record.rows.filter(row=>row.text==='neighbors do si do once as couples'&&row.beats===8&&!row.progression);
 if(hook==='do si do as couples'&&coupledRows.length===1)return{kind:'corroborating',reason:'The hook summarizes the retained eight-count neighbors do-si-do-as-couples row. Unit pairing, passage shoulder and contact convention remain separately reviewed; the hook supplies none of those omitted details.'};
 if(record.hook==='Cali Twirl to Couples DSD'&&coupledRows.length===1&&record.rows[0]===coupledRows[0]&&record.rows.at(-1)?.text==='partners California twirl ⁋'&&record.rows.at(-1)?.beats===4&&record.rows.at(-1)?.progression)return{kind:'corroborating',reason:'The hook summarizes the literal terminal partner California twirl followed by the next repeat’s opening couples do-si-do. It does not supply a new movement or waive the measured repeat-boundary validation; the coupled unit and released-hold convention remains separately reviewed.'};
 const promenadeArrow=record.hook.match(/^(?:Beginner friendly, )?promenade (?:->|→) circle (left|right)$/i);
 if(promenadeArrow&&record.rows.some((row,index)=>/^(?:partners|neighbors) promenade$/.test(row.text)&&row.beats===8&&!row.progression&&new RegExp('^circle '+promenadeArrow[1].toLowerCase()+' [1-4] places$').test(record.rows[index+1]?.text??'')))return{kind:'corroborating',reason:'The arrow summary names the adjacent source promenade and circle in the stated direction. Its difficulty description supplies no movement or timing; source counts, named relations and modeled transitions remain separately validated.'};
 const summaryReason=corroboratedSummary(hook);if(summaryReason)return{kind:'corroborating',reason:summaryReason};
 if(hook==='simple becket that teaches positional roles'&&/^becket$/i.test(record.formation)&&['ladles','gentlespoons'].every(role=>record.rows.some(row=>row.beats===8&&!row.progression&&row.text===`${role} do si do once`)))return{kind:'corroborating',reason:'The source’s teaching summary is consistent with its separate full do-si-do rows for each named role in Becket formation. It adds no action, assignment or timing, and does not establish a teaching outcome.'};
 if(hook==='easy becket dance with no role distinctions'&&/^becket$/i.test(record.formation)&&record.rows.length>0&&!record.rows.some(row=>/\b(?:gentlespoons?|gents?|men|larks?|ladles?|ladies|women|ravens?|robins?|ones|twos|actives?|inactives?)\b/i.test(row.text)))return{kind:'corroborating',reason:'The retained Becket table has no role-qualified source rows. The hook describes that wording and its perceived ease; it does not remove source instructions or assert that every animation detail is role-neutral.'};
 if(hook==='easy hey dance'&&record.rows.some(row=>row.beats===16&&!row.progression&&/^(?:gentlespoons|ladles) start a full hey - (?:rights in center, lefts on ends|lefts in center, rights on ends)$/.test(row.text)))return{kind:'corroborating',reason:'The evaluative hook describes the complete source-named full hey. It supplies no extra pass, timing or direction, and its ease claim remains attributed context.'};
 if(hook==='glossary dance for teaching hey'&&record.rows.some(row=>row.beats===16&&!row.progression&&/^(?:gentlespoons|ladles) start a full hey - (?:rights in center, lefts on ends|lefts in center, rights on ends)$/.test(row.text)))return{kind:'corroborating',reason:'The teaching hook names the literal full hey already retained in the table. It adds no passes, timing, setup or movement; the claimed teaching usefulness is an attributed description.'};
 if(hook==='simple and fun handholds'&&record.rows.some(row=>/^(?:neighbors|partners) right hand balance & box the gnat$/.test(row.text))&&record.rows.some(row=>/^star (?:left|right) - wrist grip - 4 places$/.test(row.text)))return{kind:'corroborating',reason:'The hook describes the table’s explicit right-hand balance/box and wrist-grip star holds. The evaluative wording adds no new hand connection, timing or movement.'};
 if(hook==='box the gnat to star different while simple'&&record.rows.some((row,i)=>/^(?:neighbors|partners) right hand balance & box the gnat$/.test(row.text)&&row.beats===8&&!row.progression&&/^star (?:left|right)(?: - (?:hands across|wrist grip) -)? 4 places(?: \+)?$/.test(record.rows[i+1]?.text??'')&&record.rows[i+1].beats===8&&!record.rows[i+1].progression))return{kind:'corroborating',reason:'The named box-to-star order matches adjacent retained rows. “Different while simple” is a descriptive judgment, not an extra movement; any star qualifier or note still requires its own interpretation.'};
 const clauses=[...record.rows.map(row=>canonical(row.text)),canonical(record.notes),canonical(record.preamble)].filter(Boolean);
 if(clauses.some(clause=>contains(clause,hook)))return{kind:'corroborating',reason:'The complete normalized hook phrase is already present in a retained source clause, including its stated roles and modifiers.'};
 const descriptiveWith=hook.match(/^(.+?) with (.+)$/);
 if(descriptiveWith&&informational(descriptiveWith[1])&&(corroboratedSummary(descriptiveWith[2])||clauses.some(clause=>contains(clause,descriptiveWith[2]))))return{kind:'corroborating',reason:'The hook’s clear evaluative introduction describes a complete figure phrase already retained in the source. Its roles and modifiers are not replaced or expanded.'};
 // A short list can summarize separately stated figures. Every complete term
 // must match a source clause; matching only a figure keyword is insufficient.
 const list=record.hook.split(/[,;]/).map(canonical).filter(Boolean);
 if(list.length>1&&list.every(term=>informational(term)||corroboratedSummary(term)||clauses.some(clause=>contains(clause,term))))return{kind:'corroborating',reason:'Each action-bearing part of the hook is corroborated by a complete retained source phrase; descriptive parts remain metadata.'};
 // Recognize only literal adjacent figure summaries, retaining all words in
 // each side. More elaborate catches, exceptions and scope need review.
 const transition=hook.split(/\s+(?:to|then|into)\s+/);
 if(transition.length>=2&&transition.length<=3&&transition.every(term=>figureCue.test(term))){
  const rows=record.rows.map(row=>canonical(row.text));
  if(rows.some((_,start)=>transition.every((term,i)=>contains(rows[(start+i)%rows.length],term))))return{kind:'corroborating',reason:'The hook’s complete transition phrases match adjacent source rows in the stated order; no extra movement is inserted.'};
 }
 return{kind:'review',reason:'The hook contains a movement, role, hand, direction, timing, scope or end-effect cue not fully corroborated by the retained source clauses.'};
}

export function originalityHookReview(record:Pick<ContraDbRecord,'hook'>):string|undefined {if(record.hook==='so predictable that it may not be original')return 'Review the complete hook as attributed commentary about predictability and uncertain originality. Its originality claim is unverified; it supplies no movement, participant scope, timing or endpoint instruction.';}

