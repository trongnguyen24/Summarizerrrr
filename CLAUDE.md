# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Summarizerrrr is a browser extension (Chrome/Firefox) that provides AI-powered summarization for web content, especially YouTube videos, Udemy/Coursera courses, and general websites. Built with WXT framework, Svelte 5, and TypeScript.

## Essential Commands

### Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server (Chrome)
npm run dev:firefox  # Start development server (Firefox)
npm run check        # Run Svelte type checking
```

### Building
```bash
npm run build           # Build for Chrome
npm run build:firefox   # Build for Firefox
npm run zip             # Create Chrome extension zip
npm run zip:firefox     # Create Firefox extension zip
```

### Mobile Development (Android Firefox)
```bash
npm run android         # Run on Android emulator
npm run android:win     # Run on specific Android device
```

## Architecture Overview

### Core Structure
- **WXT Framework**: Modern web extension development framework with TypeScript support
- **Svelte 5**: UI framework with reactive stores and Shadow DOM integration
- **Multi-browser**: Chrome (MV3) and Firefox (MV2) support with conditional logic

### Key Directories
```
src/
├── entrypoints/          # WXT entry points (background, content, popup, etc.)
│   ├── background.js     # Service worker (Chrome) / Background script (Firefox)
│   ├── content.js        # Main content script with Shadow DOM
│   ├── settings/         # Settings page
│   ├── prompt/           # Prompt editor page
│   └── sidepanel/        # Chrome side panel / Firefox sidebar
├── components/           # Reusable Svelte components
├── stores/               # Svelte stores for state management
├── lib/
│   ├── api/              # AI API integrations (Gemini, OpenAI, etc.)
│   ├── prompts/          # AI prompt templates
│   └── i18n/             # Internationalization (40+ languages)
└── services/             # Core business logic
```

### Browser-Specific Implementation
The codebase uses `import.meta.env.BROWSER` to conditionally handle Chrome vs Firefox:
- Chrome: Uses `chrome.sidePanel` API, MV3 service worker
- Firefox: Uses `browser.sidebarAction` API, background scripts
- Mobile detection for different UI behaviors

### State Management
- **settingsStore.svelte.js**: User preferences, AI model configs
- **summaryStore.svelte.js**: Summary generation state and content
- **i18nShadowStore.svelte.js**: Internationalization for Shadow DOM contexts

### Content Script Architecture
- Main content script creates Shadow DOM UI for all websites
- Specialized content extractors for different platforms:
  - `UdemyContentExtractor.js`: Course content from Udemy
  - `CourseraContentExtractor.js`: Course content from Coursera
  - YouTube transcript extraction via injected scripts

### AI Integration
- Multi-provider support: Google Gemini, OpenAI, Anthropic, Groq, Ollama, OpenRouter
- Configurable parameters: temperature, top-p, response length
- Template-based prompt system for different content types
- Support for both basic (preset models) and advanced (custom models) configurations

## Development Notes

### WXT Configuration
- `wxt.config.ts` handles manifest generation for both browsers
- Shadow DOM integration for content scripts
- Web accessible resources for YouTube transcript extraction

### Internationalization
- Uses `svelte-i18n` with 40+ language support
- Special handling for Shadow DOM contexts
- Locale files in `src/lib/locales/`

### Extension Permissions
- Chrome: `sidePanel`, `storage`, `activeTab`, `scripting`, `tabs`, `contextMenus`
- Firefox: `storage`, `tabs`, `<all_urls>`, `contextMenus`, `scripting`

### Key Features to Understand
1. **Universal content summarization** across all websites
2. **Platform-specific extractors** for courses (Udemy, Coursera)
3. **YouTube transcript integration** with timeline support
4. **Shadow DOM isolation** for content script UI
5. **Multi-provider AI integration** with fallback support
6. **Cross-browser compatibility** with feature detection