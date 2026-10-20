import {parseDanceText,type ImportResult} from './parser.ts';
import {readContraDbImport,type ContraDbImportResult,type ContraDbInterpretation} from './contradb-import.ts';
import {contraDbRecordUrl} from './contradb-source.ts';
export interface SourceImportResult extends ImportResult {contraDb?:ContraDbImportResult;}
export interface SourceImportOptions {contraDbInterpretation?:ContraDbInterpretation;}
export function contraDbInputUrl(input:string):string|undefined {const raw=input.trim();return /^[1-9]\d{0,8}$/.test(raw)?`https://contradb.com/dances/${raw}`:(()=>{const url=contraDbRecordUrl(raw);return url&&/\/[1-9]\d{0,8}$/.test(url)?url:undefined;})();}
export function isContraDbInput(raw:string):boolean {
 if(/^\s*</.test(raw)&&/dance-show-title|show-figure/.test(raw))return true;
 if(raw.trimStart().startsWith('{'))try{const value=JSON.parse(raw);return ['contra-studio/contradb-snapshot','contra-studio/contradb-interpretation'].includes(value?.schema);}catch{return false;}
 return false;
}
export function readSourceInput(raw:string,options:SourceImportOptions={}):SourceImportResult {
 if(contraDbInputUrl(raw))return{errors:['Choose Review choreography in the importer to retrieve this public ContraDB record, or save its page as HTML and open that file.'],warnings:[]};
 if(!isContraDbInput(raw))return parseDanceText(raw);
 const result=readContraDbImport(raw,{...(options.contraDbInterpretation?{interpretation:options.contraDbInterpretation}:{})});
 return{dance:result.dance,errors:result.errors,warnings:result.warnings,validation:result.validation,contraDb:result,clauses:result.rows.map(row=>({phrase:row.source.phrase,source:row.source.text,line:row.source.index+1,beats:row.source.beats,status:row.resolved?'supported':row.recognized?'ambiguous':'unsupported',diagnostic:row.diagnostics.map(d=>d.message).join(' ')}))};
}
