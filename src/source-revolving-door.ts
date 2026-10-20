import type {ContraDbRecord,ContraDbRow} from './contradb-source.ts';

export interface RevolvingDoorChoice {
 amount:1;
 dropOffAfter:.5;
 approachHold:'half-shoulder-waist';
 phaseBeats:readonly [1.25,4.5,1.25,1];
}
export const CONVENTIONAL_REVOLVING_DOOR:RevolvingDoorChoice=Object.freeze({amount:1,dropOffAfter:.5,approachHold:'half-shoulder-waist',phaseBeats:Object.freeze([1.25,4.5,1.25,1] as const)});
export function isRevolvingDoorChoice(value:unknown):value is RevolvingDoorChoice {
 if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))return false;
 const keys=['amount','dropOffAfter','approachHold','phaseBeats'],descriptors=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(value).length!==keys.length||Reflect.ownKeys(value).some(k=>typeof k!=='string'||!keys.includes(k))||keys.some(k=>!descriptors[k]||!Object.hasOwn(descriptors[k],'value')))return false;
 const v=value as RevolvingDoorChoice,p=v.phaseBeats;
 if(v.amount!==1||v.dropOffAfter!==.5||v.approachHold!=='half-shoulder-waist'||!Array.isArray(p)||p.length!==4||Reflect.ownKeys(p).length!==5)return false;
 return [1.25,4.5,1.25,1].every((n,i)=>{const d=Object.getOwnPropertyDescriptor(p,String(i));return !!d&&Object.hasOwn(d,'value')&&d.value===n;});
}
const clean=(text:string)=>text.replace(/[–—]/g,'-').replace(/\s+/g,' ').trim();
export const isPartnerRevolvingDoorText=(text:string)=>/^revolving door - (?:ladles|robins) take right hands and drop off partners on other side$/i.test(clean(text));
export function hasPartnerRevolvingDoorContext(record:ContraDbRecord,row:ContraDbRow):boolean {
 const i=record.rows.indexOf(row),previous=record.rows[i-1],next=record.rows[i+1];
 const final=record.rows.at(-1),marked=record.rows.filter(r=>r.progression);
 return /^improper$/i.test(record.formation)&&record.rows.length===8&&record.rows.every(r=>r.beats===8)&&marked.length===1&&marked[0]===final&&/^star left 4 places ⁋$/i.test(clean(final?.text??''))&&row.beats===8&&!row.progression&&isPartnerRevolvingDoorText(row.text)&&!!previous&&previous.beats===8&&!previous.progression&&/^partners swing$/i.test(clean(previous.text))&&!!next&&next.beats===8&&!next.progression&&/^neighbors swing$/i.test(clean(next.text));
}
export const REVOLVING_DOOR_CHOICE_DESCRIPTION='Review the full right-hand robin turn and half-turn partner drop as modeled numerical amounts; the source names right hands and dropping partners across but omits those numbers. Retain the preceding partner swing’s half-shoulder/waist supports while releasing its leading handhold within the existing eight counts. The door’s eight counts use 1.25 pickup, 4.5 carried half-turn, 1.25 free half-turn, then 1 count of neighbor-swing offer, with contact acquisition during the final half-count. The hold, drop timing, internal phases and connecting preparation are explicit animation conventions, not quoted source timing. No count is added or borrowed from the following eight-count neighbor swing.';
