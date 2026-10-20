type HostingEnvironment = {BASE_URL?: string; MODE?: string};
export function hostingConfiguration(environment?: HostingEnvironment) {
 const base = environment?.BASE_URL ?? './';
 return {
  sourceDownloaderAvailable: environment?.MODE !== 'pages',
  catalogueUrl: `${base}${base && !base.endsWith('/') ? '/' : ''}contradb-index.json`,
 };
}
/** Vite supplies these values in browsers; Node source tests have no env object. */
const environment = (import.meta as ImportMeta & {env?: HostingEnvironment}).env;
export const {sourceDownloaderAvailable,catalogueUrl} = hostingConfiguration(environment);
export const staticSourceHelp = 'This site opens included Ready dances and saved files. To review another ContraDB dance, open its public page, save it as HTML, and import that file here.';
