/**
 * Seeks the video to the specified timestamp.
 * Handles iOS Safari specific behavior where setting currentTime might pause the video.
 *
 * @param {number} seconds - The timestamp in seconds to seek to.
 */
export const seekToTimestamp = (seconds) => {
  const video = document.querySelector('video')

  if (video) {
    // 1. Seek video
    video.currentTime = seconds

    // 2. Fix for iOS Safari:
    // On iOS, when setting currentTime, the video often automatically pauses to save battery/data.
    // We need to force it to play again after a very short delay.
    if (video.paused) {
      // Use setTimeout to separate the stack, helping iOS recognize the play command as valid
      setTimeout(() => {
        video.play().catch((err) => {
          console.warn('Autoplay prevented by iOS restriction', err)
        })
      }, 100)
    }
  } else {
    // Fallback if no video tag is found (rarely happens)
    const currentUrl = new URL(window.location.href)
    currentUrl.searchParams.set('t', Math.floor(seconds))
    window.location.replace(currentUrl.toString())
  }
}
