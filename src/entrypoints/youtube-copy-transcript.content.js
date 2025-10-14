// @ts-nocheck
import { defineContentScript, createShadowRootUi } from '#imports'
import { MessageBasedTranscriptExtractor } from './content/extractors/MessageBasedTranscriptExtractor.js'
import CopyTranscriptIcon from './content/CopyTranscriptIcon.svelte'
import { mount, unmount } from 'svelte'
import './content/styles/floating-ui.css'

export default defineContentScript({
  matches: ['*://*.youtube.com/watch*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    console.log('[YouTube Copy Transcript] Content script loaded')

    // Wait for YouTube player controls to load using MutationObserver
    const waitForPlayerControls = (timeout = 5000) => {
      return new Promise((resolve, reject) => {
        const selector = '.ytp-chrome-controls .ytp-right-controls'

        // First check if controls already exist
        const rightControls = document.querySelector(selector)
        if (rightControls) {
          resolve(rightControls)
          return
        }

        // Set up MutationObserver to watch for DOM changes
        const observer = new MutationObserver((mutations, obs) => {
          const controls = document.querySelector(selector)
          if (controls) {
            obs.disconnect()
            resolve(controls)
          }
        })

        // Start observing the document body for added nodes
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        })

        // Fallback timeout
        setTimeout(() => {
          observer.disconnect()
          const controls = document.querySelector(selector)
          if (controls) {
            resolve(controls)
          } else {
            reject(
              new Error(
                `YouTube player controls not found after ${timeout}ms timeout`
              )
            )
          }
        }, timeout)
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

        const videoTitle =
          document
            .querySelector('h1.ytd-watch-metadata')
            ?.textContent?.trim() || document.title
        const transcriptExtractor = new MessageBasedTranscriptExtractor('en')
        const transcript = await transcriptExtractor.getPlainTranscript()
        const hasTranscript = transcript && transcript.trim().length > 0
        return { hasTranscript, videoTitle }
      } catch (error) {
        console.log(
          '[YouTube Copy Transcript] Error checking transcript availability:',
          error
        )
        return { hasTranscript: false, videoTitle: '' }
      }
    }

    // Insert copy transcript icon
    const insertCopyIcon = async (rightControls) => {
      try {
        // Check if transcript is available before showing icon
        const { hasTranscript, videoTitle } =
          await checkTranscriptAvailability()
        if (!hasTranscript) {
          console.log(
            '[YouTube Copy Transcript] No transcript available, not showing icon'
          )
          return
        }

        // Check if our icon is already inserted
        const existingIcon = document.querySelector(
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
          padding: 0 0.4rem;
        `

        // Insert before .ytp-right-controls
        rightControls.parentNode.insertBefore(iconContainer, rightControls)

        // Create shadow DOM UI for the icon
        const ui = await createShadowRootUi(ctx, {
          name: 'youtube-copy-transcript-icon',
          position: 'inline',
          anchor: iconContainer,
          onMount(container) {
            const app = mount(CopyTranscriptIcon, {
              target: container,
              props: { videoTitle },
            })
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

          try {
            // Wait for player controls to be available using standardized function
            const rightControls = await waitForPlayerControls()
            await insertCopyIcon(rightControls)
          } catch (error) {
            console.error(
              '[YouTube Copy Transcript] Error on navigation:',
              error
            )
          }
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
      // Wait for initial player load using standardized function
      const rightControls = await waitForPlayerControls()
      console.log('[YouTube Copy Transcript] Right controls found')

      // Insert the copy icon
      await insertCopyIcon(rightControls)

      // Setup navigation watcher for SPA navigation
      setupNavigationWatcher()
    } catch (error) {
      console.error('[YouTube Copy Transcript] Initialization error:', error)
    }
  },
})
