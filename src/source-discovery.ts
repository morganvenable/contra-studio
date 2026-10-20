/** A factual search index, never a choreography or runtime-support registry. */
export interface SourceIndexRecord {id:string;title:string;author:string;formation:string;}
export interface SourceIndex {schema:'contra-studio/contradb-index';version:1;retrievedAt:string;sourceUrl:string;reportedRecords:number;records:SourceIndexRecord[];}
export const FAVORITE_WRITERS=['Chris Page','Susan Petrick','Frannie Marr','Jacqui Grennan','Isaac Banner','Koren Wake','Yoyo Zhou'] as const;
const fold=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
export function readSourceIndex(value:unknown):SourceIndex {
 const p=value as SourceIndex;
 if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['schema','version','retrievedAt','sourceUrl','reportedRecords','records'].includes(k))||p.schema!=='contra-studio/contradb-index'||p.version!==1||typeof p.retrievedAt!=='string'||!Number.isFinite(Date.parse(p.retrievedAt))||p.sourceUrl!=='https://contradb.com/api/v1/dances'||!Number.isSafeInteger(p.reportedRecords)||p.reportedRecords<0||!Array.isArray(p.records)||p.records.length>10000||p.reportedRecords<p.records.length)throw new Error('The source search index could not be verified.');
 const ids=new Set<string>();
 for(const row of p.records){if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==4||Object.keys(row).some(k=>!['id','title','author','formation'].includes(k))||typeof row.id!=='string'||!/^\d{1,10}$/.test(row.id)||Number(row.id)<1||ids.has(row.id)||!['title','author','formation'].every(k=>typeof row[k as keyof SourceIndexRecord]==='string'&&row[k as keyof SourceIndexRecord].length<=500))throw new Error('The source search index has an invalid record.');ids.add(row.id);}
 return p;
}
const aliases:Record<string,string>={'susan patrick':'Susan Petrick','jackie grennan':'Jacqui Grennan','franny marr':'Frannie Marr'};
function distance(a:string,b:string):number{let previous=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){const next=[i];for(let j=1;j<=b.length;j++)next[j]=Math.min(next[j-1]+1,previous[j]+1,previous[j-1]+(a[i-1]===b[j-1]?0:1));previous=next;}return previous[b.length];}
export interface SourceSearch {matches:SourceIndexRecord[];notice?:string;}
export function searchSourceIndex(index:SourceIndex,query:string):SourceSearch {
 let normalized=fold(query.slice(0,200)),notice:string|undefined;
 if(aliases[normalized]){const name=aliases[normalized];normalized=fold(name);notice=`Using the verified spelling ${name}.`;}
 const words=normalized.split(' ').filter(Boolean);
 let matches=index.records.filter(row=>words.every(word=>fold(`${row.id} ${row.title} ${row.author}`).includes(word)));
 if(normalized==='frannie marr'&&!matches.length)return{matches:[],notice:'Frannie Marr is a verified caller; this snapshot has no dance choreographer credit under that name.'};
 if(!matches.length&&words.length>=2&&normalized.length>=8){
  const candidates=[...new Set(index.records.map(row=>row.author))].filter(name=>!/[;&]/.test(name)&&Math.abs(fold(name).length-normalized.length)<=2&&distance(fold(name),normalized)<=2);
  if(candidates.length===1){const candidate=candidates[0];matches=index.records.filter(row=>row.author===candidate);notice=`Possible name match: ${candidate}. Check the credited choreographer before opening.`;}
 }
 return{matches,...(notice?{notice}:{})};
}
