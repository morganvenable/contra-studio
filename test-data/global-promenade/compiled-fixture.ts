import {compileChoreography} from '../../src/choreography.ts';
import {REGISTERED_MOTION_CAPABILITIES} from '../../src/capabilities.ts';
import type {compileOvalImproper,OvalSourceDance} from '../../src/global-promenade-source.ts';
export const OVAL_TEST_CAPABILITIES={...REGISTERED_MOTION_CAPABILITIES,wholeSetOvalPromenades:true};
export function compileStagedOval(source:OvalSourceDance,count:number):ReturnType<typeof compileOvalImproper>{return compileChoreography(source,count,OVAL_TEST_CAPABILITIES) as ReturnType<typeof compileOvalImproper>;}
