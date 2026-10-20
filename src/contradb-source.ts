import type {CategorizedMotionDiagnostic} from './motion-compilation-result.ts';
/** Independently authored reader for publicly displayed ContraDB records.
 * ContraDB's software is AGPL-3.0; that does not establish a choreography license.
 * No ContraDB implementation is included. Untrusted HTML is parsed as data only.
 */
export interface ContraDbDiagnostic extends CategorizedMotionDiagnostic { code: string; severity: 'error' | 'review' | 'warning'; message: string; row?: number; }
export interface ContraDbRow {
  id: string; index: number; phrase: string; beatsText: string; beats?: number;
  text: string; html: string; progression: boolean;
  span: Readonly<{start:number;end:number}>;
}
export interface ContraDbMetadata {
  id: number; title: string; choreographer_id?: number; choreographer_name: string;
  formation: string; created_at?: string; updated_at?: string; publish?: string;
  [key:string]: unknown;
}
export interface ContraDbRecord {
  format: 'contradb-public-page'; sourceId: string; sourceUrl: string;
  title: string; author: string; authorUrl?: string; formation: string;
  hook: string; preamble: string; notes: string; publication: string;
  rows: readonly ContraDbRow[]; original: string;
  metadata?: Readonly<ContraDbMetadata>; retrievedAt?: string;
  revision?: string; variantIdentity: string; snapshotId: string;
  provenance: Readonly<{softwareLicense:'AGPL-3.0'; choreographyLicense:'not-established'; access:'public-page-snapshot'; implementation:'independently-authored';verification:'supplied-snapshot-not-network-authenticated'}>;
}
export interface ContraDbSourceResult {record?: ContraDbRecord; diagnostics: ContraDbDiagnostic[]; structurallyValid:boolean; executable:false;}
export interface ContraDbSourceOptions {sourceUrl?:string; retrievedAt?:string; metadata?:ContraDbMetadata;}
export interface ContraDbSnapshot {schema:'contra-studio/contradb-snapshot';version:1;sourceUrl:string;retrievedAt?:string;metadata?:ContraDbMetadata;html:string;}
interface Element {tag:string;attrs:Record<string,string>;children:Array<Element|string>;start:number;end:number;}
const maximumLength=500_000;
export function contraDbRecordUrl(value:string):string|undefined {
  try {const u=new URL(value.trim());if(u.protocol!=='https:'||u.hostname!=='contradb.com'||u.username||u.password||u.port||u.search||u.hash)return;
    const m=u.pathname.match(/^\/dances\/([1-9]\d{0,9})\/?$/);if(m)return `https://contradb.com/dances/${m[1]}`;
  }catch{return;}
}
function decode(text:string):string {
  const named:Record<string,string>={amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' ',frac12:'½',frac14:'¼',frac34:'¾',ndash:'–',mdash:'—',hellip:'…'};
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z\d]+);/gi,(match,entity:string)=>{
    if(entity[0]==='#'){const n=entity[1].toLowerCase()==='x'?parseInt(entity.slice(2),16):parseInt(entity.slice(1),10);return n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'�';}
    return named[entity.toLowerCase()]??match;
  });
}
/** Small bounded non-executing HTML reader. It does not load URLs or run scripts. */
function htmlTree(html:string):Element {
 const root:Element={tag:'root',attrs:{},children:[],start:0,end:html.length},stack=[root];let nodes=0;
 const tokens=/<!--[\s\S]*?-->|<![^>]*>|<\/?[a-z][^>]*>|[^<]+|</gi;
 for(const m of html.matchAll(tokens)){
  const raw=m[0],start=m.index!;if(++nodes>20000)throw new Error('HTML node budget exceeded.');
  if(raw.startsWith('<!--')||raw.startsWith('<!'))continue;
  if(raw.startsWith('</')){const tag=raw.slice(2).match(/^\w[\w:-]*/)?.[0].toLowerCase();if(tag==='h2'&&stack.at(-1)?.tag==='p'&&(stack.at(-1)!.attrs.class??'').split(/\s+/).includes('dance-show-hook')){stack.pop()!.end=start+raw.length;continue;}for(let i=stack.length-1;i>0;i--)if(stack[i].tag===tag){while(stack.length>i)stack.pop()!.end=start+raw.length;break;}continue;}
  if(/^<[a-z]/i.test(raw)){
   const tag=raw.slice(1).match(/^[\w:-]+/)![0].toLowerCase();
   // Public pages contain redundant </tr> and a known </h2> after a hook <p>.
   // Optional row/cell/paragraph endings are closed without merging their text.
   if(['tr','td','th','p'].includes(tag)){const index=stack.findLastIndex(e=>e.tag===tag);if(index>0)while(stack.length>index)stack.pop()!.end=start;}
   const attrs:Record<string,string>=Object.create(null);const tail=raw.slice(tag.length+1,-1);
   for(const a of tail.matchAll(/([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)){const key=a[1].toLowerCase();if(Object.hasOwn(attrs,key))throw new Error(`Duplicate HTML attribute ${key}.`);attrs[key]=decode(a[2]??a[3]??a[4]??'');}
   const child:Element={tag,attrs,children:[],start,end:start+raw.length};stack.at(-1)!.children.push(child);
   if(!['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'].includes(tag)&&!raw.endsWith('/>')){stack.push(child);if(stack.length>128)throw new Error('HTML nesting budget exceeded.');}
  }else stack.at(-1)!.children.push(raw);
 }
 while(stack.length>1)stack.pop()!.end=html.length;return root;
}
function all(node:Element,predicate:(node:Element)=>boolean):Element[]{const out:Element[]=[];for(const child of node.children)if(typeof child!=='string'){if(predicate(child))out.push(child);out.push(...all(child,predicate));}return out;}
const hasClass=(node:Element,name:string)=>(node.attrs.class??'').split(/\s+/).includes(name);
function textOf(node:Element):string {if(['script','style','template','noscript'].includes(node.tag))return '';return node.children.map(c=>typeof c==='string'?decode(c):c.tag==='br'?'\n':textOf(c)).join('');}
const clean=(text:string)=>text.replace(/\s+/g,' ').trim();
function deepFreeze<T>(value:T):T{if(value&&typeof value==='object'){Object.freeze(value);for(const v of Object.values(value))deepFreeze(v);}return value;}
/** Stable non-security fingerprint; exact original text remains the source of truth. */
function fingerprint(text:string):string {let h=14695981039346656037n;for(let i=0;i<text.length;i++)h=BigInt.asUintN(64,(h^BigInt(text.charCodeAt(i)))*1099511628211n);return h.toString(16).padStart(16,'0');}
function validMetadata(value:unknown):value is ContraDbMetadata {return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length<=32&&Object.values(value).every(v=>v===null||typeof v==='string'||typeof v==='number'&&Number.isFinite(v)||typeof v==='boolean')&&Number.isSafeInteger((value as ContraDbMetadata).id)&&(value as ContraDbMetadata).id>0&&['title','choreographer_name','formation'].every(k=>typeof (value as Record<string,unknown>)[k]==='string');}
export function readContraDbSource(input:string,options:ContraDbSourceOptions={}):ContraDbSourceResult {
 const diagnostics:ContraDbDiagnostic[]=[];const issue=(code:string,message:string,severity:ContraDbDiagnostic['severity']='error',row?:number)=>diagnostics.push({code,message,severity,...(row===undefined?{}:{row})});
 const result=(record?:ContraDbRecord):ContraDbSourceResult=>({record,diagnostics,structurallyValid:!!record&&!diagnostics.some(d=>d.severity==='error'),executable:false});
 if(typeof input!=='string'||input.length>maximumLength){issue('input-size','Import one ContraDB page or snapshot under 500 KB.');return result();}
 let html=input,context={...options};
 if(input.trimStart().startsWith('{')){
  let payload:unknown;try{payload=JSON.parse(input);}catch{issue('invalid-json','The ContraDB snapshot is not valid JSON.');return result();}
  const p=payload as Partial<ContraDbSnapshot>;
  if(!p||p.schema!=='contra-studio/contradb-snapshot'||p.version!==1||typeof p.html!=='string'||typeof p.sourceUrl!=='string'){
   issue('metadata-only','ContraDB search JSON contains metadata, not complete choreography. Import a saved public dance page or a version-1 Contra Studio ContraDB snapshot.');return result();
  }
  for(const key of Object.keys(p))if(!['schema','version','sourceUrl','retrievedAt','metadata','html'].includes(key))issue('unknown-snapshot-field',`Unrecognized snapshot field “${key}” is not silently ignored.`);
  if(options.sourceUrl&&contraDbRecordUrl(options.sourceUrl)!==contraDbRecordUrl(p.sourceUrl))issue('source-conflict','Snapshot URL conflicts with the requested source record.');
  if(options.metadata&&p.metadata){if(!validMetadata(options.metadata)||!validMetadata(p.metadata)){issue('metadata-shape','Metadata is limited to32 scalar source fields; nested values or malformed source identity are not accepted.');return result();}if(JSON.stringify(options.metadata)!==JSON.stringify(p.metadata))issue('metadata-context-conflict','Supplied metadata conflicts with the retained snapshot metadata.');}
  html=p.html;context={...options,sourceUrl:p.sourceUrl,retrievedAt:p.retrievedAt??options.retrievedAt,metadata:p.metadata??options.metadata};
 }
 let root:Element;try{root=htmlTree(html);}catch(e){issue('html-structure',e instanceof Error?e.message:'Malformed HTML.');return result();}
 const single=(name:string,required=true):Element|undefined=>{const matches=all(root,e=>hasClass(e,name));if(matches.length!==1){if(required||matches.length>1)issue('source-field',`Expected one ${name} element, found ${matches.length}.`);return;}return matches[0];};
 const titleNode=single('dance-show-title'),authorNode=single('dance-show-choreographer'),formationNode=single('dance-show-formation'),publicationNode=single('dance-show-publish');
 const hookNode=single('dance-show-hook',false),preambleNode=single('dance-show-preamble'),notesNode=single('dance-show-notes');
 const copyIds=all(root,e=>e.tag==='a').map(e=>e.attrs.href?.match(/^\/dances\/new\?copy_dance_id=([1-9]\d{0,9})$/)?.[1]).filter(Boolean);
 const uniqueIds=[...new Set(copyIds)];
 let sourceUrl=context.sourceUrl?contraDbRecordUrl(context.sourceUrl):uniqueIds.length===1?`https://contradb.com/dances/${uniqueIds[0]}`:undefined;
 if(!sourceUrl){issue('source-url','An exact HTTPS ContraDB dance URL is required, or one unambiguous source copy link.');return result();}
 const sourceId=sourceUrl.split('/').at(-1)!;
 if(uniqueIds.some(id=>id!==sourceId))issue('source-id-conflict','Page record ID conflicts with the supplied source URL.');
 if(context.retrievedAt!==undefined&&(typeof context.retrievedAt!=='string'||!Number.isFinite(Date.parse(context.retrievedAt))))issue('retrieval-date','Snapshot retrieval time must be an explicit parseable timestamp.');
 if(context.metadata!==undefined&&!validMetadata(context.metadata)){issue('metadata-shape','Metadata must preserve numeric ID, title, choreographer name, and formation, with at most32 scalar fields and no nested data.');return result();}
 const title=clean(titleNode?textOf(titleNode):''),author=clean(authorNode?textOf(authorNode):'').replace(/^by:\s*/i,''),formation=clean(formationNode?textOf(formationNode):'').replace(/^formation:\s*/i,'');
 if(context.metadata){
  const keys=['id','title','choreographer_id','choreographer_name','formation','hook','user_id','user_name','created_at','updated_at','publish','matching_figures_html'];
  for(const key of Object.keys(context.metadata))if(!keys.includes(key))issue('unknown-metadata-field',`Unknown ContraDB metadata field “${key}” requires source review.`);
  for(const key of ['created_at','updated_at']){const value=context.metadata[key];if(value!==undefined&&(typeof value!=='string'||!Number.isFinite(Date.parse(value))))issue('metadata-revision',`Metadata ${key} must retain a valid source timestamp.`);}
 }
 if(!title||!author||!formation)issue('empty-source-field','Source title, author and formation must be nonempty.');
 if(context.metadata){for(const[key,a,b]of [['id',String(context.metadata.id),sourceId],['title',context.metadata.title,title],['choreographer',context.metadata.choreographer_name,author],['formation',context.metadata.formation,formation]])if(clean(a)!==clean(b))issue('metadata-conflict',`The ${key} differs between the API metadata and this page snapshot; do not merge revisions.`);}
 const sourceTables=all(root,e=>e.tag==='table'&&hasClass(e,'contra-table-nonfluid'));
 if(sourceTables.length!==1)issue('source-table',`Expected one choreography table, found ${sourceTables.length}.`);
 const table=sourceTables[0],sourceRows=table?all(table,e=>e.tag==='tr'):[],rows:ContraDbRow[]=[];let phrase='';
 if(table){
  for(const container of [table,...all(table,e=>['tbody','thead','tfoot','tr'].includes(e.tag))])for(const child of container.children){
   if(typeof child==='string'){if(clean(decode(child)))issue('unclaimed-table-content','Non-row choreography text is retained but has not been interpreted.');}
   else if(!(container.tag==='tr'?['td','th']:['tr','tbody','thead','tfoot']).includes(child.tag))issue('unclaimed-table-content',`Unexpected ${child.tag} content in the choreography table is retained and blocks interpretation.`);
  }
 }
 if(all(root,e=>hasClass(e,'show-figure')).some(e=>!table||e.start<table.start||e.end>table.end))issue('figure-outside-table','A source figure lies outside the retained choreography table.');
 for(const [index,tr]of sourceRows.entries()){
  const cells=tr.children.filter((c):c is Element=>typeof c!=='string'&&(c.tag==='td'||c.tag==='th'));
  if(cells.length!==3){issue('figure-row','Expected a three-cell source row; the entire source table is retained.','error',index);continue;}
  if(all(tr,e=>hasClass(e,'show-figure')).length!==1)issue('unclaimed-source-row','A source table row has no single marked figure; its complete text is retained but cannot be played.','error',index);
  const rowPhrase=clean(textOf(cells[0]));if(rowPhrase)phrase=rowPhrase;
  const beatsText=clean(textOf(cells[1])),text=clean(textOf(cells[2]));
  const beats=/^\d+(?:\.\d+)?$/.test(beatsText)?Number(beatsText):undefined;
  if(!hasClass(cells[1],'dance-show-beats')||beats===undefined||!Number.isFinite(beats)||beats<0||beats>256)issue('row-duration',`Unresolved source duration “${beatsText}”.`,'error',index);
  if(!phrase)issue('row-phrase','A source row has no phrase.','error',index);
  if(!text)issue('empty-figure','A source row has no figure text.','error',index);
  // Text outside show-figure (including inline notes) is deliberately retained.
  rows.push({id:`contradb:${sourceId}:row:${index}`,index,phrase,beatsText,beats,text,html:html.slice(tr.start,tr.end),progression:text.includes('⁋'),span:{start:tr.start,end:tr.end}});
 }
 if(!rows.length)issue('no-figures','This page has no public timed figure rows.');
 const authorLink=authorNode?all(authorNode,e=>e.tag==='a')[0]?.attrs.href:undefined;
 const publication=clean(publicationNode?textOf(publicationNode):'');
 if(context.metadata?.publish!==undefined&&context.metadata.publish!==(/^shared everywhere$/i.test(publication)?'everywhere':/^shared to sketchbook$/i.test(publication)?'sketchbook':undefined))issue('metadata-publication-conflict','API metadata and page disagree about publication status.');
 if(context.metadata?.hook!==undefined&&typeof context.metadata.hook==='string'&&clean(context.metadata.hook)!==clean(hookNode?textOf(hookNode):'').replace(/^hook:\s*/i,''))issue('metadata-hook-conflict','API hook text and page hook differ; do not merge revisions.');
 if(/^shared to sketchbook$/i.test(publication))issue('sketchbook-source','This publicly readable source is marked sketchbook. Keep that status and do not present it as a published/verified transcription.','warning');
 else if(!/^shared everywhere$/i.test(publication))issue('publication-scope',`Unrecognized source publication “${publication||'unspecified'}” needs review before use.`);
 const elements=[titleNode,authorNode,formationNode,hookNode,preambleNode,table,notesNode,publicationNode].filter((e):e is Element=>!!e).sort((a,b)=>a.start-b.start);
 // Preserve exact source fragments, including every table row. Page navigation,
 // scripts outside the record, cookies and login/CSRF fields are not retained.
 let original='';
 for(const element of elements){const offset=original.length;original+=html.slice(element.start,element.end)+'\n';if(element===table)for(const row of rows)row.span={start:offset+row.span.start-element.start,end:offset+row.span.end-element.start};}
 for(const element of elements)if(all(element,e=>['script','style','iframe','form','input','meta'].includes(e.tag)).length)issue('active-source-element','Active or credential-bearing HTML inside a choreography field is not an accepted source record.');
 const record:ContraDbRecord={format:'contradb-public-page',sourceId,sourceUrl,title,author,...(authorLink&&/^\/choreographers\/[1-9]\d*$/.test(authorLink)?{authorUrl:`https://contradb.com${authorLink}`} : {}),formation,hook:clean(hookNode?textOf(hookNode):'').replace(/^hook:\s*/i,''),preamble:clean(preambleNode?textOf(preambleNode):''),notes:clean(notesNode?textOf(notesNode):''),publication,rows,original,metadata:context.metadata?JSON.parse(JSON.stringify(context.metadata)):undefined,retrievedAt:context.retrievedAt,revision:context.metadata?.updated_at,variantIdentity:`contradb:${sourceId}`,snapshotId:`contradb:${sourceId}:${fingerprint(original)}`,provenance:{softwareLicense:'AGPL-3.0',choreographyLicense:'not-established',access:'public-page-snapshot',implementation:'independently-authored',verification:'supplied-snapshot-not-network-authenticated'}};
 return result(deepFreeze(record));
}
export function makeContraDbSnapshot(record:ContraDbRecord):ContraDbSnapshot {
 return {schema:'contra-studio/contradb-snapshot',version:1,sourceUrl:record.sourceUrl,retrievedAt:record.retrievedAt,metadata:record.metadata,html:record.original};
}
