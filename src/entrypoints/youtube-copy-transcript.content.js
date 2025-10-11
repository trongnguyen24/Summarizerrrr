// @ts-nocheck
import { defineContentScript, createShadowRootUi } from '#imports'
import { MessageBasedTranscriptExtractor } from './content/extractors/MessageBasedTranscriptExtractor.js'
import CopyTranscriptIcon from '../components/ui/CopyTranscriptIcon.svelte'
import { mount, unmount } from 'svelte'

export default defineContentScript({
  matches: ['*://*.youtube.com/watch*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    console.log('[YouTube Copy Transcript] Content script loaded')

    // Wait for YouTube player to load
    const waitForPlayer = () => {
      return new Promise((resolve) => {
        const checkPlayer = () => {
          const player = document.querySelector(
            '.ytp-chrome-controls .ytp-right-controls'
          )
          if (player) {
            resolve(player)
          } else {
            setTimeout(checkPlayer, 100)
          }
        }
        checkPlayer()
      })
    }

    // Check if transcript is available
    const checkTranscriptAvailability = async () => {
      try {
        // Wait for YouTube transcript script to be available
        if (typeof getCaptions === 'undefined') {
          console.log(
            '[YouTube Copy Transcript] Waiting for transcript script...'
          )
          await new Promise((resolve) => {
            const checkScript = () => {
              if (typeof getCaptions !== 'undefined') {
                resolve()
              } else {
                setTimeout(checkScript, 100)
              }
            }
            checkScript()
          })
        }

        const transcriptExtractor = new MessageBasedTranscriptExtractor('en')
        const transcript = await transcriptExtractor.getPlainTranscript()
        return transcript && transcript.trim().length > 0
      } catch (error) {
        console.log(
          '[YouTube Copy Transcript] Error checking transcript availability:',
          error
        )
        return false
      }
    }

    // Insert copy transcript icon
    const insertCopyIcon = async (playerControls) => {
      try {
        // Check if transcript is available before showing icon
        const hasTranscript = await checkTranscriptAvailability()
        if (!hasTranscript) {
          console.log(
            '[YouTube Copy Transcript] No transcript available, not showing icon'
          )
          return
        }

        // Find the settings button to position our icon next to it
        const settingsButton = playerControls.querySelector(
          '.ytp-settings-button'
        )
        if (!settingsButton) {
          console.log('[YouTube Copy Transcript] Settings button not found')
          return
        }

        // Check if our icon is already inserted
        const existingIcon = playerControls.querySelector(
          '.copy-transcript-container'
        )
        if (existingIcon) {
          console.log('[YouTube Copy Transcript] Icon already exists')
          return
        }

        // Create container for our icon
        const iconContainer = document.createElement('div')
        iconContainer.className = 'copy-transcript-container'
        iconContainer.style.cssText = `
          display: inline-flex;
          align-items: center;
          height: 100%;
        `

        // Insert before settings button
        settingsButton.parentNode.insertBefore(iconContainer, settingsButton)

        // Create shadow DOM UI for the icon
        const ui = await createShadowRootUi(ctx, {
          name: 'youtube-copy-transcript-icon',
          position: 'inline',
          anchor: iconContainer,
          onMount(container) {
            const app = mount(CopyTranscriptIcon, { target: container })
            return app
          },
          onRemove(app) {
            unmount(app)
          },
        })

        ui.mount()
        console.log('[YouTube Copy Transcript] Icon inserted successfully')
      } catch (error) {
        console.error('[YouTube Copy Transcript] Error inserting icon:', error)
      }
    }

    // Watch for navigation changes in YouTube SPA
    const setupNavigationWatcher = () => {
      let currentUrl = window.location.href

      const handleNavigation = async () => {
        if (window.location.href !== currentUrl) {
          currentUrl = window.location.href
          console.log(
            '[YouTube Copy Transcript] Navigation detected, re-initializing...'
          )

          // Wait a bit for YouTube to load the new page
          setTimeout(async () => {
            try {
              const playerControls = await waitForPlayer()
              await insertCopyIcon(playerControls)
            } catch (error) {
              console.error(
                '[YouTube Copy Transcript] Error on navigation:',
                error
              )
            }
          }, 1000)
        }
      }

      // Watch for pushstate/popstate events
      window.addEventListener('popstate', handleNavigation)

      // Override pushState and replaceState to detect SPA navigation
      const originalPushState = history.pushState
      const originalReplaceState = history.replaceState

      history.pushState = function (...args) {
        originalPushState.apply(this, args)
        setTimeout(handleNavigation, 100)
      }

      history.replaceState = function (...args) {
        originalReplaceState.apply(this, args)
        setTimeout(handleNavigation, 100)
      }
    }

    // Initialize the feature
    try {
      // Wait for initial player load
      const playerControls = await waitForPlayer()
      console.log('[YouTube Copy Transcript] Player controls found')

      // Insert the copy icon
      await insertCopyIcon(playerControls)

      // Setup navigation watcher for SPA navigation
      setupNavigationWatcher()
    } catch (error) {
      console.error('[YouTube Copy Transcript] Initialization error:', error)
    }
  },
})
