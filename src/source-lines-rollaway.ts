import type {ContraDbRecord} from './contradb-source.ts';
export interface LinesRollawayChoice {phase:'return';direction:'left-to-right'|'right-to-left';}
export const LINES_ROLLAWAY_DESCRIPTION='The source gives four counts forward and four counts for the named half-sashay rollaway. Review the rollaway as occurring while the lines return to their prior sidelines, with an explicit lateral rolling direction. These two source rows share one eight-count motion; no counts or actor relationships are replaced. Entry facing turns toward the opposite line during the initial advance, starting at the actual carried heading.';
export function linesRollawaySource(record:ContraDbRecord,index:number){
 const a=record.rows[index],b=record.rows[index+1];
 if(!a||!b||a.text!=='long lines forward'||a.beats!==4||b.beats!==4||a.progression||b.progression)return;
 const m=b.text.match(/^(gentlespoons|ladles) roll away neighbors with a half sashay(?: on the way back| as long lines go back| on lines back| backing up)?(?: \(roll (left to right|right to left)\))?$/);
 if(!m)return;
 return {rollRole:m[1]==='gentlespoons'?'robin' as const:'lark' as const,sashayRole:m[1]==='gentlespoons'?'lark' as const:'robin' as const,rollRelation:'neighbor' as const,sourceDirection:m[2]?.replaceAll(' ','-') as 'left-to-right'|'right-to-left'|undefined};
}
export function isLinesRollawayChoice(value:unknown):value is LinesRollawayChoice {const c=value as LinesRollawayChoice;return !!c&&typeof c==='object'&&!Array.isArray(c)&&Object.keys(c).length===2&&c.phase==='return'&&['left-to-right','right-to-left'].includes(c.direction);}
