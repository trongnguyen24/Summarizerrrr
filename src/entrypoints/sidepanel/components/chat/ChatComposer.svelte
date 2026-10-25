<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import { slideScaleFade } from '@/lib/utils/slideScaleFade.js'
  import ChatSkillChip from '@/entrypoints/sidepanel/components/chat/ChatSkillChip.svelte'
  import ChatContextBar from '@/entrypoints/sidepanel/components/chat/ChatContextBar.svelte'
  import ChatContextGauge from '@/entrypoints/sidepanel/components/chat/ChatContextGauge.svelte'
  import ChatModelSelect from '@/entrypoints/sidepanel/components/chat/ChatModelSelect.svelte'
  import SkillPicker from '@/entrypoints/sidepanel/components/chat/SkillPicker.svelte'
  import TabMentionMenu from '@/entrypoints/sidepanel/components/chat/TabMentionMenu.svelte'
  import ChatComposerInput from '@/entrypoints/sidepanel/components/chat/ChatComposerInput.svelte'
  import ChatRichTextInput from '@/entrypoints/sidepanel/components/chat/ChatRichTextInput.svelte'

  import {
    chatState,
    chatTabsState,
    capabilitiesState,
    canSendChat,
    sendChatMessage,
    stopGeneration,
    selectChatSkill,
    addTabAttachment,
    removeTabAttachment,
    dismissActiveSource,
    restoreActiveSource,
    ensureActiveSourceEstimate,
    getEffectiveChatModel,
    notifyChatDraftChanged,
  } from '@/stores/chatStore.svelte.js'
  import { getProviderCapabilities } from '@/lib/chat/providerCapabilities.js'
  import { skillService } from '@/lib/chat/skills/skillService.js'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import { resolveAutoSourceKind } from '@/services/chat/sourceResolution.js'

  let { autofocus = false } = $props()

  // The effective source kind for the current page. Precedence mirrors
  // chatService.prepareGroundedAttachments: skill sourceMode → auto.
  let activeSourceKind = $derived.by(() => {
    const url = chatState.currentUrl || ''
    if (!url) return null
    const skillMode = chatState.selectedSkill?.sourceMode
    if (skillMode && skillMode !== 'auto') return skillMode
    return resolveAutoSourceKind(url)
  })

  // Whether ChatContextBar has anything to render — mirrors its internal
  // visibility condition so the attached-tab overlap only applies when shown.
  let hasContextBar = $derived(
    (activeSourceKind && !chatState.activeSourceDismissed) ||
      chatState.pendingAttachments.length > 0 ||
      chatState.committedSources.length > 0 ||
      (chatState.currentUrl && chatState.activeSourceDismissed),
  )

  // Total estimated token cost of @tab chips attached but not yet sent.
  let pendingEstimate = $derived(
    chatState.pendingAttachments.reduce(
      (sum, a) => sum + (a.estimatedTokens || 0),
      0,
    ),
  )

  // Baseline usage for the donut before the first send: resolve the selected
  // model's context window so the popover shows "[model] — [window]" on open.
  // Re-runs when the model changes or the capability registry gains data.
  let previewUsage = $derived.by(() => {
    capabilitiesState.version // reactive dependency: refresh on discovery/hydrate
    const { provider, model } = getEffectiveChatModel()
    if (!provider || !model) return null
    const caps = getProviderCapabilities(provider, model)
    const output = caps.defaultOutputTokens || 0
    return {
      used: 0,
      window: caps.contextWindowTokens,
      inputBudget: Math.max(0, caps.contextWindowTokens - output),
      source: caps.source,
      providerId: provider,
      modelId: model,
      input: null,
      output: null,
      cached: null,
    }
  })

  // Real usage from the last sent turn takes precedence over the preview.
  let donutUsage = $derived(chatState.contextUsage || previewUsage)

  let richTextRef = $state(null)
  let textareaEl = $state(null)
  let mentionMenuRef = $state(null)
  let skillMenuRef = $state(null)
  let editorError = $state(false)

  let skills = $state([])
  let mentionOpen = $state(false)
  let mentionQuery = $state('')
  let mentionRange = $state(null)
  let skillOpen = $state(false)
  let skillQuery = $state('')
  let skillRange = $state(null)
  let composerError = $state('')

  $effect(() => {
    settings.chatUserSkills
    skills = skillService.listSkills(settings)
  })

  export function focus() {
    if (!editorError && richTextRef) {
      richTextRef.focus()
    } else {
      textareaEl?.focus()
    }
  }

  function handleKeydown(event) {
    if (skillOpen && skillMenuRef?.handleKeyDown(event)) return
    if (mentionOpen && mentionMenuRef?.handleKeyDown(event)) return
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  function handleRichTextKeyDown(event) {
    if (skillOpen && skillMenuRef) {
      return skillMenuRef.handleKeyDown(event)
    }
    if (mentionOpen && mentionMenuRef) {
      return mentionMenuRef.handleKeyDown(event)
    }
    return false
  }

  // Enter. The composer stays live while a reply streams, so Enter can't send
  // straight away — it arms the message instead, and the store fires it when
  // the current generation finishes cleanly.
  function handleSubmit() {
    if (chatState.isSending) {
      if (chatState.composerText.trim() || chatState.selectedSkill)
        chatState.queuedSend = true
      return
    }
    if (!canSendChat()) return
    sendChatMessage()
  }

  // The round button, which is a Stop button while streaming. Deliberately not
  // the same as Enter: stopping must never send the armed message.
  function handleButtonClick() {
    if (chatState.isSending) {
      chatState.queuedSend = false
      stopGeneration()
      return
    }
    handleSubmit()
  }

  function clearSkill() {
    chatState.selectedSkill = null
    if (chatState.composerText.trim())
      ensureActiveSourceEstimate(
        resolveAutoSourceKind(chatState.currentUrl || ''),
      )
  }

  function handleRestoreActiveSource() {
    restoreActiveSource()
    if (chatState.composerText.trim() || chatState.selectedSkill) {
      ensureActiveSourceEstimate(activeSourceKind)
    }
  }

  function handleComposerChange(markdown) {
    chatState.composerText = markdown
    if (markdown.trim()) ensureActiveSourceEstimate(activeSourceKind)
  }

  function handleComposerInput(event) {
    chatState.composerText = event.currentTarget.value
    if (chatState.composerText.trim())
      ensureActiveSourceEstimate(activeSourceKind)
    const match = chatState.composerText.match(/(?:^|\s)@([^\s@]*)$/)
    mentionOpen = Boolean(match)
    mentionQuery = match?.[1] || ''
    const skillMatch = chatState.composerText.match(/(?:^|\s)\/([^\s/]*)$/)
    skillOpen = Boolean(skillMatch)
    skillQuery = skillMatch?.[1] || ''
    if (mentionOpen) skillOpen = false
    if (skillOpen) mentionOpen = false
  }

  function handleMentionChange({ open, query, range }) {
    mentionOpen = open
    mentionQuery = query
    mentionRange = range
  }

  function handleSkillChange({ open, query, range }) {
    skillOpen = open
    skillQuery = query
    skillRange = range
  }

  function handleInitError(err) {
    console.warn(
      '[ChatComposer] Fallback to textarea due to editor init error:',
      err,
    )
    editorError = true
  }

  async function handleTabSelect(tab) {
    try {
      await addTabAttachment(tab)
      if (!editorError && richTextRef) {
        richTextRef.deleteRange(mentionRange)
        richTextRef.focus()
      } else {
        chatState.composerText = chatState.composerText.replace(
          /(?:^|\s)@[^\s@]*$/,
          (value) => (value.startsWith(' ') ? ' ' : ''),
        )
        textareaEl?.focus()
      }
      composerError = ''
    } catch (error) {
      composerError = error.message
    }
  }

  // Fired on every editor update with whether a skill token is still present.
  // Backspacing over the token is the only way to clear a skill now, so this
  // is what keeps the store in step with the document.
  function handleSkillTokenChange(present) {
    if (!present && chatState.selectedSkill) clearSkill()
  }

  function handleSkillSelect(skill, range = skillRange) {
    // Insert the token *before* touching the store: inserting fires an editor
    // update, and handleSkillTokenChange would otherwise see no token yet and
    // immediately clear the skill we just selected.
    if (!editorError && richTextRef) {
      richTextRef.insertSkillToken(skill, range)
      richTextRef.focus()
    }
    selectChatSkill(skill)
    ensureActiveSourceEstimate(
      skill?.sourceMode && skill.sourceMode !== 'auto'
        ? skill.sourceMode
        : resolveAutoSourceKind(chatState.currentUrl || ''),
    )
    if (editorError) {
      chatState.composerText = chatState.composerText.replace(
        /(?:^|\s)\/[^\s/]*$/,
        (value) => (value.startsWith(' ') ? ' ' : ''),
      )
      textareaEl?.focus()
    }
  }

  // The empty-state chips: one tap selects the skill *and* fires it, so the
  // user never has to reach for Send on a chat they haven't typed into.
  // `canSendChat()` already treats a bare skill as sendable, and the capture
  // handleSkillSelect kicks off is the same in-flight one `sendChatMessage`
  // awaits — so submitting straight away doesn't start a second extraction.
  //
  // No typed `/query` to replace, so the range is explicitly null rather than
  // whatever `skillRange` holds from an earlier picker interaction.
  export function selectSkillAndSend(skill) {
    handleSkillSelect(skill, null)
    // Goes through handleSubmit, not sendChatMessage: that keeps the chip on
    // the same footing as Enter, including arming a queued send if a reply is
    // somehow still streaming.
    handleSubmit()
  }

  $effect(() => {
    if (autofocus) {
      if (!editorError && richTextRef) richTextRef.focus()
      else textareaEl?.focus()
    }
  })
</script>

<div class="flex w-full flex-col gap-2 px-4 pt-2 pb-3 max-w-[52rem] mx-auto">
  <div class="relative">
    <TabMentionMenu
      bind:this={mentionMenuRef}
      open={mentionOpen}
      query={mentionQuery}
      attachments={chatState.pendingAttachments}
      onSelect={handleTabSelect}
      onClose={() => (mentionOpen = false)}
    />
    <SkillPicker
      bind:this={skillMenuRef}
      open={skillOpen}
      query={skillQuery}
      {skills}
      onSelect={handleSkillSelect}
      onClose={() => (skillOpen = false)}
    />

    <!-- Context bar: attached tab, inset on both sides, tucked under the chat box -->
    <div
      class="mx-3 {hasContextBar || chatState.detached ? '-mb-1.5' : ''}"
    >
      {#if chatState.detached}
        <div
          class="flex items-center gap-1.5 bg-surface-2 border border-border/40 px-3 pt-1.5 pb-3 text-xs text-text-secondary"
          data-testid="detached-source-note"
        >
          <Icon icon="carbon:unlink" width="14" height="14" />
          <span>{$t('chat.detached.source_note')}</span>
        </div>
      {/if}
      <ChatContextBar
        currentUrl={chatState.detached ? null : chatState.currentUrl}
        currentTitle={chatState.detached ? null : chatState.currentTitle}
        currentFavIconUrl={chatState.detached ? null : chatState.currentFavIconUrl}
        activeSourceKind={chatState.detached ? null : activeSourceKind}
        activeSourceDismissed={
          chatState.detached ? true : chatState.activeSourceDismissed
        }
        activeSourceEstimate={
          chatState.detached ? null : chatState.activeSourceEstimate
        }
        committedSources={chatState.committedSources}
        pendingAttachments={chatState.pendingAttachments}
        onDismissActiveSource={dismissActiveSource}
        onRestoreActiveSource={handleRestoreActiveSource}
        onRemoveAttachment={removeTabAttachment}
      />
    </div>

    <!-- Composer box: text input on top, controls row on the bottom -->
    <div class="relative overflow-hidden z-10">
      <div
        class="size-5 absolute z-10 bottom-0 left-0 rotate-45 bg-surface-1 translate-y-1/2 -translate-x-1/2 border border-border"
      ></div>
      <div
        class="size-3 absolute z-10 top-0 right-0 rotate-45 bg-white -translate-y-1/2 translate-x-1/2"
      ></div>
      <div
        class="w-3 h-0.5 z-8 absolute bg-white shadow-[0_-2px_6px_#fff,0_-1px_3px_#ffffffa5] rounded-t-sm bottom-0 -translate-y-1.75 translate-x-0.5 rotate-45"
      ></div>
      <div
        class="relative flex flex-col border border-border bg-surface-2 px-3 py-1"
      >
        <!-- Context window gauge: top-right corner energy bar -->
        <div class="absolute -top-3 right-px z-20">
          <ChatContextGauge
            usage={donutUsage}
            {pendingEstimate}
            turns={chatState.usageTurns}
          />
        </div>

        {#if !editorError}
          {#key chatTabsState.activeSessionTabId}
            <ChatRichTextInput
              bind:this={richTextRef}
              value={chatState.composerText}
              skill={chatState.selectedSkill}
              onskilltokenchange={handleSkillTokenChange}
              onchange={handleComposerChange}
              onkeydown={handleRichTextKeyDown}
              onmentionchange={handleMentionChange}
              onskillchange={handleSkillChange}
              oniniterror={handleInitError}
              onsubmit={handleSubmit}
              disabled={chatState.queuedSend}
              placeholder="Ask a question"
            />
          {/key}
        {:else}
          <!-- Plain-textarea fallback: no editor, so no inline token. The skill
               falls back to a chip above the input. -->
          {#if chatState.selectedSkill}
            <div class="flex min-w-0 pt-1">
              <ChatSkillChip
                skill={chatState.selectedSkill}
                onClear={clearSkill}
              />
            </div>
          {/if}
          <ChatComposerInput
            bind:this={textareaEl}
            value={chatState.composerText}
            oninput={handleComposerInput}
            onkeydown={handleKeydown}
            disabled={chatState.queuedSend}
            placeholder="Describe a task or ask a question"
          />
        {/if}

        <!-- Controls row: Model + effort (left) | Context donut + Send (right) -->
        <div class="flex items-center justify-between gap-1.5">
          <ChatModelSelect />
          <div class="flex items-center gap-1.5">
            {#if chatState.isSending && chatState.queuedSend}
              <span
                class="flex min-w-0 items-center gap-1 text-xs text-text-secondary"
              >
                <span class="truncate">Queued</span>
                <button
                  type="button"
                  class="shrink-0 text-muted transition-colors hover:text-text-primary"
                  aria-label="Cancel queued message"
                  onclick={() => (chatState.queuedSend = false)}
                >
                  <Icon icon="tabler:x" width="12" height="12" />
                </button>
              </span>
            {/if}
            <button
              type="button"
              class="relative z-20 flex size-8 shrink-0 items-center justify-center transition-all duration-300 {chatState.isSending ||
              canSendChat()
                ? ' text-white! hover:opacity-70'
                : 'scale-85!  text-muted cursor-not-allowed'}"
              disabled={!chatState.isSending && !canSendChat()}
              aria-label={chatState.isSending
                ? 'Stop generating'
                : 'Send message'}
              onclick={handleButtonClick}
            >
              <!-- Both states are absolutely centred so the icons cross-fade in
                   place instead of the button jumping between two children. -->
              {#if chatState.isSending}
                <span
                  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  transition:slideScaleFade={{
                    duration: 300,
                    slideFrom: 'bottom',
                    startScale: 0.4,
                    slideDistance: '0rem',
                  }}
                >
                  <Icon icon="heroicons:stop-solid" width="16" height="16" />
                </span>
              {:else}
                <span
                  class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  transition:slideScaleFade={{
                    duration: 300,
                    slideFrom: 'bottom',
                    startScale: 0.4,
                    slideDistance: '0rem',
                  }}
                >
                  <svg
                    class="size-6"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M19.7491 5.62305V9.52005C19.7491 10.5809 19.3277 11.5983 18.5776 12.3485C17.8274 13.0986 16.81 13.52 15.7491 13.52H3.87014M8.10614 18.377L4.30914 14.58C4.16969 14.4408 4.05906 14.2754 3.98356 14.0933C3.90806 13.9113 3.86918 13.7161 3.86914 13.519M8.10514 8.66205L4.30914 12.46C4.01614 12.753 3.86914 13.137 3.86914 13.521"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>

    {#if composerError}<p class="mt-1 text-xs text-error">
        {composerError}
      </p>{/if}
  </div>
</div>
<div
  class="pointer-events-none z-[-1] absolute inset-x-0 bottom-0 h-44 bg-linear-to-t from-surface-1 from-20% via-surface-1 via-70% to-transparent"
></div>
