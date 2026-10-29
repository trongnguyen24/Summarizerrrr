import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { closeDatabase, DB_NAME } from '@/lib/db/indexedDBService.js'
import {
  applyConversationSyncChanges,
  createConversation,
  exportConversationBackup,
  exportConversationSnapshot,
  getChatRevision,
  getConversation,
  listConversations,
  recoverStreamingMessages,
  softDeleteAllConversations,
  updateConversationMetadata,
} from '@/lib/db/conversationRepository.js'

function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Test database deletion was blocked'))
  })
}

beforeEach(async () => {
  closeDatabase()
  await deleteDatabase()
})

afterEach(async () => {
  closeDatabase()
  await deleteDatabase()
})

/** Upsert-shaped sync item, as produced by mergeChatData. */
function syncUpsert(id, updatedAt) {
  return {
    conversation: { id, title: `Synced ${id}`, createdAt: updatedAt, updatedAt, deleted: false },
    messages: [],
    updatedAt,
  }
}

describe('chat revision counter', () => {
  it('starts at zero on a fresh database', async () => {
    expect(await getChatRevision()).toBe(0)
  })

  it.each([
    ['createConversation', () => createConversation({ id: 'conv-new', title: 'First' })],
    ['updateConversationMetadata', () => updateConversationMetadata('conv-1', { title: 'Renamed' })],
    ['applyConversationSyncChanges', () => applyConversationSyncChanges({ upserts: [syncUpsert('conv-2', '2026-01-01T00:00:00.000Z')] })],
    ['softDeleteAllConversations', () => softDeleteAllConversations()],
  ])('%s bumps the revision exactly once', async (_name, write) => {
    await createConversation({ id: 'conv-1', title: 'Seed' })
    const before = await getChatRevision()

    await write()

    expect(await getChatRevision()).toBe(before + 1)
  })

  it('readonly calls do not move the revision', async () => {
    await createConversation({ id: 'conv-1', title: 'Seed' })
    const before = await getChatRevision()

    await getConversation('conv-1')
    await listConversations()
    await exportConversationBackup()
    await getChatRevision()

    expect(await getChatRevision()).toBe(before)
  })

  it('a readwrite call that writes nothing does not move the revision', async () => {
    // Opening a conversation runs recoverStreamingMessages; with no streaming
    // message it writes nothing, so the next sync must still be able to skip.
    await createConversation({ id: 'conv-1', title: 'Seed' })
    const before = await getChatRevision()

    expect(await recoverStreamingMessages('conv-1')).toEqual([])

    expect(await getChatRevision()).toBe(before)
  })

  it('exportConversationSnapshot returns the revision it read', async () => {
    await createConversation({ id: 'conv-1', title: 'Seed' })
    await updateConversationMetadata('conv-1', { title: 'Renamed' })

    const snapshot = await exportConversationSnapshot()

    expect(snapshot.revision).toBe(await getChatRevision())
    expect(snapshot.revision).toBeGreaterThan(0)
  })

  it('exportConversationBackup leaves the internal revision out of user backups', async () => {
    await createConversation({ id: 'conv-1', title: 'Seed' })

    const backup = await exportConversationBackup()

    expect(backup).not.toHaveProperty('revision')
    expect(backup.conversations).toHaveLength(1)
  })

  it('a rename moves the revision even when no timestamp passes the newest one (clock skew)', async () => {
    // Conversation A arrives from another device with a clock far ahead. Its
    // timestamp becomes the maximum, so a timestamp fingerprint would not move
    // when B is renamed with the local clock. The revision still must.
    await createConversation({ id: 'conv-b', title: 'Local B' })
    await applyConversationSyncChanges({
      upserts: [syncUpsert('conv-a', '2099-01-01T00:00:00.000Z')],
    })
    const before = await getChatRevision()
    const maxTimestampBefore = (await getConversation('conv-a')).updatedAt

    await updateConversationMetadata('conv-b', { title: 'Renamed B' })

    expect(await getChatRevision()).toBe(before + 1)
    expect((await getConversation('conv-a')).updatedAt).toBe(maxTimestampBefore)
  })
})

describe('applyConversationSyncChanges skipped count', () => {
  it('reports a conversation left alone because it changed locally after the snapshot', async () => {
    // Local conversation is "now"; the incoming copy is from 2000, so it loses.
    await createConversation({ id: 'conv-local', title: 'Local edit' })

    const outcome = await applyConversationSyncChanges({
      upserts: [syncUpsert('conv-local', '2000-01-01T00:00:00.000Z')],
    })

    expect(outcome).toEqual({ applied: 0, purged: 0, skipped: 1 })
  })

  it('reports zero skipped when every upsert is applied', async () => {
    const outcome = await applyConversationSyncChanges({
      upserts: [syncUpsert('conv-new', '2026-01-01T00:00:00.000Z')],
    })

    expect(outcome).toEqual({ applied: 1, purged: 0, skipped: 0 })
  })
})
