/**
 * Cloudflare Worker - OAuth2 Token Exchange Proxy
 * 
 * Environment variables required:
 * - GOOGLE_CLIENT_ID: OAuth2 client ID
 * - GOOGLE_CLIENT_SECRET: OAuth2 client secret
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

// Optional: Specific extension IDs whitelist (more secure)
// Set as environment variable ALLOWED_EXTENSION_IDS as comma-separated values
// Example: "abcdefghijklmnopqrstuvwxyz123456,your-firefox-id"

/**
 * Validate Origin header against allowed extension origins
 */
function isValidOrigin(origin, env) {
  if (!origin) return false;

  // Check specific extension IDs whitelist (if configured)
  if (env.ALLOWED_EXTENSION_IDS) {
    const allowedIds = env.ALLOWED_EXTENSION_IDS.split(',').map(id => id.trim());
    for (const id of allowedIds) {
      // Chrome: chrome-extension://{extension_id}
      // Firefox: moz-extension://{extension_id}
      const chromeOrigin = `chrome-extension://${id}`;
      const firefoxOrigin = `moz-extension://${id}`;
      
      if (origin === chromeOrigin || origin === firefoxOrigin) {
        return true;
      }
    }
    // If whitelist is configured but origin doesn't match, reject
    return false;
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
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/exchange' && request.method === 'POST') {
        return await handleExchange(request, env, corsHeaders);
      }

      if (url.pathname === '/refresh' && request.method === 'POST') {
        return await handleRefresh(request, env, corsHeaders);
      }

      return new Response('Not Found', { status: 404 });
    } catch (error) {
      console.error('Error:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};

/**
 * Validate redirect_uri against allowed patterns
 */
function isValidRedirectUri(redirectUri, env) {
  if (!redirectUri) return false;

  // Check specific extension IDs whitelist (if configured)
  if (env.ALLOWED_EXTENSION_IDS) {
    const allowedIds = env.ALLOWED_EXTENSION_IDS.split(',').map(id => id.trim());
    for (const id of allowedIds) {
      // Build expected URL patterns for each extension ID
      // Chrome: https://{extension_id}.chromiumapp.org/
      // Firefox: https://{extension_id}.extensions.allizom.org/
      const chromePattern = `https://${id}.chromiumapp.org`;
      const firefoxPattern = `https://${id}.extensions.allizom.org`;
      
      if (redirectUri.startsWith(chromePattern) || redirectUri.startsWith(firefoxPattern)) {
        return true;
      }
    }
    // If whitelist is configured but URI doesn't match, reject
    return false;
  }

  // Fallback: Check against general patterns
  return ALLOWED_REDIRECT_PATTERNS.some(pattern => pattern.test(redirectUri));
}

/**
 * Exchange authorization code for tokens
 */
async function handleExchange(request, env, corsHeaders) {
  const { code, code_verifier, redirect_uri } = await request.json();

  if (!code || !code_verifier || !redirect_uri) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Validate redirect_uri to prevent abuse
  if (!isValidRedirectUri(redirect_uri, env)) {
    console.error('Invalid redirect_uri:', redirect_uri);
    return new Response(JSON.stringify({ error: 'Invalid redirect_uri' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      code,
      code_verifier,
      grant_type: 'authorization_code',
      redirect_uri,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/**
 * Refresh access token
 */
async function handleRefresh(request, env, corsHeaders) {
  const { refresh_token } = await request.json();

  if (!refresh_token) {
    return new Response(JSON.stringify({ error: 'Missing refresh_token' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    access_token: data.access_token,
    expires_in: data.expires_in,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
