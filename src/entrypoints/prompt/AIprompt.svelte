<script>
  import Icon from '@iconify/svelte'
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '../../lib/slideScaleFade.js' // Corrected path if needed
  import { enhancePrompt } from '../../lib/api.js'
  import aiPrompt from '../../lib/prompts/aiPrompt.js'

  let isOpen = $state(false) // State for the dialog
  let enhancedSystemPrompt = $state('')
  let enhancedUserPrompt = $state('')
  let dataget = $state('')

  let loading = false

  const handlePromptEnhance = async () => {
    loading = true
    const systemPrompt = document.getElementById('currentSystemPrompt').value
    const userPrompt = document.getElementById('currentUserPrompt').value

    const prompt = aiPrompt

    try {
      const enhanced = await enhancePrompt(systemPrompt, prompt)
      console.log(enhanced)
      dataget = enhanced
      if (enhanced && enhanced.enhanced_prompts) {
        enhancedSystemPrompt = enhanced.enhanced_prompts.system_prompt
        enhancedUserPrompt = enhanced.enhanced_prompts.user_prompt
      }
    } catch (error) {
      console.error('Lỗi khi gọi API:', error)
      // Xử lý lỗi ở đây, ví dụ: hiển thị thông báo cho người dùng
    } finally {
      loading = false
    }
  }

  const handleApplyPrompt = () => {
    const systemPromptTextarea = document.getElementById('currentSystemPrompt')
    const userPromptTextarea = document.getElementById('currentUserPrompt')

    systemPromptTextarea.value = enhancedSystemPrompt
    userPromptTextarea.value = enhancedUserPrompt
  }
</script>

<button
  onclick={() => {
    isOpen = true
    handlePromptEnhance()
  }}
  class="absolute bottom-6 right-4"
  title="Prompt Enhance"
>
  <div
    class="p-2 relative transition-colors overflow-hidden border border-primary/10 hover:border-primary/20 dark:border-border/70 dark:hover:border-gray-700 text-primary/90 hover:text-primary z-20 bg-radial from-orange-100 dark:from-gray-950 group to-orange-50 dark:to-surface-2 to-60% hover:bg-surface-2 rounded-full"
  >
    <div class="chip__filter overflow-hidden"></div>
    <Icon
      class="group-hover:rotate-12 group-hover:scale-150 ease-in-out transition-transform duration-300"
      icon="octicon:sparkle-fill-16"
      width="16"
      height="16"
    />
  </div>
</button>

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
      class="outline-hidden fixed left-[50%] top-1/2 -translate-y-1/2 w-[calc(100vw-32px)] max-w-5xl z-50 translate-x-[-50%]"
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
              <div class="flex relative p-px gap-4 flex-col">
                <textarea
                  disabled
                  class="resize-none px-4 pt-6 pb-12 outline-0 min-h-48 h-[calc(100vh-10rem)] max-h-[40rem] overflow-auto w-full"
                  >{dataget}</textarea
                >
                <div
                  class="absolute bg-linear-to-t right-2 from-surface-1 to-surface-1/40 bottom-16 mask-t-from-50% h-8 backdrop-blur-[2px] w-full z-30 pointer-events-none"
                ></div>
                <div class="p-4 pt-0">
                  <button
                    class="ml-auto flex relative overflow-hidden group"
                    onclick={handleApplyPrompt}
                  >
                    <div
                      class="font-medium py-2 px-4 border transition-colors duration-200
                      bg-primary group-hover:bg-primary/95 dark:group-hover:bg-orange-500 text-orange-50 dark:text-orange-100/90 border-orange-400 hover:border-orange-300/75 hover:text-white"
                    >
                      Apply prompt
                    </div>
                    <span
                      class="size-4 absolute z-20 -left-2 -bottom-2 border bg-white dark:bg-surface-1 rotate-45 transition-colors duration-200
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
