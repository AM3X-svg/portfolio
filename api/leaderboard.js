// api/leaderboard.js — Vercel Serverless Function (Supabase REST)
// Expects environment variables SUPABASE_URL and SUPABASE_KEY (service_role)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // service_role recommended
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    if (req.method === 'GET') return res.status(200).json({ rows: [], fallback: true });
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    // parse query params from req.url
    let all = false;
    try { const url = new URL(req.url, 'http://localhost'); all = url.searchParams.has('all'); } catch(e){}

    if (req.method === 'GET') {
      // Get top scores (or all if ?all=1)
      let url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/leaderboard?select=username,score,date&order=score.desc`;
      if (!all) url += '&limit=10';
      const r = await fetch(url, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      const rows = await r.json();
      return res.status(r.status).json({ rows });
    }

    if (req.method === 'POST') {
      const { user, score } = req.body || {};
      if (!user || typeof score !== 'number') {
        return res.status(400).json({ error: 'user and score required (score must be number)' });
      }
      const safeUser = String(user).trim().slice(0, 40);
      const safeScore = Math.max(0, Math.floor(score));

      // Check existing row for this username
      const q = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/leaderboard?select=id,score&username=eq.${encodeURIComponent(safeUser)}`;
      const existingResp = await fetch(q, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      const existingRows = await existingResp.json().catch(()=>[]);

      if (Array.isArray(existingRows) && existingRows.length>0) {
        const row = existingRows[0];
        if (safeScore > (row.score||0)) {
          // PATCH the existing row
          const patchUrl = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/leaderboard?id=eq.${row.id}`;
          const patchResp = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`
            },
            body: JSON.stringify({ score: safeScore, date: new Date().toISOString() })
          });
          if (!patchResp.ok) return res.status(patchResp.status).json({ error: 'Failed to update score' });
          return res.status(200).json({ success: true, action: 'updated' });
        }
        return res.status(200).json({ success: false, action: 'no_change', reason: 'existing score higher or equal' });
      }

      // Insert new row
      const insertUrl = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/leaderboard`;
      const insertResp = await fetch(insertUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`
        },
        body: JSON.stringify([{ username: safeUser, score: safeScore, date: new Date().toISOString() }])
      });
      if (!insertResp.ok) {
        const txt = await insertResp.text().catch(()=>null);
        return res.status(insertResp.status).json({ error: 'Failed to insert', detail: txt });
      }
      return res.status(200).json({ success: true, action: 'inserted' });
    }

    if (req.method === 'DELETE') {
      const { adminToken } = req.body || {};
      if (adminToken !== ADMIN_TOKEN) return res.status(403).json({ error: 'Forbidden' });
      const url = `${SUPABASE_URL.replace(/\/+$/, '')}/rest/v1/leaderboard`;
      const r = await fetch(url, { method: 'DELETE', headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } });
      return res.status(r.status).json({ success: r.ok });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err) {
    console.error('Leaderboard API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
