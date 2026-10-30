// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { flushSync, mount, unmount } from 'svelte'
import ChatUserBubble from '../../src/components/chat/ChatUserBubble.svelte'

describe('ChatUserBubble', () => {
  it('renders a skill chip when a user sends a skill without text', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const component = mount(ChatUserBubble, {
      target: host,
      props: {
        message: {
          role: 'user',
          content: '',
          status: 'complete',
          skillInvocation: {
            skillId: 'summarize',
            skillVersion: 3,
            name: 'Summarize',
            instructionSnapshot: 'Summarize the grounded source.',
          },
        },
      },
    })

    flushSync()
    expect(host.textContent).toContain('Summarize')
    expect(host.querySelector('[data-testid="chat-user-bubble"]')).not.toBeNull()

    await unmount(component)
    host.remove()
  })
})
