# Code Style and Conventions

*   **Svelte 5:** The project uses Svelte 5 features, including Runes (`$state`, `$effect`) for state management and `$props()` for passing properties.
*   **State Management:** Global state is managed in `*.svelte.js` files (e.g., `settingsStore.svelte.js`). These files export a state object (`$state`) and action functions to modify the state.
*   **Styling:** TailwindCSS is used for styling, applied directly to HTML element classes.
*   **Component Structure:** Svelte files have a `<script>` tag at the top, followed by the HTML markup.
*   **Asynchronous Programming:** `async/await` is used for handling asynchronous operations, especially when interacting with browser APIs (`chrome.storage`).
*   **Documentation:** JSDoc is used to document functions in JavaScript files.