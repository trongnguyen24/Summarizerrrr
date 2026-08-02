<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ChatSourceIcon from '@/entrypoints/sidepanel/components/chat/ChatSourceIcon.svelte'
  import { formatK } from '@/lib/utils/formatTokens.js'
  import {
    labelForSourceKind,
    iconForSourceKind,
    activeSourceLabelForUrl,
  } from '@/services/chat/sourceResolution.js'
  import { slideScaleFade } from '@/lib/utils/slideScaleFade.js'

  let {
    /** @type {string|null} */
    currentUrl = null,
    /** @type {string|null} */
    currentTitle = null,
    /** @type {string|null} */
    currentFavIconUrl = null,
    /** @type {string|null} */
    activeSourceKind = null,
    /** @type {boolean} */
    activeSourceDismissed = false,
    /** @type {object|null} Lazy current-page token estimate. */
    activeSourceEstimate = null,
    /** @type {Array} Sources already included in the active AI context path. */
    committedSources = [],
    /** @type {Array} */
    pendingAttachments = [],
    /** @type {Record<string,number>|null} Per-source token map from Phase 3 diagnostics. */
    sourceTokens = null,
    /** @type {Function} */
    onDismissActiveSource = () => {},
    /** @type {Function} */
    onRestoreActiveSource = () => {},
    /** @type {Function} */
    onRemoveAttachment = () => {},
  } = $props()

  let expanded = $state(false)

  function normalizeUrl(url) {
    try {
      const normalized = new URL(url)
      normalized.hash = ''
      return normalized.toString()
    } catch {
      return String(url || '')
    }
  }

  function isCurrentSource(source) {
    return Boolean(
      currentUrl &&
        normalizeUrl(source.url || source.normalizedUrl) ===
          normalizeUrl(currentUrl) &&
        (!source.sourceKind ||
          !activeSourceKind ||
          source.sourceKind === activeSourceKind),
    )
  }

  const hasCommittedCurrent = $derived(committedSources.some(isCurrentSource))

  // Build a unified sources list from active page + pending attachments
  const sources = $derived.by(() => {
    const list = []
    const committedIds = new Set(
      committedSources.map((source) => source.sourceId).filter(Boolean),
    )
    const committedCurrent = committedSources.find(isCurrentSource)

    // Keep the current page first. Once it has entered AI context, reuse the
    // committed record so the row becomes locked instead of rendering twice.
    if (committedCurrent) {
      list.push({
        key: `committed-${committedCurrent.sourceId}`,
        title: currentTitle || committedCurrent.title,
        favIconUrl: currentFavIconUrl || committedCurrent.favIconUrl,
        kind: committedCurrent.sourceKind || activeSourceKind,
        tokens:
          committedCurrent.estimatedTokens ??
          sourceTokens?.[committedCurrent.sourceId] ??
          null,
        estimating: false,
        isActivePage: true,
        locked: true,
        onRemove: null,
      })
    } else if (activeSourceKind && !activeSourceDismissed) {
      const estimateMatches =
        activeSourceEstimate &&
        normalizeUrl(activeSourceEstimate.url) === normalizeUrl(currentUrl) &&
        activeSourceEstimate.sourceKind === activeSourceKind
      list.push({
        key: 'active-page',
        title: currentTitle || activeSourceLabelForUrl(currentUrl || ''),
        favIconUrl: currentFavIconUrl,
        kind: activeSourceKind,
        tokens: estimateMatches ? activeSourceEstimate.estimatedTokens : null,
        estimating: estimateMatches ? activeSourceEstimate.estimating : false,
        isActivePage: true,
        locked: estimateMatches
          ? Boolean(activeSourceEstimate.submitted)
          : false,
        onRemove:
          estimateMatches && activeSourceEstimate.submitted
            ? null
            : onDismissActiveSource,
      })
    }

    for (const source of committedSources) {
      if (source === committedCurrent) continue
      list.push({
        key: `committed-${source.sourceId}`,
        title: source.title || 'Context source',
        favIconUrl: source.favIconUrl ?? null,
        kind: source.sourceKind,
        tokens:
          source.estimatedTokens ?? sourceTokens?.[source.sourceId] ?? null,
        estimating: false,
        isActivePage: false,
        locked: true,
        onRemove: null,
      })
    }

    // Pending attachments
    for (const att of pendingAttachments) {
      if (att.sourceId && committedIds.has(att.sourceId)) continue
      list.push({
        key: `${att.tabId}-${att.sourceKind || 'auto'}`,
        title: att.title || att.hostname || 'Attached tab',
        favIconUrl: att.favIconUrl ?? null,
        kind: att.sourceKind,
        tokens: att.estimatedTokens,
        estimating: att.estimating ?? false,
        isActivePage: false,
        locked: Boolean(att.submitted),
        onRemove: att.submitted
          ? null
          : () => onRemoveAttachment(att.tabId, att.sourceKind),
      })
    }

    return list
  })

  const knownTokens = $derived(
    sources.reduce((sum, s) => sum + (s.tokens || 0), 0),
  )
  const addedCount = $derived(sources.filter((s) => !s.isActivePage).length)

  // A single source stays directly manageable. Only multiple sources open the
  // expandable manager, regardless of whether token measurement has completed.
  const mode = $derived(sources.length > 1 ? 'summary' : 'title')
  const canRestoreActive = $derived(
    Boolean(currentUrl && activeSourceDismissed && !hasCommittedCurrent),
  )

  // First 3 sources for the favicon stack
  const stackSources = $derived(sources.slice(0, 3))

  function toggleExpand() {
    expanded = !expanded
  }

  function handleExpandKeydown(event) {
    if (event.key === 'Escape') {
      expanded = false
      event.stopPropagation()
    }
  }

  function handleClickOutside(event) {
    // Close expanded panel on outside click
    expanded = false
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
{#if sources.length > 0 || (currentUrl && activeSourceDismissed)}
  <div class="relative" onkeydown={handleExpandKeydown}>
    <!-- Expanded panel (above the bar) -->
    {#if expanded && mode === 'summary'}
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <div
        class="fixed inset-0 z-10"
        onclick={handleClickOutside}
        role="presentation"
      ></div>
      <div
        id="context-bar-panel"
        class="absolute bottom-full left-0 right-0 z-20 mb-px flex flex-col border border-border/40 bg-surface-2 px-0.5 py-0.5"
        transition:slideScaleFade={{
          slideFrom: 'bottom',
          slideDistance: '0.25rem',
          startScale: 0.98,
          startOpacity: 0,
          duration: 200,
        }}
      >
        {#each sources as source (source.key)}
          <div
            class="flex items-center gap-2 px-2.5 py-1.5 text-xs hover:bg-surface-1"
          >
            <ChatSourceIcon
              favIconUrl={source.favIconUrl}
              fallbackIcon={iconForSourceKind(source.kind)}
              size={14}
            />
            <span
              class="min-w-0 flex-1 truncate text-text-secondary"
              title={source.title}
            >
              {source.title}
            </span>
            {#if source.kind}
              <span class="shrink-0 text-[10px] text-text-tertiary"
                >{labelForSourceKind(source.kind)}</span
              >
            {/if}
            <span class="shrink-0 tabular-nums text-text-tertiary">
              {#if source.estimating}
                <Icon icon="svg-spinners:ring-resize" width="12" height="12" />
              {:else if source.tokens != null}
                ~{formatK(source.tokens)}
              {:else}
                —
              {/if}
            </span>
            {#if source.locked}
              <span
                class="shrink-0 text-text-tertiary"
                title="Already included in AI context"
                data-testid="context-source-locked"
              >
                <Icon
                  icon="heroicons:lock-closed-solid"
                  width="12"
                  height="12"
                />
              </span>
            {:else if source.onRemove}
              <button
                type="button"
                class="shrink-0 rounded-full p-0.5 text-text-tertiary hover:bg-surface-3 hover:text-text-primary"
                aria-label="Remove {source.title}"
                onclick={(e) => {
                  e.stopPropagation()
                  source.onRemove()
                }}
              >
                <Icon icon="tabler:x" width="12" height="12" />
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Context bar -->
    {#if mode === 'title' && sources.length > 0}
      <!-- UI-1: one source — title, lazy token state, and direct remove/lock. -->
      <div
        class="flex relative items-center gap-1.5 bg-surface-2 border border-border/40 px-3 pt-1.5 pb-3 text-xs text-text-secondary"
        data-testid="context-bar-title"
      >
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5 bg-linear-to-t from-black/25 to-black/0"
        ></div>
        <ChatSourceIcon
          favIconUrl={sources[0].favIconUrl}
          fallbackIcon={iconForSourceKind(sources[0].kind)}
          size={14}
        />
        <span class="min-w-0 flex-1 truncate" title={sources[0].title}>
          {sources[0].title}
        </span>
        {#if sources[0].estimating}
          <Icon
            icon="svg-spinners:ring-resize"
            width="12"
            height="12"
            class="shrink-0 text-text-tertiary"
            data-testid="context-bar-estimating"
          />
        {:else if sources[0].tokens != null}
          <span
            class="shrink-0 tabular-nums text-text-tertiary"
            data-testid="context-bar-tokens"
          >
            ~{formatK(sources[0].tokens)} tokens
          </span>
        {/if}
        {#if sources[0].locked}
          <span
            class="shrink-0 text-text-tertiary"
            title="Already included in AI context"
            data-testid="context-source-locked"
          >
            <Icon icon="heroicons:lock-closed-solid" width="12" height="12" />
          </span>
        {:else if sources[0].onRemove}
          <button
            type="button"
            class="shrink-0 rounded-full p-0.5 text-text-tertiary hover:bg-surface-3 hover:text-text-primary"
            aria-label="Remove {sources[0].title}"
            onclick={(event) => {
              event.stopPropagation()
              sources[0].onRemove()
            }}
            data-testid="context-bar-single-remove"
          >
            <Icon icon="tabler:x" width="12" height="12" />
          </button>
        {/if}
      </div>
    {:else if mode === 'summary'}
      <!-- UI-2: Summary mode — favicon stack + count + tokens, clickable -->
      <button
        type="button"
        class="flex w-full relative items-center gap-1.5 bg-surface-2 border border-border/40 px-3 pt-1.5 pb-3 text-xs text-text-secondary transition-colors"
        aria-expanded={expanded}
        aria-controls="context-bar-panel"
        onclick={toggleExpand}
        data-testid="context-bar-summary"
      >
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-5 bg-linear-to-t from-black/25 to-black/0"
        ></div>
        <!-- Favicon stack -->
        <div class="flex shrink-0 items-center">
          {#each stackSources as source, i (source.key)}
            <div
              class="rounded-full ring-2 ring-surface-2"
              style:margin-left={i > 0 ? '-4px' : '0'}
              style:z-index={stackSources.length - i}
              style:position="relative"
            >
              <ChatSourceIcon
                favIconUrl={source.favIconUrl}
                fallbackIcon={iconForSourceKind(source.kind)}
                size={14}
              />
            </div>
          {/each}
        </div>

        {#if addedCount > 0}
          <span
            class="shrink-0 text-text-tertiary"
            data-testid="context-bar-tab-count"
          >
            + {addedCount} tab{addedCount !== 1 ? 's' : ''}
          </span>
        {/if}

        <span class="flex-1"></span>

        {#if knownTokens > 0}
          <span
            class="shrink-0 tabular-nums text-text-tertiary"
            data-testid="context-bar-tokens"
          >
            ~{formatK(knownTokens)} tokens
          </span>
        {/if}

        <Icon
          icon="heroicons:chevron-up"
          width="12"
          height="12"
          class="shrink-0 text-text-tertiary transition-transform {expanded
            ? ''
            : 'rotate-180'}"
        />
      </button>
    {/if}

    <!-- Restore button (when active source is dismissed) -->
    {#if canRestoreActive}
      <div class="flex items-center px-1 py-0.5">
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2.5 py-1 text-xs text-text-tertiary transition-colors hover:border-text-tertiary hover:text-text-secondary"
          onclick={onRestoreActiveSource}
          title="Add this page as context"
        >
          <Icon icon="heroicons:plus" width="14" height="14" />
          {activeSourceLabelForUrl(currentUrl || '')}
        </button>
      </div>
    {/if}
  </div>
{/if}
