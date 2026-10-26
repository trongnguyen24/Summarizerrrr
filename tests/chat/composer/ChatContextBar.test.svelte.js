// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { flushSync, mount } from 'svelte'
import ChatContextBar from '../../../src/components/chat/ChatContextBar.svelte'

// Mock the slideScaleFade transition to avoid animation issues in tests
vi.mock('@/lib/utils/slideScaleFade.js', () => ({
  slideScaleFade: () => ({ delay: 0, duration: 0, css: () => '' }),
}))

// Mock animationService
vi.mock('@/services/animationService.js', () => ({
  isReduceMotionEnabled: () => false,
  shouldAnimate: () => true,
}))

// Mock settingsStore
vi.mock('@/stores/settingsStore.svelte.js', () => ({
  settings: { reduceMotion: false },
}))

HTMLElement.prototype.scrollIntoView ||= vi.fn()

function createHost() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  return host
}

describe('ChatContextBar', () => {
  it('renders title mode when active page only with no tokens', () => {
    const host = createHost()
    const onDismiss = vi.fn()

    mount(ChatContextBar, {
      target: host,
      props: {
        currentUrl: 'https://example.com/page',
        currentTitle: 'My Page Title',
        currentFavIconUrl: 'https://example.com/favicon.ico',
        activeSourceKind: 'webpage',
        activeSourceDismissed: false,
        pendingAttachments: [],
        onDismissActiveSource: onDismiss,
      },
    })
    flushSync()

    const titleBar = host.querySelector('[data-testid="context-bar-title"]')
    expect(titleBar).not.toBeNull()
    expect(host.textContent).toContain('My Page Title')

    // No token text should appear
    expect(host.textContent).not.toContain('tokens')

    // Not a button — title mode is not clickable
    const summaryButton = host.querySelector('[data-testid="context-bar-summary"]')
    expect(summaryButton).toBeNull()

    // A single uncommitted source is directly removable without opening a panel.
    const remove = host.querySelector('[data-testid="context-bar-single-remove"]')
    expect(remove).not.toBeNull()
    remove.click()
    expect(onDismiss).toHaveBeenCalledOnce()

    host.remove()
  })

  it('keeps one measured source in title mode and shows its token estimate', () => {
    const host = createHost()

    mount(ChatContextBar, {
      target: host,
      props: {
        currentUrl: 'https://example.com/page',
        currentTitle: 'Measured Page',
        activeSourceKind: 'webpage',
        activeSourceEstimate: {
          url: 'https://example.com/page',
          sourceKind: 'webpage',
          estimatedTokens: 2400,
          estimating: false,
        },
      },
    })
    flushSync()

    expect(host.querySelector('[data-testid="context-bar-title"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="context-bar-summary"]')).toBeNull()
    expect(host.querySelector('[data-testid="context-bar-tokens"]')?.textContent).toContain('~2.4K tokens')

    host.remove()
  })

  it('renders a committed single source as locked with no remove button', () => {
    const host = createHost()

    mount(ChatContextBar, {
      target: host,
      props: {
        currentUrl: 'https://example.com/page',
        currentTitle: 'Committed Page',
        activeSourceKind: 'webpage',
        committedSources: [{
          sourceId: 'source-1',
          url: 'https://example.com/page',
          title: 'Committed Page',
          sourceKind: 'webpage',
          estimatedTokens: 1800,
          locked: true,
        }],
      },
    })
    flushSync()

    expect(host.querySelector('[data-testid="context-bar-title"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="context-source-locked"]')).not.toBeNull()
    expect(host.querySelector('[data-testid="context-bar-single-remove"]')).toBeNull()
    expect(host.querySelector('button[aria-label^="Remove"]')).toBeNull()

    host.remove()
  })

  it('renders summary mode with tab count and tokens when attachment has estimate', () => {
    const host = createHost()

    mount(ChatContextBar, {
      target: host,
      props: {
        currentUrl: 'https://example.com/page',
        currentTitle: 'My Page',
        currentFavIconUrl: null,
        activeSourceKind: 'webpage',
        activeSourceDismissed: false,
        pendingAttachments: [
          {
            tabId: 201,
            title: 'Attached Tab',
            hostname: 'other.com',
            favIconUrl: 'https://other.com/favicon.ico',
            sourceKind: 'webpage',
            estimatedTokens: 5000,
            estimating: false,
          },
        ],
      },
    })
    flushSync()

    const summaryBar = host.querySelector('[data-testid="context-bar-summary"]')
    expect(summaryBar).not.toBeNull()

    const tabCount = host.querySelector('[data-testid="context-bar-tab-count"]')
    expect(tabCount).not.toBeNull()
    expect(tabCount.textContent).toContain('+ 1 tab')

    const tokens = host.querySelector('[data-testid="context-bar-tokens"]')
    expect(tokens).not.toBeNull()
    expect(tokens.textContent).toContain('~5K tokens')

    host.remove()
  })

  it('uses the YouTube favicon in the context bar after attaching comments', () => {
    const host = createHost()

    mount(ChatContextBar, {
      target: host,
      props: {
        currentUrl: 'https://example.com/page',
        currentTitle: 'Active page',
        currentFavIconUrl: null,
        activeSourceKind: 'webpage',
        activeSourceDismissed: false,
        pendingAttachments: [
          {
            tabId: 301,
            title: 'YouTube Comments',
            hostname: 'youtube.com',
            favIconUrl: 'https://www.youtube.com/favicon.ico',
            sourceKind: 'youtubeComments',
            estimatedTokens: 1200,
            estimating: false,
          },
        ],
      },
    })
    flushSync()

    const summaryBar = host.querySelector('[data-testid="context-bar-summary"]')
    expect(summaryBar?.querySelector('img')?.getAttribute('src')).toBe('https://www.youtube.com/favicon.ico')
    expect(summaryBar?.querySelector('[data-youtube-comments-icon="true"]')).toBeNull()

    summaryBar.click()
    flushSync()
    const panel = host.querySelector('#context-bar-panel')
    expect(panel?.querySelector('img')?.getAttribute('src')).toBe('https://www.youtube.com/favicon.ico')
    expect(panel?.querySelector('[data-youtube-comments-icon="true"]')).toBeNull()

    host.remove()
  })

  it('click expands to show per-source detail; ✕ calls correct callbacks', async () => {
    const onDismiss = vi.fn()
    const onRemoveAttachment = vi.fn()
    const host = createHost()

    mount(ChatContextBar, {
      target: host,
      props: {
        currentUrl: 'https://example.com/page',
        currentTitle: 'Active Page',
        currentFavIconUrl: null,
        activeSourceKind: 'webpage',
        activeSourceDismissed: false,
        pendingAttachments: [
          {
            tabId: 201,
            title: 'Reddit Tab',
            hostname: 'reddit.com',
            favIconUrl: 'https://reddit.com/favicon.ico',
            sourceKind: 'webpage',
            estimatedTokens: 3000,
            estimating: false,
          },
        ],
        onDismissActiveSource: onDismiss,
        onRemoveAttachment,
      },
    })
    flushSync()

    // Click the summary bar to expand
    const summaryBar = host.querySelector('[data-testid="context-bar-summary"]')
    expect(summaryBar).not.toBeNull()
    summaryBar.click()
    flushSync()

    // Expanded panel should show
    const panel = host.querySelector('#context-bar-panel')
    expect(panel).not.toBeNull()

    // Should have two rows (active page + attachment)
    const removeButtons = panel.querySelectorAll('button[aria-label]')
    expect(removeButtons.length).toBe(2)

    // Click ✕ on the active page
    removeButtons[0].click()
    flushSync()
    expect(onDismiss).toHaveBeenCalled()

    // Click ✕ on the attachment
    removeButtons[1].click()
    flushSync()
    expect(onRemoveAttachment).toHaveBeenCalledWith(201, 'webpage')

    host.remove()
  })

  it('renders fallback icon when favIconUrl is undefined', () => {
    const host = createHost()

    mount(ChatContextBar, {
      target: host,
      props: {
        currentUrl: 'https://example.com/page',
        currentTitle: 'Test Page',
        currentFavIconUrl: undefined,
        activeSourceKind: 'webpage',
        activeSourceDismissed: false,
        pendingAttachments: [],
      },
    })
    flushSync()

    // Should not render an <img> — should render the fallback Icon
    const img = host.querySelector('img')
    expect(img).toBeNull()

    host.remove()
  })

  it('renders fallback icon for chrome:// favicon URL', () => {
    const host = createHost()

    mount(ChatContextBar, {
      target: host,
      props: {
        currentUrl: 'https://example.com/page',
        currentTitle: 'Test Page',
        currentFavIconUrl: 'chrome://favicon/size/16@2x/https://example.com',
        activeSourceKind: 'webpage',
        activeSourceDismissed: false,
        pendingAttachments: [],
      },
    })
    flushSync()

    // chrome:// URLs are guarded — should not render an <img>
    const img = host.querySelector('img')
    expect(img).toBeNull()

    host.remove()
  })

  it('renders spinner when source is estimating', () => {
    const host = createHost()

    mount(ChatContextBar, {
      target: host,
      props: {
        currentUrl: 'https://example.com/page',
        currentTitle: 'Active Page',
        currentFavIconUrl: null,
        activeSourceKind: 'webpage',
        activeSourceDismissed: false,
        pendingAttachments: [
          {
            tabId: 201,
            title: 'Estimating Tab',
            hostname: 'example.org',
            favIconUrl: null,
            sourceKind: 'webpage',
            estimatedTokens: null,
            estimating: true,
          },
        ],
      },
    })
    flushSync()

    // Click to expand so we can see individual source rows
    const summaryBar = host.querySelector('[data-testid="context-bar-summary"]')
    summaryBar.click()
    flushSync()

    const panel = host.querySelector('#context-bar-panel')
    expect(panel).not.toBeNull()

    // In the expanded panel, the estimating source row should NOT show
    // the em-dash (unknown) or a token count — it shows a spinner instead
    const rows = panel.querySelectorAll('.flex.items-center.gap-2')
    const estimatingRow = Array.from(rows).find(r => r.textContent.includes('Estimating Tab'))
    expect(estimatingRow).not.toBeNull()

    // The estimating row should NOT contain the em-dash for unknown tokens
    // and should NOT contain a formatted token count
    const tabularSpans = estimatingRow.querySelectorAll('.tabular-nums')
    for (const span of tabularSpans) {
      // Should not show em-dash (that's the "unknown" state, not "estimating")
      expect(span.textContent.trim()).not.toBe('—')
    }

    host.remove()
  })

  it('shows restore button when active source is dismissed', () => {
    const onRestore = vi.fn()
    const host = createHost()

    mount(ChatContextBar, {
      target: host,
      props: {
        currentUrl: 'https://example.com/page',
        currentTitle: 'Dismissed Page',
        currentFavIconUrl: null,
        activeSourceKind: 'webpage',
        activeSourceDismissed: true,
        pendingAttachments: [],
        onRestoreActiveSource: onRestore,
      },
    })
    flushSync()

    // Title mode bar should not render since source is dismissed
    const titleBar = host.querySelector('[data-testid="context-bar-title"]')
    expect(titleBar).toBeNull()

    // Restore button should exist
    const restoreButton = host.querySelector('button[title="Add this page as context"]')
    expect(restoreButton).not.toBeNull()

    restoreButton.click()
    flushSync()
    expect(onRestore).toHaveBeenCalled()

    host.remove()
  })
})
