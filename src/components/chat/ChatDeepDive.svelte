<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import { Tooltip as BitsTooltip } from 'bits-ui'
  import Tooltip from '@/components/ui/Tooltip.svelte'
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
        content={entry.isGenerating ? 'Generating…' : 'Deep Dive'}
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
              ? 'Generating Deep Dive questions'
              : 'Deep Dive'}
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
    <div class="mt-2 flex w-full flex-col gap-2">
      {#if entry.questions.length}
        <div class="flex items-center gap-1.5">
          <Icon icon="octicon:sparkle-fill-16" width="12" height="12" class="text-primary" />
          <p class="font-mono text-[0.65rem] uppercase tracking-wider text-muted">
            Deep Dive
          </p>
        </div>
        <div class="flex flex-col gap-1.5 border-l border-border pl-3">
          {#each entry.questions as question (question)}
            <button
              type="button"
              class="group flex items-start gap-1.5 text-left text-sm text-text-secondary transition-colors hover:text-text-primary disabled:opacity-50"
              disabled={entry.isGenerating}
              onclick={() => ask(question)}
            >
              <Icon
                icon="heroicons:arrow-right-circle"
                width="15"
                height="15"
                class="mt-0.5 shrink-0 text-muted transition-colors group-hover:text-primary"
              />
              <span>{question}</span>
            </button>
          {/each}
          <button
            type="button"
            class="mt-0.5 flex w-fit items-center gap-1 font-mono text-[0.65rem] uppercase tracking-wider text-muted transition-colors hover:text-primary disabled:opacity-50"
            disabled={entry.isGenerating}
            onclick={generate}
          >
            <Icon
              icon="heroicons:arrow-path"
              width="12"
              height="12"
              class={entry.isGenerating ? 'animate-spin' : ''}
            />
            Regenerate
          </button>
        </div>
      {/if}
      {#if entry.error}
        <p class="text-xs text-error">{entry.error}</p>
      {/if}
    </div>
  {/if}
{/if}
