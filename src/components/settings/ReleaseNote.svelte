<!-- @ts-nocheck -->
<script>
  import Version from '../ui/version.svelte'
  import packageJson from '../../../package.json'
  import LogoColor from '../ui/Logo-color.svelte'
  import Pivot from '../ui/Pivot.svelte'
  import { render } from 'svelte/server'
  import { domVisibility } from '@/stores/stateAbout.svelte.js'
  import 'overlayscrollbars/overlayscrollbars.css'
  import { useOverlayScrollbars } from 'overlayscrollbars-svelte'

  const options = {
    scrollbars: {
      theme: 'os-theme-custom-app',
      autoHide: 'scroll',
    },
  }
  const [initialize, instance] = useOverlayScrollbars({ options, defer: true })

  // Utility function to detect touch devices
  function isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  }
  let scrollContainerEl
  // Use $effect to initialize OverlayScrollbars (only on non-touch devices)
  $effect(() => {
    const tocElement = document.getElementById('release-note-scroll')
    if (tocElement && !isTouchDevice()) {
      initialize(tocElement)
    }
  })
</script>

{#snippet note(title, description)}
  <li class="p-0 mt-4 text-text-secondary">
    <span class=" text-text-primary font-bold">{title}</span>
    {description}
  </li>
{/snippet}

<div class=" absolute inset-0 bg-surface-1 z-50">
  <div
    id="release-note-scroll"
    class="h-full pb-20 {isTouchDevice() ? 'overflow-y-auto' : ''}"
    bind:this={scrollContainerEl}
  >
    <div
      class="w-full relative border-6 bg-background border-background flex justify-center overflow-hidden"
    >
      <div
        class="font-mono absolute z-20 right-0 bottom-0 text-xs py-1.5 px-2 bg-background border border-border"
      >
        <span class=" text-text-secondary">Version</span>
        <b>{packageJson.version}</b>
      </div>
      <div
        class=" absolute flex p-3 md:p-4 font-mono font-medium tracking-tight gap-2 md:text-lg left-0 top-0 items-center"
      >
        <LogoColor class="w-7 md:w-9" /> Summarizerrrr
      </div>
      <div class=" absolute z-[999] size-12 left-4 bottom-2">
        <Pivot />
      </div>

      <div class=" absolute inset-0 border border-dashed border-border"></div>
      <Version class=" w-140 md:w-200 shrink-0 mx-auto" />
    </div>
    <div class="p-6 prose prose-sm w-full max-w-full">
      <h2>Release note</h2>
      <b class="  font-mono">2.1.6</b>
      <ul class="mt-0">
        {@render note(
          '[Enhanced] Copy-to-Clipboard Functionality',
          'Supports copying formatted content (lists, headings) with a fallback to plain text if it fails.'
        )}
        {@render note(
          '[Improved] AI Prompting for Summary Quality',
          `AI prompts are updated to focus on "Key Takeaways" and filter out low-value comments.`
        )}
      </ul>

      <b class="font-mono">2.1.0</b>
      <ul class="mt-0">
        {@render note(
          'One-Click Summarization:',
          'A new mode has been introduced where clicking the floating action button automatically triggers summarization.'
        )}
        {@render note(
          'Ollama API Proxy:',
          `Fixes CORS connection errors for improved reliability.`
        )}
        {@render note(
          'AI Thought Process Display:',
          `The AI's reasoning is now shown in a collapsible section.`
        )}
      </ul>
      <b class="font-mono">2.0.0</b>
      <ul class="mt-0">
        {@render note(
          'Enhanced Mobile Support & UI Overhaul:',
          'Introduction of new floating panel, mobile sheet, alongside significant refactoring of existing UI elements, to provide a more responsive and mobile-friendly user experience.'
        )}
        {@render note(
          'Improved YouTube Transcript Extraction:',
          ` A more robust system for retrieving video transcripts, especially on mobile.`
        )}
      </ul>
    </div>
  </div>
</div>
