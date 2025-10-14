// @ts-nocheck
import { defineContentScript, createShadowRootUi } from '#imports'
import { MessageBasedTranscriptExtractor } from './content/extractors/MessageBasedTranscriptExtractor.js'
import CopyTranscriptIcon from './content/CopyTranscriptIcon.svelte'
import { mount, unmount } from 'svelte'
import './content/styles/floating-ui.css'

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
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

    // Store reference to current UI instance
    let currentUI = null

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
          // Remove existing icon if no transcript available
          if (currentUI) {
            currentUI.remove()
            currentUI = null
            const existingIcon = document.querySelector(
              '.copy-transcript-container'
            )
            if (existingIcon) {
              existingIcon.remove()
            }
          }
          return
        }

        // Remove existing icon to create a fresh one with updated props
        if (currentUI) {
          console.log(
            '[YouTube Copy Transcript] Removing existing icon for refresh'
          )
          currentUI.remove()
          currentUI = null
        }

        // Remove existing container
        const existingIcon = document.querySelector(
          '.copy-transcript-container'
        )
        if (existingIcon) {
          existingIcon.remove()
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
        currentUI = await createShadowRootUi(ctx, {
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

        currentUI.mount()
        console.log(
          '[YouTube Copy Transcript] Icon inserted successfully with title:',
          videoTitle
        )
      } catch (error) {
        console.error('[YouTube Copy Transcript] Error inserting icon:', error)
      }
    }

    // Helper function to get current video ID
    const getCurrentVideoId = () => {
      const url = window.location.href
      const match = url.match(/[?&]v=([^&]+)/)
      return match ? match[1] : null
    }

    // Watch for navigation changes in YouTube SPA
    const setupNavigationWatcher = () => {
      let currentUrl = window.location.href
      let currentVideoId = getCurrentVideoId()

      const handleNavigation = async () => {
        const newUrl = window.location.href
        const newVideoId = getCurrentVideoId()

        if (newUrl !== currentUrl || newVideoId !== currentVideoId) {
          console.log('[YouTube Copy Transcript] Navigation detected:', {
            oldUrl: currentUrl,
            newUrl,
            oldVideoId: currentVideoId,
            newVideoId,
          })

          currentUrl = newUrl
          currentVideoId = newVideoId

          // Only proceed if we're on a watch page with a video ID
          if (newVideoId) {
            // Small delay to ensure DOM is ready
            setTimeout(async () => {
              try {
                // Wait for player controls to be available
                const rightControls = await waitForPlayerControls()
                await insertCopyIcon(rightControls)
              } catch (error) {
                console.error(
                  '[YouTube Copy Transcript] Error on navigation:',
                  error
                )
              }
            }, 200)
          } else {
            console.log(
              '[YouTube Copy Transcript] Not a watch page, skipping icon insertion'
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
        setTimeout(handleNavigation, 50)
      }

      history.replaceState = function (...args) {
        originalReplaceState.apply(this, args)
        setTimeout(handleNavigation, 50)
      }

      // Additional observer for YouTube-specific navigation
      const observerCallback = (mutations) => {
        for (const mutation of mutations) {
          // Check for changes in video title or other key elements
          if (
            mutation.target.matches &&
            (mutation.target.matches('h1.ytd-watch-metadata') ||
              mutation.target.matches('#movie_player'))
          ) {
            setTimeout(handleNavigation, 100)
            break
          }
        }
      }

      const observer = new MutationObserver(observerCallback)
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['src', 'href'],
      })

      // Additional interval check as fallback
      setInterval(() => {
        handleNavigation()
      }, 2000)
    }

    // Initialize the feature
    try {
      const currentVideoId = getCurrentVideoId()
      if (!currentVideoId) {
        console.log(
          '[YouTube Copy Transcript] Not on a watch page, skipping initialization'
        )
        // Still setup navigation watcher to detect when user navigates to a watch page
        setupNavigationWatcher()
        return
      }

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
