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

// --- BYOK (Bring Your Own Key) Mode ---
// Allows users to use their own OAuth credentials instead of the default proxy

/**
 * Exchange authorization code directly with Google (BYOK mode)
 * Used when user provides their own OAuth credentials
 */
async function exchangeCodeDirectInternal(code, codeVerifier, redirectUri, clientId, clientSecret) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Direct token exchange failed:', error)
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
 * Refresh access token directly with Google (BYOK mode)
 */
export async function refreshAccessTokenDirect(refreshToken, clientId, clientSecret) {
  if (!refreshToken) {
    throw new Error('No refresh token available')
  }
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    console.error('Direct token refresh failed:', error)
    
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
 * Authenticate with BYOK mode (user's own credentials)
 * @param {string} clientId - User's OAuth Client ID
 * @param {string} clientSecret - User's OAuth Client Secret
 */
export async function authenticateWithCustomCredentials(clientId, clientSecret) {
  const redirectUri = getRedirectUri()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  
  console.log('[CloudSync BYOK] Using custom credentials')
  console.log('[CloudSync BYOK] Redirect URI:', redirectUri)
  console.log('[CloudSync BYOK] Identity API available:', isIdentityApiAvailable())
  
  try {
    let authCode
    
    if (isIdentityApiAvailable()) {
      // Desktop flow
      const authUrl = buildAuthUrlWithClientId(redirectUri, codeChallenge, clientId)
      
      const responseUrl = await browser.identity.launchWebAuthFlow({
        url: authUrl.toString(),
        interactive: true,
      })
      
      authCode = parseAuthorizationCode(responseUrl)
    } else {
      // Mobile flow - similar to authenticateMobile but with custom client ID
      const authUrl = buildAuthUrlWithClientId(redirectUri, codeChallenge, clientId)
      
      const authTab = await browser.tabs.create({ url: authUrl.toString() })
      
      authCode = await new Promise((resolve, reject) => {
        const AUTH_TIMEOUT = 120000
        
        const timeoutId = setTimeout(() => {
          cleanup()
          reject(new Error('Authentication timeout. Please try again.'))
        }, AUTH_TIMEOUT)
        
        const cleanup = () => {
          clearTimeout(timeoutId)
          browser.tabs.onUpdated.removeListener(tabListener)
        }
        
        const tabListener = async (tabId, changeInfo, tab) => {
          if (tabId !== authTab.id) return
          if (!tab.url || !tab.url.startsWith(redirectUri)) return
          
          cleanup()
          
          try {
            const url = new URL(tab.url)
            const code = url.searchParams.get('code')
            const error = url.searchParams.get('error')
            
            try {
              await browser.tabs.remove(tabId)
            } catch (e) {
              console.warn('[CloudSync BYOK] Could not close auth tab:', e)
            }
            
            if (error) {
              reject(new Error(`Auth error: ${error}`))
              return
            }
            
            if (!code) {
              reject(new Error('No authorization code received'))
              return
            }
            
            resolve(code)
          } catch (err) {
            reject(err)
          }
        }
        
        browser.tabs.onUpdated.addListener(tabListener)
      })
    }
    
    // Exchange code directly with Google (BYOK mode)
    return await exchangeCodeDirectInternal(authCode, codeVerifier, redirectUri, clientId, clientSecret)
  } catch (error) {
    console.error('[CloudSync BYOK] Authentication failed:', error)
    throw error
  }
}

/**
 * Build OAuth authorization URL with custom Client ID
 */
function buildAuthUrlWithClientId(redirectUri, codeChallenge, clientId) {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  return authUrl
}

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

// --- Platform Detection ---

// Firefox extension ID from wxt.config.ts (URL-encoded for allizom.org)
// Original: trongnguyen24@gmail.com → Encoded: trongnguyen24%40gmail.com
const FIREFOX_EXTENSION_ID_ENCODED = 'trongnguyen24%40gmail.com'

/**
 * Check if browser.identity API is available
 * Not available on Firefox Android
 */
function isIdentityApiAvailable() {
  return typeof browser?.identity?.launchWebAuthFlow === 'function'
}

/**
 * Get redirect URI based on platform
 * Desktop: uses browser.identity.getRedirectURL()
 * Mobile Firefox: uses https://HASH.extensions.allizom.org/ format
 * (Google doesn't accept moz-extension:// URLs)
 */
function getRedirectUri() {
  // Check if identity API is available (Desktop Firefox/Chrome)
  if (isIdentityApiAvailable()) {
    let redirectUrl = browser.identity.getRedirectURL()
    if (!redirectUrl.endsWith('/')) {
      redirectUrl += '/'
    }
    // Log this URL - user needs to copy the hash from here for Google Cloud Console
    console.log('[CloudSync] Desktop redirect URL:', redirectUrl)
    return redirectUrl
  }
  
  // Mobile Firefox: use the SAME hash as desktop
  // This hash is generated by Firefox from the extension ID
  const FIREFOX_REDIRECT_HASH = '5addcb3f-a5ee-4df3-b7e6-a30bf3445a6d'
  const mobileRedirectUrl = `https://${FIREFOX_REDIRECT_HASH}.extensions.allizom.org/`
  console.log('[CloudSync] Mobile redirect URL:', mobileRedirectUrl)
  return mobileRedirectUrl
}

// --- Authentication ---

/**
 * Build OAuth authorization URL with PKCE
 */
function buildAuthUrl(redirectUri, codeChallenge) {
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  return authUrl
}

/**
 * Mobile OAuth flow using browser.tabs
 * Opens Google auth in a new tab and monitors for redirect
 */
async function authenticateMobile(redirectUri, codeVerifier, codeChallenge) {
  console.log('[CloudSync] Using mobile OAuth flow')
  
  const authUrl = buildAuthUrl(redirectUri, codeChallenge)
  
  // Open auth URL in new tab
  const authTab = await browser.tabs.create({ url: authUrl.toString() })
  console.log('[CloudSync] Opened auth tab:', authTab.id)
  
  return new Promise((resolve, reject) => {
    const AUTH_TIMEOUT = 120000 // 2 minutes
    
    const timeoutId = setTimeout(() => {
      cleanup()
      reject(new Error('Authentication timeout. Please try again.'))
    }, AUTH_TIMEOUT)
    
    const cleanup = () => {
      clearTimeout(timeoutId)
      browser.tabs.onUpdated.removeListener(tabListener)
    }
    
    const tabListener = async (tabId, changeInfo, tab) => {
      // Only monitor our auth tab
      if (tabId !== authTab.id) return
      
      // Check if URL matches our redirect URI
      if (!tab.url || !tab.url.startsWith(redirectUri)) return
      
      console.log('[CloudSync] Auth redirect detected:', tab.url)
      cleanup()
      
      try {
        const url = new URL(tab.url)
        const code = url.searchParams.get('code')
        const error = url.searchParams.get('error')
        
        // Close the auth tab
        try {
          await browser.tabs.remove(tabId)
        } catch (e) {
          console.warn('[CloudSync] Could not close auth tab:', e)
        }
        
        if (error) {
          reject(new Error(`Auth error: ${error}`))
          return
        }
        
        if (!code) {
          reject(new Error('No authorization code received'))
          return
        }
        
        // Exchange code for tokens
        const tokens = await exchangeCodeViaProxy(code, codeVerifier, redirectUri)
        resolve(tokens)
      } catch (err) {
        reject(err)
      }
    }
    
    browser.tabs.onUpdated.addListener(tabListener)
  })
}

/**
 * Desktop OAuth flow using browser.identity
 */
async function authenticateDesktop(redirectUri, codeVerifier, codeChallenge) {
  console.log('[CloudSync] Using desktop OAuth flow')
  
  const authUrl = buildAuthUrl(redirectUri, codeChallenge)
  
  const responseUrl = await browser.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  })
  
  const authCode = parseAuthorizationCode(responseUrl)
  return await exchangeCodeViaProxy(authCode, codeVerifier, redirectUri)
}

/**
 * Authenticate with Google using OAuth2 PKCE flow
 * Automatically selects desktop or mobile flow based on API availability
 */
export async function authenticate() {
  const redirectUri = getRedirectUri()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  
  console.log('[CloudSync] Redirect URI:', redirectUri)
  console.log('[CloudSync] Identity API available:', isIdentityApiAvailable())
  
  try {
    if (isIdentityApiAvailable()) {
      return await authenticateDesktop(redirectUri, codeVerifier, codeChallenge)
    } else {
      return await authenticateMobile(redirectUri, codeVerifier, codeChallenge)
    }
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
