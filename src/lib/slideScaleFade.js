import { cubicOut } from 'svelte/easing'

/**
 * @typedef {Object} SlideScaleFadeParams
 * @property {number} [delay=0] - Thời gian trễ (ms)
 * @property {number} [duration=400] - Thời gian thực hiện transition (ms)
 * @property {(t: number) => number} [easing=cubicOut] - Easing function
 * @property {'left' | 'right' | 'top' | 'bottom'} [slideFrom='top'] - Hướng trượt vào/ra
 * @property {string} [slideDistance='30px'] - Khoảng cách trượt (ví dụ: '50px', '100%')
 * @property {number} [startScale=0.95] - Tỷ lệ scale ban đầu (ví dụ: 0.8 cho nhỏ hơn, 1.2 cho lớn hơn)
 * @property {number} [startOpacity=0] - Độ mờ ban đầu (thường là 0 cho 'in')
 */

/**
 * Svelte 5 transition kết hợp slide, scale, và fade.
 * Hoạt động tốt cho cả `in:` và `out:`.
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
  } = params

  // Tách giá trị số và đơn vị từ slideDistance
  const distanceValue = parseFloat(slideDistance)
  const distanceUnit = slideDistance.replace(/[\d.-]/g, '') || 'px' // Mặc định là px nếu không có đơn vị

  return {
    delay,
    duration,
    easing,
    css: (t, u) => {
      // t: tiến trình từ 0 đến 1 (cho 'in')
      // u: tiến trình ngược từ 1 đến 0 (1 - t)

      const opacity = startOpacity + (1 - startOpacity) * t // Đi từ startOpacity đến 1
      const scale = startScale + (1 - startScale) * t // Đi từ startScale đến 1

      let transform = ''
      const currentDistance = distanceValue * u // Khoảng cách hiện tại, giảm dần về 0 khi t tăng

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
 *        easing: quintOut
 *      }}">
 *        Phần tử với hiệu ứng đã được tùy chỉnh.
 *      </div>
 *    {/if}
 */
