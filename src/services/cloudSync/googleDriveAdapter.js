// @ts-nocheck
/**
 * Google Drive Adapter for Cloud Sync
 * Uses OAuth2 Authorization Code Flow with PKCE
 * Token exchange via secure proxy server (Cloudflare Worker)
 * 
 * Architecture:
 * 1. Extension gets authorization code from Google
 * 2. Extension sends code to proxy server
 * 3. Proxy server (with client_secret) exchanges for tokens
 * 4. Proxy returns tokens to extension
 */

import { browser } from 'wxt/browser'

// OAuth2 Configuration
const CLIENT_ID = '1045816330790-n9u8unuthqvdqvlmce7d3j779uprv26k.apps.googleusercontent.com'
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'

// Token proxy server URL (Cloudflare Worker with custom domain)
const TOKEN_PROXY_URL = 'https://oauth.summarizerrrr.com'

// --- PKCE Helpers ---

function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

async function generateCodeChallenge(codeVerifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(digest))
}

function base64UrlEncode(buffer) {
  const base64 = btoa(String.fromCharCode(...buffer))
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function getRedirectUri() {
  let redirectUrl = browser.identity.getRedirectURL()
  if (!redirectUrl.endsWith('/')) {
    redirectUrl += '/'
  }
  return redirectUrl
}

// --- Authentication ---

/**
 * Authenticate with Google using OAuth2 PKCE flow
 * Token exchange happens via secure proxy server
 */
export async function authenticate() {
  const redirectUri = getRedirectUri()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  
  console.log('[CloudSync] Redirect URI:', redirectUri)
  
  // Build authorization URL with PKCE
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('access_type', 'offline') // Get refresh token
  authUrl.searchParams.set('prompt', 'consent') // Force consent for refresh token
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  
  try {
    // Step 1: Get authorization code from Google
    const responseUrl = await browser.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    })
    
    const authCode = parseAuthorizationCode(responseUrl)
    
    // Step 2: Exchange code for tokens via proxy server
    return await exchangeCodeViaProxy(authCode, codeVerifier, redirectUri)
  } catch (error) {
    console.error('Authentication failed:', error)
    throw error
  }
}

function parseAuthorizationCode(responseUrl) {
  const url = new URL(responseUrl)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')
  
  if (error) {
    throw new Error(`Auth error: ${error}`)
  }
  
  if (!code) {
    throw new Error('No authorization code received')
  }
  
  return code
}

/**
 * Exchange authorization code via proxy server
 * Proxy server holds client_secret securely
 */
async function exchangeCodeViaProxy(code, codeVerifier, redirectUri) {
  const response = await fetch(`${TOKEN_PROXY_URL}/exchange`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Token exchange failed:', error)
    throw new Error(error.error_description || error.error || 'Failed to exchange code')
  }
  
  const data = await response.json()
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  }
}

/**
 * Refresh access token via proxy server
 */
export async function refreshAccessToken(refreshToken) {
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }
  
  const response = await fetch(`${TOKEN_PROXY_URL}/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Token refresh failed:', error)
    
    if (error.error === 'invalid_grant') {
      throw new Error('Session expired. Please sign in again.')
    }
    
    throw new Error(error.error_description || 'Failed to refresh token')
  }
  
  const data = await response.json()
  
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  }
}

/**
 * Revoke access token (logout)
 */
export async function revokeToken(accessToken) {
  if (!accessToken) return
  
  try {
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${accessToken}`, {
      method: 'GET',
    })
  } catch (err) {
    console.warn('Revoke token failed (ignoring):', err)
  }
}

// --- Google Drive API Operations ---

async function findFile(accessToken, filename) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${filename}'&fields=files(id,modifiedTime)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED')
    }
    throw new Error(`Failed to search file ${filename}`)
  }
  
  const data = await response.json()
  return data.files?.[0]?.id || null
}

export async function listFiles(accessToken, query = "trashed = false") {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED')
    }
    throw new Error('Failed to list files')
  }
  
  const data = await response.json()
  return data.files || []
}

export async function getFile(accessToken, filename) {
  const fileId = await findFile(accessToken, filename)
  
  if (!fileId) {
    return null
  }
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED')
    }
    if (response.status === 404) {
      return null
    }
    const err = await response.json()
    throw new Error(err.error?.message || `Failed to get ${filename}`)
  }
  
  return await response.json()
}

export async function saveFile(accessToken, filename, data) {
  const fileId = await findFile(accessToken, filename)
  
  if (fileId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      }
    )
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('TOKEN_EXPIRED')
      }
      const err = await res.json()
      throw new Error(err.error?.message || `Update ${filename} failed`)
    }
  } else {
    const form = new FormData()
    form.append(
      'metadata',
      new Blob([JSON.stringify({ name: filename, mimeType: 'application/json', parents: ['appDataFolder'] })], {
        type: 'application/json',
      })
    )
    form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    
    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: form,
      }
    )
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('TOKEN_EXPIRED')
      }
      const err = await res.json()
      throw new Error(err.error?.message || `Create ${filename} failed`)
    }
  }
}

export async function deleteFile(accessToken, filename) {
  const fileId = await findFile(accessToken, filename)
  
  if (fileId) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }
}

export async function deleteFileById(accessToken, fileId) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete file ${fileId}`)
  }
}

export async function getUserProfile(accessToken) {
  const response = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('TOKEN_EXPIRED')
    }
    throw new Error('Failed to get user profile')
  }
  
  return await response.json()
}
