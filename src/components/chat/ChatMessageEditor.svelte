<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'
  import { Editor } from '@tiptap/core'
  import { getEditorExtensions } from '@/lib/chat/composer/editorExtensions.js'
  import { Markdown } from '@/lib/chat/composer/markdownCodec.js'
  import { resolveKey } from '@/lib/chat/composer/keyboardPolicy.js'

  let {
    value = '',
    onsave = null,
    oncancel = null
  } = $props()

  let editorContainer = $state(null)
  let editor = $state(null)
  let editorError = $state(false)
  let fallbackText = $state((() => value)())

  onMount(() => {
    try {
      editor = new Editor({
        element: editorContainer,
        extensions: [
          ...getEditorExtensions({ placeholder: 'Edit your message...' }),
          Markdown
        ],
        content: value,
        contentType: 'markdown',
        autofocus: 'end',
        editorProps: {
          attributes: {
            class: 'w-full text-sm text-text-primary focus:outline-0 focus-visible:outline-0 focus:ring-0 resize-none min-h-[60px] max-h-[200px] overflow-y-auto',
            role: 'textbox',
            'aria-multiline': 'true',
            'aria-label': 'Edit message'
          },
          handleKeyDown(view, event) {
            if (!editor) return false
            const resolvedFrom = editor.state.selection.$from
            const blockType = resolvedFrom.parent.type.name

            const action = resolveKey({
              key: event.key,
              shiftKey: event.shiftKey,
              metaKey: event.metaKey,
              ctrlKey: event.ctrlKey,
              isComposing: event.isComposing,
              keyCode: event.keyCode,
              blockType,
              menuOpen: false,
              disabled: false
            })

            if (action === 'submit') {
              event.preventDefault()
              handleSave()
              return true
            } else if (action === 'hard-break') {
              event.preventDefault()
              editor.commands.setHardBreak()
              return true
            }

            if (event.key === 'Escape') {
              event.preventDefault()
              oncancel?.()
              return true
            }

            return false
          }
        }
      })
    } catch (err) {
      console.warn('[ChatMessageEditor] Fallback to textarea due to editor init error:', err)
      editorError = true
      fallbackText = value
    }
  })

  onDestroy(() => {
    if (editor) {
      editor.destroy()
    }
  })

  function handleSave() {
    if (editorError) {
      onsave?.(fallbackText)
    } else if (editor) {
      onsave?.(editor.getMarkdown())
    }
  }
</script>

{#if editorError}
  <div class="flex w-full flex-col gap-2 rounded-2xl border border-border bg-surface-2 px-3.5 py-2">
    <textarea
      class="w-full resize-none bg-transparent text-sm text-text-primary focus:outline-none"
      rows="3"
      bind:value={fallbackText}
      onkeydown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleSave()
        } else if (e.key === 'Escape') {
          oncancel?.()
        }
      }}
      placeholder="Edit your message..."
    ></textarea>
    <div class="flex justify-end gap-2 border-t border-border/30 pt-1.5">
      <button
        type="button"
        class="rounded-md px-3 py-1 text-xs text-text-secondary hover:bg-blackwhite-5 transition-colors"
        onclick={oncancel}
      >
        Cancel
      </button>
      <button
        type="button"
        class="rounded-md bg-accent px-3 py-1 text-xs text-white hover:bg-accent/80 transition-colors"
        onclick={handleSave}
      >
        Save & Submit
      </button>
    </div>
  </div>
{:else}
  <div class="flex w-full flex-col gap-2 rounded-2xl border border-border bg-surface-2 px-3.5 py-2">
    <div bind:this={editorContainer} class="w-full"></div>
    <div class="flex justify-end gap-2 border-t border-border/30 pt-1.5">
      <button
        type="button"
        class="rounded-md px-3 py-1 text-xs text-text-secondary hover:bg-blackwhite-5 transition-colors"
        onclick={oncancel}
      >
        Cancel
      </button>
      <button
        type="button"
        class="rounded-md bg-accent px-3 py-1 text-xs text-white hover:bg-accent/80 transition-colors"
        onclick={handleSave}
      >
        Save & Submit
      </button>
    </div>
  </div>
{/if}

<style>
  :global(.tiptap) {
    min-height: 60px;
    outline: none;
    font-size: 0.875rem;
    color: var(--color-text-primary);
    word-break: break-word;
  }
  :global(.tiptap p) {
    margin: 0;
  }
  :global(.tiptap ul) {
    list-style-type: disc !important;
    padding-left: 1.25rem !important;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }
  :global(.tiptap ol) {
    list-style-type: decimal !important;
    padding-left: 1.25rem !important;
    margin-top: 0.25rem;
    margin-bottom: 0.25rem;
  }
  :global(.tiptap li) {
    margin-top: 0.125rem;
    margin-bottom: 0.125rem;
  }
  :global(.tiptap blockquote) {
    border-left: 3px solid var(--color-border);
    padding-left: 0.75rem;
    color: var(--color-muted);
    margin: 0.5rem 0;
    font-style: normal;
  }
  :global(.tiptap code) {
    background-color: var(--color-blackwhite-5);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: var(--font-mono);
  }
</style>
