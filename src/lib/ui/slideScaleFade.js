// @ts-nocheck
import { cubicOut } from 'svelte/easing'
import { isReduceMotionEnabled } from '@/services/animationService.js'

/**
 * @typedef {Object} SlideScaleFadeParams
 * @property {number} [delay=0] - Thời gian trễ (ms)
 * @property {number} [duration=400] - Thời gian thực hiện transition (ms)
 * @property {(progress: number) => number} [easing=cubicOut] - Easing function
 * @property {'left' | 'right' | 'top' | 'bottom'} [slideFrom='top'] - Hướng trượt vào/ra
 * @property {string} [slideDistance='30px'] - Khoảng cách trượt (ví dụ: '50px', '100%')
 * @property {number} [startScale=0.95] - Tỷ lệ scale ban đầu (ví dụ: 0.8 cho nhỏ hơn, 1.2 cho lớn hơn)
 * @property {number} [startOpacity=0] - Độ mờ ban đầu (thường là 0 cho 'in')
 * @property {number} [startBlur=0] - Độ blur ban đầu (px), mặc định = 0
 */

/**
 * Svelte 5 transition kết hợp slide, scale, và fade.
 * Hoạt động tốt cho cả `in:` và `out:`.
 * Respects reduce motion setting - khi bật sẽ skip animation.
 * @param {Element} node - Phần tử DOM (không dùng trực tiếp trong Svelte 5 css function nhưng là một phần của signature)
 * @param {SlideScaleFadeParams} [params] - Các tham số tùy chỉnh
 * @returns {import('svelte/transition').TransitionConfig}
 */
export function slideScaleFade(node, params = {}) {
  const {
    delay = 0,
    duration = 500, // Giảm duration mặc định một chút
    easing = cubicOut,
    slideFrom = 'top',
    slideDistance = '2rem',
    startScale = 0.9,
    startOpacity = 0,
    startBlur = 0,
  } = params

  // Respect reduce motion setting - skip animation
  const actualDuration = isReduceMotionEnabled() ? 0 : duration
  const actualDelay = isReduceMotionEnabled() ? 0 : delay

  // Tách giá trị số và đơn vị từ slideDistance
  const distanceValue = parseFloat(slideDistance)
  const distanceUnit = slideDistance.replace(/[\d.-]/g, '') || 'px' // Mặc định là px nếu không có đơn vị

  return {
    delay: actualDelay,
    duration: actualDuration,
    easing,
    css: (progress, u) => {
      // progress: tiến trình từ 0 đến 1 (cho 'in')
      // u: tiến trình ngược từ 1 đến 0 (1 - progress)

      const opacity = startOpacity + (1 - startOpacity) * progress // Đi từ startOpacity đến 1
      const scale = startScale + (1 - startScale) * progress // Đi từ startScale đến 1
      const blur = startBlur * (1 - progress) // Đi từ startBlur về 0

      let transform = ''
      const currentDistance = distanceValue * u // Khoảng cách hiện tại, giảm dần về 0 khi progress tăng

      switch (slideFrom) {
        case 'left':
          transform = `translateX(-${currentDistance}${distanceUnit})`
          break
        case 'right':
          transform = `translateX(${currentDistance}${distanceUnit})`
          break
        case 'top':
          transform = `translateY(-${currentDistance}${distanceUnit})`
          break
        case 'bottom':
          transform = `translateY(${currentDistance}${distanceUnit})`
          break
      }

      // Kết hợp các transform
      const finalTransform = `${transform} scale(${scale})`

      // Trả về chuỗi CSS
      return `
    opacity: ${opacity};
    transform: ${finalTransform};
    filter: blur(${blur}px);
    transform-origin: center center; // Đảm bảo scale từ tâm
   `
    },
  }
}

/*
 * CÁCH SỬ DỤNG TRONG SVELTE 5
 *
 * 1. Import transition vào component của bạn:
 *    <script>
 *      import { slideScaleFade } from './path/to/slideScaleFade.js';
 *      import { quintOut } from 'svelte/easing'; // Tùy chọn: import easing khác
 *      let visible = false;
 *    </script>
 *
 * 2. Áp dụng vào một phần tử HTML với directive `transition:`:
 *
 *    <label>
 *      <input type="checkbox" bind:checked={visible}>
 *      Hiển thị/ẩn
 *    </label>
 *
 *    {#if visible}
 *      <div transition:slideScaleFade>
 *        Phần tử này sẽ trượt, scale và mờ dần khi xuất hiện/biến mất.
 *      </div>
 *    {/if}
 *
 * 3. Tùy chỉnh tham số:
 *
 *    {#if visible}
 *      <div transition:slideScaleFade="{{
 *        duration: 800,
 *        delay: 200,
 *        slideFrom: 'left',
 *        slideDistance: '100px',
 *        startScale: 0.5,
 *        startBlur: 4,
 *        easing: quintOut
 *      }}">
 *        Phần tử với hiệu ứng đã được tùy chỉnh (bao gồm blur).
 *      </div>
 *    {/if}
 */

/**
 * @typedef {Object} FadeOnlyParams
 * @property {number} [delay=0] - Thời gian trễ (ms)
 * @property {number} [duration=200] - Thời gian thực hiện transition (ms)
 * @property {(progress: number) => number} [easing=cubicOut] - Easing function
 */

/**
 * Simple fade transition that respects reduce motion setting.
 * Use for overlays, backdrops, and simple opacity changes.
 * @param {Element} node - DOM element
 * @param {FadeOnlyParams} [params] - Custom parameters
 * @returns {import('svelte/transition').TransitionConfig}
 */
export function fadeOnly(node, params = {}) {
  const {
    delay = 0,
    duration = 200,
    easing = cubicOut,
  } = params

  // Respect reduce motion setting
  const actualDuration = isReduceMotionEnabled() ? 0 : duration
  const actualDelay = isReduceMotionEnabled() ? 0 : delay

  return {
    delay: actualDelay,
    duration: actualDuration,
    easing,
    css: (progress) => `opacity: ${progress}`,
  }
}

/**
 * @typedef {Object} FlyOnlyParams
 * @property {number} [delay=0] - Thời gian trễ (ms)
 * @property {number} [duration=300] - Thời gian thực hiện transition (ms)
 * @property {(progress: number) => number} [easing=cubicOut] - Easing function
 * @property {number} [x=0] - X offset
 * @property {number} [y=-20] - Y offset (default: fly from above)
 * @property {number} [opacity=0] - Starting opacity
 */

/**
 * Fly transition that respects reduce motion setting.
 * Use for dropdowns, tooltips, and popover content.
 * @param {Element} node - DOM element
 * @param {FlyOnlyParams} [params] - Custom parameters
 * @returns {import('svelte/transition').TransitionConfig}
 */
export function flyOnly(node, params = {}) {
  const {
    delay = 0,
    duration = 300,
    easing = cubicOut,
    x = 0,
    y = -20,
    opacity = 0,
  } = params

  // Respect reduce motion setting
  const actualDuration = isReduceMotionEnabled() ? 0 : duration
  const actualDelay = isReduceMotionEnabled() ? 0 : delay

  return {
    delay: actualDelay,
    duration: actualDuration,
    easing,
    css: (progress, u) => `
      transform: translate(${u * x}px, ${u * y}px);
      opacity: ${opacity + (1 - opacity) * progress};
    `,
  }
}
