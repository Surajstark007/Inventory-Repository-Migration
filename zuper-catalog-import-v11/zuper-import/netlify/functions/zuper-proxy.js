// netlify/functions/zuper-proxy.js
// Proxies all Zuper API calls server-side — eliminates CORS entirely

exports.handler = async (event) => {
  const { httpMethod, headers, body } = event;

  // CORS preflight
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'x-api-key, content-type, accept',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const apiKey = headers['x-api-key'] || headers['X-Api-Key'] || headers['X-API-KEY'];
  if (!apiKey) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Missing x-api-key' }) };
  }

  // Parse the original URL path via rawUrl (Netlify provides this)
  // Path format coming in: /api/zuper/{region}/{...zuper-path}?querystring
  let rawPath = '';
  try {
    const rawUrl = event.rawUrl || '';
    const parsed = new URL(rawUrl);
    rawPath = parsed.pathname + parsed.search;
  } catch (e) {
    rawPath = event.path || '';
  }

  // Strip /api/zuper/ prefix
  const withoutPrefix = rawPath.replace(/^\/api\/zuper\//, '');
  const firstSlash = withoutPrefix.indexOf('/');

  let region, zuperPathAndQuery;
  if (firstSlash === -1) {
    region = withoutPrefix.split('?')[0];
    zuperPathAndQuery = '/';
  } else {
    region = withoutPrefix.substring(0, firstSlash);
    zuperPathAndQuery = withoutPrefix.substring(firstSlash);
  }

  if (!region) {
    return {
      statusCode: 400, headers: corsHeaders,
      body: JSON.stringify({ error: 'Cannot parse region', received: rawPath }),
    };
  }

  const targetUrl = `https://${region}.zuperpro.com/api${zuperPathAndQuery}`;

  const fetchOpts = {
    method: httpMethod,
    headers: { 'accept': 'application/json', 'content-type': 'application/json', 'x-api-key': apiKey },
  };
  if (body && ['POST', 'PUT', 'PATCH'].includes(httpMethod)) fetchOpts.body = body;

  try {
    const resp = await fetch(targetUrl, fetchOpts);
    const text = await resp.text();
    return { statusCode: resp.status, headers: corsHeaders, body: text };
  } catch (err) {
    return {
      statusCode: 502, headers: corsHeaders,
      body: JSON.stringify({ error: 'Upstream failed', message: err.message, target: targetUrl }),
    };
  }
};
