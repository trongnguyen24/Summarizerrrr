# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Summarizerrrr is a browser extension (Chrome/Firefox) that provides AI-powered content summarization for various types of web content including YouTube videos, online courses (Udemy/Coursera), websites, and selected text. The extension uses a multi-provider AI system supporting Google Gemini, OpenRouter, and Ollama models.

## Development Commands

```bash
# Install dependencies
npm install

# Development (Chrome)
npm run dev

# Development (Firefox)
npm run dev:firefox

# Build for production (Chrome)
npm run build

# Build for production (Firefox)
npm run build:firefox

# Type checking
npm run check

# Create extension packages
npm run zip           # Chrome
npm run zip:firefox   # Firefox

# Prepare extension (post-install)
npm run postinstall
```

## Architecture Overview

### Framework & Build System
- **WXT Framework**: Modern web extension development framework
- **Svelte 5**: Frontend framework with latest runes syntax ($state, $derived, $effect)
- **TypeScript**: Type safety with extension-specific configurations
- **TailwindCSS**: Utility-first CSS framework with custom design system

### Core Extension Structure

#### Entry Points (`src/entrypoints/`)
- `background.js`: Service worker handling extension lifecycle, tab management, content script injection
- `sidepanel/`: Main UI (Chrome side panel / Firefox sidebar)
- `archive/`: Archived summaries management
- `prompt/`: Custom prompt editor
- `*.content.js`: Platform-specific content scripts for YouTube, Udemy, Coursera

#### State Management (`src/stores/`)
- `summaryStore.svelte.js`: Core summarization state and logic
- `settingsStore.svelte.js`: User preferences and API configurations
- `themeStore.svelte.js`: Theme management (dark/light mode)
- `*ModeSettingsStore.svelte.js`: Basic/Advanced mode configurations

#### AI Provider System (`src/lib/providers/`)
- `baseProvider.js`: Abstract base class for all AI providers
- `geminiProvider.js`: Google Gemini API integration
- `openrouterProvider.js`: OpenRouter API integration
- `ollamaProvider.js`: Local Ollama integration
- Provider-agnostic API layer in `src/lib/api.js`

#### Content Processing (`src/lib/`)
- `promptBuilders.js`: Builds prompts for different content types
- `promptTemplates.js`: Template system for various summarization formats
- `indexedDBService.js`: Local storage for summaries and history

### Component Architecture

#### Display Components (`src/components/displays/`)
- Content-specific display components for different platforms
- Modular design supporting YouTube, Course, Web, and Selected Text summaries

#### Input Components (`src/components/inputs/`)
- Reusable form components with consistent styling
- Provider-specific configuration components

#### Button Components (`src/components/buttons/`)
- Action buttons with loading states and animations

### Browser Extension Features

#### Cross-Platform Support
- Chrome: Uses sidePanel API and scripting permissions
- Firefox: Uses sidebar and webextensions polyfill
- Conditional browser-specific manifest configuration in `wxt.config.ts`

#### Content Script Injection
- Automatic injection for supported platforms (YouTube, Udemy, Coursera)
- Dynamic injection based on URL patterns
- Handles transcript extraction and course content processing

#### Permissions & Security
- `<all_urls>` for content access
- `storage` for settings persistence
- `activeTab` and `tabs` for tab management
- `contextMenus` for right-click summarization

## Key Technical Patterns

### Svelte 5 Runes Usage
- Use `$state()` for reactive variables
- Use `$derived()` for computed values
- Use `$effect()` for side effects and cleanup
- Store patterns with `$state.snapshot()` for debugging

### Provider System Integration
- All AI providers implement the `BaseProvider` interface
- Configuration handled through settings store
- Graceful fallbacks and error handling
- Support for both basic (Gemini-only) and advanced (multi-provider) modes

### Extension Messaging
- Background script serves as message hub
- Port-based communication for real-time updates
- Content scripts communicate via chrome.runtime.sendMessage
- Proper error handling for disconnected ports

### Storage Strategy
- Chrome sync storage for settings
- IndexedDB for summary archives and history
- Automatic cleanup with configurable limits

## Platform-Specific Considerations

### YouTube Integration
- Transcript extraction with language support
- Chapter-based summarization
- Timeline integration

### Course Platforms (Udemy/Coursera)
- Content extraction from lecture pages
- Concept-focused summarization
- Course navigation awareness

### Web Content
- Generic webpage content processing
- Selected text summarization via context menu
- Reddit/forum discussion analysis

## Configuration Files

- `wxt.config.ts`: Extension build and manifest configuration
- `tsconfig.json`: TypeScript configuration extending WXT defaults
- `package.json`: Dependencies and build scripts
- No additional linting or testing configurations present

## Debugging & Development

- Use browser developer tools for extension debugging
- Background script logs available in extension service worker console
- Content script logs in page console
- Settings and state inspection via browser extension tools