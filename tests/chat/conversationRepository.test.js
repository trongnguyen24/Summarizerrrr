import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  closeDatabase,
  DB_NAME,
  getDatabase,
} from '@/lib/db/indexedDBService.js'
import {
  addMessage,
  createConversation,
  deleteMessagesByConversation,
  deleteUnreferencedSources,
  exportConversationBackup,
  exportConversationBundle,
  finalizeAssistantMessage,
  getConversation,
  getSourceById,
  importConversationBundle,
  importConversationBackup,
  listMessagesByConversation,
  putSourceSnapshot,
  restoreConversationBackup,
  softDeleteConversation,
} from '@/lib/db/conversationRepository.js'
import { dataIntegrityService } from '@/services/dataIntegrityService.js'

function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Test database deletion was blocked'))
  })
}

async function createVersionNineFixture() {
  const request = indexedDB.open(DB_NAME, 9)
  const database = await new Promise((resolve, reject) => {
    request.onupgradeneeded = (event) => {
      const upgradeDb = event.target.result
      const summaries = upgradeDb.createObjectStore('summaries', { keyPath: 'id' })
      summaries.createIndex('title', 'title', { unique: false })
      summaries.createIndex('url', 'url', { unique: false })
      summaries.createIndex('date', 'date', { unique: false })
      const history = upgradeDb.createObjectStore('history', { keyPath: 'id' })
      history.createIndex('title', 'title', { unique: false })
      history.createIndex('url', 'url', { unique: false })
      history.createIndex('date', 'date', { unique: false })
      history.createIndex('isArchived', 'isArchived', { unique: false })
      const tags = upgradeDb.createObjectStore('tags', { keyPath: 'id' })
      tags.createIndex('name', 'name', { unique: true })
      tags.createIndex('createdAt', 'createdAt', { unique: false })
      const backups = upgradeDb.createObjectStore('data_backups', { keyPath: 'id' })
      backups.createIndex('createdAt', 'createdAt', { unique: false })
      backups.createIndex('type', 'type', { unique: false })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  const transaction = database.transaction(['summaries', 'history', 'tags'], 'readwrite')
  transaction.objectStore('summaries').add({
    id: 'legacy-summary',
    title: 'Legacy summary',
    url: 'https://example.com/summary',
    date: '2026-07-01T00:00:00.000Z',
  })
  transaction.objectStore('history').add({
    id: 'legacy-history',
    title: 'Legacy history',
    url: 'https://example.com/history',
    date: '2026-07-01T00:00:00.000Z',
  })
  transaction.objectStore('tags').add({
    id: 'legacy-tag',
    name: 'legacy',
    createdAt: '2026-07-01T00:00:00.000Z',
  })
  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

function sourceData(overrides = {}) {
  return {
    normalizedUrl: 'https://example.com/source',
    url: 'https://example.com/source',
    title: 'Source',
    sourceType: 'webpage',
    contentHash: 'hash-1',
    condensedContent: 'A condensed source snapshot.',
    condensationVersion: 1,
    condensationLanguage: 'en',
    originalLength: 100,
    ...overrides,
  }
}

beforeEach(async () => {
  closeDatabase()
  await deleteDatabase()
})

afterEach(async () => {
  closeDatabase()
  await deleteDatabase()
})

describe('conversationRepository', () => {
  it('upgrades a version-9 database without losing old stores or records', async () => {
    await createVersionNineFixture()

    const database = await getDatabase()
    expect(database.version).toBe(12)
    expect([...database.objectStoreNames]).toEqual(
      expect.arrayContaining([
        'summaries',
        'history',
        'tags',
        'data_backups',
        'conversations',
        'conversation_messages',
        'conversation_sources',
        'chat_meta',
      ])
    )

    const transaction = database.transaction(['summaries', 'history', 'tags'], 'readonly')
    await expect(requestAsPromise(transaction.objectStore('summaries').get('legacy-summary'))).resolves.toMatchObject({
      title: 'Legacy summary',
    })
    await expect(requestAsPromise(transaction.objectStore('history').get('legacy-history'))).resolves.toMatchObject({
      title: 'Legacy history',
    })
    await expect(requestAsPromise(transaction.objectStore('tags').get('legacy-tag'))).resolves.toMatchObject({
      name: 'legacy',
    })
  })

  it('allocates deterministic message sequence numbers and rejects duplicate pairs', async () => {
    const { conversation, firstMessage } = await createConversation(
      { id: 'conversation-1', title: 'First' },
      { id: 'message-1', content: 'First user message' }
    )
    const assistant = await finalizeAssistantMessage(conversation.id, {
      id: 'message-2',
      content: 'First assistant message',
    })
    const secondUserMessage = await addMessage(conversation.id, {
      id: 'message-3',
      role: 'user',
      content: 'Second user message',
    })

    expect([firstMessage.sequence, assistant.sequence, secondUserMessage.sequence]).toEqual([1, 2, 3])
    expect((await listMessagesByConversation(conversation.id)).map((message) => message.id)).toEqual([
      'message-1',
      'message-2',
      'message-3',
    ])

    const database = await getDatabase()
    const transaction = database.transaction(['conversation_messages'], 'readwrite')
    const duplicateRequest = transaction.objectStore('conversation_messages').add({
      id: 'duplicate-sequence',
      conversationId: conversation.id,
      sequence: 1,
      role: 'user',
      content: 'Duplicate sequence',
      createdAt: '2026-07-10T00:00:00.000Z',
    })
    const duplicateError = await new Promise((resolve) => {
      duplicateRequest.onerror = (event) => {
        event.preventDefault()
        resolve(duplicateRequest.error)
      }
    })
    expect(duplicateError).toMatchObject({ name: 'ConstraintError' })
  })

  it('deduplicates snapshots by normalized URL plus content hash', async () => {
    const first = await putSourceSnapshot(sourceData())
    const sameSnapshot = await putSourceSnapshot(sourceData({ title: 'Changed display title' }))
    const sameContentDifferentUrl = await putSourceSnapshot(
      sourceData({
        normalizedUrl: 'https://example.com/other-source',
        url: 'https://example.com/other-source',
      })
    )

    expect(sameSnapshot.id).toBe(first.id)
    expect(sameContentDifferentUrl.id).not.toBe(first.id)
  })

  it('round-trips a bundle while preserving skill snapshots and attachment references', async () => {
    const source = await putSourceSnapshot(sourceData({ id: 'source-1' }))
    const { conversation } = await createConversation(
      { id: 'conversation-export', title: 'Export me' },
      {
        id: 'message-export-user',
        content: 'Summarize this source.',
        skillInvocation: {
          skillId: 'summarize',
          skillVersion: 1,
          instructionSnapshot: 'Summarize in bullets.',
        },
        attachmentRefs: [source.id],
      }
    )
    await finalizeAssistantMessage(conversation.id, {
      id: 'message-export-assistant',
      content: 'A summary.',
      providerId: 'gemini',
      modelId: 'gemini-3-flash-preview',
    })

    const bundle = await exportConversationBundle(conversation.id)
    const imported = await importConversationBundle(bundle)
    const importedMessages = await listMessagesByConversation(imported.conversationId)

    expect(imported.conversationId).not.toBe(conversation.id)
    expect(importedMessages[0]).toMatchObject({
      skillInvocation: bundle.messages[0].skillInvocation,
      attachmentRefs: [source.id],
    })
  })

  it('does not garbage-collect a source still referenced by another conversation', async () => {
    const source = await putSourceSnapshot(sourceData({ id: 'shared-source' }))
    const first = await createConversation(
      { id: 'conversation-a' },
      { content: 'Use shared source.', attachmentRefs: [source.id] }
    )
    await createConversation(
      { id: 'conversation-b' },
      { content: 'Also use shared source.', attachmentRefs: [source.id] }
    )

    await softDeleteConversation(first.conversation.id)
    await deleteMessagesByConversation(first.conversation.id)
    await expect(deleteUnreferencedSources()).resolves.toEqual([])
    await expect(getSourceById(source.id)).resolves.toMatchObject({ id: source.id })
  })

  it('backs up and restores all three chat stores together', async () => {
    const source = await putSourceSnapshot(sourceData({ id: 'backup-source' }))
    await createConversation(
      { id: 'backup-conversation' },
      { content: 'Backup this.', attachmentRefs: [source.id] }
    )
    const backup = await exportConversationBackup()

    await restoreConversationBackup({
      conversations: [],
      conversationMessages: [],
      conversationSources: [],
    })
    await expect(getConversation('backup-conversation')).resolves.toBeUndefined()

    await restoreConversationBackup(backup)
    await expect(getConversation('backup-conversation')).resolves.toMatchObject({ id: 'backup-conversation' })
    await expect(getSourceById('backup-source')).resolves.toMatchObject({ id: 'backup-source' })
  })

  it('merges a chat backup with conflicting IDs while preserving snapshot and skill references', async () => {
    const source = await putSourceSnapshot(sourceData({ id: 'conflicting-source' }))
    await createConversation({ id: 'conflicting-conversation', title: 'Existing' })

    const result = await importConversationBackup({
      schemaVersion: 1,
      conversations: [{ id: 'conflicting-conversation', title: 'Imported', createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z' }],
      conversationMessages: [{
        id: 'imported-message', conversationId: 'conflicting-conversation', sequence: 1,
        role: 'user', content: 'Use the imported source.', createdAt: '2026-07-10T00:00:00.000Z',
        skillInvocation: { skillId: 'summarize', skillVersion: 1, instructionSnapshot: 'Summarize.' },
        attachmentRefs: ['conflicting-source'],
      }],
      conversationSources: [{ ...source, id: 'conflicting-source' }],
    })

    const importedConversationId = result.conversationIdMap['conflicting-conversation']
    expect(importedConversationId).not.toBe('conflicting-conversation')
    await expect(listMessagesByConversation(importedConversationId)).resolves.toEqual([
      expect.objectContaining({
        conversationId: importedConversationId,
        attachmentRefs: [source.id],
        skillInvocation: expect.objectContaining({ instructionSnapshot: 'Summarize.' }),
      }),
    ])
  })

  it('accepts a legacy backup with no chat fields', async () => {
    await expect(importConversationBackup({})).resolves.toMatchObject({
      conversationIdMap: {},
      messageIdMap: {},
      sourceIdMap: {},
    })
  })

  it('adds chat records and a schema version to complete pre-import backups', async () => {
    const source = await putSourceSnapshot(sourceData({ id: 'integrity-source' }))
    await createConversation(
      { id: 'integrity-conversation' },
      { content: 'Include me in the complete backup.', attachmentRefs: [source.id] }
    )

    const backupId = await dataIntegrityService.createPreImportBackup('Chat backup test')
    const backup = await dataIntegrityService.getBackupById(backupId)

    expect(backup).toMatchObject({
      backupSchemaVersion: 2,
      data: {
        conversations: [expect.objectContaining({ id: 'integrity-conversation' })],
        conversationMessages: [expect.objectContaining({ conversationId: 'integrity-conversation' })],
        conversationSources: [expect.objectContaining({ id: 'integrity-source' })],
      },
    })
  })
})
