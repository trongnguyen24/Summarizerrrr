import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gunzipSync } from 'node:zlib'

vi.mock('wxt/browser', () => ({
  browser: { identity: {}, runtime: { id: 'test-extension-id' }, tabs: {} },
}))

import {
  clearSyncFolderCache,
  getFileJsonl,
  parseJsonl,
  saveFileJsonl,
} from '@/services/cloudSync/googleDriveAdapter.js'

const FOLDER_ID = 'folder-1'
const FILE = 'summarizerrrr-chats.jsonl.gz'

/**
 * In-memory stand-in for the three Drive endpoints the chats path touches:
 * folder lookup, file search by name, and media download / multipart create /
 * media update. Every upload is recorded so tests can inspect what went out.
 */
let files
let uploads
let nextId
let clock

function installFakeDrive() {
  files = new Map()
  uploads = []
  nextId = 1
  clock = 0

  vi.stubGlobal('fetch', vi.fn(async (url, init = {}) => {
    const method = init.method || 'GET'

    if (url.includes("mimeType='application/vnd.google-apps.folder'")) {
      return Response.json({ files: [{ id: FOLDER_ID }] })
    }

    if (url.includes(' in parents')) {
      const found = [...files.values()].filter((f) => url.includes(`name='${f.name}'`))
      return Response.json({ files: found.map((f) => ({ id: f.id, modifiedTime: f.modifiedTime })) })
    }

    if (method === 'GET' && url.includes('alt=media')) {
      const id = url.match(/files\/([^?]+)\?alt=media/)[1]
      return new Response(files.get(id).bytes, { status: 200 })
    }

    if (method === 'POST' && url.includes('uploadType=multipart')) {
      const form = init.body
      const meta = JSON.parse(await form.get('metadata').text())
      const fileBlob = form.get('file')
      const bytes = new Uint8Array(await fileBlob.arrayBuffer())
      const id = `file-${nextId++}`
      const modifiedTime = `T${++clock}`
      files.set(id, { id, name: meta.name, bytes, modifiedTime })
      uploads.push({ method, metadataMimeType: meta.mimeType, blobType: fileBlob.type, bytes })
      return Response.json({ id, modifiedTime })
    }

    if (method === 'PATCH' && url.includes('uploadType=media')) {
      const id = url.match(/files\/([^?]+)\?uploadType=media/)[1]
      const bytes = new Uint8Array(await new Response(init.body).arrayBuffer())
      const modifiedTime = `T${++clock}`
      files.set(id, { ...files.get(id), bytes, modifiedTime })
      uploads.push({ method, contentType: init.headers['Content-Type'], bytes })
      return Response.json({ id, modifiedTime })
    }

    throw new Error(`fake drive: unhandled ${method} ${url}`)
  }))
}

const chats = {
  meta: { version: 2, updatedAt: 1000 },
  conversations: {
    c1: {
      id: 'c1',
      updatedAt: '2026-10-01T00:00:00.000Z',
      deleted: false,
      conversation: { id: 'c1', title: 'Hello', updatedAt: '2026-10-01T00:00:00.000Z' },
      messages: [{ id: 'm1', role: 'user', content: 'x'.repeat(2000) }],
    },
  },
  chatSources: {
    s1: { id: 's1', kind: 'page', text: 'y'.repeat(2000) },
  },
}

beforeEach(() => {
  clearSyncFolderCache()
  installFakeDrive()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('parseJsonl', () => {
  it('reads the meta line and buckets chat lines by _type', () => {
    const text = [
      JSON.stringify({ _meta: true, version: 2, updatedAt: 5 }),
      JSON.stringify({ _type: 'conversation', id: 'c1', title: 'T' }),
      JSON.stringify({ _type: 'chatSource', id: 's1', text: 'src' }),
    ].join('\n')

    const parsed = parseJsonl(text)

    expect(parsed.meta).toEqual({ version: 2, updatedAt: 5 })
    expect(parsed.conversations).toEqual({ c1: { id: 'c1', title: 'T' } })
    expect(parsed.chatSources).toEqual({ s1: { id: 's1', text: 'src' } })
  })

  it('skips a malformed line without dropping the rest', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const text = [
      JSON.stringify({ _meta: true, version: 2, updatedAt: 0 }),
      '{not json',
      JSON.stringify({ _type: 'conversation', id: 'c1' }),
    ].join('\n')

    const parsed = parseJsonl(text)

    expect(Object.keys(parsed.conversations)).toEqual(['c1'])
  })
})

describe('gzip chats file', () => {
  it('uploads a real gzip body as application/gzip and reads it back', async () => {
    const saved = await saveFileJsonl('token', FILE, chats, { gzip: true })

    expect(saved).toEqual({ id: 'file-1', modifiedTime: 'T1' })
    const [upload] = uploads
    expect(upload.metadataMimeType).toBe('application/gzip')
    expect(upload.blobType).toBe('application/gzip')
    expect(upload.bytes[0]).toBe(0x1f)
    expect(upload.bytes[1]).toBe(0x8b)

    const inflated = new TextDecoder().decode(gunzipSync(upload.bytes))
    expect(inflated.split('\n')[0]).toBe(JSON.stringify({ _meta: true, version: 2, updatedAt: 1000 }))
    expect(upload.bytes.byteLength).toBeLessThan(new TextEncoder().encode(inflated).byteLength)

    const back = await getFileJsonl('token', FILE, { gzip: true })
    expect(back).toEqual({
      meta: { version: 2, updatedAt: 1000 },
      conversations: chats.conversations,
      chatSources: chats.chatSources,
    })
  })

  it('updates an existing gzip file in place with the same content type', async () => {
    await saveFileJsonl('token', FILE, chats, { gzip: true })

    const edited = structuredClone(chats)
    edited.conversations.c1.conversation.title = 'Edited'
    const saved = await saveFileJsonl('token', FILE, edited, { gzip: true })

    expect(saved).toEqual({ id: 'file-1', modifiedTime: 'T2' })
    expect(files.size).toBe(1)
    expect(uploads[1]).toMatchObject({ method: 'PATCH', contentType: 'application/gzip' })

    const back = await getFileJsonl('token', FILE, { gzip: true })
    expect(back.conversations.c1.conversation.title).toBe('Edited')
  })

  it('without the option, the plain JSONL path is unchanged', async () => {
    await saveFileJsonl('token', FILE, chats)

    const [upload] = uploads
    expect(upload.metadataMimeType).toBe('text/plain')
    expect(upload.bytes[0]).not.toBe(0x1f)
    expect(new TextDecoder().decode(upload.bytes).startsWith('{"_meta":true')).toBe(true)

    const back = await getFileJsonl('token', FILE)
    expect(back.conversations).toEqual(chats.conversations)
  })
})
