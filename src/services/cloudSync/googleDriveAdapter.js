// @ts-nocheck
/**
 * Google Drive Adapter for Cloud Sync
 * Uses OAuth2 Authorization Code Flow with PKCE, in one of two modes:
 *
 * - Shared (default): the published Summarizerrrr client (CLIENT_ID). The code
 *   is exchanged and the token refreshed through the token proxy
 *   (Cloudflare Worker at TOKEN_PROXY_URL), which holds the client_secret.
 *   `authenticate()` / `refreshAccessToken()`.
 * - Custom (BYOK): the user's own Google Cloud OAuth client. The code is
 *   exchanged and refreshed directly with Google using the user's secret.
 *   `authenticateWithCustomCredentials()` / `refreshAccessTokenDirect()`.
 *
 * Both modes share the same auth-code flow (`obtainAuthCode()`). Drive data is
 * per OAuth client (`drive.file` scope), so the two modes see separate files.
 */

import { browser } from 'wxt/browser'

/**
 * Thrown when Google's token endpoint rejects a request.
 * `code` carries Google's own identifier (`invalid_grant`, `invalid_client`, …)
 * so callers can branch on it instead of matching message strings — the
 * messages are user-facing and change; the codes don't.
 */
export class OAuthTokenError extends Error {
  constructor(message, code) {
    super(message)
    this.name = 'OAuthTokenError'
    this.code = code || 'unknown_error'
  }
}

/**
 * Turn a non-OK token-endpoint response into an OAuthTokenError.
 * Google answers with `{ error, error_description }`; a proxy or a network-level
 * failure may answer with neither, hence the defensive parse.
 */
async function toTokenError(response, fallbackMessage) {
  let body = {}
  try {
    body = await response.json()
  } catch {
    // Non-JSON body (gateway error page, empty 5xx) — code stays unknown.
  }
  console.error(`${fallbackMessage}:`, body)
  return new OAuthTokenError(
    body.error_description || body.error || fallbackMessage,
    body.error
  )
}

// OAuth2 Configuration
const CLIENT_ID = '197192111766-kfe6nfv6tsfbtvg0emd4ifcrjs631944.apps.googleusercontent.com'
// drive.file scope: only access files created by this app (visible in Drive)
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'

// Sync folder name visible in user's Google Drive
const SYNC_FOLDER_NAME = 'Summarizerrrr'

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
    throw await toTokenError(response, 'Direct token exchange failed')
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
    // `invalid_grant` here means the refresh token itself is dead — revoked,
    // or (by far the most common case for BYOK) expired because the user's
    // OAuth app is still in "Testing", where Google caps them at 7 days.
    // Callers branch on `error.code`, not on this message.
    throw await toTokenError(response, 'Direct token refresh failed')
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

  try {
    const authCode = await obtainAuthCode(clientId, redirectUri, codeChallenge)
    // Exchange code directly with Google (BYOK mode)
    return await exchangeCodeDirectInternal(authCode, codeVerifier, redirectUri, clientId, clientSecret)
  } catch (error) {
    console.error('[CloudSync BYOK] Authentication failed:', error)
    throw error
  }
}

/**
 * Build OAuth authorization URL with PKCE for the given Client ID
 */
function buildAuthUrl(redirectUri, codeChallenge, clientId) {
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
 * Check if running on mobile browser
 * Returns true for Android, iOS, and mobile variants
 */
function isMobileBrowser() {
  const ua = navigator.userAgent
  return ua.includes('Android') || ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('iPad')
}

/**
 * Check if running on Chrome/Edge (Chromium-based)
 */
function isChromiumBrowser() {
  const ua = navigator.userAgent
  return ua.includes('Chrome') || ua.includes('Edg') || ua.includes('Chromium')
}

/**
 * Check if browser.identity API is available AND safe to use
 * Not available on Firefox Android
 * Available but crashes on Edge/Chrome Mobile
 */
function isIdentityApiAvailable() {
  // API must exist
  if (typeof browser?.identity?.launchWebAuthFlow !== 'function') {
    return false
  }
  
  // On mobile Chromium browsers (Edge, Chrome), identity API exists but crashes
  // So we treat it as unavailable on mobile
  if (isMobileBrowser() && isChromiumBrowser()) {
    console.log('[CloudSync] Mobile Chromium detected, identity API disabled')
    return false
  }
  
  return true
}

/**
 * Get redirect URI based on platform
 * Desktop: uses browser.identity.getRedirectURL()
 * Mobile Firefox: uses https://HASH.extensions.allizom.org/
 * Mobile Chrome/Edge: uses https://EXTENSION_ID.chromiumapp.org/
 */
function getRedirectUri() {
  // Check if identity API is available AND safe to use
  if (isIdentityApiAvailable()) {
    let redirectUrl = browser.identity.getRedirectURL()
    if (!redirectUrl.endsWith('/')) {
      redirectUrl += '/'
    }
    console.log('[CloudSync] Desktop redirect URL:', redirectUrl)
    return redirectUrl
  }
  
  // Mobile fallback - detect browser type
  if (isChromiumBrowser()) {
    // Chrome/Edge Mobile: use chromiumapp.org format
    // Get extension ID from Chrome extension URL
    const extId = browser.runtime.id
    const chromeRedirectUrl = `https://${extId}.chromiumapp.org/`
    console.log('[CloudSync] Mobile Chrome/Edge redirect URL:', chromeRedirectUrl)
    return chromeRedirectUrl
  }
  
  // Firefox Mobile: use allizom.org format
  const FIREFOX_REDIRECT_HASH = '5addcb3f-a5ee-4df3-b7e6-a30bf3445a6d'
  const mobileRedirectUrl = `https://${FIREFOX_REDIRECT_HASH}.extensions.allizom.org/`
  console.log('[CloudSync] Mobile Firefox redirect URL:', mobileRedirectUrl)
  return mobileRedirectUrl
}

// --- Authentication ---

/**
 * Mobile auth-code flow using browser.tabs
 * Opens Google auth in a new tab and waits for the redirect
 */
async function obtainAuthCodeViaTab(authUrl, redirectUri) {
  const authTab = await browser.tabs.create({ url: authUrl.toString() })

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
      // Only monitor our auth tab, until it reaches our redirect URI
      if (tabId !== authTab.id) return
      if (!tab.url || !tab.url.startsWith(redirectUri)) return

      cleanup()

      try {
        await browser.tabs.remove(tabId)
      } catch (e) {
        console.warn('[CloudSync] Could not close auth tab:', e)
      }

      try {
        resolve(parseAuthorizationCode(tab.url))
      } catch (err) {
        reject(err)
      }
    }

    browser.tabs.onUpdated.addListener(tabListener)
  })
}

/**
 * Run the OAuth consent flow for `clientId` and return the authorization code.
 * Desktop: browser.identity.launchWebAuthFlow. Mobile: a tab + tabs.onUpdated.
 */
async function obtainAuthCode(clientId, redirectUri, codeChallenge) {
  const authUrl = buildAuthUrl(redirectUri, codeChallenge, clientId)

  console.log('[CloudSync] Redirect URI:', redirectUri)
  console.log('[CloudSync] Identity API available:', isIdentityApiAvailable())

  if (isIdentityApiAvailable()) {
    const responseUrl = await browser.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    })
    return parseAuthorizationCode(responseUrl)
  }

  return await obtainAuthCodeViaTab(authUrl, redirectUri)
}

/**
 * Authenticate with Google using the shared client (token exchange via proxy)
 */
export async function authenticate() {
  const redirectUri = getRedirectUri()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  try {
    const authCode = await obtainAuthCode(CLIENT_ID, redirectUri, codeChallenge)
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
    throw await toTokenError(response, 'Token exchange failed')
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
    throw await toTokenError(response, 'Token refresh failed')
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

// Cache folder ID to avoid repeated lookups
let cachedSyncFolderId = null
// Promise lock to prevent race condition when creating folder
let folderCreationPromise = null

/**
 * Get or create the sync folder in user's Google Drive
 * Creates "Summarizerrrr" folder in root if not exists
 * Uses promise lock to prevent duplicate folder creation
 */
async function getOrCreateSyncFolder(accessToken) {
  // Return cached folder ID if available
  if (cachedSyncFolderId) {
    // Verify the cached folder still exists
    try {
      const verifyResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${cachedSyncFolderId}?fields=id,trashed`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )
      
      if (verifyResponse.ok) {
        const folderData = await verifyResponse.json()
        if (!folderData.trashed) {
          return cachedSyncFolderId
        }
        // Folder was trashed, clear cache
        console.log('[CloudSync] Cached folder was trashed, clearing cache')
        cachedSyncFolderId = null
      } else if (verifyResponse.status === 404) {
        // Folder was deleted, clear cache
        console.log('[CloudSync] Cached folder was deleted, clearing cache')
        cachedSyncFolderId = null
      } else if (verifyResponse.status === 401) {
        throw new Error('TOKEN_EXPIRED')
      }
    } catch (error) {
      if (error.message === 'TOKEN_EXPIRED') {
        throw error
      }
      // Network error or other issue, clear cache and try fresh lookup
      console.warn('[CloudSync] Error verifying cached folder, clearing cache:', error)
      cachedSyncFolderId = null
    }
  }
  
  // If another call is already creating the folder, wait for it
  if (folderCreationPromise) {
    return await folderCreationPromise
  }
  
  // Create a new promise that other concurrent calls will wait on
  folderCreationPromise = (async () => {
    try {
      // Double-check cache after acquiring "lock"
      if (cachedSyncFolderId) {
        return cachedSyncFolderId
      }
      
      // Search for existing folder
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${SYNC_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id)`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      )
      
      if (!searchResponse.ok) {
        if (searchResponse.status === 401) {
          throw new Error('TOKEN_EXPIRED')
        }
        const errorText = await searchResponse.text()
        console.error('[CloudSync] Folder search failed:', searchResponse.status, errorText)
        throw new Error('Failed to search for sync folder')
      }
      
      const searchData = await searchResponse.json()
      
      if (searchData.files && searchData.files.length > 0) {
        cachedSyncFolderId = searchData.files[0].id
        console.log('[CloudSync] Found existing sync folder:', cachedSyncFolderId)
        return cachedSyncFolderId
      }
      
      // Create new folder
      const createResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: SYNC_FOLDER_NAME,
            mimeType: 'application/vnd.google-apps.folder',
          }),
        }
      )
      
      if (!createResponse.ok) {
        if (createResponse.status === 401) {
          throw new Error('TOKEN_EXPIRED')
        }
        throw new Error('Failed to create sync folder')
      }
      
      const createData = await createResponse.json()
      cachedSyncFolderId = createData.id
      console.log('[CloudSync] Created new sync folder:', cachedSyncFolderId)
      return cachedSyncFolderId
    } finally {
      // Clear the promise lock
      folderCreationPromise = null
    }
  })()
  
  return await folderCreationPromise
}

/**
 * Clear cached folder ID (call on logout)
 */
export function clearSyncFolderCache() {
  cachedSyncFolderId = null
}

/**
 * Look up a sync file by name without downloading it.
 * @returns {Promise<{ id: string, modifiedTime: string } | null>}
 */
export async function findFileMeta(accessToken, filename) {
  const folderId = await getOrCreateSyncFolder(accessToken)

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='${filename}' and '${folderId}' in parents and trashed=false&fields=files(id,modifiedTime)`,
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
  const file = data.files?.[0]
  return file ? { id: file.id, modifiedTime: file.modifiedTime } : null
}

async function findFile(accessToken, filename) {
  const meta = await findFileMeta(accessToken, filename)
  return meta?.id || null
}

export async function listFiles(accessToken, query = "trashed = false") {
  const folderId = await getOrCreateSyncFolder(accessToken)
  
  // Add parent folder filter to query
  const fullQuery = `'${folderId}' in parents and ${query}`
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(fullQuery)}&fields=files(id,name,modifiedTime)`,
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
    const folderId = await getOrCreateSyncFolder(accessToken)
    const form = new FormData()
    form.append(
      'metadata',
      new Blob([JSON.stringify({ name: filename, mimeType: 'application/json', parents: [folderId] })], {
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

/**
 * Parse JSONL text into typed buckets. Line 1 may be a `_meta` line; every other
 * line is an item, bucketed by its `_type` (Library and Chats files) or by its
 * `id` alone (History file). Invalid lines are skipped with a warning.
 * @param {string} text
 * @returns {{ meta: Object, items: Object, archives: Object, tags: Object, conversations: Object, chatSources: Object }}
 */
export function parseJsonl(text) {
  let meta = { version: 2, updatedAt: 0 }
  const items = {}
  const archives = {}
  const tags = {}
  const conversations = {}
  const chatSources = {}

  const lines = text.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed) {
      try {
        const obj = JSON.parse(trimmed)
        if (obj._meta) {
          // Metadata line
          meta = { version: obj.version || 2, updatedAt: obj.updatedAt || 0 }
        } else if (obj._type === 'archive' && obj.id) {
          // Archive item (Library file)
          archives[obj.id] = obj
        } else if (obj._type === 'tag' && obj.id) {
          // Tag item (Library file)
          tags[obj.id] = obj
        } else if (obj._type === 'conversation' && obj.id) {
          // Conversation item (Chats file): conversation record + its messages
          const { _type, ...item } = obj
          conversations[obj.id] = item
        } else if (obj._type === 'chatSource' && obj.id) {
          // Captured source snapshot (Chats file)
          const { _type, ...source } = obj
          chatSources[obj.id] = source
        } else if (obj.id) {
          // Generic item (History file) - use id as key
          items[obj.id] = obj
        }
      } catch (e) {
        console.warn(`[CloudSync] Skipping invalid JSONL line: ${trimmed.substring(0, 50)}...`)
      }
    }
  }

  return { meta, items, archives, tags, conversations, chatSources }
}

/**
 * Get file content as JSONL with metadata (JSON Lines format)
 * Format: Line 1 is metadata with _meta:true, remaining lines are items
 * @param {string} accessToken
 * @param {string} filename
 * @param {{ gzip?: boolean }} [options] - gzip: the file is gzip-compressed and is inflated before parsing
 * @returns {Object|null} { meta: {version, updatedAt}, items: Map<id, item> } or null
 */
export async function getFileJsonl(accessToken, filename, { gzip = false } = {}) {
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

  const text = gzip
    ? await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).text()
    : await response.text()

  const { meta, items, archives, tags, conversations, chatSources } = parseJsonl(text)

  // Return appropriate structure based on content
  if (Object.keys(conversations).length > 0 || Object.keys(chatSources).length > 0) {
    // Chats file format
    return { meta, conversations, chatSources }
  }
  if (Object.keys(archives).length > 0 || Object.keys(tags).length > 0) {
    // Library file format
    return { meta, archives, tags }
  }

  // History file format
  return { meta, items }
}

/**
 * Save data as JSONL file with metadata (JSON Lines format)
 * Format: Line 1 is metadata with _meta:true, remaining lines are items
 * Supports History format (items), Library format (archives + tags) and
 * Chats format (conversations + chatSources)
 * @param {string} accessToken
 * @param {string} filename
 * @param {Object} data - { meta, items }, { meta, archives, tags } or { meta, conversations, chatSources }
 * @param {{ gzip?: boolean }} [options] - gzip: compress the payload and upload it as application/gzip
 * @returns {Promise<{ id: string, modifiedTime: string }>}
 */
export async function saveFileJsonl(accessToken, filename, data, { gzip = false } = {}) {
  // Build JSONL content: metadata line first, then items
  const lines = []

  // Metadata line
  lines.push(JSON.stringify({
    _meta: true,
    version: data.meta?.version || 2,
    updatedAt: data.meta?.updatedAt || Date.now(),
  }))

  if (data.conversations || data.chatSources) {
    // Chats format: conversations + captured sources
    const conversations = data.conversations || {}
    for (const id of Object.keys(conversations)) {
      lines.push(JSON.stringify({ ...conversations[id], _type: 'conversation' }))
    }

    const chatSources = data.chatSources || {}
    for (const id of Object.keys(chatSources)) {
      lines.push(JSON.stringify({ ...chatSources[id], _type: 'chatSource' }))
    }
  } else if (data.archives || data.tags) {
    // Library format: archives + tags
    // Library format: add _type field to each item
    const archives = data.archives || {}
    for (const id of Object.keys(archives)) {
      lines.push(JSON.stringify({ ...archives[id], _type: 'archive' }))
    }

    const tags = data.tags || {}
    for (const id of Object.keys(tags)) {
      lines.push(JSON.stringify({ ...tags[id], _type: 'tag' }))
    }
  } else {
    // History format: items without _type
    const items = data.items || {}
    for (const id of Object.keys(items)) {
      lines.push(JSON.stringify(items[id]))
    }
  }

  const jsonlContent = lines.join('\n')

  // Gzipped payloads go up as application/gzip; the plain path is unchanged.
  const contentType = gzip ? 'application/gzip' : 'text/plain'
  const payload = gzip
    ? await new Response(new Blob([jsonlContent]).stream().pipeThrough(new CompressionStream('gzip'))).blob()
    : jsonlContent

  const fileId = await findFile(accessToken, filename)

  // `fields` makes Drive echo back the saved file's id and modifiedTime, which
  // the chats sync stores as its skip marker.
  if (fileId) {
    const res = await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,modifiedTime`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': contentType,
        },
        body: payload,
      }
    )
    if (!res.ok) {
      if (res.status === 401) {
        throw new Error('TOKEN_EXPIRED')
      }
      const err = await res.json()
      throw new Error(err.error?.message || `Update ${filename} failed`)
    }
    const { id, modifiedTime } = await res.json()
    return { id, modifiedTime }
  } else {
    const folderId = await getOrCreateSyncFolder(accessToken)
    const form = new FormData()
    form.append(
      'metadata',
      new Blob([JSON.stringify({ name: filename, mimeType: contentType, parents: [folderId] })], {
        type: 'application/json',
      })
    )
    form.append('file', new Blob([payload], { type: contentType }))

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime',
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
    const { id, modifiedTime } = await res.json()
    return { id, modifiedTime }
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
