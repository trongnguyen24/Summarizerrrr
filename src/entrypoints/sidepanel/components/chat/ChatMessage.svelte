<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { _ } from 'svelte-i18n'
  import { Tooltip as BitsTooltip } from 'bits-ui'
  import Tooltip from '@/entrypoints/sidepanel/components/Tooltip.svelte'
  import StreamingMarkdownV2 from '@/components/markdown/StreamingMarkdownV2.svelte'
  import ChatUserBubble from '@/entrypoints/sidepanel/components/chat/ChatUserBubble.svelte'
  import ChatMessageEditor from '@/entrypoints/sidepanel/components/chat/ChatMessageEditor.svelte'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import {
    switchBranch,
    regenerateChatMessage,
    editChatMessage,
    continueChatMessage,
  } from '@/stores/chatStore.svelte.js'
  import { conversationRepository } from '@/lib/db/conversationRepository.js'
  import { getElapsedDisplay } from '@/lib/utils/utils.js'
  import { nowState } from '@/stores/nowStore.svelte.js'
  import ChatDeepDive from '@/entrypoints/sidepanel/components/chat/ChatDeepDive.svelte'
  import ChatThinkingIndicator from '@/entrypoints/sidepanel/components/chat/ChatThinkingIndicator.svelte'

  let {
    message,
    isStreaming = false,
    retryTargetId = null,
    onRetry = null,
    onCopy = null,
    conversation = null,
    onFollowUp = null,
  } = $props()

  const isUser = $derived(message.role === 'user')
  const isAborted = $derived(message.status === 'aborted')
  const isError = $derived(message.status === 'error')
  const isInterrupted = $derived(message.status === 'interrupted')
  const canContinue = $derived(isAborted || isInterrupted)
  const hasContent = $derived(Boolean(message.content?.trim()))

  let siblings = $state([])
  let isEditing = $state(false)
  let editText = $state('')

  $effect(() => {
    // The streaming bubble carries its future id but no conversationId yet;
    // siblings load once the persisted message lands in this same node.
    if (!isStreaming && message.id && message.conversationId) {
      conversationRepository.getSiblings(message.conversationId, message.parentKey || '__root__')
        .then((res) => {
          siblings = res
        })
        .catch((err) => {
          console.error('[ChatMessage] Failed to load siblings:', err)
        })
    } else {
      siblings = []
    }
  })

  const siblingIndex = $derived(siblings.findIndex((s) => s.id === message.id))
  const hasSiblings = $derived(siblings.length > 1)

  // Footer buttons are all the same shape (14px icon + tooltip), so they render
  // through the `actionBtn` snippet below; only the class differs per variant.
  // The user row sets its own `text-text-secondary`; the assistant row inherits
  // `text-muted` from its container.
  const BTN = 'rounded-md p-1 transition-colors hover:bg-blackwhite-5 hover:text-text-primary'
  const BTN_USER = `${BTN} text-text-secondary`
  const BTN_NAV = 'rounded p-0.5 transition-colors hover:bg-blackwhite-5 hover:text-text-primary'

  function copyContent() {
    navigator.clipboard?.writeText(message.content || '')
    onCopy?.(message)
  }

  function startEditing() {
    editText = message.content || ''
    isEditing = true
  }

  function cancelEditing() {
    isEditing = false
    editText = ''
  }

  function submitEdit() {
    if (!editText.trim()) return
    isEditing = false
    editChatMessage(message.id, editText)
    editText = ''
  }

  function handleEditKeydown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submitEdit()
    } else if (event.key === 'Escape') {
      cancelEditing()
    }
  }

  const timeLabel = $derived.by(() => {
    const elapsed = getElapsedDisplay(message.createdAt, nowState.value)
    if (!elapsed) return null
    switch (elapsed.mode) {
      case 'just-now':
        return $_('chat.time.justNow', { default: 'Just now' })
      case 'minutes':
        return $_('chat.time.minutesAgo', {
          default: `${elapsed.minutes}m ago`,
          values: { count: elapsed.minutes },
        })
      case 'clock':
        return elapsed.clock
      case 'datetime':
        return elapsed.label
      default:
        return null
    }
  })
</script>

<!-- The tooltip label doubles as the accessible name — one string, no drift.
     `{...builder}` MUST come before `{onclick}`: the bits-ui trigger props
     carry their own `onclick` (it closes the tooltip), and in a Svelte spread
     the last writer wins — spreading after would silently swallow the action. -->
{#snippet actionBtn(label, icon, onclick, cls)}
  <Tooltip content={label} side="top" delayDuration={300}>
    {#snippet children({ builder })}
      <button type="button" {...builder} class={cls} aria-label={label} {onclick}>
        <Icon {icon} width="16" height="16" />
      </button>
    {/snippet}
  </Tooltip>
{/snippet}

<div
  class="flex w-full flex-col gap-1 {isUser ? 'items-end' : 'items-start'}"
  data-message-status={message.status}
  data-message-id={message.id}
  data-message-role={message.role}
>
  {#if isUser}
    {#if isEditing}
      <div class="w-full max-w-[85%]">
        <ChatMessageEditor
          value={editText}
          onsave={(text) => {
            editChatMessage(message.id, text)
            isEditing = false
          }}
          oncancel={cancelEditing}
        />
      </div>
    {:else}
      <ChatUserBubble {message} />
    {/if}
    {#if !isStreaming && !isEditing}
      <BitsTooltip.Provider>
        <div class="mt-0.5 flex flex-wrap items-center justify-end gap-1">
          {#if hasSiblings}
            <div class="flex items-center gap-1 select-none text-xs text-text-secondary">
              {@render actionBtn(
                'Previous branch',
                'heroicons:chevron-left',
                () => switchBranch(siblings[(siblingIndex - 1 + siblings.length) % siblings.length].id),
                BTN_NAV,
              )}
              <span>{siblingIndex + 1}/{siblings.length}</span>
              {@render actionBtn(
                'Next branch',
                'heroicons:chevron-right',
                () => switchBranch(siblings[(siblingIndex + 1) % siblings.length].id),
                BTN_NAV,
              )}
            </div>
          {/if}
          {@render actionBtn('Edit message', 'heroicons:pencil-square', startEditing, BTN_USER)}
          {@render actionBtn(
            'Copy message',
            'heroicons:square-2-stack',
            copyContent,
            BTN_USER,
          )}
          {#if timeLabel}
            <span
              class="ml-1 text-[11px] text-text-secondary/60 tabular-nums"
              title={message.createdAt}
            >
              {timeLabel}
            </span>
          {/if}
        </div>
      </BitsTooltip.Provider>
    {/if}
  {:else}
    {#if isStreaming && !hasContent}
      <ChatThinkingIndicator />
    {/if}

    <!-- No `content-visibility: auto` here: an offscreen streaming message
         would report its 200px placeholder instead of its real height, so the
         page height (and the scrollbar) would jump as you read down into it. -->
    <div
      class="prose main-sidepanel wrap-anywhere prose-h2:mt-4 w-full max-w-none text-text-primary"
    >
      <StreamingMarkdownV2
        sourceMarkdown={message.content}
        enableCursor={isStreaming && hasContent}
        enableHighlight={true}
        summaryLang={settings.summaryLang}
        isLoading={isStreaming}
        class="custom-markdown-style"
      />
    </div>

    {#if isAborted}
      <div class="flex items-center gap-1 text-xs text-text-secondary">
        <Icon icon="heroicons:stop-solid" width="12" height="12" />
        <span>Stopped</span>
      </div>
    {:else if isError}
      <div class="flex w-full items-start gap-1.5 text-xs text-error">
        <Icon
          icon="heroicons:exclamation-circle"
          width="12"
          height="12"
          class="mt-1 shrink-0"
        />
        <div class="chat-error-markdown min-w-0 flex-1">
          <StreamingMarkdownV2
            sourceMarkdown={message.error?.message || 'Something went wrong.'}
            enableCursor={false}
            summaryLang={settings.summaryLang}
            isLoading={false}
            class="custom-markdown-style"
          />
        </div>
      </div>
    {/if}

    {#if !isStreaming}
      <!-- One row: branch switcher (only with siblings), copy, regenerate, the
           Deep Dive pill and the time. `flex-wrap` is deliberate — a very narrow side
           panel wraps the row instead of overflowing it. -->
      <BitsTooltip.Provider>
        <div class="mt-0.5 flex w-full flex-wrap items-center gap-1 text-muted">
          {#if hasSiblings}
            <div class="flex items-center gap-1 select-none text-xs text-text-secondary">
              {@render actionBtn(
                'Previous branch',
                'heroicons:chevron-left',
                () => switchBranch(siblings[(siblingIndex - 1 + siblings.length) % siblings.length].id),
                BTN_NAV,
              )}
              <span>{siblingIndex + 1}/{siblings.length}</span>
              {@render actionBtn(
                'Next branch',
                'heroicons:chevron-right',
                () => switchBranch(siblings[(siblingIndex + 1) % siblings.length].id),
                BTN_NAV,
              )}
            </div>
          {/if}

          {@render actionBtn(
            'Copy response',
            'heroicons:square-2-stack',
            copyContent,
            BTN,
          )}

          {#if message.status === 'complete'}
            {@render actionBtn(
              'Regenerate response',
              'heroicons:arrow-path',
              () => regenerateChatMessage(message.id),
              BTN,
            )}
          {:else if canContinue}
            {@render actionBtn(
              'Continue response',
              'heroicons:play',
              () => continueChatMessage(message.id),
              BTN,
            )}
          {/if}

          {#if onRetry && retryTargetId && isError}
            {@render actionBtn(
              'Retry this message',
              'heroicons:arrow-path',
              () => onRetry(retryTargetId),
              BTN,
            )}
          {/if}

          {#if message.status === 'complete'}
            <ChatDeepDive section="trigger" {conversation} {message} {onFollowUp} />
          {/if}

          {#if timeLabel}
            <span class="ml-1 text-[11px] text-text-secondary/60 tabular-nums">
              {timeLabel}
            </span>
          {/if}
        </div>
      </BitsTooltip.Provider>

      {#if message.status === 'complete'}
        <ChatDeepDive section="panel" {conversation} {message} {onFollowUp} />
      {/if}
    {/if}
  {/if}
</div>

<style>
  .chat-error-markdown {
    color: var(--color-error);
    line-height: 1.35;
  }

  .chat-error-markdown :global(p) {
    margin: 0;
    color: inherit;
  }
</style>
