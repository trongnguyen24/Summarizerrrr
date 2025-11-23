// @ts-nocheck
// This script is injected into the main world to access the YouTube player API
// It listens for custom events dispatched by the content script

// Listen for seek requests from content script
window.addEventListener('Summarizerrrr_Seek', (event) => {
  try {
    const seconds = event.detail.seconds
    
    // Try using the HTML5 video element directly (User confirmed this works)
    const video = document.querySelector('video')
    if (video) {
      video.currentTime = seconds
      return
    }

    // Fallback to YouTube Player API
    const player = document.getElementById('movie_player')
    if (player && typeof player.seekTo === 'function') {
      player.seekTo(seconds, true)
      player.playVideo()
    } else {
      console.error('[Summarizerrrr] No video player found')
    }
  } catch (error) {
    console.error('[Summarizerrrr] Error executing seek:', error)
  }
})

console.log('[Summarizerrrr] Player control script loaded')
