/** Stable diagnostic meaning, independent of adapter-specific display codes.
 * A rejected compilation is not permission to skip a guard or try a fallback.
 * Source review may only vary its already-declared omitted choice candidates. */
export type MotionDiagnosticCategory='motion-compilation';
export interface CategorizedMotionDiagnostic {category?:MotionDiagnosticCategory;}
export function motionCompilationFailure(code:string,message:string){return{code,message,severity:'error' as const,category:'motion-compilation' as const};}
export function isMotionCompilationFailure(diagnostic:CategorizedMotionDiagnostic):boolean{return diagnostic.category==='motion-compilation';}
