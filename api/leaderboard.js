// api/leaderboard.js — Vercel Serverless Function
// Classement global via Vercel KV (Redis intégré)
// Installation : vercel env add KV_REST_API_URL + KV_REST_API_TOKEN
// ou lier un Vercel KV store dans le dashboard Vercel

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

const LEADERBOARD_KEY = 'mini2048:leaderboard';
const MAX_ENTRIES = 100;

// Helpers KV (Upstash Redis REST API)
async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` }
  });
  const json = await res.json();
  if (!json.result) return null;
  return JSON.parse(json.result);
}

async function kvSet(key, value) {
  await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: JSON.stringify(value) })
  });
}

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Fallback si KV non configuré : retourner tableau vide
  if (!KV_URL || !KV_TOKEN) {
    if (req.method === 'GET') return res.status(200).json({ rows: [], fallback: true });
    if (req.method === 'POST') return res.status(200).json({ success: false, reason: 'KV not configured' });
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      const data = (await kvGet(LEADERBOARD_KEY)) || [];
      const sorted = data.sort((a, b) => b.score - a.score).slice(0, 10);
      return res.status(200).json({ rows: sorted });
    }

    if (req.method === 'POST') {
      const { user, score } = req.body || {};
      if (!user || typeof score !== 'number') {
        return res.status(400).json({ error: 'user and score required' });
      }
      const safeUser  = String(user).trim().slice(0, 30);
      const safeScore = Math.max(0, Math.floor(score));

      const data = (await kvGet(LEADERBOARD_KEY)) || [];

      // Un seul score par pseudo — garde le meilleur
      const idx = data.findIndex(e => e.user === safeUser);
      if (idx >= 0) {
        if (safeScore > data[idx].score) {
          data[idx].score = safeScore;
          data[idx].date  = new Date().toISOString();
        }
      } else {
        data.push({ user: safeUser, score: safeScore, date: new Date().toISOString() });
      }

      // Garder seulement les MAX_ENTRIES meilleurs
      data.sort((a, b) => b.score - a.score);
      if (data.length > MAX_ENTRIES) data.length = MAX_ENTRIES;

      await kvSet(LEADERBOARD_KEY, data);
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      // Protégé par un token admin simple
      const { adminToken } = req.body || {};
      if (adminToken !== process.env.ADMIN_TOKEN) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      await kvSet(LEADERBOARD_KEY, []);
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });

  } catch (err) {
    console.error('Leaderboard API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}