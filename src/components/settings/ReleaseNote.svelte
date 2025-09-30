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
    class="h-full pb-20"
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
      <b class="  font-mono text-primary">2.1.6</b>
      <ul class="mt-0">
        {@render note(
          '[Enhanced] Copy-to-Clipboard Functionality',
          'The copy-to-clipboard feature has been significantly upgraded to support copying formatted content (HTML) from generated summaries, ensuring that rich text elements like lists and headings are preserved. It includes a fallback to plain text copying if formatted copy fails.'
        )}
        {@render note(
          '[Improved] AI Prompting for Summary Quality',
          `Updates to the AI prompt templates now explicitly emphasize 'Key Takeaways' and refine the handling of 'Community Response' sections, instructing the AI to filter low-signal remarks and prioritize valuable comments for more structured and insightful summaries.`
        )}
      </ul>

      <b class="font-mono text-primary">2.1.0</b>
      <ul class="mt-0">
        {@render note(
          'One-Click Summarization:',
          'A new mode has been introduced where clicking the floating action button automatically triggers summarization for the current page.'
        )}
        {@render note(
          '[Improved] AI Prompting for Summary Quality',
          `Updates to the AI prompt templates now explicitly emphasize 'Key Takeaways' and refine the handling of 'Community Response' sections, instructing the AI to filter low-signal remarks and prioritize valuable comments for more structured and insightful summaries.`
        )}
        {@render note(
          'Ollama API Proxy',
          `API requests to Ollama from content scripts are now securely routed through the background script, resolving potential Cross-Origin Resource Sharing (CORS) issues and improving reliability in restricted browser environments.`
        )}
        {@render note(
          'AI Thought Process Display',
          `The AI's internal reasoning, often marked with '<think>' or '◁think▷' tags in responses, is now parsed and displayed in collapsible sections within summaries, offering deeper insights into the generation process.`
        )}
      </ul>
      <b class="font-mono text-primary">2.0.0</b>
      <ul class="mt-0">
        {@render note(
          'Enhanced Mobile Support & UI Overhaul:',
          'Introduction of new floating panel, mobile sheet, alongside significant refactoring of existing UI elements, to provide a more responsive and mobile-friendly user experience.'
        )}
        {@render note(
          'Improved YouTube Transcript Extraction:',
          `Implementation of a new message-based system for YouTube transcript extraction, leveraging protobuf.min.js for more robust content retrieval, especially for mobile.`
        )}
      </ul>
    </div>
  </div>
</div>
