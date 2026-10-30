<script>
  // @ts-nocheck
  import { _ } from 'svelte-i18n'
  import Icon from '@iconify/svelte'
  import { Tooltip as BitsTooltip } from 'bits-ui'
  import Tooltip from '@/components/ui/Tooltip.svelte'
  import QuestionChip from '@/components/buttons/QuestionChip.svelte'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import {
    getConversationDeepDive,
    startConversationDeepDive,
    resolveConversationDeepDive,
    rejectConversationDeepDive,
  } from '@/stores/deepDiveStore.svelte.js'
  import { generateFollowUpQuestions } from '@/services/tools/deepDiveService.js'

  // The pill lives inside the message's single-row footer while the generated
  // questions have to render below it, so this component is mounted twice —
  // once per `section` — instead of duplicating the generate/store wiring.
  let { conversation, message, onFollowUp = null, section = 'panel' } = $props()
  let entry = $state(null)
  let enabled = $derived(settings.tools?.deepDive?.enabled ?? false)

  $effect(() => {
    entry = conversation?.id && message?.id
      ? getConversationDeepDive(conversation.id, message.id)
      : null
  })

  async function generate() {
    if (!enabled || !entry || entry.isGenerating) return
    const requestId = startConversationDeepDive(conversation.id, message.id)
    try {
      const questions = await generateFollowUpQuestions(
        message.content,
        conversation.title,
        '',
        conversation.personaSnapshot?.language || settings.summaryLang || 'English',
        entry.questionHistory,
        entry.questionHistory.length > 0,
      )
      resolveConversationDeepDive(conversation.id, message.id, requestId, questions)
    } catch (error) {
      rejectConversationDeepDive(conversation.id, message.id, requestId, error)
    }
  }

  function ask(question) {
    onFollowUp?.(question)
  }
</script>

{#if enabled && entry && section === 'trigger'}
  {#if !entry.questions.length}
    <!-- Own `Tooltip.Provider`: bits-ui throws (and renders nothing at all) when
         the context is missing, so the trigger must not depend on whichever
         parent happens to mount it. Nested providers are fine. -->
    <BitsTooltip.Provider>
      <Tooltip
        content={entry.isGenerating
          ? $_('chat.deep_dive.generating', { default: 'Generating…' })
          : $_('chat.deep_dive.title', { default: 'Deep Dive' })}
        side="top"
        delayDuration={300}
      >
        {#snippet children({ builder })}
          <!-- `{...builder}` first: the bits-ui trigger props carry their own
               `onclick`/`disabled`, and the last writer wins in a spread. -->
          <button
            type="button"
            {...builder}
            class="rounded-md p-1 transition-colors hover:bg-blackwhite-5 disabled:opacity-50"
            disabled={entry.isGenerating}
            onclick={generate}
            aria-label={entry.isGenerating
              ? $_('chat.deep_dive.generating_aria', { default: 'Generating Deep Dive questions' })
              : $_('chat.deep_dive.title', { default: 'Deep Dive' })}
          >
            <Icon
              icon={entry.isGenerating ? 'heroicons:arrow-path' : 'octicon:sparkle-fill-16'}
              class={entry.isGenerating ? 'animate-spin text-primary' : 'text-primary'}
              width="14"
              height="14"
            />
          </button>
        {/snippet}
      </Tooltip>
    </BitsTooltip.Provider>
  {/if}
{:else if enabled && entry && section === 'panel'}
  {#if entry.questions.length || entry.error}
    <div class="mt-3 flex w-full flex-col gap-2">
      {#if entry.questions.length}
        <!-- Mirrors the summary's inline Deep Dive (InlineDeepDiveQuestions):
             same QuestionChip rows and round reload button, minus the striped
             header and provider picker — a chat follow-up stays in this chat. -->
        <div
          class="flex flex-col gap-3 transition-opacity duration-300 {entry.isGenerating
            ? 'pointer-events-none opacity-50'
            : ''}"
        >
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <Icon icon="octicon:sparkle-fill-16" width="12" height="12" class="text-primary" />
              <p class="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
                {$_('chat.deep_dive.title', { default: 'Deep Dive' })}
              </p>
            </div>
            <button
              type="button"
              class="deep-dive-reload"
              disabled={entry.isGenerating}
              onclick={generate}
              title={entry.isGenerating
                ? $_('chat.deep_dive.generating', { default: 'Generating…' })
                : $_('chat.deep_dive.regenerate', { default: 'Generate new questions' })}
              aria-label={$_('chat.deep_dive.regenerate', { default: 'Generate new questions' })}
            >
              <Icon
                icon="heroicons:arrow-path"
                width="14"
                height="14"
                class={entry.isGenerating ? 'animate-spin' : ''}
              />
            </button>
          </div>
          <div class="flex flex-col gap-3">
            {#each entry.questions as question, i (question)}
              <QuestionChip
                {question}
                index={i + 1}
                disabled={entry.isGenerating}
                onclick={() => ask(question)}
              />
            {/each}
          </div>
        </div>
      {/if}
      {#if entry.error}
        <p class="text-xs text-error">{entry.error}</p>
      {/if}
    </div>
  {/if}
{/if}

<style>
  /* Same look as the summary Deep Dive's `.nav-btn`. */
  .deep-dive-reload {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.4em;
    border: 1px solid var(--color-border);
    border-radius: 10rem;
    background-color: var(--color-surface-1);
    color: var(--text-secondary);
    transition: all 200ms;
  }

  .deep-dive-reload:hover {
    background-color: var(--color-surface-2);
    color: var(--primary);
  }

  .deep-dive-reload:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
