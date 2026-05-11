<script>
  // @ts-nocheck
  import { t } from 'svelte-i18n'
  import {
    updateFirefoxPermission,
    getFirefoxPermission,
    getCachedPermission,
  } from '../../stores/settingsStore.svelte.js'
  import {
    checkSpecificPermission,
    requestSpecificPermission,
    removeSpecificPermission,
  } from '../../services/firefoxPermissionService.js'
  import { browser } from 'wxt/browser'
  import ExportImport from './ExportImport.svelte'
  import CloudSyncToolSettings from './tools/CloudSyncToolSettings.svelte'
  import SwitchPermission from '../inputs/SwitchPermission.svelte'

  // Permission states
  let httpsPermission = $state(getFirefoxPermission('httpsPermission'))
  let hasInitialized = $state(false)

  // Reactive update khi settings store thay đổi
  $effect(() => {
    if (hasInitialized) {
      const storePermission = getFirefoxPermission('httpsPermission')
      if (storePermission !== httpsPermission) {
        httpsPermission = storePermission
      }
    }
  })

  // Load permission states từ Firefox API với caching
  async function loadPermissionStates() {
    if (import.meta.env.BROWSER === 'firefox') {
      try {
        const permissionKey = 'httpsPermission'
        const cached = getCachedPermission(permissionKey)
        if (cached) {
          await updateFirefoxPermission(permissionKey, cached.value)
          return
        }
        const hasPermission = await checkSpecificPermission('<all_urls>')
        await updateFirefoxPermission(permissionKey, hasPermission)
        hasInitialized = true
      } catch (error) {
        console.error('[DataSyncSettings] Error loading permission states:', error)
      }
    }
  }

  async function handleHttpsPermission(checked) {
    const permissionKey = 'httpsPermission'
    try {
      if (checked) {
        const granted = await requestSpecificPermission('<all_urls>')
        await updateFirefoxPermission(permissionKey, granted)
        try {
          await browser.runtime.sendMessage({
            type: 'PERMISSION_CHANGED',
            permissionKey,
            value: granted,
            source: 'DataSyncSettings',
            timestamp: Date.now(),
          })
        } catch (error) {
          console.warn('[DataSyncSettings] Failed to broadcast permission change:', error)
        }
      } else {
        const removed = await removeSpecificPermission('<all_urls>')
        const newPermissionState = !removed
        await updateFirefoxPermission(permissionKey, newPermissionState)
        try {
          await browser.runtime.sendMessage({
            type: 'PERMISSION_CHANGED',
            permissionKey,
            value: newPermissionState,
            source: 'DataSyncSettings',
            timestamp: Date.now(),
          })
        } catch (error) {
          console.warn('[DataSyncSettings] Failed to broadcast permission change:', error)
        }
      }
    } catch (error) {
      console.error('[DataSyncSettings] Error handling permission change:', error)
      await updateFirefoxPermission(permissionKey, !checked)
    }
  }

  if (import.meta.env.BROWSER === 'firefox') {
    $effect(() => {
      loadPermissionStates()
    })
  }
</script>

<div class=" flex flex-col gap-8 py-6">
  <!-- Optional Permissions Section - Chỉ hiển thị trên Firefox -->
  {#if import.meta.env.BROWSER === 'firefox'}
    <div class="flex flex-col gap-2 px-5">
      <label class="block font-bold text-primary">
        {$t('permissionWarning.title')}</label
      >
      <p class="text-xs text-text-secondary">
        {$t('permissionWarning.description')}
      </p>
      <SwitchPermission
        id="https-permission-switch"
        name=" {$t('permissionWarning.button')}"
        bind:checked={httpsPermission}
        onCheckedChange={handleHttpsPermission}
      />
    </div>
  {/if}

  <div class="px-5">
    <CloudSyncToolSettings />
  </div>

  <div class="border-t border-border/50 pt-4">
    <ExportImport />
  </div>
</div>
