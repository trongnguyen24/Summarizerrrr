<script>
  import { onMount, onDestroy } from 'svelte'
  import { fade } from 'svelte/transition'
  import { t } from 'svelte-i18n'
  import Cat from './cat.svelte'

  // Notification data with i18n keys
  let notifications = $state([
    {
      id: 1,
      titleKey: 'notifications.api_limits.title',
      descriptionKey: 'notifications.api_limits.description',
      cta: {
        labelKey: 'notifications.api_limits.cta_label',
        link: 'https://www.youtube.com/watch?v=ZLiRcFxzPBI',
      },
    },
    {
      id: 2,
      titleKey: 'notifications.version_update.title',
      descriptionKey: 'notifications.version_update.description',
      cta: {
        labelKey: 'notifications.version_update.cta_label',
        link: 'settings.html?tab=about',
      },
    },
  ])

  let currentIndex = $state(0)
  let isSheetOpen = $state(false)
  let isClosing = $state(false)
  let rotationInterval = null

  // Auto-rotate notifications every 5 seconds
  function startRotation() {
    if (notifications.length <= 1) return
    rotationInterval = setInterval(() => {
      if (!isSheetOpen) {
        currentIndex = (currentIndex + 1) % notifications.length
      }
    }, 5000)
  }

  function stopRotation() {
    if (rotationInterval) {
      clearInterval(rotationInterval)
      rotationInterval = null
    }
  }

  function openSheet() {
    isSheetOpen = true
    isClosing = false
    stopRotation()
  }

  function closeSheet() {
    isClosing = true
    // Wait for animation to complete before hiding
    setTimeout(() => {
      isSheetOpen = false
      isClosing = false
      startRotation()
    }, 300)
  }

  function handleBackdropClick() {
    closeSheet()
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape' && isSheetOpen && !isClosing) {
      closeSheet()
    }
  }

  onMount(() => {
    startRotation()
    window.addEventListener('keydown', handleKeyDown)
  })

  onDestroy(() => {
    stopRotation()
    window.removeEventListener('keydown', handleKeyDown)
  })

  // Current notification to display
  const currentNotification = $derived(
    notifications[currentIndex] || notifications[0],
  )
</script>

{#if notifications.length > 0}
  <!-- Notification Bar -->
  <button
    onclick={openSheet}
    class="fixed left-1/2 -translate-x-1/2 w-full font-mono flex flex-col justify-center max-w-100 bottom-2 z-50 p-2 rounded-full cursor-pointer group"
    aria-label="Open notifications"
  >
    <div
      class="dark:bg-surface-2 bg-background w-full p-0.5 pr-3 dark:border text-text-secondary border-border rounded-4xl flex items-center gap-2 transition-all duration-200 hover:border-border-active hover:bg-surface-3"
    >
      <div
        class="w-8 h-8 flex items-center justify-center bg-blackwhite-5 rounded-full shrink-0"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
        >
          <path
            fill="currentColor"
            d="m12 8l-1.33.09C9.81 7.07 7.4 4.5 5 4.5c0 0-1.97 2.96-.04 6.91c-.55.83-.89 1.26-.96 2.25l-1.93.29l.21.98l1.76-.26l.14.71l-1.57.94l.47.89l1.45-.89C5.68 18.76 8.59 20 12 20s6.32-1.24 7.47-3.68l1.45.89l.47-.89l-1.57-.94l.14-.71l1.76.26l.21-.98l-1.93-.29c-.07-.99-.41-1.42-.96-2.25C20.97 7.46 19 4.5 19 4.5c-2.4 0-4.81 2.57-5.67 3.59zm-3 3a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1m6 0a1 1 0 0 1 1 1a1 1 0 0 1-1 1a1 1 0 0 1-1-1a1 1 0 0 1 1-1m-4 3h2l-.7 1.39c.2.64.76 1.11 1.45 1.11a1.5 1.5 0 0 0 1.5-1.5h.5a2 2 0 0 1-2 2c-.75 0-1.4-.41-1.75-1c-.35.59-1 1-1.75 1a2 2 0 0 1-2-2h.5a1.5 1.5 0 0 0 1.5 1.5c.69 0 1.25-.47 1.45-1.11z"
          />
        </svg>
      </div>
      <div class="flex-1 grid grid-cols-1 grid-rows-1">
        {#key currentIndex}
          <div
            class="text-xs truncate col-start-1 row-start-1 text-left"
            transition:fade={{ duration: 300 }}
          >
            {$t(currentNotification?.titleKey)}
          </div>
        {/key}
      </div>

      <!-- Indicator dots -->
      {#if notifications.length > 1}
        <div class="flex gap-1">
          {#each notifications as _, i}
            <div
              class="w-1.5 h-1.5 rounded-full transition-colors duration-200"
              class:bg-text-primary={i === currentIndex}
              class:bg-border={i !== currentIndex}
            ></div>
          {/each}
        </div>
      {/if}
    </div>
  </button>
{/if}

<!-- Bottom Sheet -->
{#if isSheetOpen}
  <!-- Backdrop -->
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_interactive_supports_focus -->
  <div
    class="fixed inset-0 z-[100] cursor-default bg-transparent border-none"
    onclick={handleBackdropClick}
    role="button"
    aria-label="Close notification sheet"
  ></div>

  <!-- Sheet Content (separate for animation) -->

  <div
    class="fixed bottom-0 max-w-100 w-full left-1/2 -translate-x-1/2 z-[101] flex justify-center"
  >
    <div
      class="relative w-full bg-surface-2 rounded-t-3xl border-t border-x border-surface-2 dark:border-border shadow-2xl"
      class:sheet-open={!isClosing}
      class:sheet-close={isClosing}
      style="height: max(40vh, 320px);"
    >
      <Cat {isClosing} />
      <!-- Drag Handle -->
      <div class="flex justify-center pt-0.5">
        <!-- <div class="w-10 h-1 rounded-full bg-border"></div> -->
        <button
          onclick={closeSheet}
          class="p-1.5 rounded-full hover:bg-surface-3 transition-colors text-text-secondary hover:text-text-primary"
          aria-label="Close notifications"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12z"
            />
          </svg>
        </button>
      </div>

      <!-- Notifications List -->
      <div
        class="overflow-y-auto thin-scroll px-4 py-3 flex flex-col gap-4"
        style="max-height: calc(max(40vh, 320px) - 40px);"
      >
        {#each notifications as notification}
          <div class="">
            <div class="flex flex-col gap-2">
              <div class="flex flex-col gap-1">
                <h3 class="text-sm font-medium text-text-primary">
                  {$t(notification.titleKey)}
                </h3>
                <p class="text-xs text-text-secondary leading-relaxed">
                  {$t(notification.descriptionKey)}
                </p>
              </div>
              {#if notification.cta}
                <button
                  onclick={() =>
                    browser.tabs.create({ url: notification.cta.link })}
                  class="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors w-fit cursor-pointer"
                >
                  {$t(notification.cta.labelKey)}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="currentColor"
                      d="M16.175 13H4v-2h12.175l-5.6-5.6L12 4l8 8l-8 8l-1.425-1.4z"
                    />
                  </svg>
                </button>
              {/if}
            </div>
          </div>
        {/each}

        {#if notifications.length === 0}
          <div
            class="flex flex-col items-center justify-center py-8 text-text-tertiary"
          >
            <p class="text-xs">{$t('notifications.no_notifications')}</p>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .sheet-open {
    animation: sheet-slide-up 0.3s ease-out forwards;
  }

  .sheet-close {
    animation: sheet-slide-down 0.3s ease-out forwards;
  }

  @keyframes sheet-slide-up {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }

  @keyframes sheet-slide-down {
    from {
      transform: translateY(0);
    }
    to {
      transform: translateY(100%);
    }
  }
</style>
