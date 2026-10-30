// @ts-nocheck
/**
 * YouTube Quick Summary Content Script
 * Double Injection Strategy:
 * 1. Static: Inject into ytd-thumbnail when hovering
 * 2. Dynamic: Inject into ytd-video-preview when it appears
 * 
 * Performance Optimized:
 * - Throttled mouseover handler (100ms) to reduce CPU usage
 * - Narrowed MutationObserver scope to content container only
 * - On-demand preview checking instead of polling interval
 * - Cached style computations for positioned containers
 */
import { mount, unmount } from 'svelte'
import QuickSummaryButton from './content/QuickSummaryButton.svelte'
import { settingsStorage } from '@/services/wxtStorageService.js'

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_end',
  
  async main() {
    // Constants
    const PREVIEW_SELECTOR = 'ytd-video-preview'
    const INJECTED_MARKER = 'data-qs-injected'
    const POSITIONED_MARKER = 'data-qs-positioned'
    const THROTTLE_MS = 100
    
    // State
    let isEnabled = false
    let currentVideoId = null
    let observer = null
    let previewObserver = null // { target, observer } for the shared ytd-video-preview
    let lastMouseOverTime = 0
    let pendingPreviewCheck = null
    
    // Store mounted components for cleanup
    const mountedComponents = new WeakMap()
    
    // ===== THROTTLE UTILITY =====
    function shouldThrottle() {
      const now = Date.now()
      if (now - lastMouseOverTime < THROTTLE_MS) {
        return true
      }
      lastMouseOverTime = now
      return false
    }
    
    // ===== MOUSEOVER HANDLER (THROTTLED) =====
    function handleMouseOver(e) {
      if (!isEnabled) return
      if (shouldThrottle()) return
      
      // Try to find the thumbnail container - prioritize larger containers
      let thumbnail = e.target.closest('yt-lockup-view-model')  // Watch page sidebar
      if (!thumbnail) {
        thumbnail = e.target.closest('ytd-thumbnail')  // Home, Search pages
      }
      if (!thumbnail) {
        thumbnail = e.target.closest('yt-thumbnail-view-model')  // Fallback
      }
      if (!thumbnail) return
      
      // Skip if already injected
      if (thumbnail.hasAttribute(INJECTED_MARKER)) {
        // Still schedule preview check for already-injected thumbnails
        schedulePreviewCheck()
        return
      }
      
      // Get video link and ID - different selectors for different layouts
      let link = thumbnail.querySelector('a#thumbnail')  // Old layout
      if (!link) {
        link = thumbnail.querySelector('a[href*="/watch"]')  // New layout
      }
      if (!link) return
      
      const videoId = extractVideoId(link.href)
      if (!videoId) return
      
      // Track current video ID for preview injection
      currentVideoId = videoId
      
      // Mark as injected
      thumbnail.setAttribute(INJECTED_MARKER, 'true')
      
      // Find the actual thumbnail image container to inject into
      let targetContainer = thumbnail
      
      // For watch page sidebar, inject into the thumbnail image container
      const thumbnailImage = thumbnail.querySelector('yt-thumbnail-view-model')
      if (thumbnailImage) {
        targetContainer = thumbnailImage
        ensureRelativePosition(targetContainer)
      }
      
      injectButton(targetContainer, videoId)
      
      // Schedule preview check after hover (replaces interval)
      schedulePreviewCheck()
    }
    
    // ===== ON-DEMAND PREVIEW CHECK (replaces interval) =====
    function schedulePreviewCheck() {
      if (pendingPreviewCheck) return
      
      pendingPreviewCheck = requestAnimationFrame(() => {
        pendingPreviewCheck = null
        checkPreview()
      })
    }
    
    function checkPreview() {
      if (!isEnabled) return

      const preview = document.querySelector(PREVIEW_SELECTOR)
      if (!preview) return

      watchPreview(preview)
      syncPreviewButton(preview)
    }

    // ===== PREVIEW SYNC =====
    // YouTube keeps ONE ytd-video-preview alive and reuses it for every hovered
    // video, toggling it with the `ytdVideoPreviewActive` class (older layouts
    // used the `hidden` attribute). So the button must be re-synced whenever the
    // preview switches video, not injected once.

    function isPreviewVisible(preview) {
      if (preview.hasAttribute('hidden') || preview.style.display === 'none') return false
      if (preview.classList.contains('ytdVideoPreviewHost')) {
        return preview.classList.contains('ytdVideoPreviewActive')
      }
      return true
    }

    function getPreviewVideoId(preview) {
      const previewLink = preview.querySelector('a[href*="watch"]')
      return (previewLink && extractVideoId(previewLink.href)) || currentVideoId
    }

    function syncPreviewButton(preview) {
      if (!isEnabled || !isPreviewVisible(preview)) return

      const videoId = getPreviewVideoId(preview)
      if (!videoId) return

      const existingWrapper = preview.querySelector(':scope > .qs-button-wrapper')
      if (existingWrapper?.dataset.videoId === videoId) return
      if (existingWrapper) removeWrapper(existingWrapper)

      injectButton(preview, videoId)
    }

    /**
     * Observe the (long-lived) preview element itself for show/hide and video
     * changes — scoped to it so the page-wide observer can stay narrow.
     */
    function watchPreview(preview) {
      if (previewObserver?.target === preview) return
      previewObserver?.observer.disconnect()

      const obs = new MutationObserver((mutations) => {
        // The player inside churns its classes; only the host's own state and
        // link hrefs matter.
        const relevant = mutations.some(
          (m) => m.target === preview || m.attributeName === 'href'
        )
        if (relevant) syncPreviewButton(preview)
      })
      obs.observe(preview, {
        attributes: true,
        subtree: true,
        attributeFilter: ['class', 'hidden', 'href']
      })
      previewObserver = { target: preview, observer: obs }
    }
    
    // ===== MUTATION OBSERVER CALLBACK =====
    function handleMutations(mutations) {
      if (!isEnabled) return
      
      for (const mutation of mutations) {
        // Check for added nodes
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            checkAndInjectPreview(node)
          }
        }
        
        // Check for attribute changes on video-preview
        if (mutation.type === 'attributes' && mutation.target.matches?.(PREVIEW_SELECTOR)) {
          checkAndInjectPreview(mutation.target)
        }
      }
    }
    
    /**
     * Check if element is/contains video-preview and inject button
     */
    function checkAndInjectPreview(element) {
      if (!isEnabled) return
      
      const preview = element.matches?.(PREVIEW_SELECTOR) 
        ? element 
        : element.querySelector?.(PREVIEW_SELECTOR)
      
      if (!preview) return

      watchPreview(preview)
      syncPreviewButton(preview)
    }

    function removeWrapper(wrapper) {
      const comp = mountedComponents.get(wrapper)
      if (comp) {
        unmount(comp)
        mountedComponents.delete(wrapper)
      }
      wrapper.remove()
    }
    
    /**
     * Ensure container has relative positioning (cached via marker)
     */
    function ensureRelativePosition(container) {
      // Skip if already processed
      if (container.hasAttribute(POSITIONED_MARKER)) return
      
      const style = window.getComputedStyle(container)
      if (style.position === 'static') {
        container.style.position = 'relative'
      }
      container.setAttribute(POSITIONED_MARKER, 'true')
    }
    
    /**
     * Inject Svelte button component into container
     */
    function injectButton(container, videoId) {
      if (!isEnabled) return
      
      // Create wrapper element
      const wrapper = document.createElement('div')
      wrapper.className = 'qs-button-wrapper'
      wrapper.dataset.videoId = videoId

      // Ensure container has relative positioning (cached)
      ensureRelativePosition(container)
      
      container.appendChild(wrapper)
      
      // Mount Svelte component
      const component = mount(QuickSummaryButton, {
        target: wrapper,
        props: { videoId }
      })
      
      mountedComponents.set(wrapper, component)
    }
    
    /**
     * Remove all injected buttons from the page
     */
    function removeAllButtons() {
      document.querySelectorAll('.qs-button-wrapper').forEach(removeWrapper)
      
      // Remove injection markers so buttons can be re-injected when enabled
      const markedElements = document.querySelectorAll(`[${INJECTED_MARKER}]`)
      markedElements.forEach(el => el.removeAttribute(INJECTED_MARKER))
      
      // Remove positioned markers
      const positionedElements = document.querySelectorAll(`[${POSITIONED_MARKER}]`)
      positionedElements.forEach(el => el.removeAttribute(POSITIONED_MARKER))
    }
    
    /**
     * Start observer with narrowed scope
     */
    function startFeature() {
      if (isEnabled) return
      
      isEnabled = true
      
      // Observe only the main content container for better performance
      // Falls back to body if container not found
      const observeTarget = document.querySelector('#content, #page-manager, ytd-app') || document.body
      
      observer = new MutationObserver(handleMutations)
      observer.observe(observeTarget, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['hidden']  // Only watch 'hidden' attribute changes
      })
      
      console.log('[Quick Summary] Feature enabled - optimized observer started')
    }
    
    /**
     * Stop all observers and listeners, remove buttons
     */
    function stopFeature() {
      if (!isEnabled) return
      
      isEnabled = false
      
      // Cancel pending preview check
      if (pendingPreviewCheck) {
        cancelAnimationFrame(pendingPreviewCheck)
        pendingPreviewCheck = null
      }
      
      // Stop MutationObserver
      if (observer) {
        observer.disconnect()
        observer = null
      }

      if (previewObserver) {
        previewObserver.observer.disconnect()
        previewObserver = null
      }

      // Remove all injected buttons
      removeAllButtons()
      
      console.log('[Quick Summary] Feature disabled - observers stopped, buttons removed')
    }
    
    // ===== INITIALIZATION =====
    
    // Add mouseover listener (always active, but checks isEnabled flag)
    document.body.addEventListener('mouseover', handleMouseOver, { passive: true })
    
    // Check initial setting
    const storedSettings = await settingsStorage.getValue()
    if (storedSettings?.quickSummaryEnabled === false) {
      isEnabled = false
      console.log('[Quick Summary] Feature disabled in settings (not starting)')
    } else {
      startFeature()
      console.log('[Quick Summary] Content script initialized (optimized)')
    }
    
    // Watch for settings changes to toggle feature without reload
    settingsStorage.watch((newSettings) => {
      if (newSettings?.quickSummaryEnabled === false) {
        stopFeature()
      } else {
        startFeature()
      }
    })
  }
})

/**
 * Extracts video ID from YouTube URL
 */
function extractVideoId(url) {
  if (!url) return null
  
  try {
    const urlObj = new URL(url, window.location.origin)
    
    if (urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v')
    }
    
    if (urlObj.pathname.startsWith('/shorts/')) {
      return urlObj.pathname.split('/')[2]
    }
    
    if (urlObj.pathname.startsWith('/embed/')) {
      return urlObj.pathname.split('/')[2]
    }
    
    return null
  } catch {
    return null
  }
}