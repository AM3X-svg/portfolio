// Vercel serverless function proxy to Supabase (PostgREST)
// Requires environment variables:
// SUPABASE_URL (e.g. https://xyzcompany.supabase.co)
// SUPABASE_KEY (service_role or anon with write permissions)

export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_KEY;
  if(!SUPABASE_URL || !SUPABASE_KEY) {
    res.setHeader('Access-Control-Allow-Origin','*');
    return res.status(500).json({ error: 'SUPABASE_URL or SUPABASE_KEY not configured' });
  }

  // Allow CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Methods','GET,POST');
    res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');
    return res.status(204).end();
  }

  const base = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/leaderboard`;
  const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    if (req.method === 'GET') {
      // fetch top 50
      const r = await fetch(`${base}?select=user,score,date&order=score.desc&limit=50`, { headers });
      const data = await r.json();
      res.setHeader('Access-Control-Allow-Origin','*');
      return res.status(200).json({ ok: true, rows: data });
    }

    if (req.method === 'POST') {
      const body = req.body || (await new Promise(r => { let d=''; req.on('data',c=>d+=c); req.on('end',()=>r(JSON.parse(d))); }));
      const user = (body.user || '').toString().slice(0,40);
      const score = parseInt(body.score,10) || 0;
      const payload = { user, score, date: new Date().toISOString() };
      const r = await fetch(base, { method: 'POST', headers: { ...headers, Prefer: 'return=minimal' }, body: JSON.stringify(payload) });
      if (!r.ok) {
        const txt = await r.text();
        res.setHeader('Access-Control-Allow-Origin','*');
        return res.status(502).json({ error: 'Supabase error', detail: txt });
      }
      res.setHeader('Access-Control-Allow-Origin','*');
      return res.status(201).json({ ok: true });
    }

    // method not allowed
    res.setHeader('Access-Control-Allow-Origin','*');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin','*');
    return res.status(500).json({ error: err.message });
  }
}
