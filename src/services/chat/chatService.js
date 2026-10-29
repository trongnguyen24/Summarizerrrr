import { buildContextPipeline } from '@/lib/chat/contextPipeline/index.js'
import { handleError } from '@/lib/error/simpleErrorHandler.js'
import { conversationRepository } from '@/lib/db/conversationRepository.js'
import { chatSourceService } from './chatSourceService.js'
import { chatSessionService } from './chatSessionService.js'
import { createPersonaSnapshot } from '@/lib/chat/skills/skillService.js'
import { resolveAutoSourceKind } from './sourceResolution.js'
import {
  resolveFeatureModel,
  resolveConversationModel,
} from '@/lib/providers/featureModelResolver.js'
import {
  normalizeProviderId,
  getLegacyModel,
  resolveProviderEntry,
  resolveAdapterCall,
  getProvider,
} from '@/lib/providers/providerRegistry.js'
import { isOpenAICompatibleProfileId } from '@/lib/providers/openAICompatibleProfiles.js'
import {
  normalizeChatReasoningLevel,
  buildReasoningRequestOptions,
} from '@/lib/api/reasoningConfig.js'

// Debounced in the background worker, so calling this once per finished turn is cheap.
function defaultOnPersisted() {
  import('@/services/cloudSync/cloudSyncService.svelte.js')
    .then(({ triggerSync }) => triggerSync())
    .catch((error) => console.warn('[chatService] Failed to trigger cloud sync:', error))
}

async function* defaultStreamRequest(request) {
  const {
    generateContentRequest,
    generateContentStreamEnhancedRequest,
  } = await import('@/lib/api/aiSdkAdapter.js')
  const { getBrowserCompatibility } = await import('@/lib/utils/browserDetection.js')

  async function* generateBlockingResponse() {
    const fullText = await generateContentRequest(request)
    yield { chunk: fullText, fullText, isComplete: false }
    yield { chunk: '', fullText, isComplete: true, usage: null }
  }

  const compatibility = getBrowserCompatibility()
  if (!compatibility.supportsAdvancedStreaming) {
    yield* generateBlockingResponse()
    return
  }

  try {
    yield* generateContentStreamEnhancedRequest(request)
  } catch (error) {
    // Firefox mobile can reject the stream writer's `flush` property. Retry
    // once with a blocking request so chat still completes on that platform.
    if (
      compatibility.isFirefoxMobile &&
      (error?.isFirefoxMobileStreamingError || error?.message?.includes('flush'))
    ) {
      yield* generateBlockingResponse()
      return
    }
    throw error
  }
}

/**
 * Real prompt (input) token count reported by the provider on stream completion,
 * or null when unavailable. Prefers `promptTokens`, falling back to `inputTokens`
 * — the same shape the per-message usage label reads.
 */
function realInputTokens(usage) {
  if (!usage) return null
  const n = usage.promptTokens ?? usage.inputTokens
  return typeof n === 'number' && n > 0 ? n : null
}

/**
 * Build the context-meter payload for a finished turn.
 *
 * Fires even when the provider reported nothing — the blocking fallback path
 * (Firefox mobile, see `defaultStreamRequest`) always yields `usage: null`, and
 * a meter left showing the previous turn's numbers is worse than one that says
 * it doesn't know. `available: false` is that signal; the token fields are null
 * alongside it while the model/window fields stay real.
 */
function contextDiagnostics(usage, pipeline, providerId, modelId) {
  const used = realInputTokens(usage)
  return {
    available: used != null,
    used,
    inputBudget: pipeline.inputBudgetTokens,
    window: pipeline.capabilities?.contextWindowTokens,
    source: pipeline.capabilities?.source,
    input: used,
    output: usage?.completionTokens ?? usage?.outputTokens ?? null,
    cached: usage?.cachedInputTokens ?? null,
    providerId,
    modelId,
    sourceTokens: pipeline.sourceTokens || {},
  }
}

function isAbortError(error, abortController) {
  return Boolean(
    abortController?.signal.aborted ||
      error?.name === 'AbortError' ||
      error?.message?.toLowerCase().includes('aborted')
  )
}

function titleFrom(value, fallback = 'New conversation') {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text ? text.slice(0, 80) : fallback
}

export function getModelId(providerId, settings) {
  return getLegacyModel(normalizeProviderId(providerId), settings)
}

function sourceIdsFrom(messages) {
  return [...new Set(messages.flatMap((message) => message.attachmentRefs || []))]
}

/**
 * Stateful sequencing without UI dependencies. Callbacks let the Svelte store
 * render a transient response while the repository only receives terminal
 * assistant records.
 */
export function createChatService({
  repository = conversationRepository,
  sourceService = chatSourceService,
  sessionService = chatSessionService,
  buildPipeline = buildContextPipeline,
  streamRequest = defaultStreamRequest,
  onPersisted = defaultOnPersisted,
} = {}) {
  /** Every turn ends here (complete, aborted or error), so it doubles as the sync hook. */
  async function finalizeStreaming(messageId, updates) {
    const message = await repository.finalizeStreamingAssistantMessage(messageId, updates)
    onPersisted()
    return message
  }

  async function startConversationForActiveTab({ settings, personaSnapshot, modelOverride } = {}) {
    const tab = await sourceService.getActiveTab()
    const resolvedChat = resolveFeatureModel('chat', settings)
    const providerId = modelOverride?.provider || resolvedChat.providerId
    const modelId = modelOverride?.model || resolvedChat.modelId
    const conversation = (
      await repository.createConversation({
        title: titleFrom(tab.title),
        personaSnapshot:
          personaSnapshot ||
          createPersonaSnapshot(settings?.chatGlobalPersona, {
            language: settings?.summaryLang || null,
          }),
        providerId,
        modelId,
      })
    ).conversation
    sessionService.setConversationId(tab.id, conversation.id)
    return { conversation, tab }
  }

  async function openConversation(id) {
    const conversation = await repository.getConversation(id)
    if (!conversation || conversation.deleted) throw new Error(`Conversation ${id} was not found`)
    return {
      conversation,
      messages: await repository.listMessagesByConversation(id),
    }
  }

  async function prepareGroundedAttachments(existingAttachments, sourceRequired, { skillInvocation, settings, onWarnings, activeSource } = {}) {
    const attachmentRefs = []
    const warnings = []
    const commentLimit = settings?.commentLimit
    for (const attachment of existingAttachments || []) {
      if (typeof attachment === 'string') { attachmentRefs.push(attachment); continue }
      try {
        const captured = await sourceService.captureTabSource(attachment, attachment.sourceKind, { commentLimit })
        attachmentRefs.push(captured.source.id)
      } catch (error) {
        warnings.push(error.message || `Could not capture ${attachment.title || 'selected tab'}.`)
      }
    }
    if (!sourceRequired) return attachmentRefs

    // Resolve the active source kind from the skill's sourceMode.
    // Explicit kinds (e.g. 'youtubeComments') pass through; 'auto' or absent →
    // resolveAutoSourceKind (transcript on YouTube, course transcript, webpage).
    const mode = skillInvocation?.sourceMode || 'auto'
    const preparedKind = activeSource?.sourceKind || null
    if (activeSource?.sourceId) {
      if (!attachmentRefs.includes(activeSource.sourceId)) attachmentRefs.push(activeSource.sourceId)
      onWarnings?.(warnings)
      return attachmentRefs
    }
    if (activeSource?.tabId && activeSource?.url) {
      const kind = preparedKind || (mode === 'auto' ? resolveAutoSourceKind(activeSource.url) : mode)
      const captured = await sourceService.captureTabSource(activeSource, kind, { commentLimit })
      if (!attachmentRefs.includes(captured.source.id)) attachmentRefs.push(captured.source.id)
      onWarnings?.(warnings)
      return attachmentRefs
    }

    const activeTab = await sourceService.getActiveTab()
    const sourceKind = mode === 'auto' ? resolveAutoSourceKind(activeTab.url) : mode

    const cached = await sourceService.getCachedActiveSource(sourceKind)
    const captured = cached || (await sourceService.captureActiveSource(sourceKind, { commentLimit }))
    if (!attachmentRefs.includes(captured.source.id)) attachmentRefs.push(captured.source.id)
    onWarnings?.(warnings)
    return attachmentRefs
  }

  async function runGeneration({
    conversation,
    history,
    currentUserMessage,
    settings,
    abortController,
    retryOfMessageId = null,
    onChunk,
    onWarnings,
    onDiagnostics,
  }) {
    const resolved = resolveConversationModel(conversation, settings)
    let conversationProviderId = resolved.providerId
    let conversationModelId = resolved.modelId

    // Check if the provider ID is a dynamic profile ID and if it is missing/deleted
    if (isOpenAICompatibleProfileId(conversationProviderId)) {
      const resolved = resolveProviderEntry(conversationProviderId, settings)
      if (!resolved) {
        const fallbackChat = resolveFeatureModel('chat', settings)
        conversationProviderId = fallbackChat.providerId
        conversationModelId = fallbackChat.modelId

        await repository.updateConversationMetadata(conversation.id, {
          providerId: conversationProviderId,
          modelId: conversationModelId,
        })

        conversation.providerId = conversationProviderId
        conversation.modelId = conversationModelId

        const providerLabel = resolveProviderEntry(conversationProviderId, settings)?.label || conversationProviderId
        onWarnings?.([
          `The selected OpenAI Compatible profile was deleted. Falling back to the current Chat provider: ${providerLabel}.`
        ])
      }
    }

    const resolvedEntry = resolveProviderEntry(conversationProviderId, settings)
    const capabilityProviderId = resolvedEntry ? resolvedEntry.capabilityProviderId : conversationProviderId

    const transient = {
      role: 'assistant',
      content: '',
      status: 'complete',
      retryOfMessageId,
      parentId: currentUserMessage.id,
    }
    let pipeline
    let usage = null
    let streamingMessageId = null
    let checkpointTimer = null

    function cancelCheckpoint() {
      if (checkpointTimer != null) {
        clearTimeout(checkpointTimer)
        checkpointTimer = null
      }
    }

    function scheduleCheckpoint(content) {
      cancelCheckpoint()
      if (!streamingMessageId) return
      checkpointTimer = setTimeout(() => {
        repository.checkpointStreamingContent(streamingMessageId, content).catch(() => {})
      }, 500)
    }

    try {
      const attachmentRefs = currentUserMessage.attachmentRefs || []

      // Pre-persist the assistant message with status 'streaming' before calling the model.
      const streamingMessage = await repository.createStreamingAssistantMessage(conversation.id, {
        ...transient,
        content: '',
        providerId: conversationProviderId,
        modelId: conversationModelId,
      })
      streamingMessageId = streamingMessage.id
      // Every chunk carries the id of the row this reply will become, so the
      // message list can key the streaming bubble by its final id and patch it
      // in place when the persisted message arrives (see ChatMessageList).
      transient.id = streamingMessage.id

      pipeline = await buildPipeline(
        {
          conversation,
          history,
          currentUserMessage,
          skillInvocation: currentUserMessage.skillInvocation,
          conversationSourceRefs: sourceIdsFrom(history),
          newAttachmentRefs: attachmentRefs,
          providerId: capabilityProviderId,
          modelId: conversationModelId,
        },
        { repository }
      )
      onWarnings?.(pipeline.warnings)

      if (pipeline.rejected) {
        const error = new Error("Your message is too long for this model's context window, even with every source removed. Shorten it or switch to a model with a larger context.")
        error.code = pipeline.rejected.code
        error.params = pipeline.rejected.params
        throw error
      }

      const { providerId: resolvedAdapterId, settings: resolvedSettings } = resolveAdapterCall(
        conversationProviderId,
        conversationModelId,
        settings
      )

      // Read the reasoning level snapshot from the user message (falls back
      // to 'provider-default' for older records that lack the field).
      const reasoningLevel = normalizeChatReasoningLevel(currentUserMessage.reasoningLevel)
      const reasoningOptions = buildReasoningRequestOptions(resolvedAdapterId, reasoningLevel)

      for await (const event of streamRequest({
        providerId: resolvedAdapterId,
        settings: resolvedSettings,
        system: pipeline.system,
        messages: pipeline.messages,
        abortSignal: abortController.signal,
        ...reasoningOptions,
      })) {
        if (event.isComplete) {
          usage = event.usage || null
          // Report the turn's real token counts to the context meter.
          onDiagnostics?.(
            contextDiagnostics(usage, pipeline, conversationProviderId, conversationModelId)
          )
          // Merge any reasoning-related warnings from the AI SDK into context
          // warnings so the user sees them alongside pipeline warnings.
          if (event.reasoningWarnings?.length) {
            const existing = pipeline.warnings || []
            onWarnings?.([...existing, ...event.reasoningWarnings])
          }
          continue
        }
        transient.content = event.fullText
        onChunk?.({ ...transient })
        scheduleCheckpoint(event.fullText)
      }

      cancelCheckpoint()

      if (abortController.signal.aborted) transient.status = 'aborted'
      const assistant = await finalizeStreaming(streamingMessageId, {
        content: transient.content,
        status: transient.status,
        providerId: conversationProviderId,
        modelId: conversationModelId,
        usage,
        groundingRefs: pipeline?.groundingRefs || [],
      })
      return { assistant, transient, diagnostics: pipeline }
    } catch (error) {
      cancelCheckpoint()

      if (isAbortError(error, abortController)) {
        transient.status = 'aborted'
        if (streamingMessageId) {
          const assistant = await finalizeStreaming(streamingMessageId, {
            content: transient.content,
            status: 'aborted',
            providerId: conversationProviderId,
            modelId: conversationModelId,
            groundingRefs: pipeline?.groundingRefs || [],
          })
          return { assistant, transient, diagnostics: pipeline }
        }
        return { assistant: null, transient, diagnostics: pipeline }
      }

      const handledError = handleError(error, {
        source: pipeline ? 'chatGeneration' : 'chatAssembly',
      })
      transient.status = 'error'
      transient.error = handledError
      if (streamingMessageId) {
        const assistant = await finalizeStreaming(streamingMessageId, {
          content: transient.content,
          status: 'error',
          error: handledError,
          providerId: conversationProviderId,
          modelId: conversationModelId,
          usage,
          groundingRefs: pipeline?.groundingRefs || [],
        })
        return { assistant, transient, error: handledError, diagnostics: pipeline }
      }
      return { assistant: null, transient, error: handledError, diagnostics: pipeline }
    }
  }

  return {
    startConversationForActiveTab,
    openConversation,

    async send({
      conversation,
      messages = [],
      content,
      skillInvocation = null,
      pendingAttachments = [],
      activeSource = null,
      settings,
      abortController = new AbortController(),
      sourceRequired = true,
      reasoningLevel,
      onUserMessage,
      onChunk,
      onWarnings,
      onDiagnostics,
    }) {
      if (!String(content || '').trim() && !skillInvocation) {
        throw new Error('Enter a message or choose a skill before sending.')
      }

      let attachmentRefs
      try {
        attachmentRefs = await prepareGroundedAttachments(pendingAttachments, sourceRequired, {
          skillInvocation,
          settings,
          onWarnings,
          activeSource,
        })
      } catch (error) {
        throw handleError(error, { source: 'chatCapture' })
      }

      const history = await repository.getGenerationPath(conversation.id)

      const normalizedReasoningLevel = normalizeChatReasoningLevel(reasoningLevel)
      const userMessage = await repository.addMessage(conversation.id, {
        role: 'user',
        content: String(content || '').trim(),
        skillInvocation,
        attachmentRefs,
        reasoningLevel: normalizedReasoningLevel,
      })
      onUserMessage?.(userMessage)

      return runGeneration({
        conversation,
        history,
        currentUserMessage: userMessage,
        settings,
        abortController,
        onChunk,
        onWarnings,
        onDiagnostics,
      })
    },

    async retry({ conversation, messages, userMessageId, settings, abortController, onChunk, onWarnings, onDiagnostics }) {
      const { history, currentUserMessage } = await repository.getGenerationContextForUser(userMessageId)
      return runGeneration({
        conversation,
        history,
        currentUserMessage,
        settings,
        abortController: abortController || new AbortController(),
        retryOfMessageId: userMessageId,
        onChunk,
        onWarnings,
        onDiagnostics,
      })
    },

    async regenerate({ conversation, assistantMessageId, settings, abortController, onChunk, onWarnings, onDiagnostics }) {
      const allMessages = await repository.listMessagesByConversation(conversation.id)
      const assistantMessage = allMessages.find((m) => m.id === assistantMessageId)
      if (!assistantMessage) throw new Error('The assistant message was not found.')

      const userMessageId = assistantMessage.parentId
      if (!userMessageId) throw new Error('The assistant message has no parent user turn.')

      const { history, currentUserMessage } = await repository.getGenerationContextForUser(userMessageId)
      return runGeneration({
        conversation,
        history,
        currentUserMessage,
        settings,
        abortController: abortController || new AbortController(),
        retryOfMessageId: userMessageId,
        onChunk,
        onWarnings,
        onDiagnostics,
      })
    },

    renameConversation(id, title) {
      return repository.updateConversationMetadata(id, { title: titleFrom(title) })
    },

    archiveConversation(id) {
      return repository.archiveConversation(id)
    },

    async edit({ conversation, messageId, content, reasoningLevel, settings, abortController, onChunk, onWarnings, onDiagnostics }) {
      const original = await repository.getMessage(messageId)
      if (!original) throw new Error('The message to edit was not found.')
      if (original.role !== 'user') throw new Error('Only user messages can be edited.')

      // Create a new user sibling with the same parentId as the edited message
      const normalizedReasoningLevel = normalizeChatReasoningLevel(reasoningLevel)
      const newUser = await repository.addMessage(conversation.id, {
        role: 'user',
        content: String(content || '').trim(),
        skillInvocation: original.skillInvocation,
        attachmentRefs: original.attachmentRefs,
        parentId: original.parentId,
        reasoningLevel: normalizedReasoningLevel,
      })

      const { history, currentUserMessage } = await repository.getGenerationContextForUser(newUser.id)
      return runGeneration({
        conversation,
        history,
        currentUserMessage,
        settings,
        abortController: abortController || new AbortController(),
        onChunk,
        onWarnings,
        onDiagnostics,
      })
    },

    async continueResponse({ conversation, assistantMessageId, settings, abortController, onChunk, onWarnings, onDiagnostics }) {
      const assistantMessage = await repository.getMessage(assistantMessageId)
      if (!assistantMessage) throw new Error('The assistant message was not found.')
      if (assistantMessage.status !== 'aborted' && assistantMessage.status !== 'interrupted') {
        throw new Error('Only aborted or interrupted replies can be continued.')
      }

      const userMessageId = assistantMessage.parentId
      if (!userMessageId) throw new Error('The assistant message has no parent user turn.')

      const { history, currentUserMessage } = await repository.getGenerationContextForUser(userMessageId)

      // Include the partial assistant content in history so the model sees what was already generated
      const historyWithPartial = [
        ...history,
        { role: 'user', content: currentUserMessage.content },
        { role: 'assistant', content: assistantMessage.content },
      ]

      // Build a continue instruction as the current user message
      const continueInstruction = {
        ...currentUserMessage,
        content: 'Continue your previous response from exactly where you left off. Do not repeat any content you already wrote.',
      }

      const controller = abortController || new AbortController()
      const baseContent = assistantMessage.content || ''
      const transient = {
        // Continue writes back into the existing row, so chunks stream under
        // that id and the list overlays it instead of adding a second bubble.
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        status: 'complete',
        parentId: userMessageId,
      }
      let pipeline
      let usage = null
      let checkpointTimer = null

      function cancelCheckpoint() {
        if (checkpointTimer != null) {
          clearTimeout(checkpointTimer)
          checkpointTimer = null
        }
      }

      function scheduleCheckpoint(combined) {
        cancelCheckpoint()
        checkpointTimer = setTimeout(() => {
          repository.checkpointStreamingContent(assistantMessageId, combined).catch(() => {})
        }, 500)
      }

      // Flip the existing record to 'streaming' so partial continuation content
      // is durable (checkpointed) and recoverable if the panel closes mid-stream.
      await repository.markMessageStreaming(assistantMessageId)

      try {
        const resolved = resolveConversationModel(conversation, settings)
        let conversationProviderId = resolved.providerId
        let conversationModelId = resolved.modelId

        // Check if the provider ID is a dynamic profile ID and if it is missing/deleted
        if (isOpenAICompatibleProfileId(conversationProviderId)) {
          const resolved = resolveProviderEntry(conversationProviderId, settings)
          if (!resolved) {
            const fallbackChat = resolveFeatureModel('chat', settings)
            conversationProviderId = fallbackChat.providerId
            conversationModelId = fallbackChat.modelId

            await repository.updateConversationMetadata(conversation.id, {
              providerId: conversationProviderId,
              modelId: conversationModelId,
            })

            conversation.providerId = conversationProviderId
            conversation.modelId = conversationModelId

            const providerLabel = resolveProviderEntry(conversationProviderId, settings)?.label || conversationProviderId
            onWarnings?.([
              `The selected OpenAI Compatible profile was deleted. Falling back to the current Chat provider: ${providerLabel}.`
            ])
          }
        }

        const resolvedEntry = resolveProviderEntry(conversationProviderId, settings)
        const capabilityProviderId = resolvedEntry ? resolvedEntry.capabilityProviderId : conversationProviderId

        const attachmentRefs = currentUserMessage.attachmentRefs || []
        pipeline = await buildPipeline(
          {
            conversation,
            history: historyWithPartial,
            currentUserMessage: continueInstruction,
            skillInvocation: currentUserMessage.skillInvocation,
            conversationSourceRefs: sourceIdsFrom(historyWithPartial),
            newAttachmentRefs: attachmentRefs,
            providerId: capabilityProviderId,
            modelId: conversationModelId,
          },
          { repository }
        )
        onWarnings?.(pipeline.warnings)

        const { providerId: resolvedAdapterId, settings: resolvedSettings } = resolveAdapterCall(
          conversationProviderId,
          conversationModelId,
          settings
        )

        // Reuse the originating user turn's reasoning snapshot for Continue.
        const reasoningLevel = normalizeChatReasoningLevel(currentUserMessage.reasoningLevel)
        const reasoningOptions = buildReasoningRequestOptions(resolvedAdapterId, reasoningLevel)

        for await (const event of streamRequest({
          providerId: resolvedAdapterId,
          settings: resolvedSettings,
          system: pipeline.system,
          messages: pipeline.messages,
          abortSignal: controller.signal,
          ...reasoningOptions,
        })) {
          if (event.isComplete) {
            usage = event.usage || null
            // Report the turn's real token counts to the context meter.
            onDiagnostics?.(
              contextDiagnostics(usage, pipeline, conversationProviderId, conversationModelId)
            )
            // Merge any reasoning-related warnings from the AI SDK.
            if (event.reasoningWarnings?.length) {
              const existing = pipeline.warnings || []
              onWarnings?.([...existing, ...event.reasoningWarnings])
            }
            continue
          }
          transient.content = event.fullText
          // Show the combined content during streaming
          const combined = baseContent + event.fullText
          onChunk?.({ ...transient, content: combined })
          scheduleCheckpoint(combined)
        }

        cancelCheckpoint()

        // Aborted continuation stays continuable; a finished one becomes complete.
        const combined = baseContent + transient.content
        const status = controller.signal.aborted ? 'aborted' : 'complete'
        transient.status = status
        const updated = await finalizeStreaming(assistantMessageId, {
          content: combined,
          status,
          usage,
          groundingRefs: pipeline?.groundingRefs || [],
        })
        return { assistant: updated, transient, diagnostics: pipeline }
      } catch (error) {
        cancelCheckpoint()
        const combined = baseContent + transient.content
        if (isAbortError(error, controller)) {
          transient.status = 'aborted'
          const updated = await finalizeStreaming(assistantMessageId, {
            content: combined,
            status: 'aborted',
          })
          return { assistant: updated, transient }
        }
        // Leave the record in a continuable terminal state rather than 'streaming'.
        await finalizeStreaming(assistantMessageId, { content: combined, status: 'aborted' })
          .catch(() => {})
        throw handleError(error, { source: pipeline ? 'chatGeneration' : 'chatAssembly' })
      }
    },
  }
}

export const chatService = createChatService()
