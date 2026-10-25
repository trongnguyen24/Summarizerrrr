<script>
  // @ts-nocheck
  import { t, locale } from 'svelte-i18n'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'
  import { Toaster } from 'svelte-sonner'
  import SidebarLayout from '@/components/ui/SidebarLayout.svelte'
  import SidebarTabs from '@/components/ui/SidebarTabs.svelte'
  import PromptList from '@/entrypoints/prompt/components/PromptList.svelte'
  import PromptEditor from '@/entrypoints/prompt/components/PromptEditor.svelte'
  import SkillList from '@/entrypoints/prompt/components/SkillList.svelte'
  import SkillEditor from '@/entrypoints/prompt/components/SkillEditor.svelte'
  import { createSkillEditorState } from '@/entrypoints/prompt/skillEditorState.svelte.js'
  import { slideScaleFade } from '@/lib/utils/slideScaleFade.js'
  import '@fontsource-variable/geist-mono'
  import {
    settings,
    loadSettings,
    subscribeToSettingsChanges,
  } from '@/stores/settingsStore.svelte.js'
  import {
    initializeTheme,
    subscribeToSystemThemeChanges,
  } from '@/stores/themeStore.svelte.js'

  // URL state: ?tab=prompts&promptKey=<key> or ?tab=skills.
  // Back-compat: ?view=skills opens the Skills tab; a bare ?promptKey= opens Prompts.
  const initialParams = new URLSearchParams(window.location.search)
  let activeTab = $state(
    initialParams.get('tab') === 'skills' ||
      initialParams.get('view') === 'skills'
      ? 'skills'
      : 'prompts',
  )
  // Default to the first summarize prompt instead of an empty editor.
  let promptKey = $state(
    initialParams.get('promptKey') || 'youtubeCustomPromptContent',
  )

  let sidebarOpen = $state(window.innerWidth >= 768) // Initialize based on current window size
  let promptDirty = $state(false)
  const editor = createSkillEditorState()

  const summarizePrompts = $derived({
    youtubeCustomPromptContent: $t(
      'settings.summary.custom_prompts.youtube_summary',
    ),
    webCustomPromptContent: $t('settings.summary.custom_prompts.web_summary'),
    courseSummaryCustomPromptContent: $t(
      'settings.summary.custom_prompts.course_summary',
    ),
    selectedTextCustomPromptContent: $t(
      'settings.summary.custom_prompts.selected_text',
    ),
  })

  const customActionPrompts = $derived({
    analyzeCustomPromptContent: $t('settings.summary.custom_prompts.analyze'),
    explainCustomPromptContent: $t('settings.summary.custom_prompts.explain'),
    debateCustomPromptContent: $t('settings.summary.custom_prompts.debate'),
    chapterCustomPromptContent: $t(
      'settings.summary.custom_prompts.youtube_chapter',
    ),
    commentCustomPromptContent: $t(
      'settings.summary.custom_prompts.youtube_comment',
    ),
    courseConceptsCustomPromptContent: $t(
      'settings.summary.custom_prompts.course_concepts',
    ),
  })

  const promptTitle = $derived(
    summarizePrompts[promptKey] ||
      customActionPrompts[promptKey] ||
      'Unknown Prompt',
  )

  const tabs = $derived([
    {
      id: 'prompts',
      label: $t('customize.tabs.prompts'),
      icon: 'heroicons:document-text',
      iconActive: 'heroicons:document-text-solid',
    },
    {
      id: 'skills',
      label: $t('customize.tabs.skills'),
      icon: 'heroicons:sparkles',
      iconActive: 'heroicons:sparkles-solid',
    },
  ])

  // Unsaved-changes guard: the active editor's dirty state decides whether a
  // tab, prompt or skill switch needs confirmation first.
  function canLeaveEditor() {
    const dirty = activeTab === 'prompts' ? promptDirty : editor.isModified
    if (!dirty) return true
    return confirm($t('prompts.confirm_discard'))
  }

  // Each select* returns false when the user cancels the switch.
  function selectTab(id) {
    if (id === activeTab) return true
    // Only leaving Prompts loses edits (PromptEditor unmounts); the skill
    // draft lives in `editor` and is still there when the user comes back.
    if (activeTab === 'prompts' && !canLeaveEditor()) return false
    activeTab = id
    return true
  }

  function selectPrompt(key) {
    if (key === promptKey) return true
    if (!canLeaveEditor()) return false
    promptKey = key
    return true
  }

  function selectSkill(id) {
    if (id === editor.selectedId) return true
    if (!canLeaveEditor()) return false
    editor.selectSkill(id)
    return true
  }

  function newSkill() {
    if (!canLeaveEditor()) return false
    editor.newSkill()
    return true
  }

  // Keep the address bar in step with the selection, so a reload or a shared
  // link reopens the same tab and prompt.
  $effect(() => {
    const query =
      activeTab === 'skills'
        ? '?tab=skills'
        : `?tab=prompts&promptKey=${encodeURIComponent(promptKey)}`
    window.history.replaceState(window.history.state, '', query)
  })

  // Sync i18n locale with settings store (same as archive/App.svelte)
  $effect(() => {
    const newLocale = settings.uiLang
    if (newLocale && newLocale !== $locale) {
      locale.set(newLocale)
    }
  })

  const options = {
    scrollbars: {
      autoHide: 'never',
      theme: 'os-theme-custom-app',
    },
  }
  const [initialize] = useOverlayScrollbars({ options, defer: true })

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }

  $effect(() => {
    // Initialize OverlayScrollbars only on non-touch devices
    if (!isTouchDevice()) {
      initialize(document.body)
    }

    initializeTheme()
    const unsubscribeTheme = subscribeToSystemThemeChanges()

    return () => {
      unsubscribeTheme()
    }
  })

  // Apply reduce motion setting to DOM
  $effect(() => {
    const _reduceMotion = settings.reduceMotion
    import('@/services/animationService.js').then(
      ({ applyReduceMotionToDOM }) => {
        applyReduceMotionToDOM()
      },
    )
  })

  loadSettings().then(() => {
    subscribeToSettingsChanges()
  })
</script>

<Toaster
  position="top-right"
  toastOptions={{
    unstyled: true,
  }}
/>

<main class="flex text-sm relative min-h-dvh bg-background text-text-primary">
  <SidebarLayout bind:open={sidebarOpen}>
    {#snippet sidebar({ closeOnMobile })}
      <div
        transition:slideScaleFade={{
          duration: 800,
          slideDistance: '0rem',
          startScale: 1,
          slideFrom: 'left',
        }}
        class="w-80 relative flex flex-col h-lvh"
      >
        <div class="flex items-center justify-between gap-2 pr-3 pt-4.5 pb-2">
          <h2 class="text-lg pl-12 font-bold">{$t('customize.title')}</h2>
        </div>

        <SidebarTabs {tabs} {activeTab} onSelectTab={selectTab} />

        <div class="text-text-secondary flex-1 relative overflow-y-auto">
          <div class="flex flex-col gap-0.5 px-2 py-4">
            {#if activeTab === 'prompts'}
              <PromptList
                {promptKey}
                {summarizePrompts}
                {customActionPrompts}
                onSelect={(key) => {
                  if (selectPrompt(key)) closeOnMobile()
                }}
              />
            {:else}
              <SkillList
                skills={editor.skills}
                selectedId={editor.selectedId}
                onSelect={(id) => {
                  if (selectSkill(id)) closeOnMobile()
                }}
                onCreate={() => {
                  if (newSkill()) closeOnMobile()
                }}
              />
            {/if}
          </div>
        </div>
      </div>
    {/snippet}

    <div
      class="flex flex-1 flex-col px-6 pb-4 pt-16 sm:px-10 md:px-16 md:pb-8 {sidebarOpen
        ? 'md:pl-[25rem] md:pt-4'
        : ''}"
    >
      {#if activeTab === 'prompts'}
        <PromptEditor
          {promptKey}
          title={promptTitle}
          bind:dirty={promptDirty}
        />
      {:else}
        <SkillEditor {editor} />
      {/if}
    </div>
  </SidebarLayout>
</main>
