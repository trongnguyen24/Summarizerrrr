<script>
  import Icon from '@iconify/svelte'
  import { Dialog } from 'bits-ui'
  import { fade } from 'svelte/transition'
  import { slideScaleFade } from '../../lib/slideScaleFade.js' // Corrected path if needed
  import { enhancePrompt } from '../../lib/api.js'

  let isOpen = $state(false) // State for the dialog
  let enhancedSystemPrompt = $state('')
  let enhancedUserPrompt = $state('')
  let dataget = $state('')

  let loading = false

  const handlePromptEnhance = async () => {
    loading = true
    const systemPrompt = document.getElementById('currentSystemPrompt').value
    const userPrompt = document.getElementById('currentUserPrompt').value

    const prompt = `<ROLE>
You are a Prompt Engineering Expert specializing in transforming simple prompts into detailed, structured, and effective instructions for Large Language Models.
</ROLE>
<TASK>
Analyze the user's original prompt and enhance it into a comprehensive, well-structured prompt that produces better results. The enhanced prompt should be ready to use with a '<INPUT_TEXT_TO_PROCESS>__CONTENT__</INPUT_TEXT_TO_PROCESS>' placeholder for dynamic content.
</TASK>
<CONTEXT>
This enhanced prompt will be used in a Chrome extension to help users get better AI responses. Focus on clarity, structure, and practical effectiveness while keeping the output reasonably concise.
</CONTEXT>
<INSTRUCTIONS>
1. **Analyze Intent**: Identify the core purpose and desired outcome of the original prompt
2. **Add Structure**: Include role definition, clear task description, and specific instructions
3. **Specify Format**: Use ## and ### to organize the expected output
4. **Include Guidelines**: Add relevant constraints and quality requirements
5. **Add Placeholder**: End with '<INPUT_TEXT_TO_PROCESS>__CONTENT__</INPUT_TEXT_TO_PROCESS>' to mark the placeholder for user's actual content
</INSTRUCTIONS>
<OUTPUT_STRUCTURE>
Create enhanced prompts with this structure:

Role assignment for the AI
Clear task definition
Step-by-step instructions
Output format using ## and ### headers
Quality guidelines (✅ and ❌)
Content placeholder at the end

</OUTPUT_STRUCTURE>
<QUALITY_REQUIREMENTS>
✅ Preserve the original intent of the user's prompt
✅ Make instructions clear and actionable
✅ Include specific output formatting with ## and ### headers
✅ Keep enhanced prompt under 500 words
✅ End with CONTENT placeholder
❌ Don't change the core purpose of the original prompt
❌ Don't make it overly complex or academic
❌ Don't include unnecessary examples or lengthy explanations
</QUALITY_REQUIREMENTS>
<INPUT_PARAMETERS>
Language for enhanced prompt: __LANG__
Original prompt to enhance:
<PROMPT_TO_ENHANCE>
${userPrompt}
</PROMPT_TO_ENHANCE>
</INPUT_PARAMETERS>
<EXECUTION_RULES>
Return ONLY the enhanced prompt as raw text, ready to use immediately.
Do not include any explanations, greetings, or additional formatting.
</EXECUTION_RULES>`

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
                <textarea
                  disabled
                  class="resize-none outline-0 min-h-48 h-[calc(100vh-10rem)] overflow-auto w-full"
                  >{dataget}</textarea
                >
                <div>
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

<style>
  textarea::-webkit-scrollbar {
    background-color: transparent;
    width: 6px;
    padding: 1px;
  }

  textarea::-webkit-scrollbar-thumb {
    border-radius: 10px;
    background-color: oklch(0.77 0.003 106.6 / 40%);
  }
  textarea::-webkit-scrollbar-thumb:hover {
    background-color: oklch(0.77 0.003 106.6 / 60%);
  }
</style>
