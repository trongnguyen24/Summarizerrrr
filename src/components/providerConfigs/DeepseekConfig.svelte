<script>
  // @ts-nocheck
  import { settings, updateSettings } from '../../stores/settingsStore.svelte'
  import { fade } from 'svelte/transition'
  import Icon from '@iconify/svelte'
  import ApiKeyInput from '../inputs/ApiKeyInput.svelte'
  import TextInput from '../inputs/TextInput.svelte'
  import { t } from 'svelte-i18n'

  let { selectedDeepseekModel = $bindable() } = $props()

  const deepseekModels = ['deepseek-chat', 'deepseek-reasoner']

  /**
   * Handles saving the Deepseek API key.
   * @param {string} key The API key value from the input.
   */
  function handleApiKeySave(key) {
    updateSettings({ deepseekApiKey: key })
  }

  let saveStatus = $state('')

  // Khối $effect đã được loại bỏ. Việc lưu model được xử lý bởi hàm `scheduleDeepseekModelSave`
  // được gọi từ sự kiện `oninput` của input.
</script>

<ApiKeyInput
  label={$t('settings.deepseek_config.api_key_label')}
  id="deepseekApiKey"
  apiKey={settings.deepseekApiKey}
  onSave={handleApiKeySave}
  placeholder={$t('settings.deepseek_config.api_key_placeholder')}
  linkHref="https://platform.deepseek.com/api_keys"
  linkText={$t('settings.groq_config.get_a_key')}
/>
<div class="flex flex-col gap-2">
  <div class="flex flex-col gap-2">
    <div class="flex items-center gap-1 justify-between">
      <label for="deepseek-model-input" class="block"
        >{$t('settings.deepseek_config.model_name_label')}</label
      >
      {#if saveStatus}
        <p id="save-status" transition:fade class="text-success flex mr-auto">
          {$t('settings.deepseek_config.saved_status')}
        </p>
      {/if}
      <a
        href="https://api-docs.deepseek.com/quick_start/pricing"
        target="_blank"
        class="text-xs flex items-center gap-0.5 text-primary outline-gray-500 hover:underline"
      >
        {$t('settings.deepseek_config.view_models')}
        <Icon width={12} icon="heroicons:arrow-up-right-16-solid" />
      </a>
    </div>
    <TextInput
      id="deepseek-model-input"
      list="deepseek-model-list"
      bind:value={selectedDeepseekModel}
      bind:saveStatus
      placeholder={$t('settings.deepseek_config.model_placeholder')}
      onSave={(value) => updateSettings({ selectedDeepseekModel: value })}
    />

    <datalist id="deepseek-model-list">
      {#each deepseekModels as model}
        <option value={model}>
          {model}
        </option>
      {/each}
    </datalist>
  </div>
</div>
