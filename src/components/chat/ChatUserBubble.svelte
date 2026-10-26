<script>
  // @ts-nocheck
  import ChatSkillChip from '@/components/chat/ChatSkillChip.svelte'
  import ChatUserMarkdown from '@/components/chat/ChatUserMarkdown.svelte'

  let { message } = $props()
</script>

<div
  class="flex max-w-[85%] flex-col items-start gap-1.5 rounded-2xl rounded-br-md border border-border bg-surface-2 px-3.5 py-2 text-sm wrap-anywhere text-text-primary"
  data-testid="chat-user-bubble"
>
  {#if message.skillInvocation}
    <ChatSkillChip skill={message.skillInvocation} />
  {/if}
  {#if message.content?.trim()}
    <ChatUserMarkdown source={message.content} />
  {/if}
</div>
