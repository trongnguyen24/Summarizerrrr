<script>
  // @ts-nocheck
  import { createEventDispatcher } from 'svelte'
  import { onMount } from 'svelte'

  const dispatch = createEventDispatcher()

  // Props
  export let isOpen = false
  export let progress = {
    percentage: 0,
    stage: '',
    message: '',
    stages: [],
    startTime: null,
    estimatedTimeRemaining: null,
    error: null,
    isCancellable: true,
    isCompleted: false,
    details: {},
  }

  // Local state
  let timeElapsed = 0
  let timeInterval = null
  let showDetails = false

  // Reactive calculations
  $: formattedTimeElapsed = formatTime(timeElapsed)
  $: formattedTimeRemaining = progress.estimatedTimeRemaining
    ? formatTime(progress.estimatedTimeRemaining)
    : null
  $: currentStageIndex = progress.stages.findIndex(
    (stage) => stage.id === progress.stage
  )
  $: completedStages = progress.stages.filter(
    (stage, index) => index < currentStageIndex
  )
  $: isRunning = isOpen && !progress.isCompleted && !progress.error

  // Timer management
  onMount(() => {
    if (isOpen && progress.startTime) {
      startTimer()
    }

    return () => {
      if (timeInterval) {
        clearInterval(timeInterval)
      }
    }
  })

  // Watch for modal open/close and progress changes
  $: if (isOpen && progress.startTime && !timeInterval) {
    startTimer()
  } else if (!isOpen && timeInterval) {
    clearInterval(timeInterval)
    timeInterval = null
  }

  $: if (progress.isCompleted || progress.error) {
    if (timeInterval) {
      clearInterval(timeInterval)
      timeInterval = null
    }
  }

  function startTimer() {
    timeInterval = setInterval(() => {
      if (progress.startTime) {
        timeElapsed = Math.floor((Date.now() - progress.startTime) / 1000)
      }
    }, 1000)
  }

  function formatTime(seconds) {
    if (!seconds || seconds < 0) return '0s'

    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  function handleCancel() {
    if (progress.isCancellable) {
      dispatch('cancel')
    }
  }

  function handleRetry() {
    dispatch('retry')
  }

  function handleClose() {
    if (progress.isCompleted || !progress.isCancellable) {
      dispatch('close')
    }
  }

  function getStageIcon(stage) {
    const icons = {
      validating: '🔍',
      backing_up: '💾',
      importing: '📥',
      exporting: '📤',
      processing: '⚙️',
      completing: '✅',
      error: '❌',
    }
    return icons[stage.id] || '📋'
  }

  function getStageStatus(stage, index) {
    if (stage.error) return 'error'
    if (index < currentStageIndex) return 'completed'
    if (index === currentStageIndex) return 'active'
    return 'pending'
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <!-- Backdrop -->
    <div class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"></div>

    <!-- Modal -->
    <div class="flex min-h-full items-center justify-center p-4">
      <div
        class="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-lg shadow-xl"
      >
        <!-- Header -->
        <div class="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
              {progress.error
                ? 'Import Failed'
                : progress.isCompleted
                  ? 'Import Complete'
                  : 'Importing Data'}
            </h2>

            {#if progress.isCompleted || !progress.isCancellable}
              <button
                on:click={handleClose}
                class="text-gray-400 hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
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
            {/if}
          </div>
        </div>

        <!-- Progress Content -->
        <div class="px-6 py-4">
          {#if progress.error}
            <!-- Error State -->
            <div class="text-center py-6">
              <div class="text-red-500 text-5xl mb-4">❌</div>
              <h3
                class="text-lg font-medium text-gray-900 dark:text-white mb-2"
              >
                Import Failed
              </h3>
              <p class="text-gray-600 dark:text-gray-400 mb-4">
                {progress.error.message || 'An error occurred during import.'}
              </p>
              {#if progress.error.details}
                <div
                  class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 text-left"
                >
                  <p class="text-sm text-red-800 dark:text-red-200 font-mono">
                    {progress.error.details}
                  </p>
                </div>
              {/if}
              <div class="flex justify-center gap-3">
                <button
                  on:click={handleRetry}
                  class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Retry
                </button>
                <button
                  on:click={handleClose}
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          {:else if progress.isCompleted}
            <!-- Success State -->
            <div class="text-center py-6">
              <div class="text-green-500 text-5xl mb-4">✅</div>
              <h3
                class="text-lg font-medium text-gray-900 dark:text-white mb-2"
              >
                Import Completed Successfully
              </h3>
              <p class="text-gray-600 dark:text-gray-400 mb-4">
                {progress.message || 'All data has been imported successfully.'}
              </p>
              <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <div class="text-sm text-gray-600 dark:text-gray-400">
                  Completed in: {formattedTimeElapsed}
                </div>
              </div>
              <button
                on:click={handleClose}
                class="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors"
              >
                Done
              </button>
            </div>
          {:else}
            <!-- Progress State -->
            <div class="space-y-4">
              <!-- Main Progress Bar -->
              <div>
                <div class="flex justify-between items-center mb-2">
                  <span
                    class="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Progress</span
                  >
                  <span class="text-sm text-gray-500 dark:text-gray-400"
                    >{progress.percentage}%</span
                  >
                </div>
                <div
                  class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden"
                >
                  <div
                    class="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
                    style="width: {progress.percentage}%"
                  ></div>
                </div>
              </div>

              <!-- Current Stage -->
              <div
                class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
              >
                <div class="flex items-center space-x-3">
                  <div class="text-2xl">
                    {getStageIcon(
                      progress.stages[currentStageIndex] || { id: 'processing' }
                    )}
                  </div>
                  <div class="flex-1">
                    <h4
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {progress.stages[currentStageIndex]?.name || 'Processing'}
                    </h4>
                    <p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {progress.message || 'Processing...'}
                    </p>
                  </div>
                  {#if isRunning}
                    <div
                      class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"
                    ></div>
                  {/if}
                </div>
              </div>

              <!-- Time Information -->
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    Time Elapsed
                  </div>
                  <div
                    class="text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {formattedTimeElapsed}
                  </div>
                </div>
                {#if formattedTimeRemaining}
                  <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                    <div class="text-xs text-gray-500 dark:text-gray-400">
                      Estimated Remaining
                    </div>
                    <div
                      class="text-sm font-medium text-gray-900 dark:text-white"
                    >
                      {formattedTimeRemaining}
                    </div>
                  </div>
                {/if}
              </div>

              <!-- Stages Progress -->
              <div>
                <div class="flex justify-between items-center mb-2">
                  <span
                    class="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >Stages</span
                  >
                  <button
                    on:click={() => (showDetails = !showDetails)}
                    class="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showDetails ? 'Hide' : 'Show'} Details
                  </button>
                </div>

                <div class="space-y-2">
                  {#each progress.stages as stage, index}
                    <div class="flex items-center space-x-2">
                      <div
                        class="flex-shrink-0 w-5 h-5 flex items-center justify-center"
                      >
                        {#if getStageStatus(stage, index) === 'completed'}
                          <svg
                            class="w-4 h-4 text-green-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clip-rule="evenodd"
                            ></path>
                          </svg>
                        {:else if getStageStatus(stage, index) === 'active'}
                          <div
                            class="w-4 h-4 border-2 border-blue-600 rounded-full animate-pulse"
                          ></div>
                        {:else if getStageStatus(stage, index) === 'error'}
                          <svg
                            class="w-4 h-4 text-red-500"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fill-rule="evenodd"
                              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                              clip-rule="evenodd"
                            ></path>
                          </svg>
                        {:else}
                          <div
                            class="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded-full"
                          ></div>
                        {/if}
                      </div>
                      <div class="flex-1">
                        <div class="text-sm text-gray-700 dark:text-gray-300">
                          {stage.name}
                        </div>
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {getStageStatus(stage, index) === 'completed'
                          ? 'Done'
                          : getStageStatus(stage, index) === 'active'
                            ? 'Active'
                            : getStageStatus(stage, index) === 'error'
                              ? 'Error'
                              : 'Pending'}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>

              <!-- Detailed Progress Information -->
              {#if showDetails && progress.details}
                <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h5
                    class="text-sm font-medium text-gray-900 dark:text-white mb-2"
                  >
                    Details
                  </h5>
                  <div class="space-y-1">
                    {#each Object.entries(progress.details) as [key, value]}
                      <div class="flex justify-between text-xs">
                        <span class="text-gray-600 dark:text-gray-400"
                          >{key}:</span
                        >
                        <span class="text-gray-900 dark:text-white font-medium"
                          >{value}</span
                        >
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>

        <!-- Footer Actions -->
        {#if !progress.error && !progress.isCompleted}
          <div
            class="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-700"
          >
            <div class="flex justify-end">
              {#if progress.isCancellable}
                <button
                  on:click={handleCancel}
                  class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors"
                >
                  Cancel
                </button>
              {/if}
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
