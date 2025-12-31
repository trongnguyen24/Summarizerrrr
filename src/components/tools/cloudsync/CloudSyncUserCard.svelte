<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import SyncDebugLogs from './SyncDebugLogs.svelte'

  let {
    userPicture,
    userName,
    userEmail,
    lastSyncTime,
    isSyncing,
    debugLogs,
    onSyncNow,
    onLogout,
  } = $props()

  let now = $state(Date.now())
  let showDebugLogs = $state(false)

  $effect(() => {
    const interval = setInterval(() => {
      now = Date.now()
    }, 30000)
    return () => clearInterval(interval)
  })

  function formatLastSyncTime(isoString, currentNow) {
    if (!isoString) return 'Never'

    const date = new Date(isoString)
    const diffMs = currentNow - date
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`

    // After 1 hour, show full date and time
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
</script>

<div class="relative bg-background overflow-hidden">
  <span
    class="absolute z-50 size-6 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2"
  ></span>
  <span
    class="absolute z-[2] size-6 rotate-45 bg-surface-1 top-px border border-border right-px translate-x-1/2 -translate-y-1/2"
  ></span>
  <span
    class="absolute z-[5] size-4 rotate-45 bg-text-primary top-px right-px translate-x-1/2 -translate-y-1/2"
  ></span>
  <div
    class="z-[1] absolute inset-0 border border-border pointer-events-none"
  ></div>

  <!-- User info -->
  <div class="flex relative items-center bg-dot overflow-hidden text-xs">
    <div
      class="overflow-hidden grayscale-50 relative p-3 flex items-center justify-center"
    >
      <div
        class="z-40 absolute inset-2.5 border-2 border-blackwhite/20 overflow-hidden pointer-events-none"
      ></div>
      {#if userPicture}
        <div class="crt-avatar">
          <img src={userPicture} alt={userName} class="size-18" />
        </div>
      {:else}
        <div class="crt-avatar">
          <div class="size-18 flex items-center justify-center bg-surface-2">
            <img src="/avatar.png" alt={userName} class="size-18" />
          </div>
        </div>
      {/if}
    </div>
    <div class="flex flex-col gap-0.5 min-w-0">
      <p class="text-text-primary font-bold truncate">
        {userName}
      </p>
      <p class="text-text-primary font-bold truncate">
        {userEmail}
      </p>
      <p class="text-text-secondary">
        Synced {formatLastSyncTime(lastSyncTime, now)}
      </p>
    </div>
    <button
      class="absolute top-3 right-3 text-text-secondary hover:text-text-primary transition-colors"
      onclick={() => (showDebugLogs = !showDebugLogs)}
      title="Toggle Debug Logs"
    >
      <Icon
        icon="heroicons:exclamation-circle"
        class="size-6 {showDebugLogs ? 'text-warning' : ''}"
      />
    </button>
  </div>

  <!-- Action buttons -->
  <div class="flex gap-0 justify-center items-center border-t border-border">
    <button
      onclick={onSyncNow}
      disabled={isSyncing}
      class="flex flex-1 items-center justify-center gap-2 py-3 px-4 text-text-primary hover:bg-blackwhite/10 transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon
        icon="heroicons:arrow-path"
        class="size-4 {isSyncing ? 'animate-spin' : ''}"
      />
      Sync Now
    </button>
    <button
      onclick={onLogout}
      class="flex w-fit items-center justify-center gap-2 py-3 px-4 border-l border-border text-text-primary hover:bg-blackwhite/10 duration-100 transition-colors"
    >
      <Icon icon="heroicons:arrow-right-on-rectangle" class="size-4" />Sign Out
    </button>
  </div>

  <!-- Debug Logs -->
  {#if showDebugLogs}
    <SyncDebugLogs {debugLogs} />
  {/if}
</div>

<style>
  /* CRT Avatar Effect */
  .crt-avatar {
    position: relative;
    display: block;
    filter: blur(0.5px) hue-rotate(8deg);
  }

  .crt-avatar img {
    display: block;
    width: 100%;
    animation: crt-distort 20s infinite;
  }

  .crt-avatar::before {
    content: '';
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0) 50%,
      rgba(0, 0, 0, 0.12) 50%
    );
    background-size: 100% 4px;
    animation: crt-scanlines 0.4s linear infinite;
    z-index: 10;
    pointer-events: none;
  }

  .crt-avatar::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    background: rgba(59, 55, 55, 0.1);
    animation: crt-flicker 2s infinite;
    pointer-events: none;
  }

  @keyframes crt-scanlines {
    0% {
      background-position: 0 0;
    }
    100% {
      background-position: 0 4px;
    }
  }

  @keyframes crt-flicker {
    0% {
      opacity: 0.27861;
    }
    5% {
      opacity: 0.34769;
    }
    10% {
      opacity: 0.23604;
    }
    15% {
      opacity: 0.90626;
    }
    20% {
      opacity: 0.18128;
    }
    25% {
      opacity: 0.83891;
    }
    30% {
      opacity: 0.65583;
    }
    35% {
      opacity: 0.67807;
    }
    40% {
      opacity: 0.26559;
    }
    45% {
      opacity: 0.84693;
    }
    50% {
      opacity: 0.96019;
    }
    55% {
      opacity: 0.08594;
    }
    60% {
      opacity: 0.20313;
    }
    65% {
      opacity: 0.71988;
    }
    70% {
      opacity: 0.53455;
    }
    75% {
      opacity: 0.37288;
    }
    80% {
      opacity: 0.71428;
    }
    85% {
      opacity: 0.70419;
    }
    90% {
      opacity: 0.7003;
    }
    95% {
      opacity: 0.36108;
    }
    100% {
      opacity: 0.24387;
    }
  }

  @keyframes crt-distort {
    0%,
    100% {
      filter: brightness(1);
    }
    50% {
      filter: brightness(1.02);
    }
  }
</style>
