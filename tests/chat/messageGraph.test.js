import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  closeDatabase,
  DB_NAME,
  getDatabase,
} from '@/lib/db/indexedDBService.js'
import {
  addMessage,
  createConversation,
  finalizeAssistantMessage,
  getConversation,
  listMessagesByConversation,
  getAncestorPath,
  getGenerationPath,
  getGenerationContextForUser,
  getSiblings,
  activateBranch,
  findLatestDescendant,
  validateConversationBundle,
  validateConversationBackup,
} from '@/lib/db/conversationRepository.js'
import { assembleContext } from '@/lib/chat/contextPipeline/contextAssembler.js'

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

async function createVersionTenFixture() {
  const request = indexedDB.open(DB_NAME, 10)
  const database = await new Promise((resolve, reject) => {
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      db.createObjectStore('summaries', { keyPath: 'id' })
      db.createObjectStore('history', { keyPath: 'id' })
      db.createObjectStore('tags', { keyPath: 'id' })
      db.createObjectStore('data_backups', { keyPath: 'id' })

      const conversationStore = db.createObjectStore('conversations', { keyPath: 'id' })
      conversationStore.createIndex('updatedAt', 'updatedAt', { unique: false })
      conversationStore.createIndex('archived', 'archived', { unique: false })
      conversationStore.createIndex('deleted', 'deleted', { unique: false })

      const messageStore = db.createObjectStore('conversation_messages', { keyPath: 'id' })
      messageStore.createIndex('conversationId', 'conversationId', { unique: false })
      messageStore.createIndex('conversationId_sequence', ['conversationId', 'sequence'], { unique: true })
      messageStore.createIndex('createdAt', 'createdAt', { unique: false })

      const sourceStore = db.createObjectStore('conversation_sources', { keyPath: 'id' })
      sourceStore.createIndex('sourceKey', 'sourceKey', { unique: true })
      sourceStore.createIndex('normalizedUrl', 'normalizedUrl', { unique: false })
      sourceStore.createIndex('capturedAt', 'capturedAt', { unique: false })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })

  const transaction = database.transaction(['conversations', 'conversation_messages'], 'readwrite')
  
  transaction.objectStore('conversations').add({
    id: 'conv-1',
    title: 'Linear Conversation 1',
    createdAt: '2026-07-11T12:00:00.000Z',
    updatedAt: '2026-07-11T12:00:00.000Z',
    archived: false,
    tags: [],
    providerId: 'gemini',
    deleted: false,
  })
  
  transaction.objectStore('conversation_messages').add({
    id: 'msg-1-1',
    conversationId: 'conv-1',
    sequence: 1,
    role: 'user',
    content: 'Hello',
    createdAt: '2026-07-11T12:00:01.000Z',
  })
  transaction.objectStore('conversation_messages').add({
    id: 'msg-1-2',
    conversationId: 'conv-1',
    sequence: 2,
    role: 'assistant',
    content: 'Hi there',
    createdAt: '2026-07-11T12:00:02.000Z',
  })
  transaction.objectStore('conversation_messages').add({
    id: 'msg-1-3',
    conversationId: 'conv-1',
    sequence: 3,
    role: 'user',
    content: 'Tell me a joke',
    createdAt: '2026-07-11T12:00:03.000Z',
  })

  transaction.objectStore('conversations').add({
    id: 'conv-2',
    title: 'Linear Conversation 2',
    createdAt: '2026-07-11T12:05:00.000Z',
    updatedAt: '2026-07-11T12:05:00.000Z',
    archived: false,
    tags: [],
    providerId: 'openai',
    deleted: false,
  })

  transaction.objectStore('conversation_messages').add({
    id: 'msg-2-1',
    conversationId: 'conv-2',
    sequence: 1,
    role: 'user',
    content: 'What is Svelte?',
    createdAt: '2026-07-11T12:05:01.000Z',
  })

  await new Promise((resolve, reject) => {
    transaction.oncomplete = resolve
    transaction.onerror = () => reject(transaction.error)
  })
  database.close()
}

beforeEach(async () => {
  closeDatabase()
  await deleteDatabase()
})

afterEach(async () => {
  closeDatabase()
  await deleteDatabase()
})

describe('messageGraph database upgrade', () => {
  it('upgrades a version-10 database to version-11 in-place and links linear messages', async () => {
    await createVersionTenFixture()

    const database = await getDatabase()
    expect(database.version).toBe(12)

    const transaction = database.transaction(['conversations', 'conversation_messages'], 'readonly')
    const conversations = transaction.objectStore('conversations')
    const messages = transaction.objectStore('conversation_messages')

    const conv1 = await requestAsPromise(conversations.get('conv-1'))
    expect(conv1.activeLeafMessageId).toBe('msg-1-3')

    const conv2 = await requestAsPromise(conversations.get('conv-2'))
    expect(conv2.activeLeafMessageId).toBe('msg-2-1')

    const msg11 = await requestAsPromise(messages.get('msg-1-1'))
    expect(msg11.parentId).toBeNull()
    expect(msg11.parentKey).toBe('__root__')

    const msg12 = await requestAsPromise(messages.get('msg-1-2'))
    expect(msg12.parentId).toBe('msg-1-1')
    expect(msg12.parentKey).toBe('msg-1-1')

    const msg13 = await requestAsPromise(messages.get('msg-1-3'))
    expect(msg13.parentId).toBe('msg-1-2')
    expect(msg13.parentKey).toBe('msg-1-2')

    const msg21 = await requestAsPromise(messages.get('msg-2-1'))
    expect(msg21.parentId).toBeNull()
    expect(msg21.parentKey).toBe('__root__')

    // Verify index is functional
    const siblings = await requestAsPromise(messages.index('conversationId_parentKey').getAll(['conv-1', 'msg-1-1']))
    expect(siblings).toHaveLength(1)
    expect(siblings[0].id).toBe('msg-1-2')
  })
})

describe('messageGraph repository and graph operations', () => {
  it('correctly builds parent-child chains, paths, and branch context', async () => {
    const { conversation } = await createConversation({ id: 'c-1', title: 'Graph' })
    
    // User message 1
    const u1 = await addMessage(conversation.id, { id: 'u1', role: 'user', content: 'Turn 1' })
    // Assistant reply 1
    const a1 = await finalizeAssistantMessage(conversation.id, { id: 'a1', role: 'assistant', content: 'Reply 1' })
    // User message 2
    const u2 = await addMessage(conversation.id, { id: 'u2', role: 'user', content: 'Turn 2' })

    // Verify current generation path
    const path = await getGenerationPath(conversation.id)
    expect(path.map(m => m.id)).toEqual(['u1', 'a1', 'u2'])

    // Regenerate Turn 1 assistant reply (sibling to a1)
    // Parent should be u1
    const a1Sibling = await finalizeAssistantMessage(conversation.id, {
      id: 'a1-sibling',
      role: 'assistant',
      content: 'Alternative Reply 1',
      parentId: 'u1',
    })

    // Current active leaf should now point to a1-sibling
    const updatedConv = await getConversation(conversation.id)
    expect(updatedConv.activeLeafMessageId).toBe('a1-sibling')

    // New path should be u1 -> a1-sibling
    const path2 = await getGenerationPath(conversation.id)
    expect(path2.map(m => m.id)).toEqual(['u1', 'a1-sibling'])

    // Verify siblings
    const siblings = await getSiblings(conversation.id, 'u1')
    expect(siblings.map(m => m.id)).toEqual(['a1', 'a1-sibling'])

    // getGenerationContextForUser for u2 (retry/regenerate logic context)
    const context = await getGenerationContextForUser('u2')
    expect(context.currentUserMessage.id).toBe('u2')
    expect(context.history.map(m => m.id)).toEqual(['u1', 'a1']) // original path up to parent of u2
  })

  it('ancestor path cycle and consistency guards', async () => {
    const { conversation } = await createConversation({ id: 'c-2' })
    
    const m1 = await addMessage(conversation.id, { id: 'm1', role: 'user', content: 'Message 1' })
    const m2 = await finalizeAssistantMessage(conversation.id, { id: 'm2', role: 'assistant', content: 'Message 2' })

    // Manually force a cycle in IndexedDB for testing
    const database = await getDatabase()
    const transaction = database.transaction(['conversation_messages'], 'readwrite')
    const messageStore = transaction.objectStore('conversation_messages')
    
    const record1 = await requestAsPromise(messageStore.get('m1'))
    record1.parentId = 'm2' // Point m1 to m2 (cycle: m1 -> m2 -> m1)
    record1.parentKey = 'm2'
    await requestAsPromise(messageStore.put(record1))

    await expect(getAncestorPath('m2')).rejects.toThrow('Cycle detected')
    await expect(getGenerationPath('c-2')).rejects.toThrow('Cycle detected')
  })

  it('findLatestDescendant and activateBranch works correctly', async () => {
    const { conversation } = await createConversation({ id: 'c-3' })

    const u1 = await addMessage(conversation.id, { id: 'u-1', role: 'user', content: 'U1' })
    const a1 = await finalizeAssistantMessage(conversation.id, { id: 'a-1', role: 'assistant', content: 'A1' })
    
    // Create sibling branch (a1-alt)
    const a1Alt = await finalizeAssistantMessage(conversation.id, { id: 'a-1-alt', role: 'assistant', content: 'A1-Alt', parentId: 'u-1' })
    // Add follower on a1-alt
    const u2Alt = await addMessage(conversation.id, { id: 'u-2-alt', role: 'user', content: 'U2-Alt', parentId: 'a-1-alt' })

    // Find latest descendant from u-1
    const latest = await findLatestDescendant('u-1')
    // Sequences are: u-1 (1), a-1 (2), a-1-alt (3), u-2-alt (4)
    // From u-1, children are a-1 and a-1-alt. a-1-alt has sequence 3 (greater).
    // From a-1-alt, child is u-2-alt.
    // So latest should be u-2-alt.
    expect(latest).toBe('u-2-alt')

    // Activate the sibling branch (a-1)
    const leaf = await activateBranch('a-1')
    expect(leaf).toBe('a-1') // since a-1 has no children

    const conv = await getConversation(conversation.id)
    expect(conv.activeLeafMessageId).toBe('a-1')
  })
})

describe('messageGraph context assembler', () => {
  it('excludes empty or errored assistant messages from generation history', () => {
    const history = [
      { id: '1', role: 'user', content: 'Hello' },
      { id: '2', role: 'assistant', content: 'World', status: 'complete' },
      { id: '3', role: 'user', content: 'Repeat' },
      { id: '4', role: 'assistant', content: '', status: 'complete' }, // empty
      { id: '5', role: 'assistant', content: 'Error response', status: 'error' }, // errored
    ]
    const current = { id: '6', role: 'user', content: 'Go' }

    const result = assembleContext({
      conversation: { id: 'c-99' },
      history,
      currentUserMessage: current,
    })

    const roles = result.messages.map(m => m.role)
    const contents = result.messages.map(m => m.content)

    // Should only include 'Hello', 'World', 'Repeat' and current turn parts
    expect(roles).toEqual(['user', 'assistant', 'user', 'user'])
    expect(contents[0]).toBe('Hello')
    expect(contents[1]).toBe('World')
    expect(contents[2]).toBe('Repeat')
  })
})
