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

  import Icon from '@iconify/svelte'

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

{#snippet note(title, description, links = [])}
  <li class="p-0 mt-4 text-text-secondary">
    <span class=" text-text-primary font-bold">{title}</span>
    {description}
    {#if links && links.length > 0}
      <div class="flex flex-wrap gap-2 mt-1.5">
        {#each links as link}
          <a
            href={link.url}
            target="_blank"
            rel="noreferrer"
            class="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline bg-primary/10 px-1.5 py-0.5 rounded"
          >
            {link.label}
            <Icon icon="lucide:arrow-up-right" class="size-3" />
          </a>
        {/each}
      </div>
    {/if}
  </li>
{/snippet}

<div class=" absolute inset-0 bg-surface-1 z-[99]">
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

      <b class="font-mono">2.7.0</b>
      <ul class="mt-0">
        {@render note(
          'New AI Provider - Cerebras:',
          'Added a new option offering lightning-fast speeds and daily free usage tokens.',
        )}
        {@render note(
          'Improved Gemini Reliability:',
          'You can now add multiple API keys. The system auto-switches between them to prevent errors and keep your connection stable.',
        )}
        {@render note(
          'Easier Model Selection:',
          'Replaced old inputs with a smart, searchable dropdown menu, making it faster to switch AI models.',
        )}
        {@render note(
          'Smarter Summaries:',
          'Upgraded the prompt engine to better align with your selected "Tone" and "Language."',
        )}
        {@render note(
          'New Notification Style:',
          'Important updates now appear in a clean bottom-sheet view, featuring a fun animated cat.',
        )}
        {@render note(
          'Replaced Gemini 2.0 Flash:',
          'Since this model is no longer available on the Free Tier, it has been replaced by Gemma-3-27b-it.',
        )}
      </ul>

      <b class="font-mono">2.6.0</b>
      <ul class="mt-0">
        {@render note(
          'Enhanced Mobile Experience:',
          'Mobile sheet now supports natural swipe gestures (quick swipe to dismiss, slow drag to snap back), freely adjustable height (40% to 100% of screen height), and customizable font size.',
        )}
        {@render note(
          'Course Concepts:',
          'Course summarization is now a custom action, streamlining the process by eliminating redundant API calls.',
        )}
        {@render note(
          'Refactored Prompt Management:',
          "Completely redesigned prompt system now supports custom prompts for multiple actions including 'Analyze', 'Explain', 'Debate', and 'YouTube Comments', in addition to existing summary prompts.",
        )}
        {@render note(
          'Deep Dive Questions:',
          'Deep Dive feature is now fully integrated into History and Archive sections.',
        )}
        {@render note(
          'Improved FAB Control:',
          'Floating Action Button now includes a blacklist feature with a dedicated drop zone and confirmation dialog, making it easy to hide the FAB on specific websites.',
        )}
      </ul>

      <b class="font-mono">2.5.0</b>
      <ul class="mt-0">
        {@render note(
          'YouTube Comment Insights:',
          'Now fetches and summarizes top comments (including replies) to reveal audience sentiment and key discussion topics.',
          [
            {
              label: 'sojusnik',
              url: 'https://github.com/trongnguyen24/Summarizerrrr/issues/24',
            },
          ],
        )}
        {@render note(
          'Stop Generation:',
          'You can now stop the AI summarization process at any time by clicking the button again.',
          [
            {
              label: 'B.Uniquestz',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-16#post-38035702',
            },
          ],
        )}
        {@render note(
          'Smart Fallback Notifications:',
          'New popup alerts inform you when the AI automatically switches to a lighter model or different mode to ensure reliability during high traffic.',
        )}
        {@render note(
          'Interactive Timestamps:',
          'Timestamps in summaries are now clickable links that instantly jump to the corresponding moment in the YouTube video.',
        )}
        {@render note(
          'Dynamic Permissions (Firefox):',
          'Improved content script loading on Firefox to request permissions dynamically, giving users more control and flexibility.',
          [
            {
              label: 'John Doe',
              url: 'https://addons.mozilla.org/en-CA/firefox/addon/summarizerrrr/reviews/2537086/',
            },
            {
              label: 'sojusnik',
              url: 'https://github.com/trongnguyen24/Summarizerrrr/issues/28',
            },
          ],
        )}
        {@render note(
          'Enhanced Tooltips:',
          'Added clear, helpful tooltips to main buttons to improve usability.',
          [
            {
              label: 'kalmarv',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-26#post-39570926',
            },
          ],
        )}
      </ul>

      <b class="font-mono">2.4.0</b>
      <ul class="mt-0">
        {@render note(
          'Deep Dive Tool:',
          'Introduces a powerful Deep Dive feature that generates contextual follow-up questions from summaries and enables conversations with multiple AI providers (Gemini, ChatGPT, Perplexity, Grok) for deeper content exploration.',
          [
            {
              label: 'sojusnik',
              url: 'https://github.com/trongnguyen24/Summarizerrrr/issues/23',
            },
          ],
        )}
        {@render note(
          'Extensible Tool System Architecture:',
          'Built on a new modular tool system architecture designed for scalability and easy future expansion, with dedicated settings and independent AI provider configuration per tool.',
        )}
        {@render note(
          'Gemini Auto-Fallback for Reliability:',
          'Intelligent auto-fallback mechanism for Gemini Basic models that automatically switches to lighter models (flash-lite, 2.0-flash) when API overload or resource exhaustion is detected, significantly improving service reliability.',
        )}
      </ul>

      <b class="font-mono">2.3.0</b>
      <ul class="mt-0">
        {@render note(
          'YouTube Transcript Copy & SRT Download:',
          'Added new buttons directly in the YouTube player to copy transcripts with timestamps and download video subtitles as SRT files for offline use and easier reference.',
          [
            {
              label: 'Norad',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-24#post-38963675',
            },
          ],
        )}
        {@render note(
          'Data Export/Import:',
          'Comprehensive backup and restore functionality allowing users to export all application data (settings, history, archives, tags) to a single ZIP file and import it back with merge or replace options.',
          [
            {
              label: 'Thọ Gầy 4.0',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-17#post-38049406',
            },
            {
              label: 'tranthanhxhong',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-25#post-39118628',
            },
          ],
        )}
        {@render note(
          'Export to Markdown:',
          'Export archived summaries and history items as individual Markdown files organized in a ZIP archive, supporting multi-tab summaries with YAML frontmatter metadata.',
        )}
        {@render note(
          'Refactored YouTube Summarization:',
          'Chapter summarization is no longer automatic with main video summary but can be triggered as a separate on-demand action for better control and flexibility.',
          [
            {
              label: 'sojusnik',
              url: 'https://github.com/trongnguyen24/Summarizerrrr/issues/25',
            },
            {
              label: 'sojusnik',
              url: 'https://github.com/trongnguyen24/Summarizerrrr/issues/22',
            },
          ],
        )}
      </ul>

      <b class="font-mono">2.2.9</b>
      <ul class="mt-0">
        {@render note(
          'Tag Management System:',
          'Introduced a comprehensive tag management system, allowing users to organize and categorize summaries in the archive. This includes functionality to create, rename, delete, and assign tags to summaries.',
          [
            {
              label: 'soichan123',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-23#post-38869294',
            },
          ],
        )}
        {@render note(
          'Enhanced Archive and History Filtering:',
          'Implemented filtering capabilities for the archive by selected tags and for the history by content type (YouTube, Course, Website), improving content discoverability.',
        )}
      </ul>
      <b class="font-mono">2.2.6</b>
      <ul class="mt-0">
        {@render note(
          'YouTube Transcript to AI:',
          'Added direct integration button to YouTube player for sending transcripts to Gemini, ChatGPT, Perplexity, and Grok quickly.',
          [
            {
              label: 'Norad',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-24#post-38963675',
            },
          ],
        )}
      </ul>
      <b class="font-mono">2.2.5</b>
      <ul class="mt-0">
        {@render note(
          'Custom AI Actions:',
          "Enhances the Summarizerrrr extension by introducing custom AI actions ('Analyze', 'Explain', 'Debate') that allow users to perform specialized content analysis.",
        )}
      </ul>
      <b class="font-mono">2.2.0</b>
      <ul class="mt-0">
        {@render note(
          'Proactive Permission System for Firefox:',
          'Implemented a new permission system that checks website access when opening sidepanel and displays warnings if permissions are missing. The Summarize button is disabled until permissions are granted.',
        )}
        {@render note(
          'Storage Migration from Sync to Local:',
          'Settings, themes, and app state data have been moved from sync storage to local storage for improved performance and reliability.',
        )}
        {@render note(
          'Configurable Chrome Action Button:',
          'Chrome action button behavior can now be configured to open either sidepanel or popup window, especially useful for browsers like Arc or Dia.',
          [
            {
              label: 'nidoku',
              url: 'https://github.com/trongnguyen24/Summarizerrrr/issues/16',
            },
          ],
        )}
        {@render note(
          'New Review and Donate Buttons:',
          'Added Review and Donate buttons to the About section with particle animation effects and dropdown menus for interaction.',
        )}
        {@render note(
          'Release Notes Dialog:',
          'A new release notes dialog has been added, accessible from the About section in settings, to display version changes and improvements.',
          [
            {
              label: 'tranthanhxhong',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-23#post-38752512',
            },
          ],
        )}
      </ul>

      <b class="font-mono">2.1.6</b>
      <ul class="mt-0">
        {@render note(
          '[Enhanced] Copy-to-Clipboard Functionality',
          'Supports copying formatted content (lists, headings) with a fallback to plain text if it fails.',
          [
            {
              label: 'ChuSyThang21',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-22#post-38747925',
            },
          ],
        )}
        {@render note(
          '[Improved] AI Prompting for Summary Quality',
          `AI prompts are updated to focus on "Key Takeaways" and filter out low-value comments.`,
          [
            {
              label: 'ohmycash',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-20#post-38647200',
            },
          ],
        )}
      </ul>

      <b class="font-mono">2.1.0</b>
      <ul class="mt-0">
        {@render note(
          'One-Click Summarization:',
          'A new mode has been introduced where clicking the floating action button automatically triggers summarization.',
          [
            {
              label: 'arendon1',
              url: 'https://github.com/trongnguyen24/Summarizerrrr/issues/12',
            },
          ],
        )}
        {@render note(
          'Ollama API Proxy:',
          `Fixes CORS connection errors for improved reliability.`,
          [
            {
              label: 'kingsmanvn',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-21#post-38680059',
            },
          ],
        )}
        {@render note(
          'AI Thought Process Display:',
          `The AI's reasoning is now shown in a collapsible section.`,
          [
            {
              label: 'anhhn23',
              url: 'https://voz.vn/t/chrome-extension-tom-tat-cuc-sau-youtube-web-bao.1103815/page-20#post-38639623',
            },
          ],
        )}
      </ul>
      <b class="font-mono">2.0.0</b>
      <ul class="mt-0">
        {@render note(
          'Enhanced Mobile Support & UI Overhaul:',
          'Introduction of new floating panel, mobile sheet, alongside significant refactoring of existing UI elements, to provide a more responsive and mobile-friendly user experience.',
        )}
        {@render note(
          'Improved YouTube Transcript Extraction:',
          ` A more robust system for retrieving video transcripts, especially on mobile.`,
        )}
      </ul>
    </div>
  </div>
</div>
