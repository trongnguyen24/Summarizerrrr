import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        // Add input configuration
        main: 'index.html', // Keep the default entry point
        background: 'src/background.js', // Add background script as an entry point
        youtubetranscript: 'src/youtubetranscript.js', // Add youtube-transcript.js as an entry point
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
})
