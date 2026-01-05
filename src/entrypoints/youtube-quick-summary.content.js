// @ts-nocheck
/**
 * YouTube Quick Summary Content Script
 * Double Injection Strategy:
 * 1. Static: Inject into ytd-thumbnail when hovering
 * 2. Dynamic: Inject into ytd-video-preview when it appears
 * 
 * Performance Optimized:
 * - All observers, listeners, and intervals are stopped when feature is disabled
 * - Resources are re-initialized when feature is re-enabled
 */
import { mount, unmount } from 'svelte'
import QuickSummaryButton from './content/QuickSummaryButton.svelte'
import { settingsStorage } from '@/services/wxtStorageService.js'

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_end',
  
  async main() {
    // Constants
    const THUMBNAIL_SELECTORS = [
      'ytd-thumbnail',                    // Home, Search, Channel pages
      'yt-thumbnail-view-model',          // Watch page sidebar (new layout)
      'yt-lockup-view-model',             // Watch page sidebar (container)
    ].join(', ')
    const PREVIEW_SELECTOR = 'ytd-video-preview'
    const INJECTED_MARKER = 'data-qs-injected'
    
    // State
    let isEnabled = true
    let currentVideoId = null
    let observer = null
    let intervalId = null
    
    // Store mounted components for cleanup
    const mountedComponents = new WeakMap()
    
    // ===== MOUSEOVER HANDLER =====
    function handleMouseOver(e) {
      // Skip if feature is disabled
      if (!isEnabled) return
      
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
      if (thumbnail.hasAttribute(INJECTED_MARKER)) return
      
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
        // Ensure relative positioning
        const style = window.getComputedStyle(targetContainer)
        if (style.position === 'static') {
          targetContainer.style.position = 'relative'
        }
      }
      
      injectButton(targetContainer, videoId)
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
      
      // Check if preview is visible (not hidden)
      if (preview.hasAttribute('hidden') || preview.style.display === 'none') {
        return
      }
      
      // Remove old injected button if any
      const existingWrapper = preview.querySelector('.qs-button-wrapper')
      if (existingWrapper) {
        const comp = mountedComponents.get(existingWrapper)
        if (comp) {
          unmount(comp)
          mountedComponents.delete(existingWrapper)
        }
        existingWrapper.remove()
      }
      
      // Try to get video ID from preview's video element or current tracked ID
      let videoId = null
      
      // Method 1: Try to get from preview's internal link
      const previewLink = preview.querySelector('a[href*="watch"]')
      if (previewLink) {
        videoId = extractVideoId(previewLink.href)
      }
      
      // Method 2: Use tracked video ID from thumbnail hover
      if (!videoId && currentVideoId) {
        videoId = currentVideoId
      }
      
      if (!videoId) return
      
      // Inject into preview
      injectButton(preview, videoId)
    }
    
    /**
     * Interval callback for fallback preview checking
     */
    function checkPreviewInterval() {
      if (!isEnabled) return
      
      const preview = document.querySelector(`${PREVIEW_SELECTOR}:not([hidden])`)
      if (preview && !preview.querySelector('.qs-button-wrapper') && currentVideoId) {
        injectButton(preview, currentVideoId)
      }
    }
    
    /**
     * Inject Svelte button component into container
     */
    function injectButton(container, videoId) {
      if (!isEnabled) return
      
      // Create wrapper element
      const wrapper = document.createElement('div')
      wrapper.className = 'qs-button-wrapper'
      
      // Ensure container has relative positioning
      const computedStyle = window.getComputedStyle(container)
      if (computedStyle.position === 'static') {
        container.style.position = 'relative'
      }
      
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
      const wrappers = document.querySelectorAll('.qs-button-wrapper')
      wrappers.forEach(wrapper => {
        const comp = mountedComponents.get(wrapper)
        if (comp) {
          unmount(comp)
          mountedComponents.delete(wrapper)
        }
        wrapper.remove()
      })
      
      // Remove injection markers so buttons can be re-injected when enabled
      const markedElements = document.querySelectorAll(`[${INJECTED_MARKER}]`)
      markedElements.forEach(el => el.removeAttribute(INJECTED_MARKER))
    }
    
    /**
     * Start all observers and listeners
     */
    function startFeature() {
      if (isEnabled) return // Already enabled
      
      isEnabled = true
      
      // Start MutationObserver
      observer = new MutationObserver(handleMutations)
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style', 'hidden']
      })
      
      // Start interval
      intervalId = setInterval(checkPreviewInterval, 500)
      
      console.log('[Quick Summary] Feature enabled - observers started')
    }
    
    /**
     * Stop all observers and listeners, remove buttons
     */
    function stopFeature() {
      if (!isEnabled) return // Already disabled
      
      isEnabled = false
      
      // Stop MutationObserver
      if (observer) {
        observer.disconnect()
        observer = null
      }
      
      // Stop interval
      if (intervalId) {
        clearInterval(intervalId)
        intervalId = null
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
      // Start the feature
      startFeature()
      console.log('[Quick Summary] Content script initialized (Svelte component)')
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