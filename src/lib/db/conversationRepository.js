import { generateUUID } from '../utils/utils.js'
import {
  CHAT_META_STORE_NAME,
  CONVERSATIONS_STORE_NAME,
  CONVERSATION_MESSAGES_STORE_NAME,
  CONVERSATION_SOURCES_STORE_NAME,
  getDatabase,
} from './indexedDBService.js'
import { conversationEffectiveTime, isStubSource } from './conversationSyncMerge.js'
import { stableContentHash } from '../utils/contentHash.js'

const CHAT_STORES = [
  CONVERSATIONS_STORE_NAME,
  CONVERSATION_MESSAGES_STORE_NAME,
  CONVERSATION_SOURCES_STORE_NAME,
]
const CHAT_REVISION_KEY = 'revision'
const CONVERSATION_BUNDLE_SCHEMA_VERSION = 2
export const CONVERSATION_BACKUP_SCHEMA_VERSION = 2
const VALID_MESSAGE_ROLES = new Set(['user', 'assistant'])

/** @param {IDBRequest} request */
function requestAsPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'))
  })
}

/** @param {IDBTransaction} transaction */
function transactionAsPromise(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB transaction failed'))
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB transaction aborted'))
  })
}

/**
 * Every readwrite transaction that actually writes also bumps the chat revision
 * counter, in the same transaction, so a write and its revision bump commit or
 * abort together. Cloud sync compares the counter to decide whether a chats sync
 * can be skipped. Readonly transactions, and readwrite ones that end up writing
 * nothing (e.g. recoverStreamingMessages with no streaming message), never
 * touch it.
 */
async function bumpChatRevision(store) {
  const current = await requestAsPromise(store.get(CHAT_REVISION_KEY))
  await requestAsPromise(store.put({ key: CHAT_REVISION_KEY, value: (current?.value || 0) + 1 }))
}

const WRITE_METHODS = ['put', 'add', 'delete', 'clear']

/**
 * Hands the callback object stores whose write methods flag `tracker.wrote`.
 * Methods are shadowed on the store instance (bound to the real one), so
 * indexes and reads behave exactly as before.
 */
function trackWrites(transaction, tracker) {
  const rawObjectStore = transaction.objectStore.bind(transaction)
  const wrapped = new Map()
  transaction.objectStore = (name) => {
    if (wrapped.has(name)) return wrapped.get(name)
    const store = rawObjectStore(name)
    for (const method of WRITE_METHODS) {
      const original = store[method].bind(store)
      store[method] = (...args) => {
        tracker.wrote = true
        return original(...args)
      }
    }
    wrapped.set(name, store)
    return store
  }
  return rawObjectStore
}

async function runTransaction(storeNames, mode, callback) {
  const database = await getDatabase()
  const names = mode === 'readwrite' ? [...storeNames, CHAT_META_STORE_NAME] : storeNames
  const transaction = database.transaction(names, mode)
  const transactionComplete = transactionAsPromise(transaction)
  const tracker = { wrote: false }
  const rawObjectStore = mode === 'readwrite' ? trackWrites(transaction, tracker) : null

  try {
    const result = await callback(transaction)
    if (tracker.wrote) await bumpChatRevision(rawObjectStore(CHAT_META_STORE_NAME))
    await transactionComplete
    return result
  } catch (error) {
    try {
      transaction.abort()
    } catch {
      // The transaction may already have completed or aborted.
    }
    await transactionComplete.catch(() => {})
    throw error
  }
}

/** @param {IDBObjectStore} messageStore @param {string} conversationId */
async function getNextSequence(messageStore, conversationId) {
  const messages = await requestAsPromise(
    messageStore.index('conversationId').getAll(conversationId)
  )
  return messages.reduce((max, message) => Math.max(max, message.sequence || 0), 0) + 1
}

function createConversationRecord(conversationData) {
  const now = new Date().toISOString()
  return {
    ...conversationData,
    id: conversationData.id || generateUUID(),
    title: conversationData.title || 'New conversation',
    createdAt: conversationData.createdAt || now,
    updatedAt: conversationData.updatedAt || now,
    archived: conversationData.archived || false,
    tags: conversationData.tags || [],
    personaSnapshot: conversationData.personaSnapshot || {
      content: '',
      type: conversationData.personaSnapshot?.type || 'preset',
      language: 'en',
      tone: null,
      version: 1,
    },
    providerId: conversationData.providerId || 'gemini',
    modelId: conversationData.modelId || null,
    deleted: conversationData.deleted || false,
    deletedAt: conversationData.deletedAt || null,
    activeLeafMessageId: conversationData.activeLeafMessageId || null,
  }
}

function createMessageRecord(conversationId, sequence, messageData) {
  const parentId = messageData.parentId !== undefined ? messageData.parentId : null
  const parentKey = messageData.parentKey !== undefined ? messageData.parentKey : (parentId ?? '__root__')
  return {
    ...messageData,
    id: messageData.id || generateUUID(),
    conversationId,
    sequence,
    createdAt: messageData.createdAt || new Date().toISOString(),
    status: messageData.status || 'complete',
    skillInvocation: messageData.skillInvocation || null,
    attachmentRefs: messageData.attachmentRefs || [],
    groundingRefs: messageData.groundingRefs || [],
    providerId: messageData.providerId || null,
    modelId: messageData.modelId || null,
    usage: messageData.usage || null,
    error: messageData.error || null,
    parentId,
    parentKey,
  }
}

export async function createConversation(conversationData, firstUserMessage = null) {
  return runTransaction(
    [CONVERSATIONS_STORE_NAME, CONVERSATION_MESSAGES_STORE_NAME],
    'readwrite',
    async (transaction) => {
      const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
      const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
      const conversation = createConversationRecord(conversationData)

      if (await requestAsPromise(conversationStore.get(conversation.id))) {
        throw new Error(`Conversation ${conversation.id} already exists`)
      }
      await requestAsPromise(conversationStore.add(conversation))

      if (!firstUserMessage) return { conversation, firstMessage: null }
      if (firstUserMessage.role && firstUserMessage.role !== 'user') {
        throw new Error('The first conversation message must have the user role')
      }

      const firstMessage = createMessageRecord(
        conversation.id,
        await getNextSequence(messageStore, conversation.id),
        { ...firstUserMessage, role: 'user' }
      )
      await requestAsPromise(messageStore.add(firstMessage))
      return { conversation, firstMessage }
    }
  )
}

export async function getConversation(id) {
  return runTransaction([CONVERSATIONS_STORE_NAME], 'readonly', async (transaction) =>
    requestAsPromise(transaction.objectStore(CONVERSATIONS_STORE_NAME).get(id))
  )
}

export async function listConversations({ includeArchived = true, includeDeleted = false } = {}) {
  return runTransaction([CONVERSATIONS_STORE_NAME], 'readonly', async (transaction) => {
    const conversations = await requestAsPromise(
      transaction.objectStore(CONVERSATIONS_STORE_NAME).getAll()
    )
    return conversations
      .filter((conversation) => includeDeleted || !conversation.deleted)
      .filter((conversation) => includeArchived || !conversation.archived)
      .sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)))
  })
}

export async function updateConversationMetadata(id, metadata) {
  return runTransaction([CONVERSATIONS_STORE_NAME], 'readwrite', async (transaction) => {
    const store = transaction.objectStore(CONVERSATIONS_STORE_NAME)
    const conversation = await requestAsPromise(store.get(id))
    if (!conversation) throw new Error(`Conversation ${id} was not found`)
    const updatedConversation = {
      ...conversation,
      ...metadata,
      id: conversation.id,
      updatedAt: new Date().toISOString(),
    }
    await requestAsPromise(store.put(updatedConversation))
    return updatedConversation
  })
}

export function archiveConversation(id, archived = true) {
  return updateConversationMetadata(id, { archived })
}

export function softDeleteConversation(id) {
  return updateConversationMetadata(id, {
    deleted: true,
    deletedAt: new Date().toISOString(),
  })
}

export async function addMessage(conversationId, messageData) {
  return runTransaction(
    [CONVERSATIONS_STORE_NAME, CONVERSATION_MESSAGES_STORE_NAME],
    'readwrite',
    async (transaction) => {
      const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
      const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
      const conversation = await requestAsPromise(conversationStore.get(conversationId))
      if (!conversation || conversation.deleted) {
        throw new Error(`Conversation ${conversationId} was not found`)
      }

      const parentId = messageData.parentId !== undefined ? messageData.parentId : conversation.activeLeafMessageId
      const message = createMessageRecord(
        conversationId,
        await getNextSequence(messageStore, conversationId),
        { ...messageData, parentId }
      )
      await requestAsPromise(messageStore.add(message))

      conversation.activeLeafMessageId = message.id
      conversation.updatedAt = new Date().toISOString()
      await requestAsPromise(conversationStore.put(conversation))
      return message
    }
  )
}

export async function finalizeAssistantMessage(conversationId, messageData) {
  const status = messageData.status || 'complete'
  const shouldPersist =
    status === 'complete' ||
    (status === 'aborted' && Boolean(messageData.content)) ||
    (status === 'error' && Boolean(messageData.error))

  if (!shouldPersist) return null
  if (messageData.role && messageData.role !== 'assistant') {
    throw new Error('finalizeAssistantMessage only accepts assistant messages')
  }

  return runTransaction(
    [CONVERSATIONS_STORE_NAME, CONVERSATION_MESSAGES_STORE_NAME],
    'readwrite',
    async (transaction) => {
      const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
      const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
      const conversation = await requestAsPromise(conversationStore.get(conversationId))
      if (!conversation || conversation.deleted) {
        throw new Error(`Conversation ${conversationId} was not found`)
      }

      const parentId = messageData.parentId !== undefined ? messageData.parentId : conversation.activeLeafMessageId
      const message = createMessageRecord(
        conversationId,
        await getNextSequence(messageStore, conversationId),
        { ...messageData, role: 'assistant', status, parentId }
      )
      await requestAsPromise(messageStore.add(message))

      conversation.activeLeafMessageId = message.id
      if (status === 'complete') {
        conversation.updatedAt = new Date().toISOString()
      }
      await requestAsPromise(conversationStore.put(conversation))
      return message
    }
  )
}

export async function listMessagesByConversation(conversationId) {
  return runTransaction([CONVERSATION_MESSAGES_STORE_NAME], 'readonly', async (transaction) => {
    const messages = await requestAsPromise(
      transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME).index('conversationId').getAll(conversationId)
    )
    return messages.sort((left, right) => left.sequence - right.sequence)
  })
}

export async function deleteMessagesByConversation(conversationId) {
  return runTransaction([CONVERSATION_MESSAGES_STORE_NAME], 'readwrite', async (transaction) => {
    const store = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const messages = await requestAsPromise(store.index('conversationId').getAll(conversationId))
    await Promise.all(messages.map((message) => requestAsPromise(store.delete(message.id))))
    return messages.length
  })
}

export async function putSourceSnapshot(sourceData) {
  const sourceKey = sourceData.sourceKey || `${sourceData.normalizedUrl}:${sourceData.contentHash}`
  if (!sourceData.normalizedUrl || !sourceData.contentHash) {
    throw new Error('Source snapshots require normalizedUrl and contentHash')
  }

  return runTransaction([CONVERSATION_SOURCES_STORE_NAME], 'readwrite', async (transaction) => {
    const store = transaction.objectStore(CONVERSATION_SOURCES_STORE_NAME)
    const existingSource = await requestAsPromise(store.index('sourceKey').get(sourceKey))
    if (existingSource) return existingSource

    const source = {
      ...sourceData,
      id: sourceData.id || generateUUID(),
      sourceKey,
      capturedAt: sourceData.capturedAt || new Date().toISOString(),
      tabIdHint: sourceData.tabIdHint ?? null,
    }
    await requestAsPromise(store.add(source))
    return source
  })
}

export async function getSourceById(id) {
  return runTransaction([CONVERSATION_SOURCES_STORE_NAME], 'readonly', async (transaction) =>
    requestAsPromise(transaction.objectStore(CONVERSATION_SOURCES_STORE_NAME).get(id))
  )
}

export async function getSourceByKey(sourceKey) {
  return runTransaction([CONVERSATION_SOURCES_STORE_NAME], 'readonly', async (transaction) =>
    requestAsPromise(transaction.objectStore(CONVERSATION_SOURCES_STORE_NAME).index('sourceKey').get(sourceKey))
  )
}

/**
 * Fill in the captured content of a stub source (synced metadata only) after
 * an on-demand re-capture. Keeps `id` and `sourceKey` unchanged, since the
 * sourceKey index is unique and conversations reference the source by id.
 *
 * The write is conditional inside its own transaction: it only happens while
 * the record is still a stub. A late or duplicate hydration therefore cannot
 * overwrite content that is already present.
 *
 * @param {string} id
 * @param {string} rawContent
 * @returns {Promise<object | null>} The hydrated record, or null when nothing was written.
 */
export async function hydrateSourceContent(id, rawContent) {
  const content = String(rawContent || '')
  if (!id || !content.trim()) return null

  return runTransaction([CONVERSATION_SOURCES_STORE_NAME], 'readwrite', async (transaction) => {
    const store = transaction.objectStore(CONVERSATION_SOURCES_STORE_NAME)
    const existing = await requestAsPromise(store.get(id))
    if (!existing || !isStubSource(existing)) return null

    const hydrated = {
      ...existing,
      rawContent: content,
      originalLength: content.length,
      contentHash: stableContentHash(content),
      hydratedAt: new Date().toISOString(),
      contentOmitted: false,
    }
    await requestAsPromise(store.put(hydrated))
    return hydrated
  })
}

export async function getSourcesByIds(ids) {
  return runTransaction([CONVERSATION_SOURCES_STORE_NAME], 'readonly', async (transaction) => {
    const store = transaction.objectStore(CONVERSATION_SOURCES_STORE_NAME)
    const sources = await Promise.all(ids.map((id) => requestAsPromise(store.get(id))))
    return sources.filter(Boolean)
  })
}

export async function deleteUnreferencedSources() {
  return runTransaction(
    [CONVERSATION_MESSAGES_STORE_NAME, CONVERSATION_SOURCES_STORE_NAME],
    'readwrite',
    async (transaction) => {
      const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
      const sourceStore = transaction.objectStore(CONVERSATION_SOURCES_STORE_NAME)
      const messages = await requestAsPromise(messageStore.getAll())
      const referencedSourceIds = new Set(
        messages.flatMap((message) => message.attachmentRefs || [])
      )
      const sources = await requestAsPromise(sourceStore.getAll())
      const unreferencedSources = sources.filter((source) => !referencedSourceIds.has(source.id))
      await Promise.all(unreferencedSources.map((source) => requestAsPromise(sourceStore.delete(source.id))))
      return unreferencedSources.map((source) => source.id)
    }
  )
}

export async function getAncestorPath(messageId, { includeSelf = false } = {}) {
  if (!messageId) return []
  return runTransaction([CONVERSATION_MESSAGES_STORE_NAME], 'readonly', async (transaction) => {
    const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const path = []
    const visited = new Set()
    let currentId = messageId

    while (currentId) {
      if (visited.has(currentId)) {
        throw new Error(`Cycle detected in ancestor path for message ${messageId}`)
      }
      visited.add(currentId)

      const message = await requestAsPromise(messageStore.get(currentId))
      if (!message) break

      if (path.length > 0 && message.conversationId !== path[0].conversationId) {
        throw new Error(`Mismatched conversationId in ancestor path for message ${messageId}`)
      }

      path.unshift(message)
      currentId = message.parentId
    }

    if (!includeSelf && path.length > 0) {
      path.pop()
    }
    return path
  })
}

export async function getGenerationPath(conversationId) {
  return runTransaction([CONVERSATIONS_STORE_NAME, CONVERSATION_MESSAGES_STORE_NAME], 'readonly', async (transaction) => {
    const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
    const conversation = await requestAsPromise(conversationStore.get(conversationId))
    if (!conversation || !conversation.activeLeafMessageId) return []

    const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const path = []
    const visited = new Set()
    let currentId = conversation.activeLeafMessageId

    while (currentId) {
      if (visited.has(currentId)) {
        throw new Error(`Cycle detected in generation path for conversation ${conversationId}`)
      }
      visited.add(currentId)

      const message = await requestAsPromise(messageStore.get(currentId))
      if (!message) break
      if (message.conversationId !== conversationId) {
        throw new Error(`Mismatched conversationId in generation path for conversation ${conversationId}`)
      }

      path.unshift(message)
      currentId = message.parentId
    }
    return path
  })
}

export async function getGenerationContextForUser(userMessageId) {
  return runTransaction([CONVERSATION_MESSAGES_STORE_NAME], 'readonly', async (transaction) => {
    const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const currentUserMessage = await requestAsPromise(messageStore.get(userMessageId))
    if (!currentUserMessage) {
      throw new Error(`User message ${userMessageId} was not found`)
    }

    const history = []
    if (currentUserMessage.parentId) {
      const visited = new Set()
      let currentId = currentUserMessage.parentId

      while (currentId) {
        if (visited.has(currentId)) {
          throw new Error(`Cycle detected in ancestor path for user message ${userMessageId}`)
        }
        visited.add(currentId)

        const message = await requestAsPromise(messageStore.get(currentId))
        if (!message) break
        if (message.conversationId !== currentUserMessage.conversationId) {
          throw new Error(`Mismatched conversationId in ancestor path for user message ${userMessageId}`)
        }

        history.unshift(message)
        currentId = message.parentId
      }
    }

    return {
      history,
      currentUserMessage,
    }
  })
}

export async function getSiblings(conversationId, parentKey) {
  return runTransaction([CONVERSATION_MESSAGES_STORE_NAME], 'readonly', async (transaction) => {
    const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const key = [conversationId, parentKey || '__root__']
    const messages = await requestAsPromise(
      messageStore.index('conversationId_parentKey').getAll(key)
    )
    return messages.sort((left, right) => left.sequence - right.sequence)
  })
}

export async function activateBranch(messageId) {
  return runTransaction([CONVERSATIONS_STORE_NAME, CONVERSATION_MESSAGES_STORE_NAME], 'readwrite', async (transaction) => {
    const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const message = await requestAsPromise(messageStore.get(messageId))
    if (!message) throw new Error(`Message ${messageId} was not found`)

    const activeLeafId = await findLatestDescendantInternal(messageStore, messageId)

    const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
    const conversation = await requestAsPromise(conversationStore.get(message.conversationId))
    if (!conversation) throw new Error(`Conversation ${message.conversationId} was not found`)

    conversation.activeLeafMessageId = activeLeafId
    conversation.updatedAt = new Date().toISOString()
    await requestAsPromise(conversationStore.put(conversation))
    return activeLeafId
  })
}

export async function findLatestDescendant(messageId) {
  return runTransaction([CONVERSATION_MESSAGES_STORE_NAME], 'readonly', async (transaction) => {
    const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    return findLatestDescendantInternal(messageStore, messageId)
  })
}

async function findLatestDescendantInternal(messageStore, messageId) {
  const visited = new Set()
  let currentId = messageId
  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error(`Cycle detected while descending from message ${messageId}`)
    }
    visited.add(currentId)

    const msg = await requestAsPromise(messageStore.get(currentId))
    if (!msg) break
    const childrenKey = [msg.conversationId, currentId]
    const children = await requestAsPromise(
      messageStore.index('conversationId_parentKey').getAll(childrenKey)
    )
    if (children.length === 0) {
      break
    }
    children.sort((left, right) => right.sequence - left.sequence)
    currentId = children[0].id
  }
  return currentId
}

function backfillBackupData(conversations, messages) {
  const messagesByConversation = new Map()
  for (const message of messages) {
    if (!messagesByConversation.has(message.conversationId)) {
      messagesByConversation.set(message.conversationId, [])
    }
    messagesByConversation.get(message.conversationId).push(message)
  }

  const conversationMap = new Map(conversations.map(c => [c.id, c]))

  for (const [conversationId, msgs] of messagesByConversation.entries()) {
    msgs.sort((left, right) => left.sequence - right.sequence)
    let previousMessageId = null
    for (const msg of msgs) {
      if (msg.parentId === undefined || msg.parentId === null) {
        msg.parentId = previousMessageId
      }
      if (msg.parentKey === undefined || msg.parentKey === null) {
        msg.parentKey = msg.parentId ?? '__root__'
      }
      previousMessageId = msg.id
    }
    const conversation = conversationMap.get(conversationId)
    if (conversation && (conversation.activeLeafMessageId === undefined || conversation.activeLeafMessageId === null)) {
      conversation.activeLeafMessageId = previousMessageId
    }
  }
}

function validateConversationBundle(bundle) {
  if (!bundle?.conversation?.id || !Array.isArray(bundle.messages) || !Array.isArray(bundle.sources)) {
    throw new Error('Invalid conversation bundle')
  }
  if (bundle.schemaVersion && bundle.schemaVersion > CONVERSATION_BUNDLE_SCHEMA_VERSION) {
    throw new Error(`Conversation bundle schema ${bundle.schemaVersion} is not supported`)
  }

  const sourceIds = new Set()
  const sourceKeys = new Set()
  for (const source of bundle.sources) {
    if (!source.id || !source.sourceKey || sourceIds.has(source.id) || sourceKeys.has(source.sourceKey)) {
      throw new Error('Conversation bundle has invalid source records')
    }
    sourceIds.add(source.id)
    sourceKeys.add(source.sourceKey)
  }
  const messageIds = new Set()
  const sequences = new Set()
  for (const message of bundle.messages) {
    if (
      !message.id ||
      messageIds.has(message.id) ||
      message.conversationId !== bundle.conversation.id ||
      !VALID_MESSAGE_ROLES.has(message.role) ||
      !Number.isInteger(message.sequence) ||
      message.sequence < 1
    ) {
      throw new Error('Conversation bundle has invalid message foreign keys')
    }
    messageIds.add(message.id)
    const sequenceKey = `${message.conversationId}:${message.sequence}`
    if (sequences.has(sequenceKey)) {
      throw new Error('Conversation bundle has duplicate message sequences')
    }
    sequences.add(sequenceKey)
    for (const sourceId of message.attachmentRefs || []) {
      if (!sourceIds.has(sourceId)) {
        throw new Error(`Conversation bundle references missing source ${sourceId}`)
      }
    }
  }

  if ((bundle.schemaVersion === 2 || bundle.messages.some(m => m.parentId !== undefined)) && bundle.messages.length > 0) {
    const messageMap = new Map(bundle.messages.map((m) => [m.id, m]))
    for (const message of bundle.messages) {
      if (message.parentId !== undefined && message.parentId !== null) {
        const parent = messageMap.get(message.parentId)
        if (!parent) {
          throw new Error(`Message parentId references missing message: ${message.parentId}`)
        }
        if (parent.conversationId !== message.conversationId) {
          throw new Error(`Parent message has mismatched conversation ID`)
        }
        
        const visited = new Set()
        let currentParentId = message.parentId
        while (currentParentId) {
          if (visited.has(currentParentId)) {
            throw new Error('Cycle detected in message parents')
          }
          visited.add(currentParentId)
          const parentMsg = messageMap.get(currentParentId)
          currentParentId = parentMsg ? parentMsg.parentId : null
        }
      }
    }
  }
}

export async function exportConversationBundle(conversationId) {
  const conversation = await getConversation(conversationId)
  if (!conversation) throw new Error(`Conversation ${conversationId} was not found`)
  const messages = await listMessagesByConversation(conversationId)
  const sourceIds = [...new Set(messages.flatMap((message) => message.attachmentRefs || []))]
  const sources = await getSourcesByIds(sourceIds)

  return {
    schemaVersion: CONVERSATION_BUNDLE_SCHEMA_VERSION,
    conversation,
    messages,
    sources,
  }
}

export async function importConversationBundle(bundle) {
  validateConversationBundle(bundle)

  return runTransaction(CHAT_STORES, 'readwrite', async (transaction) => {
    const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
    const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const sourceStore = transaction.objectStore(CONVERSATION_SOURCES_STORE_NAME)
    const sourceIdMap = new Map()

    for (const source of bundle.sources) {
      const existingByKey = await requestAsPromise(sourceStore.index('sourceKey').get(source.sourceKey))
      if (existingByKey) {
        sourceIdMap.set(source.id, existingByKey.id)
        continue
      }

      const sourceId = (await requestAsPromise(sourceStore.get(source.id))) ? generateUUID() : source.id
      const importedSource = { ...source, id: sourceId }
      await requestAsPromise(sourceStore.add(importedSource))
      sourceIdMap.set(source.id, sourceId)
    }

    const conversationId = (await requestAsPromise(conversationStore.get(bundle.conversation.id)))
      ? generateUUID()
      : bundle.conversation.id

    const isV1 = !bundle.schemaVersion || bundle.schemaVersion < 2
    const messageIdMap = new Map()
    let prevMessageImportedId = null

    const sortedMessages = [...bundle.messages].sort((left, right) => left.sequence - right.sequence)
    for (const message of sortedMessages) {
      const messageId = (await requestAsPromise(messageStore.get(message.id))) ? generateUUID() : message.id
      messageIdMap.set(message.id, messageId)

      let parentId = null
      if (isV1) {
        parentId = prevMessageImportedId
      } else {
        parentId = message.parentId ? messageIdMap.get(message.parentId) : null
      }

      const importedMessage = {
        ...message,
        id: messageId,
        conversationId,
        attachmentRefs: (message.attachmentRefs || []).map((sourceId) => sourceIdMap.get(sourceId)),
        parentId,
        parentKey: parentId ?? '__root__',
      }
      await requestAsPromise(messageStore.add(importedMessage))
      prevMessageImportedId = messageId
    }

    const activeLeafId = isV1
      ? prevMessageImportedId
      : (bundle.conversation.activeLeafMessageId ? messageIdMap.get(bundle.conversation.activeLeafMessageId) : null)

    const importedConversation = {
      ...bundle.conversation,
      id: conversationId,
      activeLeafMessageId: activeLeafId,
    }
    await requestAsPromise(conversationStore.add(importedConversation))

    return {
      conversationId,
      messageIdMap: Object.fromEntries(messageIdMap),
      sourceIdMap: Object.fromEntries(sourceIdMap),
    }
  })
}

export function validateConversationBackup(backup) {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Invalid conversation backup')
  }
  if (backup.schemaVersion && backup.schemaVersion > CONVERSATION_BACKUP_SCHEMA_VERSION) {
    throw new Error(`Conversation backup schema ${backup.schemaVersion} is not supported`)
  }
  const conversations = backup?.conversations || []
  const messages = backup?.conversationMessages || []
  const sources = backup?.conversationSources || []
  if (!Array.isArray(conversations) || !Array.isArray(messages) || !Array.isArray(sources)) {
    throw new Error('Conversation backup chat fields must be arrays')
  }
  const conversationIds = new Set(conversations.map((conversation) => conversation?.id))
  const sourceIds = new Set(sources.map((source) => source?.id))
  const sourceKeys = new Set()
  const messageIds = new Set()
  const sequences = new Set()

  if (conversationIds.size !== conversations.length || conversations.some((conversation) => !conversation?.id)) {
    throw new Error('Conversation backup has duplicate or missing conversation IDs')
  }
  for (const source of sources) {
    if (!source?.id || !source.sourceKey || sourceIds.size !== sources.length || sourceKeys.has(source.sourceKey)) {
      throw new Error('Conversation backup has invalid source records')
    }
    sourceKeys.add(source.sourceKey)
  }

  for (const message of messages) {
    if (
      !message?.id ||
      messageIds.has(message.id) ||
      !VALID_MESSAGE_ROLES.has(message.role) ||
      !Number.isInteger(message.sequence) ||
      message.sequence < 1 ||
      !conversationIds.has(message.conversationId)
    ) {
      throw new Error(`Conversation backup references missing conversation ${message.conversationId}`)
    }
    messageIds.add(message.id)
    const sequenceKey = `${message.conversationId}:${message.sequence}`
    if (sequences.has(sequenceKey)) throw new Error('Conversation backup has duplicate message sequences')
    sequences.add(sequenceKey)
    for (const sourceId of message.attachmentRefs || []) {
      if (!sourceIds.has(sourceId)) {
        throw new Error(`Conversation backup references missing source ${sourceId}`)
      }
    }
  }

  if ((backup.schemaVersion === 2 || messages.some(m => m.parentId !== undefined)) && messages.length > 0) {
    const messageMap = new Map(messages.map((m) => [m.id, m]))
    for (const message of messages) {
      if (message.parentId !== undefined && message.parentId !== null) {
        const parent = messageMap.get(message.parentId)
        if (!parent) {
          throw new Error(`Message parentId references missing message: ${message.parentId}`)
        }
        if (parent.conversationId !== message.conversationId) {
          throw new Error(`Parent message has mismatched conversation ID`)
        }
        
        const visited = new Set()
        let currentParentId = message.parentId
        while (currentParentId) {
          if (visited.has(currentParentId)) {
            throw new Error('Cycle detected in message parents')
          }
          visited.add(currentParentId)
          const parentMsg = messageMap.get(currentParentId)
          currentParentId = parentMsg ? parentMsg.parentId : null
        }
      }
    }
  }
}

/**
 * Snapshot of all chat stores. `revision` is read in the same readonly
 * transaction, so it describes exactly the data returned.
 */
export async function exportConversationSnapshot() {
  return runTransaction([...CHAT_STORES, CHAT_META_STORE_NAME], 'readonly', async (transaction) => {
    const conversations = await requestAsPromise(transaction.objectStore(CONVERSATIONS_STORE_NAME).getAll())
    const conversationMessages = await requestAsPromise(transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME).getAll())
    const conversationSources = await requestAsPromise(transaction.objectStore(CONVERSATION_SOURCES_STORE_NAME).getAll())
    const revisionRecord = await requestAsPromise(transaction.objectStore(CHAT_META_STORE_NAME).get(CHAT_REVISION_KEY))
    return {
      schemaVersion: CONVERSATION_BACKUP_SCHEMA_VERSION,
      conversations,
      conversationMessages,
      conversationSources,
      revision: revisionRecord?.value || 0,
    }
  })
}

/** User-facing backup: the snapshot minus the internal sync revision. */
export async function exportConversationBackup() {
  const { revision: _revision, ...backup } = await exportConversationSnapshot()
  return backup
}

/** Current chat revision: changes on every chat transaction that writes. */
export async function getChatRevision() {
  return runTransaction([CHAT_META_STORE_NAME], 'readonly', async (transaction) => {
    const record = await requestAsPromise(transaction.objectStore(CHAT_META_STORE_NAME).get(CHAT_REVISION_KEY))
    return record?.value || 0
  })
}

export async function restoreConversationBackup(backup) {
  validateConversationBackup(backup)
  return runTransaction(CHAT_STORES, 'readwrite', async (transaction) => {
    const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
    const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const sourceStore = transaction.objectStore(CONVERSATION_SOURCES_STORE_NAME)
    await Promise.all([
      requestAsPromise(conversationStore.clear()),
      requestAsPromise(messageStore.clear()),
      requestAsPromise(sourceStore.clear()),
    ])
    for (const source of backup.conversationSources || []) {
      await requestAsPromise(sourceStore.add(source))
    }
    for (const conversation of backup.conversations || []) {
      await requestAsPromise(conversationStore.add(conversation))
    }
    for (const message of backup.conversationMessages || []) {
      await requestAsPromise(messageStore.add(message))
    }
    return true
  })
}

export async function importConversationBackup(backup, { mode = 'merge' } = {}) {
  const normalizedBackup = {
    schemaVersion: backup?.schemaVersion || 1,
    conversations: backup?.conversations || [],
    conversationMessages: backup?.conversationMessages || [],
    conversationSources: backup?.conversationSources || [],
  }
  validateConversationBackup(normalizedBackup)

  const isV1 = normalizedBackup.schemaVersion < 2
  if (isV1) {
    backfillBackupData(normalizedBackup.conversations, normalizedBackup.conversationMessages)
  }

  if (mode === 'replace') return restoreConversationBackup(normalizedBackup)
  if (mode !== 'merge') throw new Error(`Unsupported conversation import mode: ${mode}`)

  return runTransaction(CHAT_STORES, 'readwrite', async (transaction) => {
    const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
    const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const sourceStore = transaction.objectStore(CONVERSATION_SOURCES_STORE_NAME)
    const sourceIdMap = new Map()
    const conversationIdMap = new Map()
    const messageIdMap = new Map()

    for (const source of normalizedBackup.conversationSources) {
      const existingByKey = await requestAsPromise(sourceStore.index('sourceKey').get(source.sourceKey))
      const sourceId = existingByKey
        ? existingByKey.id
        : (await requestAsPromise(sourceStore.get(source.id))) ? generateUUID() : source.id
      if (!existingByKey) await requestAsPromise(sourceStore.add({ ...source, id: sourceId }))
      sourceIdMap.set(source.id, sourceId)
    }

    for (const conversation of normalizedBackup.conversations) {
      const conversationId = (await requestAsPromise(conversationStore.get(conversation.id)))
        ? generateUUID()
        : conversation.id
      conversationIdMap.set(conversation.id, conversationId)
    }

    const sortedMessages = [...normalizedBackup.conversationMessages].sort((left, right) => left.sequence - right.sequence)
    for (const message of sortedMessages) {
      const messageId = (await requestAsPromise(messageStore.get(message.id)))
        ? generateUUID()
        : message.id
      messageIdMap.set(message.id, messageId)

      const parentId = message.parentId ? messageIdMap.get(message.parentId) : null
      await requestAsPromise(messageStore.add({
        ...message,
        id: messageId,
        conversationId: conversationIdMap.get(message.conversationId),
        attachmentRefs: (message.attachmentRefs || []).map((sourceId) => sourceIdMap.get(sourceId)),
        parentId,
        parentKey: parentId ?? '__root__',
      }))
    }

    for (const conversation of normalizedBackup.conversations) {
      const conversationId = conversationIdMap.get(conversation.id)
      const activeLeafMessageId = conversation.activeLeafMessageId
        ? messageIdMap.get(conversation.activeLeafMessageId)
        : null
      await requestAsPromise(conversationStore.add({
        ...conversation,
        id: conversationId,
        activeLeafMessageId,
      }))
    }

    return {
      conversationIdMap: Object.fromEntries(conversationIdMap),
      messageIdMap: Object.fromEntries(messageIdMap),
      sourceIdMap: Object.fromEntries(sourceIdMap),
    }
  })
}

export async function getMessage(messageId) {
  return runTransaction([CONVERSATION_MESSAGES_STORE_NAME], 'readonly', async (transaction) =>
    requestAsPromise(transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME).get(messageId))
  )
}

export async function updateMessageContent(messageId, content) {
  return runTransaction([CONVERSATION_MESSAGES_STORE_NAME], 'readwrite', async (transaction) => {
    const store = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const message = await requestAsPromise(store.get(messageId))
    if (!message) throw new Error(`Message ${messageId} was not found`)
    message.content = content
    message.updatedAt = new Date().toISOString()
    await requestAsPromise(store.put(message))
    return message
  })
}

/**
 * Flip an existing terminal message back to 'streaming' so it can be
 * checkpointed and recovered while a "continue" generation appends to it.
 */
export async function markMessageStreaming(messageId) {
  return runTransaction([CONVERSATION_MESSAGES_STORE_NAME], 'readwrite', async (transaction) => {
    const store = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const message = await requestAsPromise(store.get(messageId))
    if (!message) throw new Error(`Message ${messageId} was not found`)
    message.status = 'streaming'
    message.updatedAt = new Date().toISOString()
    await requestAsPromise(store.put(message))
    return message
  })
}

export async function deleteSubtree(messageId) {
  return runTransaction(
    [CONVERSATIONS_STORE_NAME, CONVERSATION_MESSAGES_STORE_NAME],
    'readwrite',
    async (transaction) => {
      const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
      const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)

      const root = await requestAsPromise(messageStore.get(messageId))
      if (!root) throw new Error(`Message ${messageId} was not found`)

      // Collect all descendants via BFS within the transaction
      const toDelete = [root]
      const queue = [messageId]
      while (queue.length > 0) {
        const parentId = queue.shift()
        const childKey = [root.conversationId, parentId]
        const children = await requestAsPromise(
          messageStore.index('conversationId_parentKey').getAll(childKey)
        )
        for (const child of children) {
          toDelete.push(child)
          queue.push(child.id)
        }
      }

      const deletedIds = new Set(toDelete.map((m) => m.id))

      // Delete all collected messages
      for (const msg of toDelete) {
        await requestAsPromise(messageStore.delete(msg.id))
      }

      // Re-point activeLeafMessageId
      const conversation = await requestAsPromise(conversationStore.get(root.conversationId))
      if (conversation) {
        if (deletedIds.has(conversation.activeLeafMessageId)) {
          // Walk up to the deleted root's parent and find its latest descendant
          const newAnchor = root.parentId
          if (newAnchor) {
            // Find latest descendant of the parent that is still alive
            const visited = new Set()
            let currentId = newAnchor
            while (currentId) {
              if (visited.has(currentId)) {
                throw new Error(`Cycle detected while re-pointing active leaf for message ${messageId}`)
              }
              visited.add(currentId)
              const msg = await requestAsPromise(messageStore.get(currentId))
              if (!msg) break
              const childKey = [root.conversationId, currentId]
              const children = await requestAsPromise(
                messageStore.index('conversationId_parentKey').getAll(childKey)
              )
              const alive = children.filter((c) => !deletedIds.has(c.id))
              if (alive.length === 0) break
              alive.sort((a, b) => b.sequence - a.sequence)
              currentId = alive[0].id
            }
            conversation.activeLeafMessageId = currentId
          } else {
            conversation.activeLeafMessageId = null
          }
          conversation.updatedAt = new Date().toISOString()
          await requestAsPromise(conversationStore.put(conversation))
        }
      }

      return { deletedCount: toDelete.length, deletedIds: [...deletedIds] }
    }
  )
}

/**
 * Write the result of a cloud-sync merge (`mergeChatData`). Each upsert
 * replaces the conversation and its whole message set. A conversation that
 * changed locally after the merge snapshot was taken — or is streaming — is
 * skipped; the next sync reconciles it.
 */
export async function applyConversationSyncChanges({ upserts = [], purgeIds = [], sources = [] } = {}) {
  return runTransaction(CHAT_STORES, 'readwrite', async (transaction) => {
    const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
    const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const sourceStore = transaction.objectStore(CONVERSATION_SOURCES_STORE_NAME)

    // Sources from the cloud are stubs (no rawContent). An existing id is
    // skipped below, so a local full source is never downgraded to a stub.
    // Two devices capturing the same page mint different ids for one sourceKey;
    // keep the local record and point incoming messages at it.
    const sourceIdMap = new Map()
    for (const source of sources) {
      if (await requestAsPromise(sourceStore.get(source.id))) continue
      const existingByKey = await requestAsPromise(sourceStore.index('sourceKey').get(source.sourceKey))
      if (existingByKey) {
        sourceIdMap.set(source.id, existingByKey.id)
        continue
      }
      await requestAsPromise(sourceStore.add(source))
    }

    const removeMessages = async (conversationId) => {
      const messages = await requestAsPromise(messageStore.index('conversationId').getAll(conversationId))
      for (const message of messages) await requestAsPromise(messageStore.delete(message.id))
      return messages
    }

    let applied = 0
    let skipped = 0
    for (const { conversation, messages = [], updatedAt } of upserts) {
      const current = await requestAsPromise(conversationStore.get(conversation.id))
      if (current) {
        const currentMessages = await requestAsPromise(
          messageStore.index('conversationId').getAll(conversation.id)
        )
        if (
          currentMessages.some((message) => message.status === 'streaming') ||
          conversationEffectiveTime(current, currentMessages) > new Date(updatedAt || 0).getTime()
        ) {
          // Left alone: changed locally after the snapshot, or still streaming.
          skipped++
          continue
        }
      }
      await removeMessages(conversation.id)
      await requestAsPromise(conversationStore.put(conversation))
      for (const message of messages) {
        await requestAsPromise(messageStore.put({
          ...message,
          attachmentRefs: (message.attachmentRefs || []).map((id) => sourceIdMap.get(id) || id),
        }))
      }
      applied++
    }

    for (const id of purgeIds) {
      await removeMessages(id)
      await requestAsPromise(conversationStore.delete(id))
    }

    return { applied, purged: purgeIds.length, skipped }
  })
}

/**
 * Pre-persist an assistant message with status 'streaming' before generation
 * starts. This makes the message durable so recovery-on-open can detect it
 * if the panel closes or crashes mid-stream.
 */
export async function createStreamingAssistantMessage(conversationId, messageData) {
  return runTransaction(
    [CONVERSATIONS_STORE_NAME, CONVERSATION_MESSAGES_STORE_NAME],
    'readwrite',
    async (transaction) => {
      const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
      const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
      const conversation = await requestAsPromise(conversationStore.get(conversationId))
      if (!conversation || conversation.deleted) {
        throw new Error(`Conversation ${conversationId} was not found`)
      }

      const parentId = messageData.parentId !== undefined ? messageData.parentId : conversation.activeLeafMessageId
      const message = createMessageRecord(
        conversationId,
        await getNextSequence(messageStore, conversationId),
        { ...messageData, role: 'assistant', status: 'streaming', parentId }
      )
      await requestAsPromise(messageStore.add(message))

      conversation.activeLeafMessageId = message.id
      conversation.updatedAt = new Date().toISOString()
      await requestAsPromise(conversationStore.put(conversation))
      return message
    }
  )
}

/**
 * Checkpoint the content of a streaming assistant message. Called on a throttle
 * (~500 ms) during generation so partial content survives panel close/crash.
 */
export async function checkpointStreamingContent(messageId, content) {
  return runTransaction([CONVERSATION_MESSAGES_STORE_NAME], 'readwrite', async (transaction) => {
    const store = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const message = await requestAsPromise(store.get(messageId))
    if (!message) return null
    // Only checkpoint if the message is still in streaming state
    if (message.status !== 'streaming') return message
    message.content = content
    message.updatedAt = new Date().toISOString()
    await requestAsPromise(store.put(message))
    return message
  })
}

/**
 * Recovery-on-open: find all messages in a conversation still marked
 * 'streaming' and flip them to 'interrupted'. This is the **source of truth**
 * for durable streaming — close hooks are best-effort only.
 */
export async function recoverStreamingMessages(conversationId) {
  return runTransaction([CONVERSATION_MESSAGES_STORE_NAME], 'readwrite', async (transaction) => {
    const store = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
    const messages = await requestAsPromise(
      store.index('conversationId').getAll(conversationId)
    )
    const recovered = []
    for (const message of messages) {
      if (message.status === 'streaming') {
        message.status = 'interrupted'
        message.updatedAt = new Date().toISOString()
        await requestAsPromise(store.put(message))
        recovered.push(message)
      }
    }
    return recovered
  })
}

/**
 * Finalize a pre-persisted streaming assistant message. Updates the existing
 * record's status, content, and metadata in place rather than creating a new
 * record (which is what finalizeAssistantMessage does for the non-durable path).
 */
export async function finalizeStreamingAssistantMessage(messageId, updates) {
  return runTransaction(
    [CONVERSATIONS_STORE_NAME, CONVERSATION_MESSAGES_STORE_NAME],
    'readwrite',
    async (transaction) => {
      const messageStore = transaction.objectStore(CONVERSATION_MESSAGES_STORE_NAME)
      const message = await requestAsPromise(messageStore.get(messageId))
      if (!message) throw new Error(`Streaming message ${messageId} was not found`)

      const status = updates.status || 'complete'
      message.content = updates.content ?? message.content
      message.status = status
      message.providerId = updates.providerId ?? message.providerId
      message.modelId = updates.modelId ?? message.modelId
      message.usage = updates.usage ?? message.usage
      message.error = updates.error ?? message.error
      message.groundingRefs = updates.groundingRefs ?? message.groundingRefs
      message.updatedAt = new Date().toISOString()
      await requestAsPromise(messageStore.put(message))

      // Update conversation timestamp on success
      if (status === 'complete') {
        const conversationStore = transaction.objectStore(CONVERSATIONS_STORE_NAME)
        const conversation = await requestAsPromise(conversationStore.get(message.conversationId))
        if (conversation) {
          conversation.updatedAt = new Date().toISOString()
          await requestAsPromise(conversationStore.put(conversation))
        }
      }

      return message
    }
  )
}

export const conversationRepository = {
  createConversation,
  getConversation,
  listConversations,
  updateConversationMetadata,
  archiveConversation,
  softDeleteConversation,
  addMessage,
  finalizeAssistantMessage,
  listMessagesByConversation,
  deleteMessagesByConversation,
  getMessage,
  updateMessageContent,
  markMessageStreaming,
  deleteSubtree,
  putSourceSnapshot,
  getSourceById,
  getSourceByKey,
  getSourcesByIds,
  hydrateSourceContent,
  deleteUnreferencedSources,
  exportConversationBundle,
  importConversationBundle,
  exportConversationBackup,
  exportConversationSnapshot,
  getChatRevision,
  importConversationBackup,
  applyConversationSyncChanges,
  getAncestorPath,
  getGenerationPath,
  getGenerationContextForUser,
  getSiblings,
  activateBranch,
  findLatestDescendant,
  createStreamingAssistantMessage,
  checkpointStreamingContent,
  recoverStreamingMessages,
  finalizeStreamingAssistantMessage,
}
