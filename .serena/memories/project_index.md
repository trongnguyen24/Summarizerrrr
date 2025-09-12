# Project Index

This document provides an index of the project's file structure and a brief description of each major directory and its contents.

## Root Directory

- `wxt.config.ts`: Configuration file for WXT (Web Extension Toolkit), defining build processes, manifest settings, and browser-specific configurations.
- `package.json`: Project metadata, dependencies, and scripts.
- `tsconfig.json`: TypeScript configuration (though the project primarily uses JavaScript, this might be for type checking or build processes).
- `src/`: Contains all source code for the extension.

## `src/` Directory

- `src/stores/`: Svelte stores for managing global application state (e.g., settings, summary data, theme).
- `src/components/`: Reusable Svelte components, categorized by their function (e.g., buttons, displays, inputs).
  - `src/components/buttons/`: Svelte components for various buttons (e.g., `SummarizeButton.svelte`, `CopyButton.svelte`).
  - `src/components/displays/`: Svelte components for displaying content (e.g., `SummaryDisplay.svelte`, `ErrorDisplay.svelte`).
  - `src/components/feedback/`: Svelte components for user feedback (e.g., `CustomToast.svelte`).
  - `src/components/icon/`: Svelte components for icons.
  - `src/components/inputs/`: Svelte components for input fields (e.g., `ApiKeyInput.svelte`, `Switch.svelte`).
  - `src/components/navigation/`: Svelte components for navigation elements (e.g., `TabNavigation.svelte`, `TOC.svelte`).
  - `src/components/providerConfigs/`: Svelte components for configuring AI providers (e.g., `ChatGPTConfig.svelte`, `GeminiAdvancedConfig.svelte`).
  - `src/components/settings/`: Svelte components for different settings panels (e.g., `GeneralSettings.svelte`, `AIModelSettings.svelte`).
  - `src/components/ui/`: General UI components (e.g., `GroupVisual.svelte`).
- `src/lib/`: Library functions and utilities.
  - `src/lib/api/`: Modules for API interactions (e.g., `aiSdkAdapter.js`, `api.js`).
  - `src/lib/db/`: Database related services (e.g., `indexedDBService.js`).
  - `src/lib/error/`: Error handling utilities (e.g., `errorHandler.js`, `errorLogger.js`).
  - `src/lib/i18n/`: Internationalization (i18n) setup and utilities (e.g., `i18n.js`).
  - `src/lib/locales/`: JSON files containing localization strings for different languages (e.g., `en.json`, `vi.json`).
  - `src/lib/prompting/`: Logic for AI prompt construction and management.
    - `src/lib/prompting/models/`: Definitions for different AI models.
    - `src/lib/prompting/prompts/`: Core prompt definitions.
    - `src/lib/prompting/prompts/modules/`: Modular parts of prompts (e.g., `formatDefinitions.js`, `lengthDefinitions.js`).
  - `src/lib/prompts/`: Specific prompt templates for various content types (e.g., `youTubePromptTemplate.js`, `courseSummaryPromptTemplate.js`).
    - `src/lib/prompts/templates/`: Template files for prompts.
  - `src/lib/ui/`: UI-related utility functions (e.g., `slideScaleFade.js`, `textScramble.js`).
  - `src/lib/utils/`: General utility functions (e.g., `utils.js`).
- `src/entrypoints/`: Entry points for different parts of the web extension.
  - `src/entrypoints/archive/`: Entry point for the archive panel.
  - `src/entrypoints/prompt/`: Entry point for the prompt editor.
  - `src/entrypoints/sidepanel/`: Entry point for the side panel.
  - `src/entrypoints/background.js`: Background script for the extension.
  - `src/entrypoints/coursera.content.js`: Content script for Coursera.
  - `src/entrypoints/udemy.content.js`: Content script for Udemy.
  - `src/entrypoints/youtubetranscript.content.js`: Content script for YouTube transcript.
- `src/assets/`: Static assets like images (e.g., `svelte.svg`).
- `src/services/`: Various service modules (e.g., `chromeService.js`, `contentService.js`, `messageHandler.js`).
