/** Shared saved-audit assertion: metadata cannot rename the source receiver. */
export function assertSwingEvidenceReceiver(figure:{who?:string},evidence:{who?:string}):void{
 if(!['partner','neighbor'].includes(figure.who??'')||evidence.who!==figure.who)throw Error('Swing evidence receiver must equal the explicit source partner or neighbor.');
}
