import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('wxt/browser', () => ({
  browser: { identity: {}, runtime: { id: 'test-extension-id' }, tabs: {} },
}))

import {
  OAuthTokenError,
  refreshAccessTokenDirect,
} from '@/services/cloudSync/googleDriveAdapter.js'

function tokenErrorResponse(body, status = 400) {
  return {
    ok: false,
    status,
    json: async () => body,
  }
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('refreshAccessTokenDirect', () => {
  it('surfaces Google\'s error code, not just its prose', async () => {
    // The 7-day Testing-mode expiry lands here. Callers must be able to tell it
    // apart from a transient failure without matching on message text.
    fetch.mockResolvedValue(
      tokenErrorResponse({
        error: 'invalid_grant',
        error_description: 'Token has been expired or revoked.',
      })
    )

    const error = await refreshAccessTokenDirect('dead-token', 'id', 'secret')
      .then(() => null)
      .catch((e) => e)

    expect(error).toBeInstanceOf(OAuthTokenError)
    expect(error.code).toBe('invalid_grant')
    expect(error.message).toBe('Token has been expired or revoked.')
  })

  it('does not label a server-side failure as a dead grant', async () => {
    fetch.mockResolvedValue(
      tokenErrorResponse({ error: 'internal_failure' }, 500)
    )

    const error = await refreshAccessTokenDirect('token', 'id', 'secret')
      .then(() => null)
      .catch((e) => e)

    expect(error.code).toBe('internal_failure')
    expect(error.code).not.toBe('invalid_grant')
  })

  it('survives a non-JSON error body', async () => {
    // Gateway HTML, empty 502 — must not throw a parse error over the real one.
    fetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token <')
      },
    })

    const error = await refreshAccessTokenDirect('token', 'id', 'secret')
      .then(() => null)
      .catch((e) => e)

    expect(error).toBeInstanceOf(OAuthTokenError)
    expect(error.code).toBe('unknown_error')
    expect(error.message).toBe('Direct token refresh failed')
  })

  it('rejects before making a request when there is no refresh token', async () => {
    await expect(refreshAccessTokenDirect(null, 'id', 'secret')).rejects.toThrow(
      'No refresh token available'
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('returns the new token with an absolute expiry', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: 'fresh', expires_in: 3600 }),
    })

    const before = Date.now()
    const result = await refreshAccessTokenDirect('token', 'id', 'secret')

    expect(result.accessToken).toBe('fresh')
    expect(result.expiresAt).toBeGreaterThanOrEqual(before + 3600 * 1000)
  })
})
