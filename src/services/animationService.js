// @ts-nocheck
import { animate } from 'animejs'

// Utility functions
function random(min, max, precision = 0) {
  const value = Math.random() * (max - min) + min
  return precision > 0 ? parseFloat(value.toFixed(precision)) : value
}

function removeElement(element) {
  if (element && element.parentNode) {
    element.parentNode.removeChild(element)
  }
}

// Timer utility
export function createTimer(options = {}) {
  const {
    autoplay = false,
    duration = 1000,
    loop = false,
    onLoop = () => {},
  } = options
  let intervalId = null
  let isPlaying = false
  const timer = {
    play() {
      if (isPlaying) return
      isPlaying = true
      const runLoop = () => {
        onLoop()
        if (loop && isPlaying) {
          intervalId = setTimeout(runLoop, duration)
        } else {
          isPlaying = false
        }
      }
      intervalId = setTimeout(runLoop, duration)
    },
    pause() {
      if (intervalId) {
        clearTimeout(intervalId)
        intervalId = null
      }
      isPlaying = false
    },
    revert() {
      this.pause()
    },
  }
  if (autoplay) timer.play()
  return timer
}

// Theme detection utility
function getBlendModeForTheme() {
  if (typeof document !== 'undefined') {
    const isDark = document.documentElement.classList.contains('dark')
    return isDark ? 'plus-lighter' : 'multiply'
  }
  return 'plus-lighter' // fallback to dark mode behavior
}

// Particle animation
export function createParticleAnimation({
  svgElement,
  buttonElement,
  pointerX,
  pointerY,
  particleColor,
}) {
  if (!svgElement || !buttonElement) return

  const spread = 16
  const particle = svgElement.cloneNode(true)
  const blendMode = getBlendModeForTheme()
  particle.style.cssText = `
    position: absolute;
    top: -8px;
    left: -8px;
    mix-blend-mode: ${blendMode};
    pointer-events: none;
    z-index: 9999;
    color: ${particleColor};
    filter: drop-shadow(0 0 3px ${particleColor});
  `
  buttonElement.appendChild(particle)

  animate(particle, {
    translateX: [
      pointerX + random(-spread, spread),
      `+=${5 + random(-2, 2, 2)}`,
      `-=${6 + random(-2, 2, 2)}`,
      `+=${4 + random(-2, 2, 2)}`,
    ],
    translateY: [pointerY + random(-5, 5), `-=${random(55, 70)}`],
    scale: [0, 1, 0],
    duration: 1600,
    ease: 'inOutQuad',
    onComplete: () => removeElement(particle),
  })
}

// Utility functions from components
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}
