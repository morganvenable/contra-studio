import {neighborDosidoGyreNote,NEIGHBOR_DOSIDO_GYRE_NOTE_DESCRIPTION} from './source-neighbor-dosido.ts';
import {releasedCircleTransitionNote} from './source-rollaway.ts';
import {activeSwingNextNeighborNote} from './source-active-swing.ts';
import {authorshipMethodologyCommentary,retractedSourceAttribution} from './source-authorship-commentary.ts';
import {starReturnFootnote,starReturnProvenanceDescription} from './source-star-return.ts';
import {hasOrderedCircleCompletionNote,CIRCLE_COMPLETION_CHOICE_DESCRIPTION} from './source-mad-row.ts';
import {balancedSquareThroughSource} from './source-square-through.ts';
import {optionalTableAlternative,preDanceWalkthroughFeedback} from './source-alternatives.ts';
import {isKnownSourceCredit} from './known-source-credits.ts';
import {fullHeyRepeatGyreShoulder} from './source-hook-constraints.ts';
import type {ContraDbRecord,ContraDbDiagnostic} from './contradb-source.ts';
import {classifySourceHook,partnerSwingsForBothSummary,originalityHookReview} from './source-hook.ts';
import {corroboratedSourceHistory} from './source-history.ts';
/** Narrow descriptions contain no movement instruction. Other hooks require a
 * semantic adapter; a generic “I read the notes” switch cannot discard them. */
export const isDescriptiveSourceHook=(text:string)=>/^(?:(?:very )?(?:easy|simple)(?: starter)?(?: dance)?|smooth transitions|smooth|flowing|beginner friendly|fun and easy)$/i.test(text.trim());
export type ProseClassification='reference-only'|'provenance-candidate'|'uncertain'|'movement';
/** A conservative triage signal, never a license to discard prose. Positive
 * classifications still need an explicit snapshot-bound review choice. */
/** A quoted work title and named credits are retained attribution, not a
 * license to ignore arbitrary instructions after an attribution prefix. */
export function isDatedFolkAttribution(text:string):boolean {
 const date=text.match(/^Edit (\d{4})\/(\d{2})\/(\d{2}):/);if(!date)return false;const instant=new Date(`${date[1]}-${date[2]}-${date[3]}T00:00:00Z`);if(!Number.isFinite(instant.getTime())||instant.getUTCFullYear()!==Number(date[1])||instant.getUTCMonth()+1!==Number(date[2])||instant.getUTCDate()!==Number(date[3]))return false;
 const token="(?:[A-Z][a-z]+(?:['’\u2010-][A-Z]?[a-z]+)*|[A-Z]\\.)",name=token+'(?: '+token+'){1,3}';
 const match=text.match(new RegExp('^Edit \\d{4}/\\d{2}/\\d{2}: this is "[^"\\n]{1,160}" \\(('+name+')\\) folk processed by ('+name+'(?:,? and '+name+'){0,2})\\.?$'));
 return !!match&&classifySourceProse(match[1])!=='movement'&&classifySourceProse(match[2])!=='movement';
}
export function classifySourceProse(text:string):ProseClassification {
 if(/^(?:https?:\/\/\S+)(?:\s+https?:\/\/\S+)*$/.test(text))return 'reference-only';
 if(isDatedFolkAttribution(text))return 'provenance-candidate';
 if(/^This variation called by [A-Z][a-z]+(?: [A-Z][a-z]+){1,3} in [A-Z][A-Za-z.'-]*(?: [A-Z][A-Za-z.'-]*){0,3}\. Original at https:\/\/contradb\.com\/dances\/\d+$/.test(text))return 'provenance-candidate';
 if(/\b(?:clap\w*|stamp\w*|stomp\w*|waltz\w*|polka\w*|mazurka\w*|zigzag\w*|spins?|hops?|jumps?|gyres?|gypsy|meltdown|ricochet\w*|partners?|neighbors?|roles?|order|begin|starts?|starting|finish|keep|use|drop|release|lift|connect|catch|return|form|rotate|switch|double|triple|then|[AB][12]|gents|ladies|ladles|gentlespoons?|larks?|robins?|ravens?|women|men|couples?|ones|twos|actives?|inactives?|swings?|balances?|allemandes?|chains?|circles?|heys?|stars?|promenades?|poussettes?|sashays?|petronellas?|circulates?|pull|pass|cross|face|facing|turn|twirl|roll|orbit|trade|exchange|progress(?:es|ion|ing)?|clockwise|counterclockwise|right|left|down|up|across|diagonal|end effects?|wait|repeat|instead|replace|skip|omit|reverse|move|go|look|walk|back(?:wards)?|forward|stop|pause|hold|hands?|arms?|shoulders?|feet|thumbs?|duck|bend|slide|beat|counts?|twice|once|first time|every time)\b/i.test(text))return 'movement';
 if(/\b(?:based on|inspired by|written|composed|dedicated|dedication|memory of|honou?r of|birthday|wedding|anniversary|published|publication|choreographer|history|historical|hailing from|collection of|attribution)\b/i.test(text))return 'provenance-candidate';
 return 'uncertain';
}
/** Bounded title-credit syntax; the linked work and attribution remain unverified.
 * This inspects the real note anchor without following the external URL. */
export function linkedTitleProvenance(record:ContraDbRecord):string|undefined {
 const match=record.notes.match(/^Title from Charli xcx (https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11})$/);if(!match)return;
 const html=record.original.match(/<div class="dance-show-notes">[\s\S]*/)?.[0]??'',links=[...html.matchAll(/<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([^<]*)<\/a>/g)];
 if(links.length!==1||links.length!==[...html.matchAll(/<a\b/g)].length||links[0][2]!==match[1])return;
 const attrs:Record<string,string>=Object.create(null);
 for(const token of links[0][1].matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){
  const key=token[1].toLowerCase();if(Object.hasOwn(attrs,key))return;attrs[key]=token[2]??token[3]??token[4]??'';
 }
 if(attrs.href!==match[1])return;
 return 'Review the retained title attribution to Charli xcx and its linked video as non-movement provenance. The title origin and linked work have not been independently verified; no music, timing or dance instruction is inferred.';
}
/** A source instruction can corroborate a typed contact graph, while the
 * remaining history still needs an explicit provenance review. */
export function wristStarNoteProvenance(text:string):string|undefined {
 const match=text.match(/^Author's Notes: The transition from left hand star to allemande left is especially nice if a New England style \(hand on wrist\) star is used\. This is the only dance I can think of for which I specifically request that type of star in those parts of the country where the default is hands-across\. ([\s\S]+)$/);
 return match&&classifySourceProse(match[1])==='provenance-candidate'?match[1]:undefined;
}
export const isLeftProgressingBecketSetup=(text:string)=>text==='Have dancers note direction of progression before circling left 1 place into Becket formation. This progresses to the left but is not intuitive.';
/** A source's absent-figure claim is checked against its complete table. The
 * separately quoted variant credit never replaces the choreographer field. */
export function noChainVariantCredit(record:ContraDbRecord):string|undefined {
 const token="(?:[A-Z][a-z]+(?:[A-Z][a-z]+)*(?:['’\u2010-][A-Z]?[a-z]+)*|[A-Z]\\.)";
 const match=record.preamble.match(new RegExp('^no-chain variant by ('+token+'(?: '+token+'){1,3})$'));
 if(!match||!isKnownSourceCredit(match[1])||record.formation!=='improper'||record.rows.reduce((sum,row)=>sum+(row.beats??NaN),0)!==64||record.rows.some(row=>/\bchains?\b/i.test(row.text)))return;
 const creditWords=match[1].replace(/([a-z])([A-Z])/g,'$1 $2');
 if(classifySourceProse(creditWords)==='movement'||/\b(?:then|unless|except|only|when|while|until|if|snap\w*|tap\w*|kick\w*|jog\w*|pivot\w*|run\w*|crouch\w*|lean\w*|touch\w*|stand\w*|sit\w*|kneel\w*|reach\w*|stretch\w*|shake\w*|step\w*|fingers?|feet|elbows?|knees?|toes?|heads?|hips?|waists?|body|bodies)\b/i.test(creditWords))return;
 return match[1];
}
/** Corroborate a teaching summary against its claimed local relationships,
 * without waiving any action or recognizing a complete dance program. */
export function corroboratedTeachingSummary(record:ContraDbRecord):string|undefined {
 if(record.notes!=='A dance for teaching chains, heys, and square through all at once; there are two chains so it reinforces the chain move, and the hey and square through are followed by B&S for long error correction time.')return;
 const rows=record.rows,chains=rows.filter(r=>/^(?:ladles|ladies|women|robins|ravens) chain(?: to (?:partner|neighbor)s?| \(to (?:partner|neighbor)s?\))?(?: ⁋)?$/i.test(r.text));
 const heys=rows.filter(r=>/^(?:ladles|ladies|women|robins|ravens|gentlespoons|gents|men|larks) start a (?:half|full) hey - (?:rights|lefts) in center, (?:rights|lefts) on ends(?: ⁋)?$/i.test(r.text));
 const squares=rows.filter(r=>balancedSquareThroughSource(r));
 if(chains.length!==2||heys.length!==1||squares.length!==1)return;
 if(![...heys,...squares].every(row=>{const next=rows[(rows.indexOf(row)+1)%rows.length];return /^(?:partners|neighbors) balance (?:&|and) swing$/i.test(next.text)&&Number.isFinite(next.beats)&&next.beats!>=8;}))return;
 return 'Review the retained teaching note as a summary of the current table: two chains, and a balance-and-swing immediately after the hey and after the square-through at the repeat. The phrase “long error correction time” supplies no new count or movement; all row counts and named relationships remain separately validated.';
}
export const DEFERRED_NEIGHBOR_NOTE="Bradley Smith Notes: The first time through the dance, the ladles allemande Left in A1 is with the couple that you start the dance with. Every time after that, the ladles have to look to the right to find the next ladle to allemande. It's a very simple progression that just requires reminding the ladles to look for the next ladle in line after the forward and back";
export const isDeferredNeighborNote=(text:string)=>text===DEFERRED_NEIGHBOR_NOTE;
export function initialWavePreamble(text:string):'lark'|'robin'|undefined {const m=text.trim().match(/^Begin in long waves, (gentlespoons|larks|ladles|robins) facing out and (gentlespoons|larks|ladles|robins) facing in\.?$/i);if(!m)return;const role=(s:string)=>/gentlespoons|larks/i.test(s)?'lark':'robin';if(role(m[1])!==role(m[2]))return role(m[2]);}
export type SourceEventFamily='improper-initial-wave'|'becket-slice'|'improper-star-whirl'|'improper-mad-robin'|'improper-ring-twirl'|'improper-six-two'|'improper-swing-start'|'improper-rory-wave'|'improper-ring-petronella'|'improper-poussette-start'|'becket-ccw-star'|'improper-double'|'improper-ring-start'|'improper-long-wave'|'improper-short-wave'|'improper-star'|'becket-right-half-hey'|'improper-deferred';
export function reviewSourceAnnotations(record:ContraDbRecord,context:{initialWaveInwardRole?:'lark'|'robin';hasReviewedNeighborDosidoGyre?:boolean;hasReviewedActiveSwingFacing?:boolean;hasStarReturn?:boolean;hasOrderedCircleCompletion?:boolean;hasReviewedMadRobinHook?:boolean;hasDiagonalHey?:boolean;preambleReview?:'corroborated-no-chain-variant'|'retain-table-optional-alternative'|'pre-dance-walkthrough-feedback';hasNoChainComposition?:boolean;hasResolvedComposition?:boolean;family?:SourceEventFamily;circulation?:'cw';waitingRoleArrangement?:'lark-left'|'lark-right';sourceHook?:'originality-commentary'|'descriptive'|'hall-summary'|'partner-swings-for-both';initialBinding?:'retain-starting-neighbors';hasHallComposition?:boolean;hasFullHeyRepeatGyre?:boolean;hasWholeSetOval?:boolean;hasWristStarTransition?:boolean;notesReview?:'terminal-dosido-gyre'|'released-circle-transition'|'authorship-methodology'|'star-return-provenance'|'corroborated-teaching-summary'|'provenance-only'|'corroborated-style-and-provenance'|'corroborated-history'|'retain-table-optional-alternative'}):{diagnostics:ContraDbDiagnostic[];warnings:string[]}{
 const diagnostics:ContraDbDiagnostic[]=[],warnings:string[]=[];
 const issue=(code:string,message:string)=>diagnostics.push({code,message,severity:'review'});
 const deferred=context.family==='improper-deferred'&&context.initialBinding==='retain-starting-neighbors'&&context.waitingRoleArrangement==='lark-left'&&context.hasHallComposition;
 const hallSummary=context.sourceHook==='hall-summary'&&record.hook==='simple up and down the hall'&&deferred;
 const reversed=context.family==='becket-right-half-hey'&&context.circulation==='cw'&&context.waitingRoleArrangement==='lark-right';
 const hookClassification=classifySourceHook(record),originality=originalityHookReview(record),originalityReviewed=!!originality&&context.sourceHook==='originality-commentary';
 const partnerSummary=partnerSwingsForBothSummary(record),partnerSummaryReviewed=!!partnerSummary&&context.sourceHook==='partner-swings-for-both';
 const noChainCredit=noChainVariantCredit(record),noChainReviewed=!!noChainCredit&&context.hasNoChainComposition&&context.preambleReview==='corroborated-no-chain-variant';
 const alternative=optionalTableAlternative(record),alternativeReviewed=!!alternative&&context.hasResolvedComposition&&context.preambleReview==='retain-table-optional-alternative';
 const preflight=preDanceWalkthroughFeedback(record),preflightReviewed=!!preflight&&context.hasResolvedComposition&&context.preambleReview==='pre-dance-walkthrough-feedback';
 if(context.preambleReview!==undefined&&!noChainReviewed&&!alternativeReviewed&&!preflightReviewed)issue('source-preamble-choice-conflict','The selected preamble interpretation requires its exact retained wording and a completely resolved corroborating current table; it cannot waive setup or movement instructions.');
 if(record.preamble){
  if(context.initialWaveInwardRole&&initialWavePreamble(record.preamble)===context.initialWaveInwardRole)warnings.push('Initial source wave role facings retained; hands, spacing and finite-end preparation are separate reviewed choices.');
  else if(preflightReviewed)warnings.push(`Snapshot-bound pre-dance review: ${preflight}`);
  else if(preflight)issue('source-preamble-review',preflight);
  else if(alternativeReviewed)warnings.push(`Snapshot-bound preamble review: ${alternative.reason}`);
  else if(alternative)issue('source-preamble-review',alternative.reason);
  else if(noChainReviewed)warnings.push(`Snapshot-bound preamble review: the current table contains no chain figure, corroborating the retained no-chain variant statement. Variant credit “${noChainCredit}” stays separate from the original choreographer field; no alternative source or authorship history is claimed to have been verified.`);
  else if(noChainCredit)issue('source-preamble-review','Review the retained no-chain variant credit against the current chain-free table. This attribution does not alter the original choreographer field or authorize a different movement.');
  else if(reversed&&isLeftProgressingBecketSetup(record.preamble))warnings.push('Source setup consumed: begin in the stated Becket formation; the left-progressing interpretation and source-declared half-hey event retain the noted direction. The preliminary formation instruction is not added to the 64-count dance.');
  else issue('source-preamble','The source has starting/variant instructions that require a dedicated semantic interpretation.');
 }
 if(context.sourceHook!==undefined&&!originalityReviewed&&!hallSummary&&!partnerSummaryReviewed&&(!record.hook||context.sourceHook!=='descriptive'||hookClassification.kind!=='informational'))issue('source-hook-choice','A descriptive-hook choice cannot acknowledge away new or conflicting movement, scope or end-effect cues.');
 if(record.hook){
  if(originalityReviewed)warnings.push(`Snapshot-bound hook commentary review: ${originality}`);
  else if(originality)issue('source-hook-originality-review',originality);
  else if(context.hasReviewedMadRobinHook&&record.hook==='mad ladle to mad ladle progression')warnings.push('The separately reviewed hook retains a complete orbit around the old neighbor, returning to already-progressed roots; only the source terminal event binds the next neighbor. Opposite world orbit directions preserve robins in front in their respective layouts.');
  else if(partnerSummaryReviewed)warnings.push(`Snapshot-bound hook interpretation: ${partnerSummary}`);
  else if(partnerSummary)issue('source-hook-scope-review',partnerSummary);
  else if(hallSummary)warnings.push('Source hook retained as a summary of the explicitly compiled down-the-hall composition; it does not waive the first-pass progression exception.');
  else if(context.sourceHook==='descriptive'&&isDescriptiveSourceHook(record.hook))warnings.push(`Retained source hook “${record.hook}” is explicitly classified as a difficulty description, with no movement instruction removed.`);
  else if(reversed&&record.hook==='ladles courtesy turn the gentlespoons; progress indecent')warnings.push('Source hook consumed: robin-led neighbor courtesy turn and lark-right/robin-left progression and end placement are explicit motion constraints.');
  else if(context.hasFullHeyRepeatGyre&&fullHeyRepeatGyreShoulder(record))warnings.push(`Source hook consumed as a cyclic movement constraint: the complete final hey reaches new neighbors, and the following cycle begins the ${fullHeyRepeatGyreShoulder(record)}-shoulder neighbor gyre. The shoulder is source-supplied, while the exact physical progression and relation are validated by the whole-dance compiler.`);
  else if(context.family==='improper-rory-wave'&&/^Rory o['’]more into matched allemandes$/i.test(record.hook))warnings.push('The retained hook corroborates the source table’s Rory right followed by neighbor left and robin right one-and-a-half turns. It adds no extra action or turn.');
  else if(context.hasDiagonalHey&&/^(?:Easy )?left diagonal hey$/i.test(record.hook))warnings.push('The retained hook summarizes the explicitly modeled left-diagonal hey; its actor groups, right-center/left-end shoulders and following across hey are preserved. Progression multiplicity and finite-end choices remain separately reviewed.');
  else if(context.hasWholeSetOval&&record.hook==='bicycle chain promenade')warnings.push('The source hook names the same full-set along-line promenade and return represented by the linked source-counted rows. Waiting participation, hold, path dimensions and marker scope remain separately reviewed conventions.');
  else if(context.family==='improper-long-wave'&&record.hook==='box circulate progression')warnings.push('Source hook corroborates the two explicitly role-bound long-wave circulations and the final source-marked next-neighbor progression; no extra movement is added.');
  else if(context.family==='improper-short-wave'&&record.hook==='pass the ocean, gentlespoons in the middle')warnings.push('Source hook corroborates the source table’s pass-to-short-wave entry, with larks in the middle; it adds no extra movement. Exact source hands, roles and following half-turns remain explicit constraints.');
  else if(hookClassification.kind!=='review')warnings.push(`Source hook retained as ${hookClassification.kind} metadata: “${record.hook}”. ${hookClassification.reason}`);
  else issue('source-hook',hookClassification.reason);
 }
 const dosidoGyre=neighborDosidoGyreNote(record),dosidoGyreReviewed=dosidoGyre&&context.hasReviewedNeighborDosidoGyre&&context.notesReview==='terminal-dosido-gyre';
 const releasedCircle=releasedCircleTransitionNote(record),releasedCircleReviewed=!!releasedCircle&&context.hasOrderedCircleCompletion&&context.notesReview==='released-circle-transition';
 const authorship=authorshipMethodologyCommentary(record),authorshipReviewed=!!authorship&&context.hasResolvedComposition&&context.notesReview==='authorship-methodology';
 const titleProvenance=linkedTitleProvenance(record);
 if(record.notes.startsWith('Title from ')&&!titleProvenance)issue('source-notes-title-context','A title-credit review requires the exact retained attribution and genuine matching reference link, with no appended instruction.');
 const starReturn=starReturnFootnote(record),starReturnReviewed=!!starReturn&&context.hasResolvedComposition&&context.hasStarReturn&&context.notesReview==='star-return-provenance';
 const teaching=corroboratedTeachingSummary(record),teachingReviewed=!!teaching&&context.notesReview==='corroborated-teaching-summary';
 const notesAlternative=optionalTableAlternative(record,'notes'),notesAlternativeReviewed=!!notesAlternative&&context.hasResolvedComposition&&context.notesReview==='retain-table-optional-alternative';
 const history=corroboratedSourceHistory(record),historyReviewed=!!history&&context.notesReview==='corroborated-history';
 const wristProvenance=wristStarNoteProvenance(record.notes),wristReviewed=!!wristProvenance&&context.hasWristStarTransition&&context.notesReview==='corroborated-style-and-provenance';
 if(context.notesReview!==undefined&&!dosidoGyreReviewed&&!releasedCircleReviewed&&!authorshipReviewed&&!starReturnReviewed&&!teachingReviewed&&!wristReviewed&&!historyReviewed&&!notesAlternativeReviewed&&(context.notesReview!=='provenance-only'||!record.notes||classifySourceProse(record.notes)==='movement'))issue('source-notes-review-conflict','A provenance-only note review cannot waive recognized movement, roles, timing or end-effect instructions, or an absent note.');
 if(record.notes&&!/^(?:https?:\/\/\S+)(?:\s+https?:\/\/\S+)*$/.test(record.notes)){
  const roleNote=/^Wait out with gentlespoons on the right, ladles on the left\. Progression is not entirely intuitive but the dance works well if taught carefully\. Dancers who swap roles may find it more challenging\. Inspired by "[^"\n]{1,200}" by [^.\n]{1,200}\. https?:\/\/\S+$/;
  if(context.hasReviewedActiveSwingFacing&&activeSwingNextNeighborNote(record))warnings.push('Source note retained as endpoint evidence: the separately reviewed final ones swing faces the new neighbors for the literal opening circle left. The note adds no figure, extra rotation or earlier neighbor rebind; the original row still omits its facing.');
  else if(dosidoGyreReviewed)warnings.push(`Snapshot-bound terminal do-si-do / next-gyre review: ${NEIGHBOR_DOSIDO_GYRE_NOTE_DESCRIPTION}`);
  else if(dosidoGyre)issue('source-terminal-dosido-gyre',NEIGHBOR_DOSIDO_GYRE_NOTE_DESCRIPTION);
  else if(releasedCircleReviewed)warnings.push(`Snapshot-bound released circle-transition review: ${releasedCircle}`);
  else if(releasedCircle)issue('source-released-circle-transition',releasedCircle);
  else if(authorshipReviewed)warnings.push(`Snapshot-bound authorship commentary review: ${authorship}`);
  else if(authorship)issue('source-notes-authorship-review',authorship);
  else if(starReturnReviewed)warnings.push(`Snapshot-bound star return and provenance review: ${starReturnProvenanceDescription(record)}`);
  else if(starReturn)issue('source-star-return-provenance',starReturnProvenanceDescription(record));
  else if(context.hasOrderedCircleCompletion&&hasOrderedCircleCompletionNote(record))warnings.push(`Source note consumed as ordered actions: ${CIRCLE_COMPLETION_CHOICE_DESCRIPTION}`);
  else if(teachingReviewed)warnings.push(`Snapshot-bound teaching-note review: ${teaching}`);
  else if(teaching)issue('source-notes-teaching-review',teaching);
  else if(notesAlternativeReviewed)warnings.push(`Snapshot-bound notes review: ${notesAlternative.reason}`);
  else if(notesAlternative)issue('source-notes-alternative-review',notesAlternative.reason);
  else if(context.family==='improper-double'&&record.notes==='Double progression')warnings.push('Source note corroborates the two explicitly retained new-neighbor boundaries. It does not supply the separately reviewed finite-end waiting policy.');
  else if(historyReviewed)warnings.push(`Snapshot-bound ${history!.kind==='phrase-summary'?'table-summary and attributed-history':'current-version history'} review: ${history!.reason} Complete original notes and table remain in the archive.`);
  else if(history)issue('source-notes-history-review',history.reason);
  else if(wristReviewed)warnings.push('Source notes corroborated: the requested New England wrist-grip left star and immediate left allemande transition are represented by the explicit contact graph. The remaining retained authorship, title history, date and rights statement are separately accepted as provenance; no motion note is dropped.');
  else if(wristProvenance)issue('source-notes-style-review','Review the source’s requested wrist-grip star transition against the explicit star contact graph, and classify the remaining retained history / attribution as provenance.');
  else if(deferred&&isDeferredNeighborNote(record.notes))warnings.push('Source notes consumed: after the opening long lines, the first repeat retains the starting neighbors; later repeats bind the next robin to the right. The first-pass exception is explicit in the saved event, not discarded as prose.');
  else if(reversed&&roleNote.test(record.notes))warnings.push('Source notes consumed: out couples retain lark-right/robin-left placement at the same finite end. The caution about role swaps, teaching advice, attribution and reference remain in the original source.');
  else if(context.notesReview==='provenance-only'&&retractedSourceAttribution(record))warnings.push(`Snapshot-bound retracted attribution review: ${retractedSourceAttribution(record)}`);
  else if(titleProvenance&&context.notesReview==='provenance-only')warnings.push(`Snapshot-bound title provenance review: ${titleProvenance}`);
  else if(classifySourceProse(record.notes)!=='movement'&&context.notesReview==='provenance-only')warnings.push('Snapshot-bound review classifies the retained notes as provenance, dedication, history or other non-movement context. This is an explicit review decision, not an assertion that free-text semantics were proved; the complete original notes remain available.');
  else if(classifySourceProse(record.notes)!=='movement')issue('source-notes-classification','Review whether the retained prose notes are provenance/dedication/history rather than movement or end-effect instructions. They are not discarded automatically.');
  else issue('source-notes','The source has prose notes that may alter movement or end effects; they are retained and block automatic playback.');
 }
 return{diagnostics,warnings};
}
