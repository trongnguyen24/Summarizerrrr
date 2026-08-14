<script>
  // @ts-nocheck
  import { tick } from 'svelte'
  import Icon from '@iconify/svelte'
  import StreamingMarkdownV2 from '@/components/markdown/StreamingMarkdownV2.svelte'
  import DisplaySettingsControls from '@/entrypoints/archive/components/displays/DisplaySettingsControls.svelte'
  import TOC from '@/entrypoints/archive/components/TOCArchive.svelte'
  import TOCSidebar from '@/entrypoints/archive/components/TOCSidebar.svelte'
  import { settings } from '@/stores/settingsStore.svelte.js'
  import { getTocMode } from '@/stores/tocModeStore.svelte.js'
  import { formatDate } from '@/lib/utils/utils.js'
  import { isRTLLanguage } from '@/lib/utils/rtlUtils.js'
  import {
    renameArchivedConversation,
    setArchivedConversationState,
    deleteArchivedConversation,
    exportArchivedConversation,
    resumeArchivedConversation,
  } from '@/stores/conversationArchiveStore.svelte.js'

  let {
    conversation,
    messages = [],
    sources = [],
    onRefresh = null,
    isSidePanelVisible = true,
    activeTab = 'history',
  } = $props()
  let title = $state('')
  let editing = $state(false)
  let lastConversationId = $state(null)
  const sourcesById = $derived(
    new Map(sources.map((source) => [source.id, source])),
  )
  const primarySource = $derived(sources.find((source) => source?.url) || null)
  const sourceHost = $derived.by(() => {
    try {
      return new URL(primarySource?.url || '').hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  })
  const isRTL = $derived(isRTLLanguage(settings.summaryLang))
  const isTocSidebar = $derived(getTocMode() === 'sidebar')
  const contentGridClass = $derived.by(() => {
    const start = isSidePanelVisible ? '!col-start-2' : 'col-start-1'
    const mdSpan = isSidePanelVisible ? 'md:col-span-1' : 'md:col-span-2'
    let xlSpan = 'xl:col-span-3'
    if (isSidePanelVisible && isTocSidebar) xlSpan = 'xl:col-span-1'
    else if (!isSidePanelVisible && isTocSidebar) xlSpan = 'xl:col-span-2'
    else if (isSidePanelVisible && !isTocSidebar) xlSpan = 'xl:col-span-2'
    return `${start} ${mdSpan} ${xlSpan}`
  })

  // Match SummaryDisplay typography controls
  const fontSizeClasses = [
    'prose-base prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg',
    'prose-lg prose-h1:text-[1.675rem] prose-h2:text-2xl prose-h3:text-xl',
    'prose-xl prose-h1:text-3xl prose-h2:text-[1.675rem]  prose-h3:[1.425rem]',
    'prose-2xl prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl',
  ]
  const widthClasses = ['max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl']
  const fontMap = {
    default: 'font-default',
    'noto-serif': 'font-noto-serif',
    opendyslexic: 'font-opendyslexic',
    mali: 'font-mali',
  }

  $effect(() => {
    title = conversation?.title || ''
  })

  $effect(() => {
    const conversationId = conversation?.id
    if (conversationId && conversationId !== lastConversationId) {
      lastConversationId = conversationId
      tick().then(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    }
  })

  async function update(action) {
    await action()
    await onRefresh?.()
  }
  async function saveTitle() {
    await update(() => renameArchivedConversation(conversation.id, title))
    editing = false
  }
</script>

<div
  class="relative grid md:grid-cols-[minmax(20rem,20rem)_1fr] xl:grid-cols-[minmax(20rem,20rem)_1fr_minmax(20rem,20rem)]"
>
  {#if conversation}
    <div class={contentGridClass}>
      <div
        class="prose px-8 md:px-16 {widthClasses[
          settings.widthIndex
        ]} mx-auto {fontSizeClasses[settings.fontSizeIndex]} {fontMap[
          settings.selectedFont
        ]} pt-12 pb-[35vh] summary-content"
      >
        <div
          class="top-0 right-0 absolute {getTocMode() === 'sidebar'
            ? 'xl:-translate-x-80'
            : 'translate-x-0'}"
        >
          <DisplaySettingsControls />
        </div>

        <!-- Header: centered meta + serif title -->
        <div class="flex flex-col gap-2">
          <div
            class="font-mono text-text-muted text-xs flex md:flex-row flex-col gap-2 py-8 md:gap-8 justify-center items-center"
          >
            <div class="flex justify-center items-center gap-1">
              <Icon height="16" width="16" icon="lucide:clock" />
              {formatDate(conversation.updatedAt)}
            </div>
            {#if primarySource}
              <div class="flex justify-center items-center gap-1">
                <Icon height="16" width="16" icon="lucide:link" />
                <a
                  href={primarySource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {sourceHost || 'Source'}
                </a>
              </div>
            {/if}
            <div class="flex justify-center items-center gap-1">
              <Icon
                height="16"
                width="16"
                icon={conversation.archived
                  ? 'heroicons:archive-box-solid'
                  : 'lucide:message-circle'}
              />
              {conversation.archived ? 'Archived' : 'Active'}
            </div>
          </div>

          {#if editing}
            <input
              class="mx-auto w-full text-center font-noto-serif font-serif text-blackwhite leading-[1.2] bg-transparent outline-none border-b border-border focus:border-blackwhite/40"
              bind:value={title}
              onkeydown={(event) => event.key === 'Enter' && saveTitle()}
              onblur={saveTitle}
            />
          {:else}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <h1
              class="mx-auto font-noto-serif my-0 p-0 text-blackwhite text-balance text-center font-serif leading-[1.2] cursor-text hover:text-primary transition-colors"
              onclick={() => (editing = true)}
              title="Click to rename"
            >
              {conversation.title}
            </h1>
          {/if}
        </div>

        <!-- Messages -->
        <div
          id="conversation-content"
          dir={isRTL ? 'rtl' : 'ltr'}
          class="mt-10 flex flex-col gap-6 text-text-secondary {isRTL
            ? 'rtl-content'
            : ''}"
        >
          {#each messages as message (message.id)}
            <section
              class="flex flex-col gap-2 {message.role === 'user'
                ? 'items-end'
                : 'items-start'}"
            >
              {#if message.skillInvocation}
                <span
                  class="not-prose rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary"
                  >Skill: {message.skillInvocation.skillId}</span
                >
              {/if}
              {#if message.attachmentRefs?.length}
                <div class="not-prose flex flex-wrap gap-1">
                  {#each message.attachmentRefs as sourceId}
                    <a
                      class="rounded-full border border-border bg-surface-2 px-2 py-1 text-xs text-text-secondary"
                      href={sourcesById.get(sourceId)?.url}
                      target="_blank"
                      rel="noreferrer"
                      >{sourcesById.get(sourceId)?.title ||
                        'Captured source'}</a
                    >
                  {/each}
                </div>
              {/if}
              {#if message.role === 'user'}
                <div
                  class="not-prose max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary/10 px-3.5 py-2 text-sm text-text-primary"
                >
                  {message.content}
                </div>
              {:else}
                <div class="w-full">
                  <StreamingMarkdownV2
                    sourceMarkdown={message.content}
                    enableCursor={false}
                    enableHighlight={true}
                    summaryLang={settings.summaryLang}
                    isLoading={false}
                  />
                </div>
              {/if}
            </section>
          {:else}
            <p class="text-text-secondary">This conversation has no messages.</p>
          {/each}
        </div>

        <!-- Footer decoration + actions (matches SummaryDisplay) -->
        <div
          id="footer"
          class="w-fit mx-auto relative mt-12 flex justify-center items-center gap-1.5"
        >
          <div class="absolute left-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="9"
              height="9"
              fill="none"
            >
              <path d="M4 0h1v9H4z" fill="currentColor" />
              <path d="M9 4v1H0V4z" fill="currentColor" />
            </svg>
          </div>
          <span class="h-px w-8 md:w-16 bg-border/70"></span>

          <button
            class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200 flex items-center justify-center"
            title="Resume in side panel"
            onclick={() => update(() => resumeArchivedConversation(conversation.id))}
          >
            <Icon icon="heroicons:play-solid" width="20" height="20" />
          </button>
          <button
            class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200 flex items-center justify-center"
            title={conversation.archived ? 'Unarchive' : 'Archive'}
            onclick={() =>
              update(() =>
                setArchivedConversationState(
                  conversation.id,
                  !conversation.archived,
                ),
              )}
          >
            <Icon
              icon={conversation.archived
                ? 'heroicons:archive-box-solid'
                : 'heroicons:archive-box'}
              width="20"
              height="20"
            />
          </button>
          <button
            class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200 flex items-center justify-center"
            title="Export Markdown"
            onclick={() => exportArchivedConversation(conversation.id, 'markdown')}
          >
            <Icon icon="heroicons:document-text" width="20" height="20" />
          </button>
          <button
            class="p-1.5 size-8 relative hover:bg-blackwhite/10 rounded-4xl transition-all duration-200 flex items-center justify-center"
            title="Export JSON"
            onclick={() => exportArchivedConversation(conversation.id, 'json')}
          >
            <Icon icon="heroicons:code-bracket" width="20" height="20" />
          </button>
          <button
            class="p-1.5 size-8 relative hover:bg-blackwhite/10 hover:text-error rounded-4xl transition-all duration-200 flex items-center justify-center"
            title="Delete conversation"
            onclick={() => update(() => deleteArchivedConversation(conversation.id))}
          >
            <Icon icon="heroicons:trash" width="20" height="20" />
          </button>

          <span class="h-px w-8 md:w-16 bg-border/70"></span>
          <div class="absolute right-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="9"
              height="9"
              fill="none"
            >
              <path d="M4 0h1v9H4z" fill="currentColor" />
              <path d="M9 4v1H0V4z" fill="currentColor" />
            </svg>
          </div>
        </div>
      </div>
    </div>
    <TOC targetDivId="conversation-content" {activeTab} />
    <TOCSidebar targetDivId="conversation-content" {activeTab} />
  {:else}
    <p
      class="text-center flex flex-col gap-4 items-center justify-center text-text-secondary py-8 h-svh"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="48"
        height="48"
        viewBox="0 0 24 24"
      >
        <g
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1"
        >
          <path d="M8 9h8M8 13h6" />
          <path
            d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"
          />
        </g>
      </svg>
      No conversation selected.
    </p>
  {/if}
</div>
