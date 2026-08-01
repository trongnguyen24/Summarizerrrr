<!-- @ts-nocheck -->
<script>
  import { settings, updateSettings } from '@/stores/settingsStore.svelte.js'
  import ApiKeyInputMulti from '@/entrypoints/settings/components/inputs/ApiKeyInputMulti.svelte'
  import { t } from 'svelte-i18n'
  import Icon from '@iconify/svelte'

  let {
    entry,
    isExpanded = false,
    onToggle = () => {},
    showHeader = true,
  } = $props()

  let additionalKeys = $state([])

  $effect(() => {
    if (entry.additionalKeysField) {
      additionalKeys = settings[entry.additionalKeysField] || []
    }
  })

  function saveApiKey(key) {
    if (entry.apiKeyField) {
      updateSettings({ [entry.apiKeyField]: key })
    }
  }

  function saveBaseUrl(e) {
    if (entry.baseUrlField) {
      updateSettings({ [entry.baseUrlField]: e.currentTarget.value.trim() })
    }
  }

  function saveEndpoint(e) {
    if (entry.endpointField) {
      updateSettings({ [entry.endpointField]: e.currentTarget.value.trim() })
    }
  }

  function saveAdditionalKeys() {
    if (entry.additionalKeysField) {
      const plainKeys = Array.from($state.snapshot(additionalKeys))
      updateSettings({ [entry.additionalKeysField]: plainKeys })
    }
  }

  function addAdditionalKey() {
    additionalKeys = [...additionalKeys, '']
  }

  function removeAdditionalKey(index) {
    additionalKeys = additionalKeys.filter((_, i) => i !== index)
    saveAdditionalKeys()
  }
</script>

<div class="overflow-hidden transition-colors duration-150">
  {#if !showHeader}
    <!-- Accordion Header - always visible -->
    <button
      type="button"
      class="w-full flex items-center gap-3 py-2.5 cursor-pointer select-none transition-colors duration-150"
      onclick={onToggle}
    >
      <span class="font-medium text-sm text-text-primary">{entry.label}</span>
    </button>
  {/if}

  <!-- Accordion Content - only when expanded -->
  {#if isExpanded}
    <div class="pb-4 flex flex-col gap-3">
      {#if entry.baseUrlField}
        <div class="flex flex-col gap-1.5 mt-3">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="text-xs text-text-secondary">
            {$t('settings.provider_key_config.base_url_label', {
              default: 'Base URL',
            })}
          </label>
          <input
            type="text"
            id={`${entry.id}-base-url`}
            class="font-mono text-xs w-full px-3 py-2 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 transition-colors duration-150"
            value={settings[entry.baseUrlField] || ''}
            placeholder="https://api.example.com/v1"
            onchange={saveBaseUrl}
          />
        </div>
      {/if}

      {#if entry.endpointField}
        <div class="flex flex-col gap-1.5 {entry.baseUrlField ? '' : 'mt-3'}">
          <!-- svelte-ignore a11y_label_has_associated_control -->
          <label class="text-xs text-text-secondary">
            {$t('settings.provider_key_config.endpoint_label', {
              default: 'Endpoint URL',
            })}
          </label>
          <input
            type="text"
            id={`${entry.id}-endpoint`}
            class="font-mono text-xs w-full px-3 py-2 bg-muted/5 dark:bg-muted/5 border border-border hover:border-blackwhite/15 focus:border-blackwhite/30 dark:border-blackwhite/10 dark:focus:border-blackwhite/20 focus:outline-none focus:ring-0 transition-colors duration-150"
            value={settings[entry.endpointField] || ''}
            placeholder="http://localhost:11434"
            onchange={saveEndpoint}
          />
        </div>
      {/if}

      {#if entry.apiKeyField}
        <div class={!entry.baseUrlField && !entry.endpointField ? 'mt-3' : ''}>
          <ApiKeyInputMulti
            apiKey={settings[entry.apiKeyField]}
            label={$t('settings.provider_key_config.api_key_label', {
              default: 'API Key',
            })}
            placeholder={$t(
              'settings.provider_key_config.api_key_placeholder',
              { default: 'Enter API Key' },
            )}
            id={`${entry.id}-api-key`}
            onSave={saveApiKey}
            linkHref={entry.id === 'gemini'
              ? 'https://aistudio.google.com/app/apikey'
              : entry.id === 'chatgpt'
                ? 'https://platform.openai.com/api-keys'
                : entry.id === 'openrouter'
                  ? 'https://openrouter.ai/keys'
                  : entry.id === 'deepseek'
                    ? 'https://platform.deepseek.com/api_keys'
                    : entry.id === 'groq'
                      ? 'https://console.groq.com/keys'
                      : entry.id === 'cerebras'
                        ? 'https://cloud.cerebras.ai'
                        : entry.id === 'nvidia'
                          ? 'https://build.nvidia.com/settings/api-keys'
                          : ''}
            linkText={$t('settings.provider_key_config.get_a_key', {
              default: 'Get API Key',
            })}
          />
        </div>
      {/if}

      {#if entry.additionalKeysField && additionalKeys.length > 0}
        <div class="flex flex-col gap-2 mt-1">
          {#each additionalKeys as key, index (index)}
            <div class="flex items-end group">
              <div class="flex-1">
                <ApiKeyInputMulti
                  bind:apiKey={additionalKeys[index]}
                  label=""
                  onSave={saveAdditionalKeys}
                  placeholder={$t(
                    'settings.gemini_basic_config.placeholder_additional_key',
                    {
                      values: { index: index + 1 },
                      default: `Additional Key #${index + 1}`,
                    },
                  )}
                  id={`${entry.id}-additional-key-${index}`}
                  showStatus={false}
                />
              </div>
              <button
                class="text-text-secondary size-8.5 border-l-0 flex justify-center items-center bg-muted/5 dark:bg-muted/5 border border-border focus-within:border-blackwhite/30 dark:border-blackwhite/10 dark:focus-within:border-blackwhite/20 transition-colors duration-150 hover:text-text-primary hover:bg-muted/20"
                onclick={() => removeAdditionalKey(index)}
                title={$t('settings.gemini_basic_config.remove_api_key', {
                  default: 'Remove API Key',
                })}
                aria-label={$t('settings.gemini_basic_config.remove_api_key', {
                  default: 'Remove API Key',
                })}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  class="size-4"
                >
                  <path
                    d="M3.75 7.25a.75.75 0 0 0 0 1.5h8.5a.75.75 0 0 0 0-1.5h-8.5Z"
                  />
                </svg>
              </button>
            </div>
          {/each}
        </div>
      {/if}

      {#if entry.additionalKeysField}
        <button
          class="flex items-center gap-1.5 font-medium text-xs text-primary hover:text-primary/80 transition-colors w-fit px-1 mt-1"
          onclick={addAdditionalKey}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 16 16"
            fill="currentColor"
            class="size-4"
          >
            <path
              fill-rule="evenodd"
              d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm.75-10.25v2.5h2.5a.75.75 0 0 1 0 1.5h-2.5v2.5a.75.75 0 0 1-1.5 0v-2.5h-2.5a.75.75 0 0 1 0-1.5h2.5v-2.5a.75.75 0 0 1 1.5 0Z"
              clip-rule="evenodd"
            />
          </svg>
          {$t('settings.gemini_basic_config.add_key_for_higher_limit', {
            default: 'Add key for higher rate limits',
          })}
        </button>
      {/if}
    </div>
  {/if}

</div>
