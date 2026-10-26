<script>
  // @ts-nocheck
  import { onMount, onDestroy } from 'svelte'
  import { Editor } from '@tiptap/core'
  import { getEditorExtensions } from '@/lib/chat/composer/editorExtensions.js'
  import { Markdown } from '@/lib/chat/composer/markdownCodec.js'
  import { resolveKey } from '@/lib/chat/composer/keyboardPolicy.js'
  import { TabMentionExtension } from '@/lib/chat/composer/tabMentionExtension.js'
  import { SkillSuggestionExtension } from '@/lib/chat/composer/skillSuggestionExtension.js'

  let {
    value = '',
    skill = null,
    disabled = false,
    placeholder = 'Ask about this page...',
    autofocus = false,
    onchange = null,
    onsubmit = null,
    onmentionchange = null,
    onskillchange = null,
    onskilltokenchange = null,
    oniniterror = null,
    onkeydown = null,
    'aria-label': ariaLabel = 'Chat message',
  } = $props()

  let editorContainer = $state(null)
  let editor = $state(null)
  let isUpdatingFromProp = false
  let localMentionOpen = false
  let localSkillOpen = false

  export function focus() {
    if (editor) {
      editor.commands.focus('end')
    }
  }

  export function getMarkdown() {
    return editor ? editor.getMarkdown() : ''
  }

  export function insertMarkdown(markdown) {
    if (editor) {
      editor.commands.insertContent(markdown, { contentType: 'markdown' })
    }
  }

  export function deleteRange(range) {
    if (editor && range) {
      editor.commands.deleteRange({ from: range.from, to: range.to })
    }
  }

  /** Replace the typed `/query` at `range` with the inline skill token. */
  export function insertSkillToken(nextSkill, range = null) {
    if (!editor || !nextSkill) return
    editor.commands.setSkillToken(
      {
        skillId: nextSkill.skillId || nextSkill.id || null,
        name: nextSkill.name || nextSkill.skillId || '',
      },
      range,
    )
  }

  function hasSkillToken() {
    if (!editor) return false
    let found = false
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'skillToken') {
        found = true
        return false
      }
    })
    return found
  }

  // Update editor when value changes externally
  $effect(() => {
    if (editor && value !== undefined) {
      const currentMarkdown = editor.getMarkdown()
      if (value !== currentMarkdown) {
        isUpdatingFromProp = true
        const wasFocused = editor.isFocused
        editor.commands.setContent(value, { contentType: 'markdown' })
        if (wasFocused) {
          editor.commands.focus('end')
        }
        isUpdatingFromProp = false
        // The token serializes to nothing, so setContent just wiped it. Put it
        // back if the skill is still selected.
        if (skill && !hasSkillToken()) insertSkillToken(skill)
      }
    }
  })

  // Keep the inline token in step with the selected skill, in both directions.
  // Removing it is not optional housekeeping: the token serializes to '', so
  // clearing `composerText` on submit leaves `value === getMarkdown()` and the
  // effect above never runs — this is the only thing that takes the token out.
  $effect(() => {
    if (!editor) return
    if (skill) {
      if (!hasSkillToken()) insertSkillToken(skill)
    } else if (hasSkillToken()) {
      editor.commands.unsetSkillToken()
    }
  })

  // Update editor disabled state
  $effect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  })

  onMount(() => {
    try {
      editor = new Editor({
        element: editorContainer,
        extensions: [
          ...getEditorExtensions({ placeholder }),
          Markdown,
          TabMentionExtension.configure({
            onMentionStateChange: ({ open, query, range, clientRect }) => {
              localMentionOpen = open
              onmentionchange?.({ open, query, range, clientRect })
            },
            // Return true to consume the key so the editor doesn't act on it.
            onMentionKeyDown: (event) => onkeydown?.(event) ?? false,
          }),
          SkillSuggestionExtension.configure({
            onSkillStateChange: ({ open, query, range, clientRect }) => {
              localSkillOpen = open
              onskillchange?.({ open, query, range, clientRect })
            },
            onSkillKeyDown: (event) => onkeydown?.(event) ?? false,
          }),
        ],
        content: value,
        contentType: 'markdown',
        editable: !disabled,
        autofocus: autofocus ? 'end' : false,
        editorProps: {
          attributes: {
            class:
              'w-full text-sm text-text-primary placeholder:text-muted pl-1 py-2 focus:outline-0 focus-visible:outline-0 focus:ring-0 transition-colors shadow-none duration-200 resize-none overflow-y-auto disabled:opacity-60 min-h-[24px]',
            'aria-label': ariaLabel,
            role: 'textbox',
            'aria-multiline': 'true',
          },
          handleKeyDown(view, event) {
            if (!editor) return false
            // While the mention menu is open, the Suggestion plugin owns the
            // keyboard (navigation + selection), so don't act on keys here.
            if (localMentionOpen || localSkillOpen) return false

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
              disabled,
            })

            if (action === 'submit') {
              event.preventDefault()
              onsubmit?.()
              return true
            } else if (action === 'hard-break') {
              event.preventDefault()
              editor.commands.setHardBreak()
              return true
            } else if (action === 'ignore') {
              // Return true for enter to prevent new lines when suggestion menu is active
              if (event.key === 'Enter') {
                event.preventDefault()
                return true
              }
            }
            return false
          },
        },
        onUpdate() {
          if (!isUpdatingFromProp) {
            const markdown = editor.getMarkdown()
            onchange?.(markdown)
            // Backspacing over the token is how the user clears the skill, so
            // the store has to learn about it from the document.
            onskilltokenchange?.(hasSkillToken())
          }
        },
      })
      // A remount (chat tab switch) rebuilds the doc from markdown, which
      // carries no token — the sync effect above re-seeds it from `skill`.
    } catch (err) {
      if (editor) {
        editor.destroy()
        editor = null
      }
      oniniterror?.(err)
    }
  })

  onDestroy(() => {
    if (editor) {
      editor.destroy()
    }
  })
</script>

<div class="relative w-full">
  <!-- The editor is a contenteditable, so the `disabled:` Tailwind variant on
       its class list never matches. Dim it here instead, otherwise a locked
       input is indistinguishable from a live one. -->
  <div
    class="chat-rich-text-input flex w-full items-start max-h-[220px] overflow-y-auto transition-opacity"
    class:opacity-60={disabled}
  >
    <div bind:this={editorContainer} class="w-full"></div>
  </div>
  <div
    class="pointer-events-none absolute inset-x-0 top-0 z-10 h-2 bg-linear-to-b from-surface-2 to-surface-2/0"
  ></div>
  <div
    class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-2 bg-linear-to-t from-surface-2 to-surface-2/0"
  ></div>
</div>

<style>
  .chat-rich-text-input {
    position: relative;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  .chat-rich-text-input::-webkit-scrollbar {
    width: 6px;
    background: transparent;
  }

  .chat-rich-text-input::-webkit-scrollbar-track {
    background: transparent;
  }

  .chat-rich-text-input::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 9999px;
  }

  :global(.tiptap) {
    min-height: 24px;
    outline: none;
    font-size: 0.875rem; /* text-sm */
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

  /* Highlight the active "@query" while the mention menu is open. */
  :global(.tiptap .suggestion) {
    color: var(--color-primary);
    background-color: var(--color-primary-10, rgba(99, 102, 241, 0.12));
    border-radius: 0.25rem;
    padding: 0 0.125rem;
  }

  /* The selected skill, inline in the input. Plain `/name` — it should read as
     part of what you typed, not as a badge. */
  :global(.tiptap .skill-token) {
    color: var(--color-text-secondary);
    white-space: nowrap;
    margin-right: 0.25rem;
  }

  :global(.tiptap .skill-token.ProseMirror-selectednode) {
    background-color: var(--color-blackwhite-5);
    border-radius: 0.25rem;
  }

  :global(.tiptap code) {
    background-color: var(--color-blackwhite-5);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-family: var(--font-mono);
  }

  /* Placeholders styling */
  :global(.tiptap p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-text-muted, #9ca3af);
    opacity: 0.4;
    pointer-events: none;
    height: 0;
  }

  :global(.tiptap.is-editor-empty::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--color-text-muted, #9ca3af);
    pointer-events: none;
    height: 0;
  }
</style>
