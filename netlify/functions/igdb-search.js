// ✅ This file lives in: netlify/functions/igdb-search.js

// Do NOT import 'dotenv/config' here — Netlify injects env vars for you.
// Do NOT import 'node-fetch' — Node 18+ has global fetch.

export default async (request) => {
  const clientId = process.env.IGDB_CLIENT_ID;
  const accessToken = process.env.IGDB_ACCESS_TOKEN;

  console.log('Client ID:', clientId);
  console.log('Access Token:', accessToken);

  const query = `
    fields name, summary, cover.url;
    search "Zelda";
    limit 5;  `;

  const igdbResponse = await fetch('https://api.igdb.com/v4/games', {
    method: 'POST',
    headers: {
      'Client-ID': clientId,
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'text/plain',
    },
    body: query.trim(),
  });

  const data = await igdbResponse.json();
  console.log(data);

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
