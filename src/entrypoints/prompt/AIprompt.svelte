<script>
  import Icon from '@iconify/svelte'
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '../../lib/slideScaleFade.js' // Corrected path if needed

  let isOpen = $state(false) // State for the dialog
</script>

<button
  onclick={() => (isOpen = true)}
  class="p-1 transition-colors hover:bg-surface-1 rounded-full hover:text-text-primary"
  title="Prompt Enhance"
>
  <Icon icon="codicon:sparkle-filled" width="16" height="16" /></button
>

<Dialog.Root bind:open={isOpen}>
  <Dialog.Portal>
    <Dialog.Overlay class="fixed inset-0 z-40 bg-black/80" forceMount>
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:fade></div>
        {/if}
      {/snippet}
    </Dialog.Overlay>
    <Dialog.Content
      forceMount
      class="outline-hidden fixed left-[50%] top-4 w-[calc(100vw-32px)] max-w-5xl z-50 translate-x-[-50%]"
    >
      {#snippet child({ props, open })}
        {#if open}
          <div {...props} transition:slideScaleFade>
            <div class="absolute z-10 right-3 top-2.5 group flex gap-2">
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <span class="block size-3.5 bg-muted/15 rounded-full"></span>
              <!-- svelte-ignore a11y_consider_explicit_label -->
              <button
                onclick={() => (isOpen = false)}
                class="block size-3.5 bg-error rounded-full"
              >
                <Icon
                  class="text-red-800 transition-opacity duration-150"
                  width={14}
                  icon="heroicons:x-mark-16-solid"
                />
              </button>
            </div>
            <div
              class="relative font-mono rounded-lg text-text-primary dark:text-text-secondary text-xs bg-background dark:bg-surface-1 overflow-hidden border border-border w-full flex-shrink-0 flex flex-col"
            >
              <div
                class="px-4 bg-surface-1 dark:bg-surface-2 py-2 border-b-0 border-border"
              >
                <p class="!text-center">Prompt Enhance</p>
              </div>
              <div class="flex gap-2 flex-col p-6">
                <label for="SystemPrompt" class="text-text-primary"
                  >System Prompt
                </label>
                <div>
                  You are an expert content summarizer specializing in YouTube
                  video transcripts. Your task is to create structured,
                  comprehensive summaries that preserve key information,
                  examples, and actionable insights. CORE PRINCIPLES: - Focus on
                  main topics, supporting evidence, examples, and practical
                  applications - Preserve important names, numbers, technical
                  terms, and specific details - Organize content logically with
                  clear headings and bullet points - Remove filler words,
                  repetitions, and non-essential transitions - Maintain
                  objective tone while highlighting key concepts
                </div>

                <label for="UserPrompt" class=" text-text-primary"
                  >User Prompt
                </label>
                <div>
                  You are an expert content summarizer specializing in YouTube
                  video transcripts. Your task is to create structured,
                  comprehensive summaries that preserve key information,
                  examples, and actionable insights. CORE PRINCIPLES: - Focus on
                  main topics, supporting evidence, examples, and practical
                  applications - Preserve important names, numbers, technical
                  terms, and specific details - Organize content logically with
                  clear headings and bullet points - Remove filler words,
                  repetitions, and non-essential transitions - Maintain
                  objective tone while highlighting key concepts
                </div>

                <div>
                  <button class=" ml-auto flex relative overflow-hidden group">
                    <div
                      class=" font-medium py-2 px-4 border transition-colors duration-200
                      bg-primary group-hover:bg-primary/95 dark:group-hover:bg-orange-500 text-orange-50 dark:text-orange-100/90 border-orange-400 hover:border-orange-300/75 hover:text-white
                     "
                    >
                      Apply prompt
                    </div>
                    <span
                      class="size-4 absolute z-10 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200
                       border-orange-400 group-hover:border-orange-300/75"
                    ></span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/if}
      {/snippet}
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
