import { describe, expect, it } from 'vitest'
import { buildLocalChatItems, mergeChatData } from '@/lib/db/conversationSyncMerge.js'

const DAY = 24 * 60 * 60 * 1000
const TTL = 30 * DAY
const NOW = Date.parse('2026-10-29T00:00:00.000Z')
const iso = (ms) => new Date(ms).toISOString()

function conversation(id, updatedAt, extra = {}) {
  return { id, title: id, createdAt: iso(updatedAt - DAY), updatedAt: iso(updatedAt), deleted: false, ...extra }
}

function message(id, conversationId, sequence, at, extra = {}) {
  return {
    id,
    conversationId,
    sequence,
    role: sequence % 2 ? 'user' : 'assistant',
    content: id,
    createdAt: iso(at),
    status: 'complete',
    attachmentRefs: [],
    ...extra,
  }
}

function snapshot({ conversations = [], messages = [], sources = [] } = {}) {
  return buildLocalChatItems({
    conversations,
    conversationMessages: messages,
    conversationSources: sources,
  })
}

function merge(cloud, local) {
  return mergeChatData({
    cloudItems: cloud.items || {},
    cloudSources: cloud.sources || {},
    local,
    tombstoneTtlMs: TTL,
    now: NOW,
  })
}

describe('buildLocalChatItems', () => {
  it('uses the newest message time as the conversation timestamp', () => {
    const local = snapshot({
      conversations: [conversation('c1', NOW - 5 * DAY)],
      messages: [message('m1', 'c1', 1, NOW - 5 * DAY), message('m2', 'c1', 2, NOW - DAY, { updatedAt: iso(NOW - 1000) })],
    })
    expect(local.items.c1.updatedAt).toBe(iso(NOW - 1000))
    expect(local.items.c1.messages.map((m) => m.id)).toEqual(['m1', 'm2'])
  })

  it('holds back a conversation that is still streaming', () => {
    const local = snapshot({
      conversations: [conversation('c1', NOW)],
      messages: [message('m1', 'c1', 1, NOW, { status: 'streaming' })],
    })
    expect(local.items.c1).toBeUndefined()
    expect(local.pendingIds.has('c1')).toBe(true)
  })

  it('ships tombstones without their messages', () => {
    const local = snapshot({
      conversations: [conversation('c1', NOW, { deleted: true, deletedAt: iso(NOW) })],
      messages: [message('m1', 'c1', 1, NOW - DAY)],
    })
    expect(local.items.c1).toMatchObject({ deleted: true, messages: [] })
  })
})

describe('mergeChatData', () => {
  it('pushes local-only conversations and their sources on first sync', () => {
    const local = snapshot({
      conversations: [conversation('c1', NOW)],
      messages: [message('m1', 'c1', 1, NOW, { attachmentRefs: ['s1'] })],
      sources: [{ id: 's1', sourceKey: 'k1' }, { id: 'orphan', sourceKey: 'k2' }],
    })
    const result = merge({}, local)
    expect(result.hasChanges).toBe(true)
    expect(Object.keys(result.items)).toEqual(['c1'])
    expect(Object.keys(result.sources)).toEqual(['s1'])
    expect(result.upserts).toEqual([])
  })

  it('applies a newer cloud conversation locally with the sources it needs', () => {
    const local = snapshot({
      conversations: [conversation('c1', NOW - DAY)],
      messages: [message('m1', 'c1', 1, NOW - DAY)],
    })
    const cloudConversation = snapshot({
      conversations: [conversation('c1', NOW)],
      messages: [message('m1', 'c1', 1, NOW - DAY), message('m2', 'c1', 2, NOW, { attachmentRefs: ['s9'] })],
      sources: [{ id: 's9', sourceKey: 'k9' }],
    })
    const result = merge(cloudConversation, local)
    expect(result.upserts.map((item) => item.id)).toEqual(['c1'])
    expect(result.upserts[0].messages).toHaveLength(2)
    expect(result.sourcesToApply.map((source) => source.id)).toEqual(['s9'])
    expect(result.hasChanges).toBe(false)
  })

  it('keeps the local version when it is newer and pushes it', () => {
    const local = snapshot({ conversations: [conversation('c1', NOW)] })
    const cloud = snapshot({ conversations: [conversation('c1', NOW - DAY, { title: 'old' })] })
    const result = merge(cloud, local)
    expect(result.upserts).toEqual([])
    expect(result.items.c1.conversation.title).toBe('c1')
    expect(result.hasChanges).toBe(true)
  })

  it('reports no changes when both sides match', () => {
    const local = snapshot({ conversations: [conversation('c1', NOW)] })
    const cloud = snapshot({ conversations: [conversation('c1', NOW)] })
    const result = merge(cloud, local)
    expect(result.upserts).toEqual([])
    expect(result.hasChanges).toBe(false)
  })

  it('never overwrites a conversation this device is streaming into', () => {
    const local = snapshot({
      conversations: [conversation('c1', NOW - DAY)],
      messages: [message('m1', 'c1', 1, NOW - DAY, { status: 'streaming' })],
    })
    const cloud = snapshot({ conversations: [conversation('c1', NOW)] })
    const result = merge(cloud, local)
    expect(result.upserts).toEqual([])
    expect(result.items.c1).toBe(cloud.items.c1)
  })

  it('propagates a deletion from the cloud', () => {
    const local = snapshot({
      conversations: [conversation('c1', NOW - DAY)],
      messages: [message('m1', 'c1', 1, NOW - DAY)],
    })
    const cloud = snapshot({ conversations: [conversation('c1', NOW, { deleted: true, deletedAt: iso(NOW) })] })
    const result = merge(cloud, local)
    expect(result.upserts).toHaveLength(1)
    expect(result.upserts[0]).toMatchObject({ deleted: true, messages: [] })
  })

  it('expires old tombstones everywhere and purges them locally', () => {
    const old = NOW - 31 * DAY
    const local = snapshot({ conversations: [conversation('c1', old, { deleted: true, deletedAt: iso(old) })] })
    const cloud = snapshot({ conversations: [conversation('c1', old, { deleted: true, deletedAt: iso(old) })] })
    const result = merge(cloud, local)
    expect(result.items).toEqual({})
    expect(result.purgeIds).toEqual(['c1'])
    expect(result.hasChanges).toBe(true)
  })
})
