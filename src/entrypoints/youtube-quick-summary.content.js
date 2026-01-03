// @ts-nocheck
/**
 * YouTube Quick Summary Content Script
 * Component Renderer Targeting Strategy:
 * Target parent Component Renderers for consistent behavior across all YouTube layouts
 */
import { mount, unmount } from 'svelte'
import QuickSummaryButton from './content/QuickSummaryButton.svelte'

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_end',
  
  main() {
    // ===== COMPONENT RENDERER CONFIGURATION =====
    
    // Allowed Component Renderers where the button should appear
    const ALLOWED_RENDERERS = [
      'ytd-rich-item-renderer',       // Home, Channel Home (new layout)
      'ytd-video-renderer',           // Search results
      'ytd-compact-video-renderer',   // Watch Sidebar (old layout)
      'yt-lockup-view-model',         // Watch Sidebar (new layout)
      'ytd-grid-video-renderer',      // Channel Videos (old layout)
      'ytd-playlist-video-renderer',  // Playlist items
    ]
    
    // Excluded Component Renderers (Shorts, Ads, etc.)
    const EXCLUDED_RENDERERS = [
      'ytd-reel-item-renderer',       // Shorts
      'ytd-ad-slot-renderer',         // Ads
    ]
    
    const PREVIEW_SELECTOR = 'ytd-video-preview'
    const ACTIVE_MARKER = 'data-qs-active'
    
    // Store mounted components for cleanup
    const mountedComponents = new WeakMap()
    
    // ===== STATIC INJECTION: Into Component Renderers =====
    document.body.addEventListener('mouseover', (e) => {
      // 1. Find the nearest allowed Component Renderer
      const container = e.target.closest(ALLOWED_RENDERERS.join(','))
      
      // 2. Validate Container
      if (!container) return
      if (container.hasAttribute(ACTIVE_MARKER)) return
      
      // 3. Check exclusions (Shorts, Ads, etc.)
      if (container.closest(EXCLUDED_RENDERERS.join(','))) return
      
      // 4. Find thumbnail and link within the container
      // Support both old (ytd-thumbnail) and new (yt-thumbnail-view-model) layouts
      let thumbnailNode = container.querySelector('ytd-thumbnail')
      if (!thumbnailNode) {
        thumbnailNode = container.querySelector('yt-thumbnail-view-model')
      }
      const linkNode = container.querySelector('a#thumbnail') || container.querySelector('a[href*="/watch"]')
      
      if (!thumbnailNode || !linkNode) return
      
      // 5. Validate link (must be a watch URL)
      if (!linkNode.href.includes('/watch?v=')) return
      
      // 6. Extract video ID
      const videoId = extractVideoId(linkNode.href)
      if (!videoId) return
      
      // 7. Mark container as active and inject button into thumbnail
      container.setAttribute(ACTIVE_MARKER, 'true')
      injectButton(thumbnailNode, videoId)
      
    }, { passive: true })
    
    // ===== DYNAMIC INJECTION: Into video preview =====
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            checkAndInjectPreview(node)
          }
        }
        
        if (mutation.type === 'attributes' && mutation.target.matches?.(PREVIEW_SELECTOR)) {
          checkAndInjectPreview(mutation.target)
        }
      }
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    })
    
    function checkAndInjectPreview(element) {
      const preview = element.matches?.(PREVIEW_SELECTOR) 
        ? element 
        : element.querySelector?.(PREVIEW_SELECTOR)
      
      if (!preview) return
      if (preview.hasAttribute('hidden') || preview.style.display === 'none') return
      if (preview.querySelector('.qs-button-wrapper')) return
      
      const previewLink = preview.querySelector('a[href*="watch"]')
      if (!previewLink) return
      
      const videoId = extractVideoId(previewLink.href)
      if (!videoId) return
      
      injectButton(preview, videoId)
    }
    
    // Periodically check for visible preview (fallback)
    setInterval(() => {
      const preview = document.querySelector(`${PREVIEW_SELECTOR}:not([hidden])`)
      if (preview && !preview.querySelector('.qs-button-wrapper')) {
        const previewLink = preview.querySelector('a[href*="watch"]')
        if (previewLink) {
          const videoId = extractVideoId(previewLink.href)
          if (videoId) {
            injectButton(preview, videoId)
          }
        }
      }
    }, 500)
    
    /**
     * Inject Svelte button component into container
     */
    function injectButton(container, videoId) {
      const wrapper = document.createElement('div')
      wrapper.className = 'qs-button-wrapper'
      
      const computedStyle = window.getComputedStyle(container)
      if (computedStyle.position === 'static') {
        container.style.position = 'relative'
      }
      
      container.appendChild(wrapper)
      
      const component = mount(QuickSummaryButton, {
        target: wrapper,
        props: { videoId }
      })
      
      mountedComponents.set(wrapper, component)
    }
    
    console.log('[Quick Summary] Content script initialized (Component Renderer strategy)')
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
