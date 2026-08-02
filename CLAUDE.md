# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Summarizerrrr is a browser extension for Chrome, Firefox, and Edge that uses AI to summarize YouTube videos, courses (Udemy/Coursera), and web pages. It's built with Svelte, WXT (Web Extension Toolkit), and the Vercel AI SDK to support multiple AI providers.

## Build & Development Commands

```bash
# Install dependencies
npm install

# Development mode
npm run dev
npm run dev:firefox

# Build for production
npm run build
npm run build:firefox

# Create distribution ZIP
npm run zip
npm run zip:firefox

# Type checking
npm run check

# Android testing
npm run android
npm run android:win
```

The extension outputs to the `.output` folder, which you load as an unpacked extension in your browser's developer mode.

## Architecture Overview

### Code Layering & Component Rules

**Layering (dependency direction):**

| Layer | May import |
|---|---|
| `src/lib/**` | `src/lib/**` only |
| `src/services/**` | `lib`, `services`, **and `stores/settingsStore` only** |
| `src/stores/**` | `lib`, `services`, `stores` |
| `src/components/**`, `src/entrypoints/**` | anything |
| everything | **never** import from `src/entrypoints/**` |

Enforced by `tests/architecture/layering.test.js`, for **static and dynamic** imports alike — `await import('@/stores/…')` is not a loophole.

**How `lib/` reaches downward:** through a registered port or reporter, never a direct import. The store/service registers itself at module load; the port keeps a lazy fallback so ordering can't break it.

| Need | Port | Registered by |
|---|---|---|
| read/write settings | `lib/config/settingsPort.js` | `stores/settingsStore` |
| WXT storage items | `lib/config/storagePort.js` | lazily resolves `services/wxtStorageService` |
| report model status | `lib/api/modelStatusReporter.js` | `stores/summaryStore` |
| bump capability signal | `lib/chat/capabilitiesSignal.js` | `stores/chatStore` |

Those port files are the **only** entries in the test's `LAZY_PORT_ALLOWLIST`. Adding one is a design decision, not a fix for a failing test.

> The `settingsStore` carve-out for `services/` is deliberate and named: `animationService`, `deepDiveService`, `toolProviderService`, and `cloudSyncService` read it directly (the last also writes back). One named, greppable exception with a test watching it beats a leaky abstraction.

**Reading settings from `lib/`:** import `settings` from `settingsPort`, not the store. Reads are synchronous and safe from module load onward (the port holds the live `$state` object, which is only ever mutated in place) — so transitions like `lib/utils/slideScaleFade.js` see real values without awaiting. Call `ensureSettingsLoaded()` only when you need storage-backed values guaranteed present, e.g. before building a prompt.

**Where components go:** `src/components/*` is **only** for things used by **2 or more surfaces** — measured, not aspirational: it currently holds exactly 6 folders / 32 files (`buttons` 9, `icons` 5, `inputs` 3, `markdown` 3, `ui` 6, `welcome` 6). Everything else lives next to the entrypoint that owns it, under `src/entrypoints/<surface>/components/`.

`settings` and `popop` count as **one surface**, not two: `popop/App.svelte` has no `components/` directory of its own and mounts settings' `@/entrypoints/settings/components/Setting.svelte` directly. A settings-only component doesn't become "shared" just because popop also renders it.

The guard test enforces **Rules 1–6**. Rule 5 bans cross-surface component imports (a file under `entrypoints/<A>/components/` must not be imported from `entrypoints/<B>/`, `A !== B`). Rule 6 requires every file under `src/components/` to be reachable — by static or dynamic import — from **2 or more** entrypoint roots. Rule 6 is what makes the placement rule stick: a new shared component needs a second real consumer before it's allowed to live in `src/components/`; there's no way to place it there "in advance" of that second usage.

**Filenames must be unique:** no two `.svelte` files anywhere under `src/` may share a basename (`App.svelte` excepted — one per entrypoint). Two different `ShadowTooltip.svelte` implementations once sat in folders imported side by side; the guard test blocks a repeat.

### High-Level Structure

The extension is organized around **multiple entrypoints** (handled by WXT):

1. **Content Scripts** - Injected into web pages to extract content
2. **Background Service Worker** - Central hub for API calls, message routing, and storage
3. **UI Entrypoints** - Popup, side panel, settings, archive, and prompt editor pages
4. **Overlay Floating UI** - Shadow DOM-based floating panel injected into pages

### Core Data Flow

1. **User triggers summarization** (keyboard shortcut, context menu, or UI button)
2. **Content script extracts content** (transcript, page text, or chapter timestamps)
3. **Message routed through background script** to appropriate handler
4. **AI SDK adapter calls the configured AI provider** (Gemini, OpenAI, Groq, Ollama, etc.)
5. **Results streamed or returned to UI** (side panel, floating panel, or popup)
6. **IndexedDB stores history/archive** via background script

### Key Files & Modules

#### Entrypoints (`src/entrypoints/`)

- **`background/`** - Background service worker, a directory entrypoint (`background/index.js`). `index.js` keeps only what has to run at worker start-up: platform branching, the cloud-sync alarms, context menus, and the port/command/tab listeners. Everything reachable from a message lives in siblings:
  - `messageRouter.js` — `createMessageRouter([...groups])`, one dispatch table replacing the old ~540-line `if` chain. A handler returns `true` to keep the channel open for an async `sendResponse`, `undefined` to close it — **that distinction is load-bearing**, and `message.type` is tried before `message.action` (a `REQUEST_SUMMARY` message carries `type: 'selectedText'`). Pinned by `tests/background/messageRouter.test.js`.
  - `handlers/` — one module per domain (sync, summarize, permissions, ollama, storage, external-chat, navigation). Each exports a `create*Handlers(deps)` factory; mutable worker state (`sidePanelPort`) is passed as a getter, never captured.
  - `ollamaService.js` — `OllamaCorsService` (declarativeNetRequest rules) + `OllamaApiProxyService` (runs `generateText` in the worker).
  - `externalChat.js` — opening Gemini/ChatGPT/Perplexity/Grok and driving their content scripts, with the Cloudflare/SPA readiness polling and send retries that requires.
  - `settingsBootstrap.js` — the worker's own settings loader. **Still a duplicate of `settingsStore`'s logic** (seam (f) in `docs/refactor/03-god-files.md`, not yet done).
  - `tabInfo.js` — `describeTab()`, the single YouTube/Udemy/Coursera classification the worker sends to the side panel.
- **`content.js`** - Shadow DOM UI injection for all websites. Uses `settingsStore` to determine if FAB (floating action button) should show.
- **`sidepanel/`** - Main UI for the side panel; connects to background via port for messages.
- **`settings/`** - Settings page for API keys, provider configuration, and UI preferences.
- **`archive/`** - Archive/history viewer with tag management and export/import functionality.
- **`prompt/`** - Prompt editor for advanced customization.
- **`popop/`** - Popup UI (shown on icon click or mobile).
- **Content extractors** - Site-specific scripts: `udemy.content.js`, `coursera.content.js`, `youtubetranscript.content.js`, etc.

#### Stores (`src/stores/`)

State management using **Svelte 5 reactive state** (`.svelte.js` files):

- **`summaryStore.svelte.js`** - Central summary state: `summaryState` object with loading flags, results, and error objects. Functions like `fetchAndSummarize()`, `summarizeSelectedText()`, `executeCustomAction()`.
- **`settingsStore.svelte.js`** - User settings (API keys, model choices, temperature, theme, etc.).
- **`archiveStore.svelte.js`** - Archive/history entries with filtering.
- **`themeStore.svelte.js`** - UI theme preferences.
- **`tabTitleStore.svelte.js`** - Current tab title tracking.
- **`i18nShadowStore.svelte.js`** - Locale for Shadow DOM components.

#### API Layer (`src/lib/api/`)

- **`aiSdkAdapter.js`** - Core adapter that maps provider IDs and settings to AI SDK models. Functions: `getAISDKModel()`, `generateContent()`, `generateContentStream()`. Supports 8+ providers (Gemini, OpenAI, Claude, Groq, OpenRouter, Ollama, DeepSeek, LM Studio).
- **`api.js`** - High-level summarization functions: `summarizeContent()`, `summarizeChapters()`, with streaming variants.
- **`ollamaProxyModel.js`** - Custom model wrapper for Ollama when accessed via background script proxy (cross-origin workaround).

#### Database (`src/lib/db/`)

- **`indexedDBService.js`** - IndexedDB operations: `addHistory()`, `addSummary()`, `getSummaryById()`, etc. Data stored in local browser database.

#### Utilities

- **`src/services/contentService.js`** - Extracts page content (page text, YouTube transcript, course transcripts).
- **`src/services/messageHandler.js`** - Handles messages from background script to side panel.
- **`src/lib/utils/`** - Helper functions for crypto, URL parsing, browser detection, DOM manipulation.
- **`src/lib/prompting/`** - Prompt building and system instructions for different content types.
- **`src/lib/i18n/`** - Internationalization setup with `svelte-i18n`.

### Critical Message Types

The extension uses browser messaging for cross-context communication:

- `'REQUEST_SUMMARY'` - Request summarization from content
- `'SAVE_TO_HISTORY'` / `'SAVE_TO_ARCHIVE'` - Store to IndexedDB
- `'OLLAMA_API_REQUEST'` - Proxy Ollama calls through background
- `'PERMISSION_CHANGED'` - Firefox optional permissions broadcast
- `'TOGGLE_FLOATING_PANEL'` - Toggle floating UI visibility
- `'tabUpdated'` / `'currentTabInfo'` - Tab detection messages
- Port-based messaging for side panel persistence

### Provider Support

The adapter (`aiSdkAdapter.js`) supports:

1. **Gemini** - Google's generative AI (default)
2. **OpenAI** - ChatGPT and GPT-4
3. **Anthropic** - Claude
4. **Groq** - Fast inference
5. **OpenRouter** - Unified API for many models
6. **Ollama** - Local models with CORS proxy workaround
7. **DeepSeek** - via OpenAI-compatible API
8. **LM Studio** - Local inference engine
9. **Custom OpenAI-compatible** - Any OpenAI-compatible server

### Storage

- **WXT Storage** (`wxtStorageService.js`) - Browser storage abstraction (local/sync)
- **IndexedDB** - For history/archive (structured summaries with metadata)
- **Migration logic** - Automatic migration from sync to local storage on update

## Svelte 5 Reactive State Pattern

All stores use Svelte 5's fine-grained reactivity with `$state`:

```javascript
export const summaryState = $state({
  summary: '',
  isLoading: false,
  error: null,
  // ... more properties
})

// Modifying state directly triggers reactivity
export function updateSummary(text) {
  summaryState.summary = text // Reactive update
}
```

No `.svelte` file components use these stores directly in templates; instead, the main entrypoints import and use them.

## Configuration & Build

### WXT Config (`wxt.config.ts`)

- Defines manifest for Chrome (MV3) and Firefox (MV2/MV3)
- Configures permissions, content scripts, commands, icons
- Tailwind CSS integrated via `@tailwindcss/vite`
- Svelte module enabled
- `iconBundlePlugin()` from `build/icons/` — see below

### Icons (offline-bundled)

Icons are `@iconify/svelte` `<Icon icon="prefix:name" />` as usual, but the icon **data is bundled, not fetched**. `@iconify/svelte`'s default component renders *nothing at all* until its network request resolves — no box, so declared `width`/`height` don't help — which is what used to make the side panel's icons pop in and shift the layout on every open.

- `src/lib/icons/iconBundle.js` — **generated, committed, never hand-edit.** It is its own cache: the plugin diffs it against the source scan and only touches the network or disk when the icon set actually changes.
- `src/lib/icons/registerIcons.js` — `addCollection()` loop, imported as a top-level side effect from all six `entrypoints/*/main.js`, next to the existing `@/lib/i18n/i18n.js` import. Must stay top-level: it has to run before `mount()`.
- `build/icons/scanIconNames.mjs` — scans `src/**/*.{svelte,js}` for quoted `prefix:name` literals, filtered by `KNOWN_PREFIXES`. Scans `.js` too because several call sites bind the name dynamically (`providerRegistry.js`, `actionConstants.js`, `iconForSourceKind()`), but the literal always lives somewhere in `src/`. It skips `iconBundle.js` itself — scanning the generated file would make its icon set self-sustaining and nothing could ever be pruned.
- `build/icons/iconBundlePlugin.mjs` — Vite plugin, memoised at **module** scope (WXT calls `vite()` once per build target, each time constructing a fresh plugin object). Also runs standalone via `npm run icons:sync`.

Day to day this is invisible: add an icon and `npm run dev` picks it up; remove one and it gets pruned. Two things fail the build on purpose — a name Iconify doesn't have (`not_found`), and an `<Icon>` prop using a collection absent from `KNOWN_PREFIXES`. Both used to render silently-empty icons. `*://*.iconify.design/*` stays in `host_permissions` as a safety net, so a missed icon degrades to the old pop-in rather than disappearing.

### TypeScript

- `tsconfig.json` extends `.wxt/tsconfig.json`
- `allowJs: true` for JS files
- Some files marked `@ts-nocheck` due to dynamic imports or browser APIs

## Key Development Patterns

### 1. Streaming vs. Non-Streaming

`fetchAndSummarize()` in `summaryStore.svelte.js` checks `settings.enableStreaming` and `providerSupportsStreaming()`:

- **Streaming** - Real-time chunks for better UX on slower connections
- **Non-streaming** - Complete result, simpler error handling

Both paths ultimately append to `summaryState.summary` or other result fields.

### 2. Error Handling

Errors are structured via `handleError()` (in `simpleErrorHandler.js`):

```javascript
summaryState.summaryError = handleError(e, {
  source: 'mainSummarizationProcess'
})
```

Error objects include: `message`, `type`, `source`, `timestamp`.

### 3. Firefox Permissions

Firefox requires optional permissions for sites. The flow:

1. Content script sends `CHECK_FIREFOX_PERMISSION` to background
2. Background checks via `firefoxPermissionService.js`
3. If denied, prompt user or show warning
4. Similar logic in `fetchAndSummarize()` when starting

### 4. Mobile & Browser Detection

- `browserDetection.js` - Detects mobile, Firefox, browser capabilities
- Special handling for mobile in `background/index.js` (forces popup instead of side panel)
- Firefox Android uses sidebar instead of side panel

## Common Tasks

### Adding a New AI Provider

1. Add provider configuration to `src/lib/config/aiConfig.js`
2. Create provider settings component in `src/components/providerConfigs/`
3. Update `getAISDKModel()` in `aiSdkAdapter.js` with new case
4. Add model selection UI in settings

### Modifying Prompts

- System instructions: `src/lib/prompting/systemInstructions.js`
- Prompt templates: `src/lib/prompting/promptBuilders.js` and `src/lib/prompts/templates/`
- Length/tone/format definitions: `src/lib/prompting/prompts/modules/`

### Updating Archive/History Schema

- Edit `indexedDBService.js` for database schema
- Update archive components in `src/entrypoints/archive/` for UI changes
- Run migration if version changes

### Adding New Shortcuts

- Update manifest in `wxt.config.ts` under `commands`
- Add listener in `background/index.js` via `browser.commands.onCommand.addListener()`
- Add corresponding message handler in the right `background/handlers/*.js` module (a new file there needs registering in `index.js`'s `createMessageRouter([...])` call)

## Important Notes

- **Streaming** can fail on Firefox mobile (ReadableStream `flush` error); handled with fallback to non-streaming
- **Ollama CORS** - Background script uses `declarativeNetRequest` to add headers for cross-origin Ollama calls
- **Shadow DOM** - Content script UI is isolated to prevent style conflicts
- **IndexedDB** - Persists across sessions; cleared by user or browser storage reset
- **Firefox optional permissions** - Required for content access; must be requested explicitly
- **MultiProvider Support** - `settings` object has properties for each provider's API key and model choice

## Testing

`npm test` runs `vitest run` — 51 test files, including the architecture guard at `tests/architecture/layering.test.js`. Run `npm test` before considering any layering or component-placement change done.

For manual testing:

1. Run `npm run dev` to build with HMR
2. Load `.output/chrome` or `.output/firefox` folder as unpacked extension
3. Test core flows: summarize page, use different providers, check history/archive
4. Check browser console for debug logs (prefixed with `[component_name]`)

## Useful Debugging

- All major functions log with component prefix: `[Background]`, `[Content]`, `[summaryStore]`, etc.
- Network tab shows AI API calls
- Storage inspection in DevTools shows WXT and IndexedDB data
- `browser.runtime` messages can be traced via background console
- Shadow DOM components are visible in DevTools under `#shadow-root`
