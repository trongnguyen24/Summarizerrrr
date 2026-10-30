/**
 * Cloud sync merge for chat conversations — pure, no IndexedDB, no network.
 *
 * The unit of sync is a whole conversation: its record plus every message
 * (all branches). Conflicts resolve Last Write Wins on the conversation's
 * *effective* timestamp — the newest of the record's own timestamps and every
 * message's `updatedAt`/`createdAt` — because several writes (checkpoints,
 * branch edits) touch a message without bumping the conversation.
 *
 * Messages can't merge individually: `sequence` is unique per conversation
 * and `parentId` links form a tree, so splicing two devices' turns together
 * would collide. LWW per conversation keeps every tree valid.
 *
 * Sources (captured page snapshots) are shared across conversations and keyed
 * by `sourceKey`, so they travel as their own map and are garbage-collected to
 * what live conversations still reference.
 */

function timeOf(value) {
  const time = new Date(value || 0).getTime()
  return Number.isFinite(time) ? time : 0
}

export function conversationEffectiveTime(conversation, messages = []) {
  let latest = Math.max(
    timeOf(conversation?.updatedAt),
    timeOf(conversation?.deletedAt),
    timeOf(conversation?.createdAt)
  )
  for (const message of messages) {
    latest = Math.max(latest, timeOf(message.updatedAt), timeOf(message.createdAt))
  }
  return latest
}

/**
 * Turn a raw chat snapshot (the shape of `exportConversationBackup()`) into
 * sync items. A conversation with a message still `streaming` is mid-write on
 * this device: it is left out (pending) so a half-finished answer is neither
 * pushed nor overwritten; the next sync after it finalizes picks it up.
 */
export function buildLocalChatItems({
  conversations = [],
  conversationMessages = [],
  conversationSources = [],
} = {}) {
  const messagesByConversation = new Map()
  for (const message of conversationMessages) {
    if (!messagesByConversation.has(message.conversationId)) {
      messagesByConversation.set(message.conversationId, [])
    }
    messagesByConversation.get(message.conversationId).push(message)
  }

  const items = {}
  const pendingIds = new Set()
  for (const conversation of conversations) {
    if (!conversation?.id) continue
    const messages = conversation.deleted
      ? []
      : (messagesByConversation.get(conversation.id) || []).sort((a, b) => a.sequence - b.sequence)
    if (messages.some((message) => message.status === 'streaming')) {
      pendingIds.add(conversation.id)
      continue
    }
    items[conversation.id] = {
      id: conversation.id,
      updatedAt: new Date(conversationEffectiveTime(conversation, messages)).toISOString(),
      deleted: !!conversation.deleted,
      conversation,
      messages,
    }
  }

  const sources = {}
  for (const source of conversationSources) {
    if (source?.id) sources[source.id] = source
  }

  return { items, sources, pendingIds }
}

/**
 * Metadata-only form of a source for the cloud file. `rawContent` and
 * `condensedContent` are never synced; a stub keeps its `id` and `sourceKey`
 * so references and dedupe keep working, and content is re-captured on demand.
 */
export function toStubSource(source) {
  const stub = {
    id: source.id,
    sourceKey: source.sourceKey,
    normalizedUrl: source.normalizedUrl,
    url: source.url,
    title: source.title,
    sourceType: source.sourceType,
    contentHash: source.contentHash,
    originalLength: source.originalLength,
    capturedAt: source.capturedAt,
    contentOmitted: true,
  }
  for (const key of ['commentLimit', 'replyLimit', 'fetchedCount']) {
    if (source[key] !== undefined) stub[key] = source[key]
  }
  return stub
}

export function isStubSource(source) {
  return source?.contentOmitted === true && !source.rawContent && !source.condensedContent
}

function referencedSourceIds(items) {
  const ids = new Set()
  for (const item of Object.values(items)) {
    if (item.deleted) continue
    for (const message of item.messages || []) {
      for (const sourceId of message.attachmentRefs || []) ids.add(sourceId)
    }
  }
  return ids
}

/**
 * @param {object} args
 * @param {Record<string, any>} args.cloudItems   conversation items from the cloud file
 * @param {Record<string, any>} args.cloudSources source records from the cloud file
 * @param {ReturnType<typeof buildLocalChatItems>} args.local
 * @param {number} args.tombstoneTtlMs  deleted conversations older than this are purged everywhere
 * @param {number} [args.now]
 */
export function mergeChatData({ cloudItems = {}, cloudSources = {}, local, tombstoneTtlMs, now = Date.now() }) {
  const { items: localItems, sources: localSources, pendingIds } = local

  const merged = {}
  for (const [id, cloudItem] of Object.entries(cloudItems)) {
    merged[id] = cloudItem
  }
  for (const [id, localItem] of Object.entries(localItems)) {
    const cloudItem = merged[id]
    if (!cloudItem || timeOf(localItem.updatedAt) >= timeOf(cloudItem.updatedAt)) {
      merged[id] = localItem
    }
  }

  // Tombstones expire, everywhere at once: drop them from the pushed file and
  // purge the local record so this device can't re-upload it next round.
  for (const [id, item] of Object.entries(merged)) {
    if (item.deleted && now - timeOf(item.updatedAt) >= tombstoneTtlMs) delete merged[id]
  }
  const purgeIds = Object.keys(localItems).filter((id) => localItems[id].deleted && !merged[id])

  // Cloud items that won (or are new here) get written locally — never over a
  // conversation this device is still streaming into.
  const upserts = Object.entries(merged)
    .filter(([id, item]) => !pendingIds.has(id) && item !== localItems[id])
    .map(([, item]) => item)

  const live = referencedSourceIds(merged)
  const sources = {}
  for (const [id, source] of Object.entries({ ...cloudSources, ...localSources })) {
    if (live.has(id)) sources[id] = toStubSource(source)
  }
  const neededLocally = referencedSourceIds(Object.fromEntries(upserts.map((item) => [item.id, item])))
  const sourcesToApply = [...neededLocally]
    .filter((id) => !localSources[id] && sources[id])
    .map((id) => sources[id])

  return {
    items: merged,
    sources,
    upserts,
    purgeIds,
    sourcesToApply,
    hasChanges: hasChatChanges(cloudItems, cloudSources, merged, sources),
  }
}

function hasChatChanges(cloudItems, cloudSources, mergedItems, mergedSources) {
  const cloudIds = Object.keys(cloudItems)
  if (cloudIds.length !== Object.keys(mergedItems).length) return true
  for (const [id, item] of Object.entries(mergedItems)) {
    const cloudItem = cloudItems[id]
    if (!cloudItem) return true
    if (timeOf(item.updatedAt) > timeOf(cloudItem.updatedAt)) return true
    if (!!item.deleted !== !!cloudItem.deleted) return true
  }
  const cloudSourceIds = Object.keys(cloudSources)
  if (cloudSourceIds.length !== Object.keys(mergedSources).length) return true
  return cloudSourceIds.some((id) => !mergedSources[id])
}
