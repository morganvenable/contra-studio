import {contraDbInputUrl} from './source-import.ts';
import {sourceDownloaderAvailable,staticSourceHelp} from './hosting.ts';
import {readContraDbSource,type ContraDbSnapshot} from './contradb-source.ts';
export interface ContraDbDelivery {sourceStatus:'live'|'retained-snapshot';retrievedAt:string|null;}
/** Same-origin, numeric-record-only gateway. No user-supplied upstream URL is sent. */
export async function fetchContraDbSnapshot(input:string,options:{signal?:AbortSignal;fetcher?:typeof fetch;timeoutMs?:number;downloaderAvailable?:boolean;onDelivery?:(delivery:ContraDbDelivery)=>void}={}):Promise<ContraDbSnapshot>{
 const sourceUrl=contraDbInputUrl(input);if(!sourceUrl)throw new Error('Use a numeric ContraDB dance ID or its exact public record URL.');const id=sourceUrl.split('/').at(-1)!;
 if(!(options.downloaderAvailable??sourceDownloaderAvailable))throw new Error(staticSourceHelp);
 const controller=new AbortController(),abort=()=>controller.abort();if(options.signal?.aborted)controller.abort();else options.signal?.addEventListener('abort',abort,{once:true});
 const timeout=setTimeout(()=>controller.abort(),options.timeoutMs??12000);
 try{
  const response=await(options.fetcher??fetch)(`/api/contradb/${id}`,{method:'GET',credentials:'same-origin',headers:{Accept:'application/json'},signal:controller.signal});
  if(!response.ok)throw new Error(response.status===404?'The record downloader is not available here, or that public record was not found. Open the source and import its saved HTML page.':`The source could not be downloaded (HTTP ${response.status}). Try again or import a saved HTML page.`);
  if(!response.headers.get('content-type')?.includes('application/json'))throw new Error('This deployment does not provide the record downloader. Open the source and import its saved HTML page.');
  const reader=response.body?.getReader();let text='';if(reader){const decoder=new TextDecoder();let bytes=0;try{while(true){const{done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>1_000_000){await reader.cancel();throw new Error('The downloaded record exceeds the bounded import size.');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}}else{text=await response.text();if(text.length>1_000_000)throw new Error('The downloaded record exceeds the bounded import size.');}
  const data=JSON.parse(text);if(String(data.id)!==id||data.sourceUrl!==sourceUrl||typeof data.html!=='string'||data.html.length>500_000)throw new Error('The downloader returned a mismatched or malformed source record. No interpretation was loaded.');
  if(data.sourceStatus!==undefined&&data.sourceStatus!=='live'&&data.sourceStatus!=='retained-snapshot')throw new Error('The downloader returned an unknown source delivery status. No interpretation was loaded.');
  const validDate=typeof data.fetchedAt==='string'&&Number.isFinite(Date.parse(data.fetchedAt));
  if(!validDate&&!(data.sourceStatus==='retained-snapshot'&&data.fetchedAt===null))throw new Error('The downloader returned a mismatched or malformed source retrieval date. No interpretation was loaded.');
  let snapshot:ContraDbSnapshot;
  if(data.sourceStatus==='retained-snapshot'){
   const saved=data.snapshot;
   if(!saved||typeof saved!=='object'||Array.isArray(saved)||saved.schema!=='contra-studio/contradb-snapshot'||saved.version!==1||saved.sourceUrl!==sourceUrl||saved.html!==data.html||(data.fetchedAt===null?Object.hasOwn(saved,'retrievedAt'):saved.retrievedAt!==data.fetchedAt))throw new Error('The saved-source response has mismatched provenance. No interpretation was loaded.');
   const checked=readContraDbSource(JSON.stringify(saved));
   if(!checked.structurallyValid||checked.record?.sourceId!==id)throw new Error('The saved-source snapshot is malformed or conflicts with its record identity. No interpretation was loaded.');
   // Return the retained snapshot exactly, including its original acquisition
   // time and metadata. Delivery mode is UI state, never choreography evidence.
   snapshot=saved;
  }else{
   if(data.snapshot!==undefined)throw new Error('A live response cannot silently substitute a saved snapshot. No interpretation was loaded.');
   snapshot={schema:'contra-studio/contradb-snapshot',version:1,sourceUrl,html:data.html,retrievedAt:data.fetchedAt};
  }
  if(controller.signal.aborted)throw new Error('Source download cancelled.');
  options.onDelivery?.({sourceStatus:data.sourceStatus??'live',retrievedAt:data.fetchedAt});
  return snapshot;
 }catch(error){if(controller.signal.aborted)throw new Error(options.signal?.aborted?'Source download cancelled.':'The source download timed out. Try again or import a saved HTML page.');if(error instanceof SyntaxError)throw new Error('The downloader did not return a valid source response. Import a saved HTML page instead.');throw error;}
 finally{clearTimeout(timeout);options.signal?.removeEventListener('abort',abort);}
}
