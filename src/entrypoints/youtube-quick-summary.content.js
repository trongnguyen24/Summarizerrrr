// @ts-nocheck
/**
 * YouTube Quick Summary Content Script
 * Double Injection Strategy:
 * 1. Static: Inject into ytd-thumbnail when hovering
 * 2. Dynamic: Inject into ytd-video-preview when it appears
 */

export default defineContentScript({
  matches: ['*://*.youtube.com/*'],
  runAt: 'document_end',
  
  main() {
    const THUMBNAIL_SELECTOR = 'ytd-thumbnail'
    const PREVIEW_SELECTOR = 'ytd-video-preview'
    const INJECTED_MARKER = 'data-qs-injected'
    
    // Inject styles
    injectStyles()
    
    // Current video ID being tracked
    let currentVideoId = null
    
    // ===== STATIC INJECTION: Into thumbnails =====
    document.body.addEventListener('mouseover', (e) => {
      const thumbnail = e.target.closest(THUMBNAIL_SELECTOR)
      if (!thumbnail) return
      
      // Get video link and ID
      const link = thumbnail.querySelector('a#thumbnail')
      if (!link) return
      
      const videoId = extractVideoId(link.href)
      if (!videoId) return
      
      // Track current video ID for preview injection
      currentVideoId = videoId
      
      // Inject icon if not already
      if (!thumbnail.hasAttribute(INJECTED_MARKER)) {
        thumbnail.setAttribute(INJECTED_MARKER, 'true')
        injectIcon(thumbnail, videoId)
      }
    }, { passive: true })
    
    // ===== DYNAMIC INJECTION: Into video preview =====
    // Watch for ytd-video-preview appearing or changing
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Check for added nodes
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            checkAndInjectPreview(node)
          }
        }
        
        // Check for attribute changes on video-preview
        if (mutation.type === 'attributes' && mutation.target.matches(PREVIEW_SELECTOR)) {
          checkAndInjectPreview(mutation.target)
        }
      }
    })
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    })
    
    /**
     * Check if element is/contains video-preview and inject icon
     */
    function checkAndInjectPreview(element) {
      const preview = element.matches(PREVIEW_SELECTOR) 
        ? element 
        : element.querySelector(PREVIEW_SELECTOR)
      
      if (!preview) return
      
      // Check if preview is visible (not hidden)
      if (preview.hasAttribute('hidden') || preview.style.display === 'none') {
        return
      }
      
      // Remove old injected icon if any (will re-inject with correct position)
      const existingIcon = preview.querySelector('.qs-icon-wrapper')
      if (existingIcon) {
        existingIcon.remove()
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
      injectIcon(preview, videoId)
    }
    
    // Also periodically check for visible preview (fallback)
    setInterval(() => {
      const preview = document.querySelector(`${PREVIEW_SELECTOR}:not([hidden])`)
      if (preview && !preview.querySelector('.qs-icon-wrapper') && currentVideoId) {
        injectIcon(preview, currentVideoId)
      }
    }, 500)
    
    console.log('[Quick Summary] Content script initialized (Double Injection)')
  }
})

/**
 * Inject icon into a container
 */
function injectIcon(container, videoId) {
  const wrapper = document.createElement('div')
  wrapper.className = 'qs-icon-wrapper'
  
  const button = document.createElement('button')
  button.className = 'qs-icon-btn'
  button.title = 'Quick Summary (opens in background)'
  
  button.innerHTML = `
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L4.09 12.26c-.53.59-.03 1.5.75 1.5h6.18l-.82 5.76c-.12.86.96 1.36 1.48.68L20.83 9.38c.53-.59.03-1.5-.75-1.5h-6.18l.82-5.76c.12-.86-.96-1.36-1.48-.68z"/>
    </svg>
  `
  
  button.addEventListener('click', async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('[Quick Summary] Button clicked, videoId:', videoId)
    
    if (!videoId) {
      console.error('[Quick Summary] No videoId!')
      return
    }
    
    button.classList.add('qs-loading')
    
    try {
      const response = await browser.runtime.sendMessage({
        type: 'QUICK_SUMMARY_OPEN_TAB',
        videoId
      })
      console.log('[Quick Summary] Response:', response)
      
      setTimeout(() => {
        button.classList.remove('qs-loading')
      }, 1000)
    } catch (error) {
      console.error('[Quick Summary] Failed to send message:', error)
      button.classList.remove('qs-loading')
    }
  })
  
  wrapper.appendChild(button)
  
  // Ensure container has relative positioning
  const computedStyle = window.getComputedStyle(container)
  if (computedStyle.position === 'static') {
    container.style.position = 'relative'
  }
  
  container.appendChild(wrapper)
}

/**
 * Injects CSS styles
 */
function injectStyles() {
  const style = document.createElement('style')
  style.textContent = `
    .qs-icon-wrapper {
      position: absolute;
      top: 20px;
      left: 16px;
      z-index: 2147483647;
      opacity: 0;
      transition: opacity 0.15s ease;
      pointer-events: none;
    }
    
    /* Show on hover of parent */
    ytd-thumbnail:hover .qs-icon-wrapper,
    ytd-video-preview:hover .qs-icon-wrapper,
    .qs-icon-wrapper:hover {
      opacity: 1;
      pointer-events: auto;
    }
    
    /* Always visible in preview (since user is actively hovering) */
    ytd-video-preview .qs-icon-wrapper {
      opacity: 0.9;
      pointer-events: auto;
    }
    
    .qs-icon-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 50px;
      background: rgba(0, 0, 0, 0.5);
      border: none;
      cursor: pointer;
    }
    
    .qs-icon-btn:hover {
      transform: scale(1);
    }
    
    .qs-icon-btn:active {
      transform: scale(1);
    }
    
    .qs-icon-btn svg {
      width: 18px;
      height: 18px;
      fill: white;
    }
    
    .qs-icon-btn.qs-loading {
      pointer-events: none;
      animation: qs-pulse 1s infinite;
    }
    
    @keyframes qs-pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }
  `
  document.head.appendChild(style)
}

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
