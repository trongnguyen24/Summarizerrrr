<script>
  // @ts-nocheck
  /**
   * One row of the merged archive/history list.
   *
   * Rows come from two different record families (summaries and chats), so the
   * hover action cluster is dispatched on `item.kind` rather than on the tab.
   * This is the single row template for both the matched and dimmed lists —
   * it used to be duplicated three times (twice in SidePanel, once in the old
   * ConversationList), which is why the kind icon lives here.
   */
  import Icon from '@iconify/svelte'
  import { t } from 'svelte-i18n'
  import { slideScaleFade } from '@/lib/utils/slideScaleFade.js'
  import ActionDropdownMenu from '@/entrypoints/archive/components/ActionDropdownMenu.svelte'

  let {
    item,
    isSelected = false,
    dimmed = false,
    activeTab,
    isTouchScreen = false,
    isConfirmingDelete = false,
    deleteCandidateId = null,
    onSelect,
    onAssignTags,
    onRename,
    onDeleteClick,
    onAddToArchive,
    onRemoveFromArchive,
    onResume,
    onToggleChatArchive,
  } = $props()

  let isChat = $derived(item.kind === 'chat')
  // Chats carry a real boolean; history rows use the older isArchived field.
  let isArchived = $derived(
    isChat ? item.raw.archived === true : item.raw.isArchived === true,
  )
</script>

<div
  class="relative group h-10 {dimmed
    ? 'opacity-40 transition-opacity duration-300 ease-in-out'
    : ''}"
>
  <button
    class="list-button w-full relative p-2.5 text-left hover:bg-blackwhite/5 rounded-md {isSelected
      ? 'text-text-primary bg-neutral-100 hover:bg-white/60 dark:hover:bg-white/10 dark:bg-surface-2 active '
      : 'hover:bg-surface-1 dark:hover:bg-surface-2'} {isTouchScreen
      ? 'pr-6'
      : 'pr-8'}"
    onclick={() => onSelect(item)}
    title={item.title}
  >
    <div
      class="flex items-center gap-1.5 w-full mask-r-from-85% mask-r-to-100%"
    >
      <Icon
        class="shrink-0 {isSelected ? '' : 'text-text-muted'}"
        icon={isChat ? 'heroicons:chat-bubble-left-right' : 'heroicons:document-text'}
        width="16"
        height="16"
      />
      <div class="line-clamp-1 transition-colors flex-1">
        {item.title}
      </div>
    </div>
  </button>

  {#if isTouchScreen}
    <div
      class="action-menu-container text-text-muted justify-center rounded-r-sm items-center bg-none top-0 bottom-0 pr-1 right-0 absolute flex"
    >
      <ActionDropdownMenu
        {item}
        {activeTab}
        {isConfirmingDelete}
        {deleteCandidateId}
        {onAssignTags}
        {onRename}
        {onDeleteClick}
        {onAddToArchive}
        {onResume}
        {onToggleChatArchive}
      />
    </div>
  {:else}
    <div
      class="text-text-muted justify-center rounded-r-sm items-center bg-linear-to-l from-surface-1 dark:from-surface-2 from-80% to-surface-1/0 dark:to-surface-2/0 top-0 bottom-0 pl-4 pr-1 right-0 absolute hidden group-hover:flex"
    >
      {#if isChat}
        <button
          onclick={() => onResume(item)}
          class="p-1 hover:text-text-primary"
          title={$t('archive.resume_in_sidepanel')}
        >
          <Icon icon="heroicons:play-solid" width="20" height="20" />
        </button>
        <button
          onclick={() => onToggleChatArchive(item)}
          class="p-1 hover:text-text-primary"
          title={isArchived
            ? $t('tags.remove_from_archive')
            : $t('tags.add_to_archive')}
        >
          <Icon
            icon={isArchived
              ? 'heroicons:archive-box-solid'
              : 'heroicons:archive-box'}
            width="20"
            height="20"
          />
        </button>
      {:else}
        {#if activeTab === 'archive'}
          <button
            onclick={() => onAssignTags(item)}
            class="p-1 hover:text-text-primary"
            title={$t('tags.assign')}
          >
            <Icon icon="tabler:tag" width="20" height="20" />
          </button>
        {/if}
        {#if activeTab === 'history'}
          {#if isArchived}
            <button
              onclick={() => onRemoveFromArchive(item)}
              class="p-1 hover:text-text-primary"
              title={$t('tags.remove_from_archive')}
            >
              <Icon icon="heroicons:archive-box-solid" width="20" height="20" />
            </button>
          {:else}
            <button
              onclick={() => onAddToArchive(item)}
              class="p-1 hover:text-text-primary"
              title={$t('tags.add_to_archive')}
            >
              <Icon icon="heroicons:archive-box" width="20" height="20" />
            </button>
          {/if}
        {/if}
      {/if}

      <button
        onclick={() => onRename(item)}
        class="p-1 hover:text-text-primary"
        title={$t('tags.rename')}
      >
        <Icon icon="tabler:pencil" width="20" height="20" />
      </button>
      <button
        onclick={() => onDeleteClick(item)}
        class="relative rounded-3xl transition-colors duration-150 p-1 {isConfirmingDelete &&
        deleteCandidateId === item.id
          ? 'text-red-50'
          : 'hover:text-text-primary'}"
        title={$t('tags.delete')}
      >
        <Icon
          icon="heroicons:trash"
          width="20"
          height="20"
          class="relative z-10"
        />
        {#if isConfirmingDelete && deleteCandidateId === item.id}
          <span
            transition:slideScaleFade={{
              duration: 150,
              slideFrom: 'bottom',
              startScale: 0.4,
              slideDistance: '0rem',
            }}
            class="rounded-sm block bg-error absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-7"
          >
          </span>
        {/if}
      </button>
    </div>
  {/if}
</div>

<style>
  .list-button::after {
    content: '';
    display: block;
    width: 0px;
    position: absolute;
    background: white;
    top: 50%;
    transform: translateY(-50%) translateX(-0.25rem);
    right: -0.5rem;
    left: -0.5rem;
    height: 1rem;
    border-radius: 0 4px 4px 0;
    transition: all 0.3s ease-in-out;
    box-shadow:
      0 0 2px #ffffff18,
      0 0 0 #ffffff18;
  }

  .list-button.active {
    &::after {
      transform: translateY(-50%) translateX(1px);
      width: 4px;
      box-shadow:
        4px 0 8px 2px #ffffff71,
        0 0 3px 1px #ffffff94;
    }
  }
</style>
