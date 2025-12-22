// @ts-nocheck
/**
 * Google Drive Adapter for Cloud Sync
 * Handles OAuth2 authentication and Google Drive API operations
 */

import { browser } from 'wxt/browser'

// OAuth2 Configuration - Implicit Flow (No Client Secret needed)
const WEB_CLIENT_ID = '1045816330790-n9u8unuthqvdqvlmce7d3j779uprv26k.apps.googleusercontent.com'
// Scopes needed: Drive app data + user profile
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email'

/**
 * Authenticate with Google using OAuth2 Implicit Flow
 * Safe for client-side extensions (no Client Secret required)
 * @returns {Promise<{accessToken: string, expiresAt: number}>}
 */
export async function authenticate() {
  // Ensure trailing slash is present to match Google Console config
  let redirectUrl = browser.identity.getRedirectURL()
  if (!redirectUrl.endsWith('/')) {
    redirectUrl += '/'
  }
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', WEB_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', redirectUrl)
  authUrl.searchParams.set('response_type', 'token') // Implicit flow
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('prompt', 'consent')
  
  try {
    const responseUrl = await browser.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true,
    })
    
    return parseAuthResponse(responseUrl)
  } catch (error) {
    console.error('Authentication failed:', error)
    throw error
  }
}

/**
 * Parse the response URL from Implicit Flow (contains access_token in hash)
 */
function parseAuthResponse(responseUrl) {
  const url = new URL(responseUrl)
  // Implicit flow returns params in the hash (fragment)
  const params = new URLSearchParams(url.hash.substring(1)) // remove '#'
  
  const accessToken = params.get('access_token')
  const expiresIn = params.get('expires_in')
  
  if (!accessToken) {
    throw new Error('No access token received')
  }
  
  return {
    accessToken,
    // refresh_token is NOT returned in Implicit Flow
    // expires_in is in seconds
    expiresAt: Date.now() + (Number(expiresIn) || 3600) * 1000,
  }
}

/**
 * Refresh access token
 * For Implicit Flow, this means running the auth flow again silently (interactive: false)
 * @returns {Promise<{accessToken: string, expiresAt: number}>}
 */
export async function refreshAccessToken() {
  // Ensure trailing slash is present to match Google Console config
  let redirectUrl = browser.identity.getRedirectURL()
  if (!redirectUrl.endsWith('/')) {
    redirectUrl += '/'
  }
  
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  authUrl.searchParams.set('client_id', WEB_CLIENT_ID)
  authUrl.searchParams.set('redirect_uri', redirectUrl)
  authUrl.searchParams.set('response_type', 'token')
  authUrl.searchParams.set('scope', SCOPES)
  authUrl.searchParams.set('prompt', 'none') // Silent refresh
  
  try {
    const responseUrl = await browser.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: false,
    })
    
    return parseAuthResponse(responseUrl)
  } catch (error) {
    console.error('Silent refresh failed:', error)
    throw new Error('Session expired. Please sign in again.')
  }
}

/**
 * Revoke access token (logout)
 * @param {string} accessToken
 */
export async function revokeToken(accessToken) {
  if (!accessToken) return
  
  try {
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${accessToken}`, {
      method: 'GET', // Google's revoke endpoint supports GET or POST
    })
  } catch (err) {
    console.warn('Revoke token failed (ignoring):', err)
  }
}

/**
 * Find a file by name in appDataFolder
 * @param {string} accessToken
 * @param {string} filename
 * @returns {Promise<string|null>} File ID or null
 */
async function findFile(accessToken, filename) {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${filename}'&fields=files(id,modifiedTime)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
  
  if (!response.ok) {
    throw new Error(`Failed to search file ${filename}`)
  }
  
  const data = await response.json()
  return data.files?.[0]?.id || null
}

/**
 * List files in appDataFolder matching query
 * @param {string} accessToken
 * @param {string} query
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
export async function listFiles(accessToken, query = "trashed = false") {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  )
  
  if (!response.ok) {
    throw new Error('Failed to list files')
  }
  
  const data = await response.json()
  return data.files || []
}

/**
 * Get file content from Google Drive
 * @param {string} accessToken
 * @param {string} filename
 * @returns {Promise<object|null>} File content or null if not exists
 */
export async function getFile(accessToken, filename) {
  const fileId = await findFile(accessToken, filename)
  
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
    console.error(`Get file ${filename} failed:`, err)
    throw new Error(err.error?.message || `Failed to get ${filename}`)
  }
  
  return await response.json()
}

/**
 * Save file to Google Drive
 * @param {string} accessToken
 * @param {string} filename
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function saveFile(accessToken, filename, data) {
  const fileId = await findFile(accessToken, filename)
  
  const metadata = {
    name: filename,
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
      console.error(`Update file ${filename} failed:`, err)
      throw new Error(err.error?.message || `Update ${filename} failed`)
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
      console.error(`Create file ${filename} failed:`, err)
      throw new Error(err.error?.message || `Create ${filename} failed`)
    }
  }
}

/**
 * Delete file from Google Drive
 * @param {string} accessToken
 * @param {string} filename
 * @returns {Promise<void>}
 */
export async function deleteFile(accessToken, filename) {
  const fileId = await findFile(accessToken, filename)
  
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
 * Delete file by ID
 * @param {string} accessToken
 * @param {string} fileId
 */
export async function deleteFileById(accessToken, fileId) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  
  if (!response.ok && response.status !== 404) {
     throw new Error(`Failed to delete file ${fileId}`)
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
