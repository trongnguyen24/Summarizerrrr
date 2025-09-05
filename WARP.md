# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Summarizerrrr is a browser extension that provides AI-powered summarization for web content, built specifically for YouTube videos, online courses (Udemy, Coursera), and general web pages. The extension supports multiple AI providers (Google Gemini, OpenAI, Ollama, etc.) and offers streaming responses with multi-language support.

## Development Commands

### Core Commands
- **Development server**: `npm run dev` - Starts WXT development mode with hot reload
- **Development (Firefox)**: `npm run dev:firefox` - Start development specifically for Firefox
- **Build for production**: `npm run build` - Creates production build for Chrome
- **Build (Firefox)**: `npm run build:firefox` - Creates production build for Firefox
- **Type checking**: `npm run check` - Runs svelte-check for TypeScript validation
- **Package extension**: `npm run zip` - Creates installable ZIP for Chrome Web Store
- **Package (Firefox)**: `npm run zip:firefox` - Creates installable ZIP for Firefox Add-ons

### Mobile Testing
- **Android testing**: `npm run android` - Run extension on Android Firefox (requires setup)
- **Android (Windows)**: `npm run android:win` - Windows-specific Android testing command

## Technology Stack

- **Framework**: WXT (Web Extension Toolkit) - Modern extension development framework
- **Frontend**: Svelte 5 with reactive state management  
- **Styling**: TailwindCSS 4 with custom component system
- **Language**: JavaScript (with TypeScript checking disabled via `// @ts-nocheck`)
- **Build**: Vite-based bundling through WXT
- **I18n**: svelte-i18n with 40+ language support
- **Storage**: IndexedDB for archive/history + WXT storage API for settings

## Architecture Overview

### Extension Structure
The extension uses WXT's multi-entrypoint architecture:

- **Background Script** (`src/entrypoints/background.js`): Service worker handling cross-browser messaging, context menus, keyboard shortcuts, and tab management
- **Content Scripts**: Platform-specific extraction (YouTube, Udemy, Coursera) with fallback to generic DOM extraction
- **Side Panel** (`src/entrypoints/sidepanel/`): Main UI for Chrome's side panel API
- **Popup** (`src/entrypoints/popop/`): Mobile interface and Firefox popup
- **Settings Page** (`src/entrypoints/settings/`): Extension configuration interface
- **Archive Page** (`src/entrypoints/archive/`): Saved summaries management

### Key Services

#### Content Extraction (`src/entrypoints/content/services/ContentExtractorService.js`)
Unified service for extracting content from different platforms:
- **YouTube**: Transcript extraction via MessageBasedTranscriptExtractor
- **Courses**: Platform-specific extractors (Udemy/Coursera)  
- **Generic**: DOM text extraction with innerText/textContent fallback

#### Summarization (`src/entrypoints/content/services/SummarizationService.js`)
Handles AI summarization with streaming support:
- **Provider agnostic**: Works with Gemini, OpenAI, Ollama, OpenRouter, etc.
- **Streaming support**: Real-time response updates with Firefox mobile fallback
- **Parallel processing**: YouTube generates both video summary and chapter breakdown simultaneously
- **Course-specific**: Specialized prompting for educational content

### State Management
Global Svelte stores handle application state:

- **`settingsStore.svelte.js`**: User preferences, API keys, provider settings
- **`summaryStore.svelte.js`**: Current summarization state and results
- **`archiveStore.svelte.js`**: Saved summaries management
- **`themeStore.svelte.js`**: Dark/light mode and UI preferences

### Cross-Browser Support
- **Chrome**: Uses side panel API for main interface
- **Firefox**: Uses sidebar API with mobile popup fallback
- **Mobile**: Dedicated mobile interface with touch-optimized UI

## Component Architecture

### Reusable Components
- **`components/buttons/`**: Specialized action buttons (summarize, copy, download, archive)
- **`components/inputs/`**: Form controls with provider-specific configurations
- **`components/providerConfigs/`**: AI provider setup interfaces (9 different providers)
- **`components/navigation/`**: Tab system and table of contents generation

### Content Script Components
- **Floating Panel**: Draggable summarization interface injected into pages
- **Shadow DOM Integration**: Isolated styling to avoid conflicts with host pages
- **Mobile Sheet**: Bottom sheet interface optimized for mobile browsers

## Key Development Patterns

### Message Passing
Complex messaging system between extension contexts:
- **Background ↔ Content Scripts**: Tab management and content extraction
- **Background ↔ Side Panel**: Long-lived port connections for real-time updates  
- **Content → Background**: Summary requests and archive operations

### Error Handling
Robust fallback system:
- **Provider failures**: Graceful degradation between AI providers
- **Content extraction**: Platform-specific → generic DOM extraction
- **Streaming errors**: Auto-fallback to non-streaming on Firefox mobile

### Internationalization
Complete i18n implementation:
- **Shadow DOM support**: Separate i18n context for injected content
- **Dynamic language switching**: Real-time UI language updates
- **Locale-aware content**: Language-specific transcript requests

## Browser Extension Specifics

### Manifest Configuration
`wxt.config.ts` defines browser-specific manifests:
- **Chrome**: Side panel permissions, content script injection
- **Firefox**: Sidebar API, different permission model
- **Content Security Policy**: Handles streaming and external API calls

### Content Script Injection
Dynamic injection based on URL patterns:
- **YouTube**: Automatic transcript extraction script injection
- **Courses**: Platform-specific content extractors
- **Universal**: Floating panel for all websites

## Testing and Development

### Testing Individual Components
Since there are no explicit test commands, test components individually:
```bash
# Test specific provider
npm run dev
# Navigate to settings → test API connection

# Test content extraction on different platforms  
npm run dev:firefox
# Visit YouTube/Udemy/Coursera pages

# Test mobile interface
npm run android  # Requires Android setup
```

### Debugging
- **Background script**: `chrome://extensions` → Inspect service worker
- **Content scripts**: DevTools → Sources → Content scripts
- **Side panel**: Right-click panel → Inspect
- **Storage**: Application tab → Storage → Local storage/IndexedDB

## Provider Integration

The extension supports 9 different AI providers through a unified API:
- **Google Gemini**: Primary provider with advanced models
- **OpenAI**: GPT models with streaming support  
- **Ollama**: Local model support
- **OpenRouter**: Access to multiple model providers
- **Anthropic, DeepSeek, Groq**: Additional cloud providers

Each provider has dedicated configuration components and API adapters in `src/lib/api/`.

## Storage Architecture

### Settings Storage
WXT storage API for cross-browser settings synchronization:
- User preferences persist across devices
- API keys stored securely in extension storage
- Provider configurations with validation

### Archive System  
IndexedDB for local summary storage:
- Offline access to saved summaries
- Full-text search capability
- Export functionality (Markdown/PDF planned)

## Platform-Specific Considerations

### YouTube Integration
- Transcript extraction without YouTube API dependency
- Chapter detection and timestamp-based summaries
- Support for auto-generated and manual captions

### Course Platform Support
- Udemy: Lecture content extraction with video transcript support
- Coursera: Reading materials and video content extraction
- Generic course platform fallback

### Mobile Optimization
- Touch-optimized floating interface
- Bottom sheet design pattern
- Simplified navigation for small screens
