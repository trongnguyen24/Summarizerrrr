# Project: Summarizerrrr

## Project Overview

Summarizerrrr is a cross-browser extension designed to summarize web content from various sources like YouTube, Udemy, Coursera, and other websites. It leverages multiple AI providers, including local models via Ollama, to provide users with quick summaries. The extension is built with a focus on UI/UX, customizability, and user data privacy.

The project is built using the [WXT](https://wxt.dev/) framework, which simplifies the development of cross-browser extensions. The frontend is built with [Svelte](https://svelte.dev/) and styled with [Tailwind CSS](https://tailwindcss.com/). The core logic is written in TypeScript.

## Building and Running

The project uses `npm` for package management.

-   **Install dependencies:**
    ```bash
    npm install
    ```

-   **Run in development mode:**
    This will create an unpacked extension in the `.output/` directory and watch for changes.
    ```bash
    # For Chrome
    npm run dev

    # For Firefox
    npm run dev:firefox
    ```

-   **Build for production:**
    This will create an optimized and minified extension in the `.output/` directory.
    ```bash
    # For Chrome
    npm run build

    # For Firefox
    npm run build:firefox
    ```

-   **Create a zip file for distribution:**
    This will create a zip file of the extension in the project root.
    ```bash
    # For Chrome
    npm run zip

    # For Firefox
    npm run zip:firefox
    ```

-   **Type Checking:**
    The project uses `svelte-check` for type checking the Svelte components.
    ```bash
    npm run check
    ```

## Development Conventions

-   **Framework:** The project uses the [WXT](https://wxt.dev/) framework. It's important to be familiar with its conventions for defining entrypoints (background scripts, content scripts, popups, side panels) and using its APIs.
-   **UI:** The UI is built with [Svelte](https://svelte.dev/) and components are located in `src/components/`.
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/) is used for styling.
-   **State Management:** Svelte stores (`.svelte.js` files) are used for state management, located in `src/stores/`.
-   **Entrypoints:** The main entrypoints are defined in `src/entrypoints/` and configured in `wxt.config.ts`.
-   **Static Assets:** Public assets are stored in the `public/` directory.
