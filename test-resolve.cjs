async function main() {
  const fetch = globalThis.fetch;
  const res = await fetch('http://127.0.0.1:9119/');
  const html = await res.text();
  const token = html.match(/window\._+(?:CLAUDE|HERMES)_+SESSION_+TOKEN__+\s*=\s*["']([^"']+)["']/)[1];
  
  const listRes = await fetch('http://127.0.0.1:9119/api/sessions?limit=30&offset=0', {
    headers: { Authorization: 'Bearer ' + token }
  });
  const data = await listRes.json();
  const recent = data.sessions;
  
  const isInternal = (id) => id.startsWith('cron_') || id.startsWith('cron:') || id.startsWith('agent:main:ops-');
  const hasRealTitle = (s) => {
    const t = (s.title ?? '').trim()
    return t.length > 0 && t !== s.id
  }
  const titled = recent.find((s) => !isInternal(s.id) && hasRealTitle(s))
  const fallback = titled ? null : recent.find(
    (s) => !isInternal(s.id) && typeof s.message_count === 'number' && s.message_count > 0
  )
  const candidate = titled ?? fallback;
  console.log("Candidate ID:", candidate ? candidate.id : "null");
  console.log("Message count of candidate:", candidate ? candidate.message_count : "null");
}

main().catch(console.error);
