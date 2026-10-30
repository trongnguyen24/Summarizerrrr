/**
 * Cloudflare Worker - OAuth2 Token Exchange Proxy
 * 
 * Environment variables:
 * - GOOGLE_CLIENT_ID: OAuth2 client ID (wrangler.toml [vars])
 * - SUMMARIZERRRR_GOOGLE_CLIENT_SECRET: OAuth2 client secret (wrangler secret, never committed)
 * - ALLOWED_ORIGINS (optional): exact extension origins, comma-separated
 * - ALLOWED_REDIRECT_URIS (optional): exact redirect URIs, comma-separated
 * 
 * Endpoints:
 * - POST /exchange - Exchange authorization code for tokens
 * - POST /refresh - Refresh access token
 */

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Whitelist of allowed extension IDs (redirect_uri patterns)
// Add your extension IDs here to protect the Worker
const ALLOWED_REDIRECT_PATTERNS = [
  // Chrome extensions
  /^https:\/\/[a-z]{32}\.chromiumapp\.org\/?$/,
  // Firefox extensions
  /^https:\/\/[a-f0-9-]+\.extensions\.allizom\.org\/?$/,
  // Safari extensions (if applicable)
  /^safari-web-extension:\/\/[A-Z0-9-]+\/?$/i,
];

// Allowed origin patterns for CORS (extension runtime origins)
const ALLOWED_ORIGIN_PATTERNS = [
  // Chrome extensions: chrome-extension://{32-char-id}
  /^chrome-extension:\/\/[a-z]{32}$/,
  // Firefox extensions: moz-extension://{uuid}
  /^moz-extension:\/\/[a-f0-9-]{36}$/,
  // Safari extensions
  /^safari-web-extension:\/\/[A-Z0-9-]+$/i,
];

// Optional exact allowlists (more secure), set as comma-separated env vars:
// - ALLOWED_ORIGINS: exact extension origins, e.g. "chrome-extension://<id>,chrome-extension://<id>".
//   moz-extension:// origins are a random UUID per Firefox install, so they are
//   always checked with the pattern above, never against this list.
// - ALLOWED_REDIRECT_URIS: exact redirect URIs (trailing slash is normalised).
// When a variable is unset, the corresponding patterns above are used instead.

/**
 * Split a comma-separated env var into a list (empty list when unset)
 */
function parseList(value) {
  if (!value) return [];
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

/**
 * Normalise a redirect URI for exact comparison (single trailing slash)
 */
function normalizeRedirectUri(uri) {
  return uri.replace(/\/+$/, '') + '/';
}

/**
 * Validate Origin header against allowed extension origins
 */
function isValidOrigin(origin, env) {
  if (!origin) return false;

  // Firefox: per-install random UUID, only the pattern can check it
  if (origin.startsWith('moz-extension://')) {
    return /^moz-extension:\/\/[a-f0-9-]{36}$/.test(origin);
  }

  // Exact origins whitelist (if configured)
  const allowedOrigins = parseList(env.ALLOWED_ORIGINS);
  if (allowedOrigins.length > 0) {
    return allowedOrigins.includes(origin);
  }

  // Fallback: Check against general patterns
  return ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
}

/**
 * Get CORS headers with validated origin
 */
function getCorsHeaders(origin, env) {
  const validOrigin = isValidOrigin(origin, env) ? origin : null;
  
  return {
    'Access-Control-Allow-Origin': validOrigin || '',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    // Vary header is important for proper caching with dynamic origins
    'Vary': 'Origin',
  };
}

/**
 * Build a JSON response that always carries the CORS headers
 */
function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Parse the request body as JSON; null when it is not valid JSON
 */
async function readJsonBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? body : null;
  } catch {
    return null;
  }
}

/**
 * Forward Google's token response. Non-JSON upstream bodies become
 * { error: 'upstream_error' } (502 when the upstream status was 2xx).
 * Never logs codes, verifiers or tokens.
 */
async function readUpstream(response) {
  try {
    return { data: await response.json(), status: response.status };
  } catch {
    return {
      data: { error: 'upstream_error', error_description: 'Invalid response from token endpoint' },
      status: response.ok ? 502 : response.status,
      failed: true,
    };
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin, env);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      // For preflight, validate origin but still respond to allow browser to proceed
      return new Response(null, { headers: corsHeaders });
    }

    // Reject requests from invalid origins (except for non-browser clients without Origin)
    if (origin && !isValidOrigin(origin, env)) {
      return jsonResponse(
        { error: 'origin_not_allowed', error_description: 'Origin not allowed' },
        403,
        corsHeaders
      );
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/exchange' && request.method === 'POST') {
        return await handleExchange(request, env, corsHeaders);
      }

      if (url.pathname === '/refresh' && request.method === 'POST') {
        return await handleRefresh(request, env, corsHeaders);
      }

      return jsonResponse(
        { error: 'not_found', error_description: 'Not Found' },
        404,
        corsHeaders
      );
    } catch (error) {
      console.error('Error:', error?.message);
      return jsonResponse(
        { error: 'internal_error', error_description: error?.message || 'Internal error' },
        500,
        corsHeaders
      );
    }
  },
};

/**
 * Validate redirect_uri against allowed patterns
 */
function isValidRedirectUri(redirectUri, env) {
  if (!redirectUri || typeof redirectUri !== 'string') return false;

  // Exact redirect URIs whitelist (if configured)
  const allowedUris = parseList(env.ALLOWED_REDIRECT_URIS).map(normalizeRedirectUri);
  if (allowedUris.length > 0) {
    return allowedUris.includes(normalizeRedirectUri(redirectUri));
  }

  // Fallback: Check against general patterns
  return ALLOWED_REDIRECT_PATTERNS.some(pattern => pattern.test(redirectUri));
}

/**
 * Exchange authorization code for tokens
 */
async function handleExchange(request, env, corsHeaders) {
  const body = await readJsonBody(request);
  if (!body) {
    return jsonResponse(
      { error: 'invalid_request', error_description: 'Body must be JSON' },
      400,
      corsHeaders
    );
  }
  const { code, code_verifier, redirect_uri } = body;

  // Validate redirect_uri to prevent abuse (logged without code/verifier)
  if (redirect_uri && !isValidRedirectUri(redirect_uri, env)) {
    console.error('Invalid redirect_uri:', redirect_uri);
    return jsonResponse(
      { error: 'invalid_redirect_uri', error_description: 'Invalid redirect_uri' },
      403,
      corsHeaders
    );
  }

  if (!code || !code_verifier || !redirect_uri) {
    return jsonResponse(
      { error: 'invalid_request', error_description: 'Missing required fields' },
      400,
      corsHeaders
    );
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.SUMMARIZERRRR_GOOGLE_CLIENT_SECRET,
      code,
      code_verifier,
      grant_type: 'authorization_code',
      redirect_uri,
    }),
  });

  const { data, status, failed } = await readUpstream(response);

  if (failed || !response.ok) {
    return jsonResponse(data, status, corsHeaders);
  }

  return jsonResponse({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  }, 200, corsHeaders);
}

/**
 * Refresh access token
 */
async function handleRefresh(request, env, corsHeaders) {
  const body = await readJsonBody(request);
  const refresh_token = body?.refresh_token;

  if (!refresh_token) {
    return jsonResponse(
      { error: 'invalid_request', error_description: 'Missing refresh_token' },
      400,
      corsHeaders
    );
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.SUMMARIZERRRR_GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const { data, status, failed } = await readUpstream(response);

  if (failed || !response.ok) {
    return jsonResponse(data, status, corsHeaders);
  }

  return jsonResponse({
    access_token: data.access_token,
    expires_in: data.expires_in,
  }, 200, corsHeaders);
}
