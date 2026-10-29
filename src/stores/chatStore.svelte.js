import { chatService } from '@/services/chat/chatService.js'
import { chatSessionService } from '@/services/chat/chatSessionService.js'
import { chatSourceService } from '@/services/chat/chatSourceService.js'
import { estimateTokens } from '@/lib/chat/contextPipeline/contextBudgeter.js'
import { setCapabilitiesSignalReporter } from '@/lib/chat/capabilitiesSignal.js'
import { lastTurn, toTurns } from '@/lib/chat/usageMetrics.js'
import { getProviderCapabilities } from '@/lib/chat/providerCapabilities.js'
import { conversationRepository } from '@/lib/db/conversationRepository.js'
import { settings } from './settingsStore.svelte.js'
import { handleError } from '@/lib/error/simpleErrorHandler.js'
import { skillService } from '@/lib/chat/skills/skillService.js'
import { invalidateConversationDeepDive } from '@/stores/deepDiveStore.svelte.js'
import { effectiveReasoningLevel } from '@/lib/api/reasoningConfig.js'
import {
  resolveFeatureModel,
  resolveConversationModel,
} from '@/lib/providers/featureModelResolver.js'
import { resolveAutoSourceKind } from '@/services/chat/sourceResolution.js'
import {
  acquire as acquireConversationLock,
  waitFor as waitForConversationLock,
} from '@/services/chat/conversationLockService.js'

/** Number of messages to show in the visible window — pagination decoupled from context. */
const VISIBLE_MESSAGE_WINDOW = 25
import { MAX_TAB_ATTACHMENTS, tabMentionService } from '@/services/chat/tabMentionService.js'
import {
  abortChatTabSession,
  chatSessionHasActivity,
  toChatTabRuntimeDescriptor,
  updateChatSessionUrl,
} from '@/services/chat/chatTabPolicy.js'

/**
 * Per-tab chat runtime.
 *
 * Each browser tab owns an independent chat session (its own messages,
 * loading/streaming flags, abort controller and composer draft). The active
 * tab's session is the reactive `chatState` that components read; every other
 * tab's session is a plain snapshot kept in `tabSessions`. A generation
 * captures the tab that started it and writes there for its whole lifetime, so
 * switching tabs only swaps the view — it never aborts an in-flight stream.
 */
function createChatSessionState() {
  return {
    /** True when the browser tab that owns this session has been closed. */
    detached: false,
    /**
     * True while another extension page holds this conversation's write lock
     * (see `conversationLockService`). The view is then browse-only: sends and
     * message edits are blocked until the lock is granted and the path reloaded.
     */
    readOnly: false,
    activeConversationId: null,
    conversation: null,
    messages: [],
    composerText: '',
    selectedSkill: null,
    pendingAttachments: [],
    /** Lazy estimate for the current browser page; populated only after user input. */
    activeSourceEstimate: null,
    /** Sources already recorded in the active AI generation path. These are immutable in the composer. */
    committedSources: [],
    /** Sticky opt-out: when true, the current page is NOT grounded into the chat. */
    activeSourceDismissed: false,
    isSending: false,
    streamingMessage: null,
    error: null,
    contextWarnings: [],
    /**
     * Titles of stub sources being re-captured before the reply, or null when
     * nothing is being re-captured. Set by `chatService`'s `onStatus`.
     */
    hydratingSources: null,
    /**
     * Context occupancy of the last generated turn — `input + output` of a
     * single turn, never a sum across turns (a turn's input already contains
     * every earlier reply). Belongs to one conversation, so it must be cleared
     * or rebuilt whenever the active conversation or model changes.
     */
    contextUsage: null,
    /**
     * Raw per-request usage for this conversation, oldest first — one entry per
     * API call, including abandoned regenerations (they were billed too).
     * Deliberately unaggregated: the context snapshot and the session totals are
     * different reductions of this list, derived at render time.
     */
    usageTurns: [],
    abortController: null,
    currentUrl: null,
    /** Real browser tab title from `browser.tabs` metadata — refreshes on every sync. */
    currentTitle: null,
    /** Real browser tab favicon URL from `browser.tabs` metadata — refreshes on every sync. */
    currentFavIconUrl: null,
    /** True when there are earlier messages not yet loaded into the visible window. */
    hasEarlierMessages: false,
    /**
     * One-shot request to scroll a just-submitted user message to the top of
     * the viewport. Chat never auto-scrolls otherwise, so this is the only way
     * the view moves on its own. Set on submit, consumed and cleared by
     * `ChatShell`.
     */
    scrollTargetMessageId: null,
    /**
     * Document scroll offset for this tab, captured when the view swaps away
     * and handed back on return — the chat counterpart of the summary
     * surface's per-tab `scrollY` (`services/tabCacheService.js`).
     */
    scrollTop: 0,
    /**
     * One-shot restore request consumed by `ChatShell`: the offset to scroll
     * the document to, or `null` for "nothing to restore". `0` is a real
     * target (the tab was at the top), so never test this for truthiness.
     */
    pendingScrollRestore: null,
    /**
     * Armed by pressing Enter while a reply is still streaming. The message
     * itself stays in the composer — this only says "send it as soon as the
     * current generation finishes cleanly". Aborts and errors clear it without
     * sending, so Stop never triggers a send.
     *
     * While armed the composer is locked: what you queued is what gets sent.
     * Cancelling the queue is what unlocks it for editing again.
     */
    queuedSend: false,
    /**
     * Per-tab reasoning effort level. `null` is a sentinel meaning "use the
     * global default from settings" — resolved at read time via
     * `effectiveReasoningLevel()`, never at session-creation time.
     */
    reasoningLevel: null,
    /**
     * Per-tab model override. `null` means "use the conversation's model or
     * the global Chat default". Set by `setChatModel` before a conversation
     * exists; consumed and cleared by `startConversationForActiveTab`.
     */
    modelOverride: null,
  }
}

const SESSION_KEYS = Object.keys(createChatSessionState())

export const chatState = $state(createChatSessionState())

export const chatTabsState = $state({
  activeBrowserTabId: null,
  activeSessionTabId: null,
  version: 0,
})

/**
 * Reactive signal bumped whenever the model-capability registry gains data
 * (discovery from a provider's /models API, or hydration of the persisted
 * cache). The context donut reads `version` so its pre-send preview of the
 * selected model's context window refreshes once real limits arrive — the
 * registry itself is a plain Map and can't drive Svelte reactivity.
 */
export const capabilitiesState = $state({ version: 0 })

/** Bump {@link capabilitiesState} so capability-derived UI recomputes. */
export function bumpCapabilitiesVersion() {
  capabilitiesState.version += 1
}

// Register with the capabilities-signal port so lib/chat can bump this without
// importing the store (see the layering table in CLAUDE.md).
setCapabilitiesSignalReporter(bumpCapabilitiesVersion)

const tabSessions = new Map() // tabId -> plain session snapshot
const activeEstimateJobs = new Map() // `${tabId}|${url}|${kind}` -> Promise
let activeTabId = null

function markChatTabsChanged() {
  chatTabsState.activeSessionTabId = activeTabId
  chatTabsState.version += 1
}

function getSession(tabId) {
  if (!tabId) return null
  if (!tabSessions.has(tabId)) tabSessions.set(tabId, createChatSessionState())
  return tabSessions.get(tabId)
}

/**
 * Current document scroll offset. Chat has no local overflow container, so the
 * scroller is the document itself — same element the summary surface scrolls.
 * Guarded for the worker/node contexts the store is also imported from.
 */
function readViewportScroll() {
  if (typeof document === 'undefined') return 0
  return (document.scrollingElement || document.documentElement)?.scrollTop ?? 0
}

/** Copy the live view into a tab's stored snapshot (drafts included). */
function stashViewInto(session) {
  if (!session) return
  for (const key of SESSION_KEYS) session[key] = chatState[key]
}

/** Paint a tab's stored snapshot onto the live view. */
function projectSessionToView(session) {
  for (const key of SESSION_KEYS) chatState[key] = session[key]
}

/**
 * Route a state update to the tab that owns it: the reactive view when that tab
 * is still on screen, otherwise its background snapshot. A null/unknown tab is
 * treated as the active view so resume flows keep working before the active tab
 * is resolved.
 */
function writeSession(tabId, patch) {
  if (tabId == null || tabId === activeTabId) Object.assign(chatState, patch)
  else Object.assign(getSession(tabId), patch)
  markChatTabsChanged()
}

function readSession(tabId) {
  return tabId == null || tabId === activeTabId ? chatState : getSession(tabId)
}

function sessionStillOwns(key, ref) {
  return ref == null || tabSessions.get(key) === ref
}

function resetView() {
  Object.assign(chatState, createChatSessionState())
  markChatTabsChanged()
}

/**
 * Conversation write locks held (or queued) by this page. Keyed by conversation
 * id: `{ release, cancelWait }`. `release` is set once the lock is granted;
 * `cancelWait` aborts a queued request. A conversation is locked once per page,
 * however many sessions show it.
 */
const conversationLocks = new Map()

/** Latest in-flight `openConversation` request per session key (null = standalone view). */
const pendingOpens = new Map()

function releaseConversationLock(conversationId) {
  const entry = conversationLocks.get(conversationId)
  if (!entry) return
  conversationLocks.delete(conversationId)
  entry.cancelWait?.()
  entry.release?.()
}

function conversationInUse(conversationId) {
  if (chatState.conversation?.id === conversationId) return true
  for (const session of tabSessions.values()) {
    if (session.conversation?.id === conversationId) return true
  }
  return false
}

/** Drop this page's lock on a conversation once no session on the page shows it. */
function releaseConversationLockIfUnused(conversationId) {
  if (!conversationId || conversationInUse(conversationId)) return
  releaseConversationLock(conversationId)
}

/** True when this page can write to the conversation (lock held). */
function isConversationWritable(conversationId) {
  return conversationLocks.get(conversationId)?.release != null
}

/**
 * Take the write lock for a conversation a session is about to show. Returns
 * whether this page may write. When another page holds it, the lock is queued
 * in the background and every session showing it is reloaded once the lock is
 * granted, because the other writer may have appended messages in the meantime.
 *
 * @param {string} conversationId
 * @returns {Promise<boolean>} true when writable
 */
async function claimConversationLock(conversationId) {
  if (!conversationId) return true
  if (conversationLocks.has(conversationId)) return isConversationWritable(conversationId)

  // Register synchronously so a concurrent claim for the same id sees the entry.
  const entry = { release: null, cancelWait: null }
  conversationLocks.set(conversationId, entry)
  const result = await acquireConversationLock(conversationId)
  // Released while the request was in flight (another session on this page let
  // go of the conversation). Our caller is still about to show it, so claim
  // afresh rather than leave it read-only with nothing queued to unlock it. A
  // caller that was itself superseded releases the new claim right after.
  if (conversationLocks.get(conversationId) !== entry) {
    result.release()
    return claimConversationLock(conversationId)
  }
  if (result.held) {
    entry.release = result.release
    return true
  }

  entry.cancelWait = waitForConversationLock(conversationId, (release) => {
    if (conversationLocks.get(conversationId) !== entry) {
      // Cancelled after the grant raced in: don't keep a lock nobody uses.
      release()
      return
    }
    entry.release = release
    entry.cancelWait = null
    reloadAfterLockGranted(conversationId)
  })
  return false
}

/** Session keys (null = the standalone view) currently showing a conversation. */
function sessionKeysShowing(conversationId) {
  const keys = []
  if (chatState.conversation?.id === conversationId) keys.push(activeTabId)
  for (const [key, session] of tabSessions) {
    if (key !== activeTabId && session.conversation?.id === conversationId) keys.push(key)
  }
  return keys
}

/**
 * Re-read a conversation's path in every session showing it, once its write
 * lock was handed to this page — the lock is per page, so all of them unlock.
 */
async function reloadAfterLockGranted(conversationId) {
  await Promise.all(
    sessionKeysShowing(conversationId).map(async (tabKey) => {
      const stillShown = () => readSession(tabKey)?.conversation?.id === conversationId
      try {
        await reloadActivePath(tabKey, null, null, (patch) => {
          if (stillShown()) writeSession(tabKey, patch)
        })
      } catch (error) {
        console.error('[chatStore] Failed to reload conversation after lock was granted:', error)
      } finally {
        if (stillShown()) writeSession(tabKey, { readOnly: false })
      }
    }),
  )
}

export function getChatTabRuntimeDescriptors() {
  const ids = new Set(tabSessions.keys())
  if (activeTabId != null) ids.add(activeTabId)

  const descriptors = []
  for (const tabId of ids) {
    const session = tabId === activeTabId ? chatState : tabSessions.get(tabId)
    if (chatSessionHasActivity(session)) {
      descriptors.push(toChatTabRuntimeDescriptor(tabId, session))
    }
  }
  return descriptors
}

export function notifyChatDraftChanged() {
  markChatTabsChanged()
}

function normalizeSourceUrl(url) {
  try {
    const normalized = new URL(url)
    normalized.hash = ''
    return normalized.toString()
  } catch {
    return String(url || '')
  }
}

function activeEstimateKey(tabId, url, sourceKind) {
  return `${tabId}|${normalizeSourceUrl(url)}|${sourceKind}`
}

function effectiveActiveSourceKind() {
  const mode = chatState.selectedSkill?.sourceMode
  if (mode && mode !== 'auto') return mode
  return resolveAutoSourceKind(chatState.currentUrl || '')
}

/**
 * Capture and estimate the current page after the user has shown intent to chat.
 * The explicit tab snapshot prevents a late async result from being attributed
 * to whichever browser tab happens to be active when extraction finishes.
 */
export function ensureActiveSourceEstimate(sourceKind = effectiveActiveSourceKind()) {
  const targetTabId = activeTabId ?? chatTabsState.activeBrowserTabId
  const owner = readSession(targetTabId)
  if (owner?.detached) return Promise.resolve(null)
  const url = owner?.currentUrl
  if (targetTabId == null || !url || owner.activeSourceDismissed) return Promise.resolve(null)

  const kind = sourceKind || resolveAutoSourceKind(url)
  const key = activeEstimateKey(targetTabId, url, kind)
  const current = owner.activeSourceEstimate
  if (current?.key === key) {
    if (current.estimating) return activeEstimateJobs.get(key) || Promise.resolve(null)
    if (current.sourceId || current.estimatedTokens != null) return Promise.resolve(current)
  }

  writeSession(targetTabId, {
    activeSourceEstimate: {
      key,
      tabId: targetTabId,
      url,
      title: owner.currentTitle,
      favIconUrl: owner.currentFavIconUrl,
      sourceKind: kind,
      sourceId: null,
      estimatedTokens: null,
      estimating: true,
      submitted: false,
    },
  })

  const job = (async () => {
    try {
      const { source } = await chatSourceService.captureTabSource(
        { tabId: targetTabId, url, title: owner.currentTitle },
        kind,
      )
      const latest = readSession(targetTabId)
      if (latest?.activeSourceEstimate?.key !== key) return null
      const estimate = {
        ...latest.activeSourceEstimate,
        sourceId: source?.id || null,
        estimatedTokens: estimateTokens(source?.rawContent || ''),
        estimating: false,
      }
      writeSession(targetTabId, { activeSourceEstimate: estimate })
      return estimate
    } catch {
      const latest = readSession(targetTabId)
      if (latest?.activeSourceEstimate?.key === key) {
        writeSession(targetTabId, {
          activeSourceEstimate: {
            ...latest.activeSourceEstimate,
            estimatedTokens: null,
            estimating: false,
          },
        })
      }
      return null
    } finally {
      if (activeEstimateJobs.get(key) === job) activeEstimateJobs.delete(key)
    }
  })()
  activeEstimateJobs.set(key, job)
  return job
}

export function canSendChat() {
  return Boolean(chatState.composerText.trim() || chatState.selectedSkill) && !chatState.isSending && !chatState.readOnly
}

/**
 * Send whatever is sitting in the composer if the user armed it with Enter
 * during the generation that just finished. Called only on a clean finish —
 * never after an abort or an error.
 */
function drainQueuedSend(tabId, completed, ownerRef, write) {
  if (!sessionStillOwns(tabId, ownerRef)) return
  const session = readSession(tabId)
  if (!session.queuedSend) return
  // Always disarm, even on an abort or an error. A flag left set would other-
  // wise survive until some later generation finished and fire there, sending
  // a message the user never asked for.
  write({ queuedSend: false })
  if (!completed) return
  // `sendChatMessage` always acts on the tab currently on screen. If the user
  // moved away, drop the arming and leave the draft — they can press Enter
  // again when they come back.
  if (tabId !== activeTabId) return
  if (!session.composerText.trim() && !session.selectedSkill) return
  sendChatMessage()
}

export function selectChatSkill(skill) {
  const invocation = skillService.select(skill)
  if (!invocation) return null
  chatState.selectedSkill = invocation
  markChatTabsChanged()
  return invocation
}

export async function addTabAttachment(tab) {
  if (chatState.pendingAttachments.length >= MAX_TAB_ATTACHMENTS) {
    throw new Error(`You can attach up to ${MAX_TAB_ATTACHMENTS} tabs per message.`)
  }
  const attachment = await tabMentionService.select(tab)
  // Deduplicate by (tabId, sourceKind) so transcript and comments for the same
  // tab can coexist as separate attachments.
  const isDuplicate = chatState.pendingAttachments.some(
    (item) => item.tabId === attachment.tabId && (item.sourceKind || undefined) === (attachment.sourceKind || undefined)
  )
  if (!isDuplicate) {
    // Show the chip immediately with a loading state, then estimate its token
    // cost in the background (extraction is real, so transcript/comments are
    // measured — not the visible page text).
    chatState.pendingAttachments = [...chatState.pendingAttachments, { ...attachment, estimatedTokens: null, estimating: true }]
    markChatTabsChanged()
    estimateAttachmentTokens(attachment, activeTabId)
  }
  return attachment
}

/** Reactively patch a single pending attachment matched by (tabId, sourceKind). */
function patchPendingAttachment(ownerTabId, tabId, sourceKind, patch) {
  const owner = readSession(ownerTabId)
  if (!owner) return
  const pendingAttachments = owner.pendingAttachments.map((item) =>
    item.tabId === tabId && (item.sourceKind || undefined) === (sourceKind || undefined)
      ? { ...item, ...patch }
      : item
  )
  writeSession(ownerTabId, { pendingAttachments })
}

/**
 * Extract the attachment's real content (transcript for video, formatted
 * comments for youtubeComments, page text otherwise — same path used at send)
 * and record an estimated token count on the chip. Warms the source cache so
 * the eventual send does not re-extract. Fails silently: a chip without an
 * estimate is fine.
 */
async function estimateAttachmentTokens(attachment, ownerTabId) {
  try {
    const { source } = await chatSourceService.captureTabSource(attachment, attachment.sourceKind)
    const tokens = estimateTokens(source?.rawContent || '')
    patchPendingAttachment(ownerTabId, attachment.tabId, attachment.sourceKind, {
      sourceId: source?.id || null,
      estimatedTokens: tokens,
      estimating: false,
    })
  } catch {
    patchPendingAttachment(ownerTabId, attachment.tabId, attachment.sourceKind, { estimatedTokens: null, estimating: false })
  }
}

export function removeTabAttachment(tabId, sourceKind) {
  chatState.pendingAttachments = chatState.pendingAttachments.filter(
    (item) => !(item.tabId === tabId && (sourceKind == null || (item.sourceKind || undefined) === sourceKind))
  )
  markChatTabsChanged()
}

/** Stop grounding the current page into the chat (sticky for this conversation). */
export function dismissActiveSource() {
  chatState.activeSourceDismissed = true
  markChatTabsChanged()
}

async function resolveCommittedSources(messages) {
  const refsById = new Map()
  for (const message of messages || []) {
    for (const ref of message.groundingRefs || []) {
      if (!ref?.sourceId) continue
      const previous = refsById.get(ref.sourceId)
      refsById.set(ref.sourceId, {
        sourceId: ref.sourceId,
        tokens: ref.tokens ?? previous?.tokens ?? null,
      })
    }
  }

  // Older stored conversations may predate persisted groundingRefs. Their user
  // attachmentRefs are the best available evidence that a source was submitted.
  if (refsById.size === 0) {
    for (const message of messages || []) {
      for (const sourceId of message.attachmentRefs || []) {
        if (sourceId && !refsById.has(sourceId)) refsById.set(sourceId, { sourceId, tokens: null })
      }
    }
  }

  const ids = [...refsById.keys()]
  if (ids.length === 0) return []
  const records = await conversationRepository.getSourcesByIds(ids)
  const recordsById = new Map(records.map((source) => [source.id, source]))
  return ids.flatMap((sourceId) => {
    const source = recordsById.get(sourceId)
    if (!source) return []
    const ref = refsById.get(sourceId)
    return [{
      sourceId,
      tabId: source.tabIdHint ?? null,
      url: source.url || source.normalizedUrl || null,
      normalizedUrl: source.normalizedUrl || normalizeSourceUrl(source.url),
      title: source.title || source.normalizedUrl || 'Context source',
      favIconUrl: null,
      sourceKind: source.sourceType || null,
      estimatedTokens: ref?.tokens ?? estimateTokens(source.rawContent || ''),
      locked: true,
    }]
  })
}

/**
 * Read every request this conversation has made, oldest first. Not an
 * incrementing counter: `messages` in a session is capped at
 * `VISIBLE_MESSAGE_WINDOW`, so a counter fed from it would undercount long
 * conversations and reset on reload.
 *
 * @param {string} conversationId
 * @returns {Promise<import('@/lib/chat/usageMetrics.js').Turn[]>}
 */
async function readUsageTurns(conversationId) {
  try {
    return toTurns(await conversationRepository.listMessagesByConversation(conversationId))
  } catch {
    // The token panel is a nice-to-have; never fail a send or an open over it.
    return []
  }
}

/**
 * Rebuild context occupancy for a conversation being opened, from the last turn
 * on its active path that reported usage. Without this the meter would show the
 * *previous* conversation's numbers until the next send.
 *
 * @param {object} conversation
 * @param {Array<object>} activePath ordered oldest → newest
 */
function rebuildContextUsage(conversation, activePath) {
  const turn = lastTurn(toTurns(activePath))
  if (!turn) return null
  const { providerId, modelId } = resolveConversationModel(conversation, settings)
  const capabilities = getProviderCapabilities(providerId, modelId)
  const output = capabilities.defaultOutputTokens || 0
  return {
    available: true,
    used: turn.input,
    window: capabilities.contextWindowTokens,
    inputBudget: Math.max(0, capabilities.contextWindowTokens - output),
    source: capabilities.source,
    input: turn.input,
    output: turn.output,
    cached: turn.cached,
    providerId,
    modelId,
    sourceTokens: {},
  }
}

async function reloadActivePath(tabId, result, ownerRef, write) {
  if (!sessionStillOwns(tabId, ownerRef)) return
  const owner = readSession(tabId)
  if (!owner.conversation) return
  const fullPath = await conversationRepository.getGenerationPath(owner.conversation.id)
  const committedSources = await resolveCommittedSources(fullPath)
  const hasEarlier = fullPath.length > VISIBLE_MESSAGE_WINDOW
  const windowed = hasEarlier ? fullPath.slice(-VISIBLE_MESSAGE_WINDOW) : fullPath
  if (!sessionStillOwns(tabId, ownerRef)) return
  write({
    messages: windowed,
    committedSources,
    pendingAttachments: [],
    hasEarlierMessages: hasEarlier,
    streamingMessage: null,
    error: result?.error || null,
    usageTurns: await readUsageTurns(owner.conversation.id),
  })
}

export async function startConversationForActiveTab() {
  const modelOverride = chatState.modelOverride
  const { conversation, tab } = await chatService.startConversationForActiveTab({
    settings,
    modelOverride: modelOverride || undefined,
  })
  if (activeTabId == null) activeTabId = tab.id
  chatTabsState.activeBrowserTabId = tab.id
  const writable = await claimConversationLock(conversation.id)
  writeSession(tab.id, {
    activeConversationId: conversation.id,
    conversation,
    readOnly: !writable,
    messages: [],
    error: null,
    contextWarnings: [],
    // A fresh conversation carries none of the previous one's token figures.
    contextUsage: null,
    usageTurns: [],
    modelOverride: null, // consumed
  })
  return conversation
}

/**
 * Switch the model for the active tab's chat. If a conversation exists, the
 * change is persisted immediately via `updateConversationMetadata`. If no
 * conversation has been started yet, it is stored as `modelOverride` and
 * consumed when the first message is sent. No-op while a generation is
 * in-flight.
 *
 * @param {{ provider: string, model: string }} selection
 */
export async function setChatModel({ provider, model }) {
  if (chatState.isSending || chatState.readOnly) return

  if (chatState.conversation) {
    const updated = await conversationRepository.updateConversationMetadata(
      chatState.conversation.id,
      { providerId: provider, modelId: model }
    )
    writeSession(activeTabId, {
      conversation: updated,
      // The window and model name in the meter belonged to the old model.
      // Rebuilding keeps the last turn's real token counts while re-resolving
      // the limits they are measured against.
      contextUsage: rebuildContextUsage(updated, chatState.messages),
    })
  } else {
    writeSession(activeTabId, {
      modelOverride: { provider, model },
    })
  }
}

/**
 * Reactive getter for the effective model that should display on the switcher
 * trigger. Resolution order: conversation → modelOverride → settings.chat.
 *
 * A conversation delegates to `resolveConversationModel` — the same resolver
 * the request path uses — so the trigger can never label a model different
 * from the one a send would actually route to. That matters for conversations
 * stamped with a provider but no model, which resolve to their own provider's
 * default rather than settings.chat's.
 * @returns {{ provider: string, model: string }}
 */
export function getEffectiveChatModel() {
  if (chatState.conversation) {
    const { providerId, modelId } = resolveConversationModel(chatState.conversation, settings)
    return { provider: providerId, model: modelId }
  }
  if (chatState.modelOverride) {
    return chatState.modelOverride
  }
  const fallback = resolveFeatureModel('chat', settings)
  return {
    provider: fallback.providerId,
    model: fallback.modelId,
  }
}

/**
 * Open a saved conversation into the session of the active browser tab (or the
 * standalone view when there is no browser tab, e.g. the Archive page).
 * `detached: true` marks the conversation as having no live page, so follow-ups
 * never ground on the currently active tab. Omitted, the session keeps its own
 * flag — a closed tab's session must stay detached when another conversation is
 * picked from its history.
 *
 * Only the latest open per session wins: one that a newer open or a
 * `closeConversation()` superseded while it was loading writes nothing and
 * returns null.
 */
export async function openConversation(id, { detached } = {}) {
  const sessionKey = activeTabId
  const request = {}
  pendingOpens.set(sessionKey, request)
  const superseded = () => pendingOpens.get(sessionKey) !== request

  const conversation = await conversationRepository.getConversation(id)
  if (!conversation || conversation.deleted) {
    if (!superseded()) pendingOpens.delete(sessionKey)
    throw new Error(`Conversation ${id} was not found`)
  }

  // Recovery-on-open: mark any stale 'streaming' messages as 'interrupted'
  await conversationRepository.recoverStreamingMessages(id)

  const writable = await claimConversationLock(id)
  const fullPath = await conversationRepository.getGenerationPath(id)
  const committedSources = await resolveCommittedSources(fullPath)
  const hasEarlier = fullPath.length > VISIBLE_MESSAGE_WINDOW
  const windowed = hasEarlier ? fullPath.slice(-VISIBLE_MESSAGE_WINDOW) : fullPath
  const usageTurns = await readUsageTurns(id)
  if (superseded()) {
    releaseConversationLockIfUnused(id)
    return null
  }
  pendingOpens.delete(sessionKey)

  // Read at write time: an earlier open may have landed while this one loaded.
  const previousId = readSession(activeTabId)?.conversation?.id ?? null
  writeSession(activeTabId, {
    activeConversationId: id,
    conversation,
    ...(detached !== undefined && { detached }),
    readOnly: !writable,
    messages: windowed,
    committedSources,
    hasEarlierMessages: hasEarlier,
    error: null,
    contextWarnings: [],
    // Both belong to the conversation being left behind. Rebuild them from this
    // one's records rather than carrying stale numbers forward.
    contextUsage: rebuildContextUsage(conversation, fullPath),
    usageTurns,
  })
  if (previousId && previousId !== id) releaseConversationLockIfUnused(previousId)
  if (activeTabId != null) chatSessionService.setConversationId(activeTabId, id)
  return conversation
}

export async function renameConversation(id, title) {
  const conversation = await chatService.renameConversation(id, title)
  if (chatState.activeConversationId === id) chatState.conversation = conversation
  return conversation
}

export async function archiveConversation(id) {
  const conversation = await chatService.archiveConversation(id)
  if (chatState.activeConversationId === id) closeConversation()
  return conversation
}

export function closeConversation() {
  // Only the active tab's generation is torn down; background tabs keep running.
  const shouldReturnToBrowser = activeTabId != null && chatState.detached
  const browserTabId = chatTabsState.activeBrowserTabId
  const closingId = chatState.conversation?.id ?? null
  // An open still loading into this view must not land after the close.
  pendingOpens.delete(activeTabId)
  chatState.abortController?.abort()
  if (activeTabId != null) {
    tabSessions.delete(activeTabId)
    chatSessionService.clearConversationId(activeTabId)
  }
  if (shouldReturnToBrowser) activeTabId = null
  resetView()
  releaseConversationLockIfUnused(closingId)
  if (shouldReturnToBrowser && browserTabId != null) {
    syncChatForActiveTab(browserTabId).catch((error) => {
      console.error('[chatStore] Failed to return to the active browser tab:', error)
    })
  }
}

export function removeChatTabSession(tabId, { detachActiveTab = false } = {}) {
  if (tabId == null) return false

  const isActiveSession = tabId === activeTabId
  const session = isActiveSession ? chatState : tabSessions.get(tabId)
  const removedId = session?.conversation?.id ?? null
  abortChatTabSession(session)
  pendingOpens.delete(tabId)
  tabSessions.delete(tabId)
  chatSessionService.clearConversationId(tabId)

  if (isActiveSession) {
    const shouldReturnToBrowser = Boolean(session?.detached)
    const browserTabId = chatTabsState.activeBrowserTabId
    if (shouldReturnToBrowser) activeTabId = null
    resetView()
    if (!shouldReturnToBrowser && detachActiveTab) activeTabId = null
    if (shouldReturnToBrowser && browserTabId != null) {
      syncChatForActiveTab(browserTabId).catch((error) => {
        console.error('[chatStore] Failed to return to the active browser tab:', error)
      })
    }
  }

  releaseConversationLockIfUnused(removedId)
  markChatTabsChanged()
  return Boolean(session)
}

export function handleChatBrowserTabRemoved(tabId) {
  const session = tabId === activeTabId ? chatState : tabSessions.get(tabId)
  const { hasConversation, isLoading } = toChatTabRuntimeDescriptor(tabId, session)
  if (hasConversation || isLoading) {
    writeSession(tabId, { detached: true, activeSourceEstimate: null })
    chatSessionService.clearConversationId(tabId)
    markChatTabsChanged()
    return true
  }
  return removeChatTabSession(tabId, { detachActiveTab: true })
}

export function handleChatTabNavigation(tabId, nextUrl) {
  if (tabId == null || !nextUrl) return false
  const session = tabId === activeTabId ? chatState : getSession(tabId)
  updateChatSessionUrl(session, nextUrl)
  markChatTabsChanged()
  return false
}

async function activateChatSessionInternal(tabId) {
  if (tabId == null || tabId === activeTabId) return chatState
  if (activeTabId != null) {
    // The DOM has been scrolled without the state knowing, so read it back
    // before the stash — otherwise the snapshot keeps a stale offset.
    chatState.scrollTop = readViewportScroll()
    stashViewInto(getSession(activeTabId))
  }
  activeTabId = tabId

  const session = getSession(tabId)
  projectSessionToView(session)
  // After the projection: it would otherwise overwrite the request with the
  // snapshot's own stale value.
  chatState.pendingScrollRestore = session.scrollTop ?? 0
  markChatTabsChanged()

  if (!session.conversation) {
    const conversationId = chatSessionService.getConversationId(tabId)
    if (conversationId) {
      try {
        const conversation = await conversationRepository.getConversation(conversationId)
        if (conversation && !conversation.deleted) {
          // Recovery-on-open for tab restore
          await conversationRepository.recoverStreamingMessages(conversationId)
          const fullPath = await conversationRepository.getGenerationPath(conversationId)
          const committedSources = await resolveCommittedSources(fullPath)
          const hasEarlier = fullPath.length > VISIBLE_MESSAGE_WINDOW
          const windowed = hasEarlier ? fullPath.slice(-VISIBLE_MESSAGE_WINDOW) : fullPath
          // A restored tab can show a conversation another page is writing to.
          session.readOnly = !(await claimConversationLock(conversation.id))
          session.activeConversationId = conversation.id
          session.conversation = conversation
          session.messages = windowed
          session.committedSources = committedSources
          session.hasEarlierMessages = hasEarlier
          // Only repaint if the user is still on this tab after the async load.
          if (activeTabId === tabId) {
            projectSessionToView(session)
            // The messages only just landed, so the earlier restore ran against
            // a near-empty document and was clamped. Ask for it again.
            chatState.pendingScrollRestore = session.scrollTop ?? 0
          }
          markChatTabsChanged()
        }
      } catch (error) {
        console.error('[chatStore] Failed to restore conversation for tab:', error)
      }
    }
  }
  return session
}

/**
 * Project a detached or live session onto the chat view without changing the
 * browser tab metadata. Auto-follow uses `syncChatForActiveTab` below; this is
 * for selecting a chat session that no longer has a browser tab.
 */
export async function activateChatSession(key) {
  return activateChatSessionInternal(key)
}

/**
 * Swap the chat view to a browser tab. Never touches other tabs' generations.
 * A tab with a persisted conversation but no loaded messages is hydrated
 * lazily. `title` and `favIconUrl` refresh on every sync; `url` remains sticky.
 */
export async function syncChatForActiveTab(tabId, { url = null, title = undefined, favIconUrl = undefined } = {}) {
  if (tabId == null) return chatState.conversation
  chatTabsState.activeBrowserTabId = tabId

  if (tabId === activeTabId) {
    if (url) handleChatTabNavigation(tabId, url)
    // Always refresh title/favicon even when staying on the same tab
    if (title !== undefined) chatState.currentTitle = title
    if (favIconUrl !== undefined) chatState.currentFavIconUrl = favIconUrl
    return chatState.conversation
  }

  const session = await activateChatSessionInternal(tabId)
  if (url && !session.currentUrl) session.currentUrl = url
  // Title and favicon always refresh — unlike URL they are not sticky
  if (title !== undefined) session.currentTitle = title
  if (favIconUrl !== undefined) session.currentFavIconUrl = favIconUrl
  if (activeTabId === tabId) {
    chatState.currentUrl = session.currentUrl
    chatState.currentTitle = session.currentTitle
    chatState.currentFavIconUrl = session.currentFavIconUrl
  }
  return session.conversation
}

/**
 * Update a tab's title/favicon in its session snapshot. Used by the
 * `onUpdated` browser event to keep inactive tabs' metadata fresh
 * without triggering a full view swap.
 */
export function updateChatTabMetadata(tabId, { title, favIconUrl } = {}) {
  if (tabId == null) return
  if (title !== undefined) writeSession(tabId, { currentTitle: title })
  if (favIconUrl !== undefined) writeSession(tabId, { currentFavIconUrl: favIconUrl })
}

export async function listRecentConversations({ limit = 10 } = {}) {
  const conversations = await conversationRepository.listConversations({
    includeArchived: false,
  })
  return conversations.slice(0, limit)
}

export async function sendChatMessage(content = chatState.composerText) {
  if (chatState.isSending || chatState.readOnly) return null
  if (!chatState.conversation) await startConversationForActiveTab()

  const targetTabId = activeTabId
  const ownerRef = getSession(targetTabId)
  const write = (patch) => {
    if (sessionStillOwns(targetTabId, ownerRef)) writeSession(targetTabId, patch)
  }
  const owner = readSession(targetTabId)
  const conversation = owner.conversation
  const history = owner.messages

  invalidateConversationDeepDive(conversation.id)

  const abortController = new AbortController()
  // Gates the queued-send drain in `finally`: only a clean finish sends the
  // next message. Aborts and errors leave it false.
  let completed = false
  const skillInvocation = chatState.selectedSkill
    ? $state.snapshot(chatState.selectedSkill)
    : null
  const pendingAttachments = $state.snapshot(chatState.pendingAttachments)
  // When the user has dismissed the page context, don't ground the active tab.
  // Explicit @ attachments (if any) are still captured.
  let sourceRequired = !chatState.activeSourceDismissed && !owner.detached
  const activeSourceKind =
    skillInvocation?.sourceMode && skillInvocation.sourceMode !== 'auto'
      ? skillInvocation.sourceMode
      : resolveAutoSourceKind(owner.currentUrl || '')
  let preparedActiveSource = sourceRequired
    ? {
        tabId: targetTabId,
        url: owner.currentUrl,
        title: owner.currentTitle,
        sourceKind: activeSourceKind,
        sourceId: null,
      }
    : null

  write({
    error: null,
    contextWarnings: [],
    isSending: true,
    abortController,
    streamingMessage: { role: 'assistant', content: '', status: 'complete' },
  })

  try {
    // If the user submits immediately after the first character, share the same
    // in-flight extraction instead of starting a second capture in chatService.
    // isSending is already true here, preventing a second submit while capture
    // is still resolving.
    if (sourceRequired && (String(content || '').trim() || skillInvocation)) {
      const estimate = await ensureActiveSourceEstimate(activeSourceKind)
      if (preparedActiveSource) preparedActiveSource.sourceId = estimate?.sourceId || null
    }
    if (abortController.signal.aborted) return null
    const latestOwner = readSession(targetTabId)
    if (latestOwner?.detached && !preparedActiveSource?.sourceId) {
      preparedActiveSource = null
      sourceRequired = false
    }

    const result = await chatService.send({
      conversation,
      messages: history,
      content,
      skillInvocation,
      pendingAttachments,
      activeSource: preparedActiveSource,
      sourceRequired,
      reasoningLevel: effectiveReasoningLevel(owner.reasoningLevel, settings),
      settings,
      abortController,
      onUserMessage: (message) => {
        if (!sessionStillOwns(targetTabId, ownerRef)) return
        const session = readSession(targetTabId)
        const patch = {
          messages: [...session.messages, message],
          scrollTargetMessageId: message.id,
          pendingAttachments: session.pendingAttachments.map((attachment) => ({
            ...attachment,
            submitted: true,
          })),
          activeSourceEstimate: session.activeSourceEstimate
            ? { ...session.activeSourceEstimate, submitted: true }
            : null,
        }
        // This callback lands asynchronously — after the page capture and
        // `addMessage` — and the composer stays editable while streaming now.
        // Only clear what is still the message we sent; never wipe the next
        // question the user has already started typing.
        if (session.composerText === content) patch.composerText = ''
        if (
          skillInvocation &&
          session.selectedSkill?.skillId === skillInvocation.skillId
        ) {
          patch.selectedSkill = null
        }
        write(patch)
      },
      onChunk: (message) => {
        write({ streamingMessage: message })
      },
      onWarnings: (warnings) => {
        write({ contextWarnings: warnings })
      },
      onStatus: (status) => {
        write({ hydratingSources: status?.type === 'hydrating' ? status.titles : null })
      },
      onDiagnostics: (usage) => {
        write({ contextUsage: usage })
      },
    })
    await reloadActivePath(targetTabId, result, ownerRef, write)
    completed = true
    return result
  } catch (error) {
    write({
      error: error?.message ? error : handleError(error, { source: 'chatPersistence' }),
      streamingMessage: null,
    })
    return null
  } finally {
    write({ isSending: false, abortController: null })
    drainQueuedSend(targetTabId, completed, ownerRef, write)
  }
}

export function stopGeneration() {
  chatState.abortController?.abort()
}

export async function sendChatFollowUp(question) {
  chatState.selectedSkill = null
  chatState.composerText = String(question || '')
  return sendChatMessage(chatState.composerText)
}

export async function retryChatMessage(userMessageId) {
  if (!chatState.conversation || chatState.isSending || chatState.readOnly) return null

  const targetTabId = activeTabId
  const ownerRef = getSession(targetTabId)
  const write = (patch) => {
    if (sessionStillOwns(targetTabId, ownerRef)) writeSession(targetTabId, patch)
  }
  const owner = readSession(targetTabId)
  const abortController = new AbortController()
  // Gates the queued-send drain in `finally`: only a clean finish sends the
  // next message. Aborts and errors leave it false.
  let completed = false

  write({
    error: null,
    isSending: true,
    abortController,
    streamingMessage: {
      role: 'assistant',
      content: '',
      status: 'complete',
      retryOfMessageId: userMessageId,
    },
  })

  try {
    const result = await chatService.retry({
      conversation: owner.conversation,
      messages: owner.messages,
      userMessageId,
      settings,
      abortController,
      onChunk: (message) => {
        write({ streamingMessage: message })
      },
      onWarnings: (warnings) => {
        write({ contextWarnings: warnings })
      },
      onStatus: (status) => {
        write({ hydratingSources: status?.type === 'hydrating' ? status.titles : null })
      },
      onDiagnostics: (usage) => {
        write({ contextUsage: usage })
      },
    })
    await reloadActivePath(targetTabId, result, ownerRef, write)
    completed = true
    return result
  } catch (error) {
    write({
      error: handleError(error, { source: 'chatGeneration' }),
      streamingMessage: null,
    })
    return null
  } finally {
    write({ isSending: false, abortController: null })
    drainQueuedSend(targetTabId, completed, ownerRef, write)
  }
}

export async function switchBranch(messageId) {
  if (chatState.readOnly) return
  const activeLeafId = await conversationRepository.activateBranch(messageId)
  const conversationId = chatState.activeConversationId
  if (conversationId) {
    const fullPath = await conversationRepository.getGenerationPath(conversationId)
    const hasEarlier = fullPath.length > VISIBLE_MESSAGE_WINDOW
    const windowed = hasEarlier ? fullPath.slice(-VISIBLE_MESSAGE_WINDOW) : fullPath
    writeSession(activeTabId, {
      messages: windowed,
      hasEarlierMessages: hasEarlier,
      error: null,
    })
  }
  return activeLeafId
}

/**
 * Load earlier messages beyond the visible window. Fetches the full active
 * path and shows all of them. Called by the “Load earlier” button in
 * ChatMessageList.
 */
export async function loadEarlierMessages() {
  const conversationId = chatState.activeConversationId
  if (!conversationId) return
  const fullPath = await conversationRepository.getGenerationPath(conversationId)
  writeSession(activeTabId, {
    messages: fullPath,
    hasEarlierMessages: false,
  })
}

export async function regenerateChatMessage(assistantMessageId) {
  if (!chatState.conversation || chatState.isSending || chatState.readOnly) return null

  const targetTabId = activeTabId
  const ownerRef = getSession(targetTabId)
  const write = (patch) => {
    if (sessionStillOwns(targetTabId, ownerRef)) writeSession(targetTabId, patch)
  }
  const owner = readSession(targetTabId)
  const abortController = new AbortController()
  // Gates the queued-send drain in `finally`: only a clean finish sends the
  // next message. Aborts and errors leave it false.
  let completed = false

  const allMessages = owner.messages
  const assistantMessage = allMessages.find((m) => m.id === assistantMessageId)
  const userMessageId = assistantMessage?.parentId

  write({
    error: null,
    isSending: true,
    abortController,
    streamingMessage: {
      role: 'assistant',
      content: '',
      status: 'complete',
      retryOfMessageId: userMessageId,
    },
  })

  try {
    const result = await chatService.regenerate({
      conversation: owner.conversation,
      assistantMessageId,
      settings,
      abortController,
      onChunk: (message) => {
        write({ streamingMessage: message })
      },
      onWarnings: (warnings) => {
        write({ contextWarnings: warnings })
      },
      onStatus: (status) => {
        write({ hydratingSources: status?.type === 'hydrating' ? status.titles : null })
      },
      onDiagnostics: (usage) => {
        write({ contextUsage: usage })
      },
    })
    await reloadActivePath(targetTabId, result, ownerRef, write)
    completed = true
    return result
  } catch (error) {
    write({
      error: handleError(error, { source: 'chatGeneration' }),
      streamingMessage: null,
    })
    return null
  } finally {
    write({ isSending: false, abortController: null })
    drainQueuedSend(targetTabId, completed, ownerRef, write)
  }
}

export async function editChatMessage(messageId, content) {
  if (!chatState.conversation || chatState.isSending || chatState.readOnly) return null

  const targetTabId = activeTabId
  const ownerRef = getSession(targetTabId)
  const write = (patch) => {
    if (sessionStillOwns(targetTabId, ownerRef)) writeSession(targetTabId, patch)
  }
  const owner = readSession(targetTabId)
  const abortController = new AbortController()
  // Gates the queued-send drain in `finally`: only a clean finish sends the
  // next message. Aborts and errors leave it false.
  let completed = false

  write({
    error: null,
    isSending: true,
    abortController,
    streamingMessage: {
      role: 'assistant',
      content: '',
      status: 'complete',
    },
  })

  try {
    const result = await chatService.edit({
      conversation: owner.conversation,
      messageId,
      content,
      reasoningLevel: effectiveReasoningLevel(chatState.reasoningLevel, settings),
      settings,
      abortController,
      onChunk: (message) => {
        write({ streamingMessage: message })
      },
      onWarnings: (warnings) => {
        write({ contextWarnings: warnings })
      },
      onStatus: (status) => {
        write({ hydratingSources: status?.type === 'hydrating' ? status.titles : null })
      },
      onDiagnostics: (usage) => {
        write({ contextUsage: usage })
      },
    })
    await reloadActivePath(targetTabId, result, ownerRef, write)
    completed = true
    return result
  } catch (error) {
    write({
      error: handleError(error, { source: 'chatGeneration' }),
      streamingMessage: null,
    })
    return null
  } finally {
    write({ isSending: false, abortController: null })
    drainQueuedSend(targetTabId, completed, ownerRef, write)
  }
}

export async function continueChatMessage(assistantMessageId) {
  if (!chatState.conversation || chatState.isSending || chatState.readOnly) return null

  const targetTabId = activeTabId
  const ownerRef = getSession(targetTabId)
  const write = (patch) => {
    if (sessionStillOwns(targetTabId, ownerRef)) writeSession(targetTabId, patch)
  }
  const owner = readSession(targetTabId)
  const abortController = new AbortController()
  // Gates the queued-send drain in `finally`: only a clean finish sends the
  // next message. Aborts and errors leave it false.
  let completed = false

  const assistantMessage = owner.messages.find((m) => m.id === assistantMessageId)

  write({
    error: null,
    isSending: true,
    abortController,
    streamingMessage: {
      // Same id as the message being continued: the list overlays that row
      // rather than rendering the partial answer twice.
      id: assistantMessageId,
      role: 'assistant',
      content: assistantMessage?.content || '',
      status: 'complete',
    },
  })

  try {
    const result = await chatService.continueResponse({
      conversation: owner.conversation,
      assistantMessageId,
      settings,
      abortController,
      onChunk: (message) => {
        write({ streamingMessage: message })
      },
      onWarnings: (warnings) => {
        write({ contextWarnings: warnings })
      },
      onStatus: (status) => {
        write({ hydratingSources: status?.type === 'hydrating' ? status.titles : null })
      },
      onDiagnostics: (usage) => {
        write({ contextUsage: usage })
      },
    })
    await reloadActivePath(targetTabId, result, ownerRef, write)
    completed = true
    return result
  } catch (error) {
    write({
      error: handleError(error, { source: 'chatGeneration' }),
      streamingMessage: null,
    })
    return null
  } finally {
    write({ isSending: false, abortController: null })
    drainQueuedSend(targetTabId, completed, ownerRef, write)
  }
}

