<script>
  import { createEventDispatcher } from 'svelte'

  // @ts-nocheck
  const dispatch = createEventDispatcher()

  // Props
  export let conflicts = []
  export let isOpen = false

  // State
  let resolutions = {}
  let globalResolution = ''
  let showDetails = {}
  let currentFilter = 'all' // all, resolved, unresolved

  // Resolution options
  const resolutionOptions = [
    { value: 'keep_existing', label: 'Keep Existing', icon: '📋' },
    { value: 'use_imported', label: 'Use Imported', icon: '📥' },
    { value: 'keep_both', label: 'Keep Both', icon: '📚' },
    { value: 'skip', label: 'Skip', icon: '⏭️' },
  ]

  // Computed values
  $: totalConflicts = conflicts ? conflicts.length : 0
  $: resolvedCount = Object.keys(resolutions).filter(
    (id) => resolutions[id]
  ).length
  $: unresolvedCount = totalConflicts - resolvedCount
  $: filteredConflicts = getFilteredConflicts()

  function getFilteredConflicts() {
    if (!conflicts) return []
    if (currentFilter === 'resolved') {
      return conflicts.filter((conflict) => resolutions[conflict.id])
    } else if (currentFilter === 'unresolved') {
      return conflicts.filter((conflict) => !resolutions[conflict.id])
    }
    return conflicts
  }

  // Event handlers
  function handleResolution(conflictId, resolution) {
    resolutions = { ...resolutions, [conflictId]: resolution }
    dispatch('resolution-change', { conflictId, resolution })
  }

  function handleGlobalResolution(resolution) {
    if (!conflicts) return
    globalResolution = resolution
    const newResolutions = {}
    conflicts.forEach((conflict) => {
      newResolutions[conflict.id] = resolution
    })
    resolutions = newResolutions
    dispatch('global-resolution', {
      resolution,
      conflicts: conflicts.map((c) => c.id),
    })
  }

  function toggleDetails(conflictId) {
    showDetails = { ...showDetails, [conflictId]: !showDetails[conflictId] }
  }

  function handleApplyAll() {
    if (globalResolution) {
      handleGlobalResolution(globalResolution)
    }
  }

  function handleConfirm() {
    dispatch('confirm', { resolutions })
    closeModal()
  }

  function handleCancel() {
    dispatch('cancel')
    closeModal()
  }

  function closeModal() {
    isOpen = false
    resolutions = {}
    globalResolution = ''
    showDetails = {}
    currentFilter = 'all'
  }

  function formatDate(dateString) {
    if (!dateString) return 'N/A'
    return (
      new Date(dateString).toLocaleDateString() +
      ' ' +
      new Date(dateString).toLocaleTimeString()
    )
  }

  function getConflictTypeIcon(type) {
    const icons = {
      duplicate: '🔄',
      version_conflict: '⚡',
      data_mismatch: '⚠️',
      missing_reference: '❓',
    }
    return icons[type] || '🔍'
  }

  function getResolutionBadge(resolution) {
    const badges = {
      keep_existing: 'bg-blue-100 text-blue-800',
      use_imported: 'bg-green-100 text-green-800',
      keep_both: 'bg-purple-100 text-purple-800',
      skip: 'bg-gray-100 text-gray-800',
    }
    return badges[resolution] || 'bg-gray-100 text-gray-800'
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div
      class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
      on:click={handleCancel}
    ></div>

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div class="relative w-full max-w-4xl bg-white rounded-lg shadow-xl">
        <!-- Header -->
        <div class="border-b border-gray-200 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900">
              Conflict Resolution
            </h2>
            <button
              on:click={handleCancel}
              class="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <svg
                class="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                ></path>
              </svg>
            </button>
          </div>

          <!-- Summary Statistics -->
          <div class="mt-4 grid grid-cols-3 gap-4">
            <div class="bg-red-50 rounded-lg p-3">
              <div class="text-red-600 text-sm font-medium">
                Total Conflicts
              </div>
              <div class="text-2xl font-bold text-red-700">
                {totalConflicts}
              </div>
            </div>
            <div class="bg-yellow-50 rounded-lg p-3">
              <div class="text-yellow-600 text-sm font-medium">Unresolved</div>
              <div class="text-2xl font-bold text-yellow-700">
                {unresolvedCount}
              </div>
            </div>
            <div class="bg-green-50 rounded-lg p-3">
              <div class="text-green-600 text-sm font-medium">Resolved</div>
              <div class="text-2xl font-bold text-green-700">
                {resolvedCount}
              </div>
            </div>
          </div>
        </div>

        <!-- Global Resolution Options -->
        <div class="border-b border-gray-200 px-6 py-4 bg-gray-50">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-medium text-gray-900">
                Global Resolution
              </h3>
              <p class="text-xs text-gray-500">Apply to all conflicts</p>
            </div>
            <div class="flex items-center gap-2">
              <select
                bind:value={globalResolution}
                class="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select resolution...</option>
                {#each resolutionOptions as option}
                  <option value={option.value}
                    >{option.icon} {option.label}</option
                  >
                {/each}
              </select>
              <button
                on:click={handleApplyAll}
                disabled={!globalResolution}
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Apply to All
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Tabs -->
        <div class="border-b border-gray-200 px-6 py-2">
          <div class="flex space-x-4">
            <button
              class="px-3 py-2 text-sm font-medium rounded-md transition-colors {currentFilter ===
              'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-500 hover:text-gray-700'}"
              on:click={() => (currentFilter = 'all')}
            >
              All ({totalConflicts})
            </button>
            <button
              class="px-3 py-2 text-sm font-medium rounded-md transition-colors {currentFilter ===
              'unresolved'
                ? 'bg-yellow-100 text-yellow-700'
                : 'text-gray-500 hover:text-gray-700'}"
              on:click={() => (currentFilter = 'unresolved')}
            >
              Unresolved ({unresolvedCount})
            </button>
            <button
              class="px-3 py-2 text-sm font-medium rounded-md transition-colors {currentFilter ===
              'resolved'
                ? 'bg-green-100 text-green-700'
                : 'text-gray-500 hover:text-gray-700'}"
              on:click={() => (currentFilter = 'resolved')}
            >
              Resolved ({resolvedCount})
            </button>
          </div>
        </div>

        <!-- Conflicts List -->
        <div class="max-h-96 overflow-y-auto">
          {#each filteredConflicts as conflict (conflict.id)}
            <div class="border-b border-gray-200 last:border-b-0">
              <div class="px-6 py-4">
                <!-- Conflict Header -->
                <div class="flex items-start justify-between">
                  <div class="flex items-start space-x-3">
                    <span class="text-2xl"
                      >{getConflictTypeIcon(conflict.type)}</span
                    >
                    <div class="flex-1">
                      <h4 class="text-sm font-medium text-gray-900">
                        {conflict.title || conflict.id}
                      </h4>
                      <p class="text-xs text-gray-500 mt-1">
                        {conflict.description}
                      </p>
                      {#if resolutions[conflict.id]}
                        <span
                          class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-2 {getResolutionBadge(
                            resolutions[conflict.id]
                          )}"
                        >
                          {resolutionOptions.find(
                            (o) => o.value === resolutions[conflict.id]
                          )?.icon}
                          {resolutionOptions.find(
                            (o) => o.value === resolutions[conflict.id]
                          )?.label}
                        </span>
                      {/if}
                    </div>
                  </div>

                  <div class="flex items-center space-x-2">
                    <button
                      on:click={() => toggleDetails(conflict.id)}
                      class="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg
                        class="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="2"
                          d="M19 9l-7 7-7-7"
                        ></path>
                      </svg>
                    </button>
                  </div>
                </div>

                <!-- Resolution Options -->
                <div class="mt-3 flex flex-wrap gap-2">
                  {#each resolutionOptions as option}
                    <button
                      on:click={() =>
                        handleResolution(conflict.id, option.value)}
                      class="px-3 py-1 text-xs font-medium rounded-md border transition-colors {resolutions[
                        conflict.id
                      ] === option.value
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'}"
                    >
                      {option.icon}
                      {option.label}
                    </button>
                  {/each}
                </div>

                <!-- Detailed Comparison -->
                {#if showDetails[conflict.id]}
                  <div
                    class="mt-4 grid grid-cols-2 gap-4 bg-gray-50 rounded-lg p-4"
                  >
                    <!-- Existing Data -->
                    <div class="border border-gray-200 rounded-lg p-3 bg-white">
                      <h5 class="text-xs font-semibold text-gray-700 mb-2">
                        Existing Data
                      </h5>
                      <div class="space-y-2">
                        {#if conflict.existing}
                          {#each Object.entries(conflict.existing) as [key, value]}
                            <div class="text-xs">
                              <span class="font-medium text-gray-600"
                                >{key}:</span
                              >
                              <span class="text-gray-800 ml-1"
                                >{typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : value}</span
                              >
                            </div>
                          {/each}
                          {#if conflict.existing.updatedAt}
                            <div class="text-xs text-gray-500 mt-2">
                              Last updated: {formatDate(
                                conflict.existing.updatedAt
                              )}
                            </div>
                          {/if}
                        {/if}
                      </div>
                    </div>

                    <!-- Imported Data -->
                    <div class="border border-gray-200 rounded-lg p-3 bg-white">
                      <h5 class="text-xs font-semibold text-gray-700 mb-2">
                        Imported Data
                      </h5>
                      <div class="space-y-2">
                        {#if conflict.imported}
                          {#each Object.entries(conflict.imported) as [key, value]}
                            <div class="text-xs">
                              <span class="font-medium text-gray-600"
                                >{key}:</span
                              >
                              <span class="text-gray-800 ml-1"
                                >{typeof value === 'object'
                                  ? JSON.stringify(value)
                                  : value}</span
                              >
                            </div>
                          {/each}
                          {#if conflict.imported.createdAt}
                            <div class="text-xs text-gray-500 mt-2">
                              Created: {formatDate(conflict.imported.createdAt)}
                            </div>
                          {/if}
                        {/if}
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}

          {#if filteredConflicts.length === 0}
            <div class="px-6 py-8 text-center">
              <div class="text-gray-400 text-sm">No conflicts found</div>
            </div>
          {/if}
        </div>

        <!-- Footer Actions -->
        <div class="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div class="flex items-center justify-between">
            <div class="text-sm text-gray-600">
              {resolvedCount} of {totalConflicts} conflicts resolved
            </div>
            <div class="flex space-x-3">
              <button
                on:click={handleCancel}
                class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                on:click={handleConfirm}
                disabled={resolvedCount === 0}
                class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Confirm Resolutions
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
