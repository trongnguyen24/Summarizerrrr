<script>
  import Icon from '@iconify/svelte'
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '../../lib/slideScaleFade.js' // Corrected path if needed
  import { summarizeContent } from '../../lib/api.js'
  import { settings } from '../../stores/settingsStore.svelte.js'

  let isOpen = $state(false) // State for the dialog
  let enhancedSystemPrompt = $state('')
  let enhancedUserPrompt = $state('')
  let dataget = $state('')

  let loading = false

  const handlePromptEnhance = async () => {
    loading = true
    const systemPrompt = document.getElementById('currentSystemPrompt').value
    const userPrompt = document.getElementById('currentUserPrompt').value

    const prompt = `Bạn là một trợ lý AI chuyên về cải thiện prompt. Nhiệm vụ của bạn là cải thiện các prompt hệ thống và người dùng được cung cấp để rõ ràng, hiệu quả và phù hợp hơn với nhiệm vụ dự định.

Đây là prompt hệ thống:
<system_prompt>
${systemPrompt}
</system_prompt>

Đây là prompt người dùng:
<user_prompt>
${userPrompt}
</user_prompt>

Hãy cung cấp các đề xuất prompt đã được cải thiện cho prompt hệ thống và prompt người dùng.`

    try {
      const selectedProvider = settings.selectedProvider
      const apiKey = settings[selectedProvider + 'ApiKey']
      const model = settings[selectedProvider + 'Model']

      const data = await summarizeContent(
        prompt,
        apiKey,
        model,
        selectedProvider
      )
      console.log(prompt)
      dataget = data

      // enhancedSystemPrompt = data.enhancedSystemPrompt
      // enhancedUserPrompt = data.enhancedUserPrompt
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
  class="p-1 transition-colors hover:bg-surface-1 rounded-full hover:text-text-primary"
  title="Prompt Enhance"
>
  <Icon icon="codicon:sparkle-filled" width="16" height="16" />
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
                <!-- <label for="SystemPrompt" class="text-text-primary"
                  >System Prompt
                </label>
                <p id="enhancedSystemPrompt" class="mb-2">
                  {enhancedSystemPrompt}
                </p>

                <label for="UserPrompt" class=" text-text-primary">
                  User Prompt
                </label>
                <p id="enhancedUserPrompt">{enhancedUserPrompt}</p> -->
                <p>{dataget}</p>

                <div>
                  <button
                    class=" ml-auto flex relative overflow-hidden group"
                    onclick={handleApplyPrompt}
                  >
                    <div
                      class=" font-medium py-2 px-4 border transition-colors duration-200
                      bg-primary group-hover:bg-primary/95 dark:group-hover:bg-orange-500 text-orange-50 dark:text-orange-100/90 border-orange-400 hover:border-orange-300/75 hover:text-white"
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
