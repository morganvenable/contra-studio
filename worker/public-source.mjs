// Read-only, credential-free fetch of one public ContraDB dance. Reviewed
// snapshots are a bounded outage fallback, never represented as a fresh fetch.
const MAX_BYTES = 500000;
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: {'content-type':'application/json; charset=utf-8',
    'cache-control':'no-store', 'x-content-type-options':'nosniff'}
});
export async function publicSource(request, fetcher = fetch, retained = {}, options = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/contradb/')) return null;
  if (request.method !== 'GET') return json({error:'Only GET is supported.'},405);
  const match = /^\/api\/contradb\/([1-9]\d{0,8})$/.exec(url.pathname);
  if (!match || url.search) return json({error:'Provide one numeric ContraDB dance ID.'},400);
  const id = Number(match[1]), sourceUrl = `https://contradb.com/dances/${id}`;
  const saved = Object.hasOwn(retained, String(id)) ? retained[String(id)] : undefined;
  const validSaved = saved?.schema==='contra-studio/contradb-snapshot' && saved.version===1 &&
    saved.sourceUrl===sourceUrl && typeof saved.html==='string' &&
    new TextEncoder().encode(saved.html).byteLength<=MAX_BYTES &&
    (saved.retrievedAt===undefined || typeof saved.retrievedAt==='string' && Number.isFinite(Date.parse(saved.retrievedAt)));
  const unavailable = (error, status=502) => validSaved
    ? json({id,sourceUrl,html:saved.html,fetchedAt:saved.retrievedAt??null,
        sourceStatus:'retained-snapshot',snapshot:saved})
    : json({error,sourceUrl},status);
  const controller = new AbortController();
  const timeoutMs = options.timeoutMs ?? 4000;
  if (!Number.isFinite(timeoutMs)||timeoutMs<=0||timeoutMs>12000) throw new Error('Invalid upstream deadline.');
  let timer,activeReader;
  const deadline = new Promise(resolve => {timer=setTimeout(()=>{
    controller.abort();resolve(unavailable('The public source is temporarily unavailable, and no retained snapshot is bundled for this record.'));
    void activeReader?.cancel().catch(()=>{});
  },timeoutMs);});
  const download = (async()=>{
    try {
      const upstream = await fetcher(sourceUrl, {
        method:'GET', redirect:'manual', credentials:'omit', signal:controller.signal,
        headers:{accept:'text/html', 'user-agent':'ContraStudio public dance reader'}
      });
      if (!upstream.ok) {void upstream.body?.cancel().catch(()=>{});if([401,403,404,410].includes(upstream.status))return json({error:`ContraDB returned ${upstream.status}.`,sourceUrl},upstream.status);return unavailable(`ContraDB returned ${upstream.status}.`);}
      if (!/^text\/html(?:;|$)/i.test(upstream.headers.get('content-type') || '')) {
        await upstream.body?.cancel();return unavailable('ContraDB did not return a public HTML dance page.');
      }
      const declared = Number(upstream.headers.get('content-length'));
      if (declared > MAX_BYTES) {await upstream.body?.cancel();return unavailable('Source page exceeds the import size limit.');}
      if (!upstream.body) return unavailable('ContraDB returned an empty response.');
      const reader=upstream.body.getReader(),decoder=new TextDecoder();activeReader=reader;let html='',count=0;
      try {
        while (true) {
          const part=await reader.read();if(part.done)break;count+=part.value.byteLength;
          if(count>MAX_BYTES){await reader.cancel();return unavailable('Source page exceeds the import size limit.');}
          html+=decoder.decode(part.value,{stream:true});
        }
        html+=decoder.decode();
      } finally {activeReader=undefined;reader.releaseLock();}
      return json({id,sourceUrl,html,fetchedAt:new Date().toISOString(),sourceStatus:'live'});
    } catch {
      return unavailable('The public source is temporarily unavailable, and no retained snapshot is bundled for this record.');
    }
  })();
  try {return await Promise.race([download,deadline]);}
  finally {clearTimeout(timer);}
}
