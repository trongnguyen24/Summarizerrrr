// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { mount, flushSync } from 'svelte'
import ChatUserMarkdown from '../../../src/components/chat/ChatUserMarkdown.svelte'

describe('ChatUserMarkdown Component', () => {
  it('renders standard text normally', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    
    mount(ChatUserMarkdown, {
      target: host,
      props: { source: 'Hello world' }
    })
    flushSync()
    
    expect(host.textContent.trim()).toBe('Hello world')
    host.remove()
  })

  it('renders formatting tags structures', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    mount(ChatUserMarkdown, {
      target: host,
      props: { source: '# Heading 1\n- Item 1\n- Item 2\n**Bold Text**' }
    })
    flushSync()

    // Headings are rendered as literal text ("# ..."), not <h1> — matching the
    // composer's minimal "Claude-input" set. Lists / bold still render.
    expect(host.querySelector('h1')).toBeNull()
    expect(host.textContent).toContain('# Heading 1')
    expect(host.querySelectorAll('li').length).toBe(2)
    expect(host.querySelector('strong').textContent.trim()).toBe('Bold Text')
    host.remove()
  })

  it('renders headings and thematic breaks as literal text, not blocks', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    mount(ChatUserMarkdown, {
      target: host,
      props: { source: '## tôi là #1\n\n---' }
    })
    flushSync()

    expect(host.querySelector('h1, h2, h3, h4, h5, h6')).toBeNull()
    expect(host.querySelector('hr')).toBeNull()
    expect(host.textContent).toContain('## tôi là #1')
    expect(host.textContent).toContain('---')
    host.remove()
  })

  it('renders external links with target="_blank" and rel="noopener noreferrer"', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    
    mount(ChatUserMarkdown, {
      target: host,
      props: { source: 'Check [Google](https://google.com)' }
    })
    flushSync()
    
    const link = host.querySelector('a')
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('https://google.com')
    expect(link.getAttribute('target')).toBe('_blank')
    expect(link.getAttribute('rel')).toBe('noopener noreferrer')
    host.remove()
  })

  it('escapes and does not execute raw HTML', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    
    mount(ChatUserMarkdown, {
      target: host,
      props: { source: 'Hello <script>alert("hack")</script><div id="hack-div">Hack</div>' }
    })
    flushSync()
    
    expect(host.querySelector('script')).toBeNull()
    expect(host.querySelector('#hack-div')).toBeNull()
    host.remove()
  })

  it('handles invalid inputs gracefully by rendering them as string fallback', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    
    mount(ChatUserMarkdown, {
      target: host,
      props: { source: null }
    })
    flushSync()
    
    expect(host.textContent.trim()).toBe('')
    host.remove()
  })
})
