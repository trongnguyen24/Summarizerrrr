// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { mount, unmount } from 'svelte'

const mocks = vi.hoisted(() => ({
  listMentionSources: vi.fn(),
}))

vi.mock('@/services/chat/tabMentionService.js', () => ({
  tabMentionService: {
    listMentionSources: mocks.listMentionSources,
  },
}))

import TabMentionMenu from '../../../src/components/chat/TabMentionMenu.svelte'

HTMLElement.prototype.scrollIntoView ||= vi.fn()

describe('TabMentionMenu', () => {
  it('renders a tab favicon when browser metadata provides one', async () => {
    const favicon = 'data:image/png;base64,aWNvbg=='
    mocks.listMentionSources.mockResolvedValue([
      {
        id: 7,
        title: 'Example page',
        hostname: 'example.com',
        url: 'https://example.com/page',
        favIconUrl: favicon,
        disabledReason: null,
      },
    ])

    const host = document.createElement('div')
    document.body.appendChild(host)
    const component = mount(TabMentionMenu, {
      target: host,
      props: { open: true },
    })

    await vi.waitFor(() => {
      expect(host.querySelector('img')?.getAttribute('src')).toBe(favicon)
    })

    await unmount(component)
    host.remove()
  })

  it('uses the YouTube favicon for comment sources', async () => {
    const favicon = 'data:image/png;base64,eW91dHViZQ=='
    mocks.listMentionSources.mockResolvedValue([
      {
        id: 'comments-9',
        tabId: 9,
        title: 'YouTube video',
        label: 'Comments · YouTube video',
        hostname: 'www.youtube.com',
        url: 'https://www.youtube.com/watch?v=abc',
        favIconUrl: favicon,
        disabledReason: null,
        isCommentEntry: true,
        kind: 'youtubeComments',
      },
    ])

    const host = document.createElement('div')
    document.body.appendChild(host)
    const component = mount(TabMentionMenu, {
      target: host,
      props: { open: true },
    })

    await vi.waitFor(() => {
      expect(host.querySelector('img')?.getAttribute('src')).toBe(favicon)
      expect(host.querySelector('[data-youtube-comments-icon="true"]')).toBeNull()
    })

    await unmount(component)
    host.remove()
  })
})
