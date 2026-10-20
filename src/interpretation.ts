import type { Dance, Figure, FigureKind, Relation } from './types';
import {readSourceInput,type SourceImportResult,type SourceImportOptions} from './source-import.ts';
import { validateDance } from './validator';

export interface FigureOption {kind:FigureKind; label:string; relations:Relation[]; direction:boolean; amount:boolean; fixedAmount?:number;}
export const EDITOR_FIGURES:FigureOption[] = [
 {kind:'balance',label:'Balance',relations:['partner','neighbor'],direction:false,amount:false},
 {kind:'swing',label:'Swing',relations:['partner','neighbor'],direction:false,amount:false},
 {kind:'circle',label:'Circle',relations:['all'],direction:true,amount:true},
 {kind:'star',label:'Star',relations:['all'],direction:true,amount:true},
 {kind:'allemande',label:'Allemande',relations:['partner','neighbor','larks','robins'],direction:true,amount:true},
 {kind:'do-si-do',label:'Do-si-do',relations:['partner','neighbor','larks','robins'],direction:false,amount:false,fixedAmount:1},
 {kind:'robins-chain',label:'Robins chain',relations:['partner','neighbor'],direction:false,amount:false},
 {kind:'long-lines',label:'Long lines forward & back',relations:['all'],direction:false,amount:false},
];
export interface EditableFigure {id:string;kind:FigureKind|'';beats:number;who:Relation|'';direction?:'left'|'right'|'';amount?:number;}
export interface InterpretationDraft {title:string;formation:'duple-improper';progression:'single';phrases:{name:string;figures:EditableFigure[]}[];}
export interface Provenance {title:string;author:string;sourceUrl?:string;text:string;notes:string[];}
export interface EditedDance extends Dance {studioInterpretation:{version:2;id:string;revision:number;editedAt:string;provenance:Provenance;draft:InterpretationDraft};sourceText:string;}
export interface DraftIssue {message:string;phraseIndex?:number;figureIndex?:number;}
export interface DraftReview {dance?:Dance;errors:DraftIssue[];warnings:string[];}
export const isEdited = (dance:Dance):dance is EditedDance => !!(dance as EditedDance).studioInterpretation;
export const relationLabel = (who:string) => ({partner:'Partner',neighbor:'Neighbor',larks:'Larks',robins:'Robins',all:'All active dancers'}[who] || 'Choose participants');
const phrases=['A1','A2','B1','B2'];
const clone=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
export function figureLabel(f:EditableFigure):string {
 const who=relationLabel(f.who);
 if(f.kind==='circle'||f.kind==='star')return `${f.kind==='circle'?'Circle':'Star'} ${f.direction||'…'} ${f.amount??'…'}`;
 if(f.kind==='allemande')return `${who} allemande ${f.direction||'…'} ${f.amount??'…'}`;
 if(f.kind==='balance'||f.kind==='swing'||f.kind==='do-si-do')return `${who} ${f.kind}`;
 if(f.kind==='robins-chain')return `Robins chain to ${f.who||'…'}`;
 if(f.kind==='long-lines')return 'Long lines, forward and back';
 return 'Choose a supported figure';
}
export function editorUnavailableReason(dance:Dance):string|undefined {
 if(dance.ringTwirlPolicy!==undefined)return 'Structured editing is not yet available for the opening-ring and terminal-twirl composition; its exact source counts, handoffs and finite-end policy are preserved.';
 if(dance.sixTwoPassPolicy!==undefined)return 'Structured editing is not yet available for the compact six-plus-two composition; its geometry, internal timing and exact source counts are preserved.';
 if(dance.ovalPolicy!==undefined)return 'Structured editing is not yet available for whole-set oval travel. Its exact route, waiting participation, timing conventions and reviewed marker scope are preserved.';
 if(dance.progressionEvents!==undefined||dance.endPolicy!==undefined)return 'Structured editing is not yet available for source-declared mid-cycle progression events. Their exact timing, neighbor transaction and waiting-role policy are preserved.';
 if(dance.formation!=='duple-improper'||dance.circulation!==undefined)return 'Structured editing is not yet available for this formation. Its original source and playable interpretation are kept intact.';
 if(dance.figures.some(f=>!EDITOR_FIGURES.some(o=>o.kind===f.kind||f.kind==='ladies-chain'&&o.kind==='robins-chain')||Object.keys(f).some(key=>!['id','kind','beats','who','direction','amount','label','notes','confidence','progression'].includes(key))))return 'Structured editing is not yet available for one or more figures in this dance. Their explicit notation is preserved, not simplified.';
 return undefined;
}
export function draftFromDance(dance:Dance):InterpretationDraft {
 const unavailable=editorUnavailableReason(dance);if(unavailable)throw new Error(unavailable);
 if(isEdited(dance))return clone(dance.studioInterpretation.draft);
 const result:InterpretationDraft={title:dance.title,formation:'duple-improper',progression:'single',phrases:phrases.map(name=>({name,figures:[]}))};
 let beat=0;for(const f of dance.figures){const p=Math.min(3,Math.floor(beat/16));const option=EDITOR_FIGURES.find(x=>x.kind===f.kind||f.kind==='ladies-chain'&&x.kind==='robins-chain');const item:EditableFigure={id:f.id,kind:f.kind==='ladies-chain'?'robins-chain':f.kind,beats:f.beats,who:f.who||''};if(option?.direction)item.direction=f.direction;if(option?.amount)item.amount=f.amount;if(option?.fixedAmount)item.amount=option.fixedAmount;result.phrases[p].figures.push(item);beat+=f.beats;}return result;
}
export function provenanceFromDance(dance:Dance,fallbackText:string):Provenance {
 if(isEdited(dance))return clone(dance.studioInterpretation.provenance);
 return {title:dance.title,author:dance.author,sourceUrl:dance.sourceUrl,text:(dance as Dance&{sourceText?:string}).sourceText||fallbackText,notes:[...(dance.notes||[])]};
}
function unknownKeys(value:Record<string,unknown>,keys:string[]):boolean{return Object.keys(value).some(k=>!keys.includes(k));}
export function validateDraft(draft:InterpretationDraft,source:Provenance):DraftReview {
 const errors:DraftIssue[]=[],warnings:string[]=[];
 if(!draft||typeof draft!=='object'||unknownKeys(draft as unknown as Record<string,unknown>,['title','formation','progression','phrases']))return {errors:[{message:'Unknown interpretation fields are not supported.'}],warnings};
 if(draft.formation!=='duple-improper'||draft.progression!=='single')errors.push({message:'Only explicit duple-improper, single-progression interpretations are supported.'});
 if(typeof draft.title!=='string'||!draft.title.trim()||draft.title.length>300)errors.push({message:'Give the interpretation a title of 1–300 characters.'});
 if(!Array.isArray(draft.phrases)||draft.phrases.length!==4)return {errors:[...errors,{message:'The interpretation must have four explicit phrases: A1, A2, B1, B2.'}],warnings};
 const figures:Figure[]=[];const positions:{phraseIndex:number;figureIndex:number}[]=[];const ids=new Set<string>();
 draft.phrases.forEach((p,pi)=>{
  if(!p||typeof p!=='object'||unknownKeys(p as unknown as Record<string,unknown>,['name','figures'])||p.name!==phrases[pi]||!Array.isArray(p.figures)){errors.push({message:`Phrase ${phrases[pi]} is missing or has unsupported fields.`,phraseIndex:pi});return;}
  if(!p.figures.length||p.figures.length>16)errors.push({message:`${p.name} needs 1–16 figures.`,phraseIndex:pi});
  let total=0;
  p.figures.forEach((f,fi)=>{
   const at={phraseIndex:pi,figureIndex:fi};
   if(!f||typeof f!=='object'||unknownKeys(f as unknown as Record<string,unknown>,['id','kind','beats','who','direction','amount'])){errors.push({...at,message:'Unknown semantic figure fields cannot be ignored.'});return;}
   if(typeof f.id!=='string'||!f.id||f.id.length>100||ids.has(f.id))errors.push({...at,message:'Each figure needs a unique stable identity.'});else ids.add(f.id);
   if(typeof f.beats!=='number'||!Number.isFinite(f.beats)||f.beats<=0||f.beats>16)errors.push({...at,message:'Use a finite duration greater than 0 and no more than 16 beats.'});else total+=f.beats;
   const option=EDITOR_FIGURES.find(x=>x.kind===f.kind);if(!option){errors.push({...at,message:'Choose a supported figure. Unknown figures are never substituted.'});return;}
   if(!option.relations.includes(f.who as Relation))errors.push({...at,message:`${option.label}: choose ${option.relations.map(relationLabel).join(' or ')}.`});
   if(option.direction&&!['left','right'].includes(f.direction||''))errors.push({...at,message:'Choose the hand or direction explicitly.'});
   if(!option.direction&&f.direction!==undefined&&f.direction!=='')errors.push({...at,message:'This figure does not accept a separate direction override.'});
   if(option.amount&&(typeof f.amount!=='number'||!Number.isFinite(f.amount)||f.amount<=0||f.amount>2))errors.push({...at,message:'Choose a finite turn amount greater than 0 and no more than 2.'});
   if(option.fixedAmount&&f.amount!==option.fixedAmount)errors.push({...at,message:'Only a whole do-si-do is currently supported.'});
   if(!option.amount&&!option.fixedAmount&&f.amount!==undefined)errors.push({...at,message:'This figure does not accept an independent turn amount.'});
   const out:Figure={id:f.id,kind:option.kind,beats:f.beats,who:f.who as Relation,label:figureLabel(f),confidence:'approximate'};
   if(option.direction)out.direction=f.direction as 'left'|'right';if(option.amount||option.fixedAmount)out.amount=f.amount;if(option.kind==='do-si-do')out.direction='right';figures.push(out);positions.push(at);
  });
  if(Math.abs(total-16)>1e-8)errors.push({message:`${p.name} has ${total} beats; exactly 16 are required.`,phraseIndex:pi});
 });
 if(errors.length)return {errors,warnings};
 const dance:Dance={id:'study-draft',title:draft.title.trim(),author:source.author,formation:'duple-improper',sourceUrl:source.sourceUrl,description:`User-edited studio interpretation of ${source.title}.`,figures,verified:false,notes:[...source.notes,`User-edited interpretation. Original choreography: ${source.title} by ${source.author}. Changes are not attributed to the original author.`,`Motion remains schematic; source calling notes are retained as provenance and are not compiled.`]};
 const validation=validateDance(dance);for(const d of validation.diagnostics){if(d.severity==='error')errors.push({message:d.message,...(d.figureIndex!==undefined?positions[d.figureIndex]:{})});else warnings.push(d.message);}
 return {dance:errors.length?undefined:dance,errors,warnings};
}
export function applyDraft(draft:InterpretationDraft,source:Provenance,previous?:Dance):DraftReview {
 const result=validateDraft(draft,source);if(!result.dance)return result;
 const existing=previous&&isEdited(previous)?previous.studioInterpretation:undefined;
 if(existing&&existing.revision>=Number.MAX_SAFE_INTEGER)return {errors:[{message:'This revision counter cannot be advanced safely. Create a new interpretation from the original source.'}],warnings:[]};
 const id=existing?.id||`study-${globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`}`;
 const edited:EditedDance={...result.dance,id,sourceText:source.text,studioInterpretation:{version:2,id,revision:(existing?.revision||0)+1,editedAt:new Date().toISOString(),provenance:clone(source),draft:clone(draft)}};
 return {...result,dance:edited};
}
export function studioArchive(dance:Dance,fallbackText:string):Record<string,unknown> {
 if(isEdited(dance)){const e=dance.studioInterpretation;return {schema:'contra-studio/interpretation',version:2,id:e.id,revision:e.revision,editedAt:e.editedAt,provenance:clone(e.provenance),interpretation:clone(e.draft),notice:'User-edited studio interpretation. Original authorship is provenance, not an endorsement of these changes. Motion is schematic.'};}
 return {schema:'contra-studio/interpretation',version:1,libraryId:/^import-[a-zA-Z0-9-]{1,100}$/.test(dance.id)?dance.id:undefined,exportedAt:new Date().toISOString(),sourceText:fallbackText,interpretation:{title:dance.title,author:dance.author,formation:dance.formation,sourceUrl:dance.sourceUrl,figures:dance.figures},notice:'Source-based schematic interpretation; not validated human motion.'};
}
export function parseStudioInput(raw:string,options:SourceImportOptions={},depth=0):SourceImportResult {
 if(depth>4)return{errors:['The saved source nesting exceeds this importer’s bounded archive depth.'],warnings:[]};
 if(raw.length>500_000)return {errors:['This import is too large. Choose one dance record under 500 KB.'],warnings:[]};
 if(raw.trim().startsWith('{')){let data:Record<string,unknown>;try{data=JSON.parse(raw);}catch{return readSourceInput(raw,options);}
  if(data?.schema==='contra-studio/interpretation'){
   if(data.version===1){if(typeof data.sourceText!=='string')return {errors:['This archive is missing its source text.'],warnings:[]};const result=parseStudioInput(data.sourceText,options,depth+1);if(result.dance&&data.libraryId!==undefined){if(typeof data.libraryId!=='string'||!/^import-[a-zA-Z0-9-]{1,100}$/.test(data.libraryId))return {errors:['The saved import identity is invalid.'],warnings:[]};result.dance.id=data.libraryId;}return result;}
   if(data.version!==2)return {errors:['This studio archive version is unsupported.'],warnings:[]};
   const p=data.provenance as Provenance;
   if(!p||typeof p!=='object'||typeof p.text!=='string'||typeof p.title!=='string'||typeof p.author!=='string'||!Array.isArray(p.notes)||p.notes.some(n=>typeof n!=='string')||(p.sourceUrl!==undefined&&typeof p.sourceUrl!=='string'))return {errors:['The original source provenance is missing or malformed.'],warnings:[]};
   if(p.sourceUrl){try{const url=new URL(p.sourceUrl);if(!['https:','http:'].includes(url.protocol)||url.username||url.password)return {errors:['Original source URL must be an ordinary HTTP or HTTPS link.'],warnings:[]};}catch{return {errors:['Original source URL is not valid.'],warnings:[]};}}
   const review=validateDraft(data.interpretation as InterpretationDraft,p);
   if(!review.dance)return {errors:review.errors.map(e=>e.message),warnings:review.warnings};
   if(typeof data.id!=='string'||!/^study-[a-zA-Z0-9-]{1,100}$/.test(data.id)||!Number.isSafeInteger(data.revision)||Number(data.revision)<1)return {errors:['The edited interpretation identity or revision is invalid.'],warnings:[]};
   const dance:EditedDance={...review.dance,id:data.id,sourceText:p.text,studioInterpretation:{version:2,id:data.id,revision:Number(data.revision),editedAt:typeof data.editedAt==='string'?data.editedAt:'',provenance:clone(p),draft:clone(data.interpretation as InterpretationDraft)}};
   return {dance,errors:[],warnings:['This is a user-edited interpretation. The original source is retained separately.',...review.warnings]};
  }
 }
 return readSourceInput(raw,options);
}
