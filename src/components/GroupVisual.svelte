<script>
  // Không import Snippet type nữa
  import { onDestroy } from 'svelte' // Vẫn cần cho cleanup effect

  // children vẫn là snippet ngầm định, nhưng không khai báo type ở đây
  // Thêm prop initialDelay
  let { children, initialDelay = 0 } = $props()

  // State để lưu trữ vị trí và kích thước của shadow div
  // Không khai báo type cho state
  let shadowStyle = $state({
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    opacity: 0, // Ban đầu ẩn shadow
  })

  // Thêm state để theo dõi trạng thái mount ban đầu
  let isMounted = $state(false)

  // Tham chiếu đến phần tử wrapper và button đang được active (click cuối cùng)
  // Không khai báo type cho biến DOM
  let wrapcrossElement
  let activeButtonElement = null

  // Hàm để cập nhật vị trí và kích thước của shadow dựa trên một phần tử button
  // Không khai báo type cho tham số
  function updateShadow(buttonElement) {
    if (!wrapcrossElement || !buttonElement) return

    // Lấy kích thước và vị trí của button và wrapper (relative to viewport)
    const buttonRect = buttonElement.getBoundingClientRect()
    const wrapperRect = wrapcrossElement.getBoundingClientRect()

    // Tính toán vị trí của button relative so với wrapper
    const top = buttonRect.top - wrapperRect.top
    const left = buttonRect.left - wrapperRect.left

    // Cập nhật state của shadowStyle
    shadowStyle = {
      top,
      left,
      width: buttonRect.width,
      height: buttonRect.height,
      opacity: 1, // Hiển thị shadow khi có button active
    }
  }

  // Xử lý sự kiện click trên wrapper sử dụng event delegation
  // Không khai báo type cho tham số event
  function handleClick(event) {
    const target = event.target // event.target không cần as HTMLElement trong JS thuần
    // Tìm phần tử button gần nhất từ target click
    const button = target.closest('button')

    // Kiểm tra xem phần tử được click có phải là button nằm trong wrapcross không
    if (button && wrapcrossElement.contains(button)) {
      activeButtonElement = button
      updateShadow(activeButtonElement)
    }
  }

  // $effect để xử lý resize và cập nhật lại vị trí shadow nếu có button active
  $effect(() => {
    // Chỉ cập nhật khi có button active
    if (activeButtonElement) {
      // Hàm xử lý khi resize cửa sổ
      const handleResize = () => {
        updateShadow(activeButtonElement) // Không cần as HTMLElement ở đây
      }

      // Thêm event listener cho sự kiện resize
      window.addEventListener('resize', handleResize)

      // Cleanup function: loại bỏ event listener khi component bị hủy
      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }
    // Nếu không có button active, không làm gì và không cần cleanup
    return
  })

  // $effect để lấy giá trị shadowStyle bằng với button có class active khi load, có delay
  $effect(() => {
    let timeoutId
    // Đảm bảo wrapcrossElement đã được bind và chưa mounted
    if (wrapcrossElement && !isMounted) {
      timeoutId = setTimeout(() => {
        // Tìm button có class 'active' bên trong wrapcrossElement
        const activeButton = wrapcrossElement.querySelector('button.active')

        // Nếu tìm thấy button active, cập nhật shadowStyle
        if (activeButton) {
          updateShadow(activeButton)
        }
        // Đánh dấu là đã mounted sau khi delay
        isMounted = true
      }, initialDelay)
    }

    // Cleanup function: loại bỏ timeout khi component bị hủy hoặc effect chạy lại
    return () => {
      clearTimeout(timeoutId)
    }
  })

  // $effect để xử lý resize và cập nhật lại vị trí shadow nếu có button active
  $effect(() => {
    // Chỉ cập nhật khi có button active VÀ component đã mounted ban đầu
    if (activeButtonElement && isMounted) {
      // Thêm điều kiện isMounted
      // Hàm xử lý khi resize cửa sổ
      const handleResize = () => {
        updateShadow(activeButtonElement) // Không cần as HTMLElement ở đây
      }

      // Thêm event listener cho sự kiện resize
      window.addEventListener('resize', handleResize)

      // Cleanup function: loại bỏ event listener khi component bị hủy
      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }
    // Nếu không có button active hoặc chưa mounted, không làm gì và không cần cleanup
    return
  })
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore event_directive_deprecated -->
<div class="wrapcross" bind:this={wrapcrossElement} on:click={handleClick}>
  <div
    class="shadow-run border border-muted/5 border-t-muted/20"
    style="
    top: {shadowStyle.top}px;
    left: {shadowStyle.left}px;
    width: {shadowStyle.width}px;
    height: {shadowStyle.height}px;
    opacity: {shadowStyle.opacity};
  "
  ></div>

  {@render children()}
</div>

<style>
  .shadow-run {
    position: absolute;
    background-color: rgba(145, 145, 145, 0.1); /* Màu nền mờ cho shadow */

    transition: all 0.2s cubic-bezier(0.455, 0.03, 0.515, 0.955); /* Hiệu ứng di chuyển mượt mà */
    pointer-events: none; /* Quan trọng: không chặn sự kiện click vào button */
    z-index: -1; /* Đặt shadow phía sau các button */
  }
  .wrapcross {
    position: relative; /* Để shadow có thể được định vị chính xác */
    inset: 0;
  }
</style>
