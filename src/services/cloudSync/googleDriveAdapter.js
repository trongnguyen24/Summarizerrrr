// @ts-nocheck
/**
 * Google Drive Adapter for Cloud Sync
 * Handles OAuth2 authentication and Google Drive API operations
 */

import { browser } from 'wxt/browser'

// OAuth2 Configuration - Always use Web Client ID with PKCE for flexibility
const WEB_CLIENT_ID = '1045816330790-n9u8unuthqvdqvlmce7d3j779uprv26k.apps.googleusercontent.com'
const WEB_CLIENT_SECRET = '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'

// Scopes needed: Drive app data + user profile
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'
const SYNC_FILENAME = 'summarizerrrr-sync.json'

/**
 * Generate a random string for PKCE code verifier
 */
function generateCodeVerifier() {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Generate code challenge from verifier (SHA256)
 */
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Authenticate with Google using OAuth2 PKCE flow
 * Works on all browsers (Chrome, Firefox, Safari, Edge)
 * @returns {Promise<{accessToken: string, refreshToken: string, expiresAt: number}>}
 */
export async function authenticate() {
  return authenticatePKCE()
}


/**
 * PKCE-based authentication for Firefox/Safari and other browsers
 */
async function authenticatePKCE() {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)
  // Ensure trailing slash is present to match Google Console config
  let redirectUrl = browser.identity.getRedirectURL()
  if (!redirectUrl.endsWith('/')) {
    redirectUrl += '/'
  }
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', WEB_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', redirectUrl)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('code_challenge', codeChallenge)
  authUrl.searchParams.set('code_challenge_method', 'S256')
  authUrl.searchParams.set('access_type', 'offline')
  authUrl.searchParams.set('prompt', 'consent')
  
  try {
    const responseUrl = await browser.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    })
    
    const url = new URL(responseUrl)
    const code = url.searchParams.get('code')
    
    if (!code) {
      throw new Error('No authorization code received')
    }
    
    // Exchange code for tokens
    return await exchangeCodeForTokens(code, codeVerifier, redirectUrl)
  } catch (error) {
    console.error('PKCE authentication failed:', error)
    throw error
  }
}

/**
 * Exchange authorization code for access and refresh tokens
 */
async function exchangeCodeForTokens(code, codeVerifier, redirectUri) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: WEB_CLIENT_ID,
      client_secret: WEB_CLIENT_SECRET,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || 'Token exchange failed')
  }
  
  const data = await response.json()
  
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken
 * @returns {Promise<{accessToken: string, expiresAt: number}>}
 */
export async function refreshAccessToken(refreshToken) {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: WEB_CLIENT_ID,
      client_secret: WEB_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  
  if (!response.ok) {
    throw new Error('Token refresh failed')
  }
  
  const data = await response.json()
  
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
}

/**
 * Revoke access token (logout)
 * @param {string} accessToken
 */
export async function revokeToken(accessToken) {
  // Revoke via Google's endpoint
  await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
    method: 'POST',
  })
}

/**
 * Find the sync file in appDataFolder
 * @param {string} accessToken
 * @returns {Promise<string|null>} File ID or null
 */
async function findSyncFile(accessToken) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${SYNC_FILENAME}'&fields=files(id,modifiedTime)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to search sync file')
  }
  
  const data = await response.json()
  return data.files?.[0]?.id || null
}

/**
 * Get sync data from Google Drive
 * @param {string} accessToken
 * @returns {Promise<object|null>} Sync data or null if not exists
 */
export async function getSyncData(accessToken) {
  const fileId = await findSyncFile(accessToken)
  
  if (!fileId) {
    return null
  }
  
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
  
  if (!response.ok) {
    if (response.status === 404) {
      return null
    }
    const err = await response.json()
    console.error('Get sync data failed:', err)
    throw new Error(err.error?.message || 'Failed to get sync data')
  }
  
  return await response.json()
}

/**
 * Save sync data to Google Drive
 * @param {string} accessToken
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function saveSyncData(accessToken, data) {
  const fileId = await findSyncFile(accessToken)
  
  const metadata = {
    name: SYNC_FILENAME,
    mimeType: 'application/json',
  }
  
  if (fileId) {
    // Update existing file
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
      const err = await res.json()
      console.error('Update file failed:', err)
      throw new Error(err.error?.message || 'Update sync data failed')
    }
  } else {
    // Create new file in appDataFolder
    const form = new FormData()
    form.append(
      'metadata',
      new Blob([JSON.stringify({ ...metadata, parents: ['appDataFolder'] })], {
        type: 'application/json',
      })
    )
    form.append('file', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    
    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      }
    )
    if (!res.ok) {
      const err = await res.json()
      console.error('Create file failed:', err)
      throw new Error(err.error?.message || 'Create sync data failed')
    }
  }
}

/**
 * Delete sync data from Google Drive
 * @param {string} accessToken
 * @returns {Promise<void>}
 */
export async function deleteSyncData(accessToken) {
  const fileId = await findSyncFile(accessToken)
  
  if (fileId) {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
  }
}

/**
 * Get user profile info
 * @param {string} accessToken
 * @returns {Promise<{email: string, name: string, picture: string}>}
 */
export async function getUserProfile(accessToken) {
  const response = await fetch(
    'https://www.googleapis.com/oauth2/v2/userinfo',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to get user profile')
  }
  
  return await response.json()
}
