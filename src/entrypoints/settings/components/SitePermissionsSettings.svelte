<script>
  // @ts-nocheck
  import Icon from '@iconify/svelte'
  import ButtonSet from '@/components/buttons/ButtonSet.svelte'
  import { t } from 'svelte-i18n'
  import { updateFirefoxPermission } from '@/stores/settingsStore.svelte.js'
  import {
    isValidPermissionDomain,
    domainToOriginPattern,
    originPatternToDomain,
    isDomainCoveredByPatterns,
    getManifestOriginPatterns,
    listGrantedSites,
    hasAllSitesAccess,
    grantAllSitesAccess,
    revokeAllSitesAccess,
    grantSite,
    revokeOrigin,
  } from '@/services/firefoxSitePermissionService.js'
  import { browser } from 'wxt/browser'

  let grantedSites = $state([])
  let newDomain = $state('')
  let errorKey = $state(null)
  // Mirrors the *verified* permission state, never the mode the user just
  // clicked: only refreshState() writes it, after re-reading
  // browser.permissions. So a denied grant or a failed removal leaves the
  // highlighted button showing what is actually granted rather than what was
  // attempted. (An earlier revision bound this to a bits-ui Select, where the
  // widget wrote the value optimistically and the UI could get stuck showing
  // "All sites" with zero permissions granted.)
  let mode = $state('selected')

  // Re-reads the real permission state from the browser.permissions API and
  // resets the dropdown to match it. Called on mount, after every action, and
  // whenever permissions change (including externally, e.g. a revocation
  // performed in about:addons).
  async function refreshState() {
    mode = (await hasAllSitesAccess()) ? 'all' : 'selected'
    grantedSites = await listGrantedSites()
  }

  // Mirrors the broadcast pattern previously in DataSyncSettings.svelte:
  // keep settings.firefoxPermissions.httpsPermission in sync (still read by
  // FirefoxPermissionOverlay.svelte and the sidepanel's
  // PermissionWarningPrompt.svelte) and notify other contexts.
  async function broadcastPermissionChange(value) {
    await updateFirefoxPermission('httpsPermission', value)
    try {
      await browser.runtime.sendMessage({
        type: 'PERMISSION_CHANGED',
        permissionKey: 'httpsPermission',
        value,
        source: 'SitePermissionsSettings',
        timestamp: Date.now(),
      })
    } catch (error) {
      console.warn(
        '[SitePermissionsSettings] Failed to broadcast permission change:',
        error,
      )
    }
  }

  async function handleModeChange(newMode) {
    if (newMode === mode) return
    errorKey = null
    if (newMode === 'all') {
      const granted = await grantAllSitesAccess()
      if (!granted) errorKey = 'settings.site_access.denied'
    } else {
      // permissions.remove() needs no user gesture.
      await revokeAllSitesAccess()
    }
    // Re-read first, then broadcast the *verified* state rather than the
    // requested one: a denied grant or a failed removal must not tell the rest
    // of the extension something that isn't true.
    await refreshState()
    await broadcastPermissionChange(mode === 'all')
  }

  async function addDomain() {
    errorKey = null
    const domain = newDomain.trim().toLowerCase()
    if (!domain) return

    if (!isValidPermissionDomain(domain)) {
      errorKey = 'settings.site_access.invalid_domain'
      return
    }

    // Normalize through the pattern round-trip before comparing, so
    // `*.example.com` and `example.com` are recognised as the same entry
    // instead of firing a redundant permissions.request().
    const normalized = originPatternToDomain(domainToOriginPattern(domain))
    if (grantedSites.some((site) => site.domain === normalized)) {
      errorKey = 'settings.site_access.already_added'
      return
    }

    // Domains the manifest already grants statically (youtube.com and its
    // subdomains, udemy, coursera, reddit, wikipedia) never show up as chips,
    // so without this they would look addable — and the request would be a
    // no-op the user could never undo.
    if (isDomainCoveredByPatterns(normalized, getManifestOriginPatterns())) {
      errorKey = 'settings.site_access.already_added'
      return
    }

    const granted = await grantSite(domain)
    if (!granted) {
      // Denied: leave the typed text intact so the user can see/retry.
      errorKey = 'settings.site_access.denied'
      return
    }

    newDomain = ''
    await refreshState()
  }

  // Revokes by the verbatim granted origin, not by the displayed domain — see
  // revokeOrigin()'s note on why re-deriving the pattern silently no-ops.
  async function removeDomain(site) {
    await revokeOrigin(site.origin)
    await refreshState()
  }

  $effect(() => {
    refreshState()

    function handlePermissionChange() {
      refreshState()
    }

    browser.permissions.onAdded.addListener(handlePermissionChange)
    browser.permissions.onRemoved.addListener(handlePermissionChange)

    return () => {
      browser.permissions.onAdded.removeListener(handlePermissionChange)
      browser.permissions.onRemoved.removeListener(handlePermissionChange)
    }
  })
</script>

<!-- Site Access Section -->
<div class="setting-block flex flex-col pb-6 pt-6">
  <div class="flex flex-col gap-1 px-5">
    <label
      for="site-access-settings-toggle"
      class="block font-bold text-text-primary"
      >{$t('settings.site_access.title')}</label
    >
    <p class="flex text-muted">
      {$t('settings.site_access.description')}
    </p>
  </div>

  <div class="py-4 flex flex-col gap-4 px-5">
    <!-- Segmented buttons, không dùng ReusableSelect: `permissions.request()`
         chỉ hợp lệ khi gọi từ trong user-gesture handler, và onclick của một
         <button> giữ được activation đó chắc chắn hơn callback đi qua widget
         Select của bits-ui. `aria-pressed` cho biết mode nào đang bật. -->
    <div
      class="grid grid-cols-2 gap-2"
      role="group"
      aria-label={$t('settings.site_access.mode.aria_label')}
    >
      <ButtonSet
        title={$t('settings.site_access.mode.all_sites')}
        class={mode === 'all' ? 'active' : ''}
        aria-pressed={mode === 'all'}
        onclick={() => handleModeChange('all')}
      />
      <ButtonSet
        title={$t('settings.site_access.mode.selected_only')}
        class={mode === 'selected' ? 'active' : ''}
        aria-pressed={mode === 'selected'}
        onclick={() => handleModeChange('selected')}
      />
    </div>

    <div class="flex-auto">
      {#if mode === 'selected'}
        <div class="flex flex-col gap-2 pb-4">
          <div class="flex relative gap-1">
            <div
              class="overflow-hidden relative w-full h-8.5 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus-within:!border-blackwhite/30 dark:border-blackwhite/10 dark:focus-within:!border-blackwhite/20 transition-colors duration-150"
            >
              <input
                type="text"
                placeholder={$t('settings.site_access.domain_input_placeholder')}
                bind:value={newDomain}
                onkeydown={(e) => e.key === 'Enter' && addDomain()}
                autocomplete="off"
                autocorrect="off"
                autocapitalize="none"
                spellcheck="false"
                inputmode="url"
                class="absolute top-0 left-0 w-[133.33%] h-[133.33%] pl-4 pr-12 text-base text-text-primary bg-transparent border-none focus:outline-none focus:ring-0 placeholder:text-muted origin-top-left scale-75"
              />
            </div>
            <button
              onclick={addDomain}
              class=" absolute top-0 right-0 w-8.5 h-8.5 flex justify-center items-center hover:text-text-primary transition-colors duration-150"
              ><Icon
                icon="heroicons:plus-circle-16-solid"
                width="16"
                height="16"
              /></button
            >
          </div>
          {#if errorKey}
            <p class="text-xs text-red-500">{$t(errorKey)}</p>
          {/if}
        </div>

        <!-- Một domain một hàng (khác FAB Domain Control dùng 2 cột): danh sách
             site access dài và domain hay bị cắt ở cột hẹp, một cột giúp quét
             mắt theo chiều dọc dễ hơn. -->
        <div
          class="flex flex-col relative overflow-hidden min-h-32 bg-background p-2 gap-2"
        >
          <span
            class="absolute z-40 size-4 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <div
            class="absolute pointer-events-none bg-dot z-20 border border-border inset-0"
          ></div>

          {#each grantedSites as site (site.origin)}
            <div
              class="flex gap-2 z-30 h-8 overflow-hidden relative justify-between items-center bg-surface-2 text-text-secondary pl-3 text-xs"
            >
              <span
                class="absolute z-20 size-3 rotate-45 border border-border bg-background bottom-px left-px -translate-x-1/2 translate-y-1/2"
              ></span>
              <div
                class="absolute pointer-events-none z-10 border border-border inset-0"
              ></div>
              <p class=" flex-auto line-clamp-1">{site.domain}</p>
              <button
                onclick={() => removeDomain(site)}
                class="p-2 border-l border-blackwhite/5 transition-colors duration-150 bg-transparent hover:bg-blackwhite/5"
              >
                <Icon icon="heroicons:minus-16-solid" width="16" height="16" />
              </button>
            </div>
          {/each}

          <div
            class="flex mx-auto text-center items-center justify-center font-medium text-text-secondary text-xs"
          >
            {$t('settings.site_access.selected_helper')}
          </div>
        </div>
      {:else}
        <div
          class="grid relative overflow-hidden min-h-32 bg-background p-2 gap-2"
        >
          <span
            class="absolute z-40 size-4 rotate-45 bg-surface-1 border border-border bottom-px left-px -translate-x-1/2 translate-y-1/2"
          ></span>
          <div
            class="absolute pointer-events-none bg-dot z-20 border border-border inset-0"
          ></div>
          <div
            class="flex items-center justify-center font-medium text-text-secondary text-xs"
          >
            {$t('settings.site_access.all_helper')}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
