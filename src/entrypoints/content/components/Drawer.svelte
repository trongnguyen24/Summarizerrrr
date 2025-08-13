<script>
  let { actions } = $props()

  let isDragging = false
  let startY
  let currentTranslateY
  let animationFrameId
  let openBtn,
    closeBtn,
    drawerContainer,
    drawerBackdrop,
    drawerPanel,
    drawerHeader

  let openDrawer, closeDrawer

  $effect(() => {
    // Hàm mở ngăn kéo
    openDrawer = () => {
      drawerContainer.classList.remove('pointer-events-none')
      drawerBackdrop.classList.remove('pointer-events-none')
      drawerPanel.classList.remove('pointer-events-none')

      requestAnimationFrame(() => {
        drawerBackdrop.style.opacity = '1'
        drawerPanel.style.transform = 'translateY(0)'
      })
    }

    // Hàm đóng ngăn kéo
    closeDrawer = () => {
      drawerContainer.classList.add('pointer-events-none')
      drawerBackdrop.classList.add('pointer-events-none')
      drawerPanel.classList.add('pointer-events-none')

      drawerBackdrop.style.opacity = '0'
      drawerPanel.style.transform = 'translateY(100%)'
    }

    // Gán sự kiện cho các nút
    openBtn.addEventListener('click', openDrawer)
    closeBtn.addEventListener('click', closeDrawer)
    drawerBackdrop.addEventListener('click', closeDrawer)

    // Export a function to be called on button click.
    if (actions) {
      actions.open = openDrawer
      actions.close = closeDrawer
    }
    return () => {
      // Cleanup if needed
    }
  })

  // --- Logic Kéo/Vuốt để đóng ---

  const onDragStart = (e) => {
    isDragging = true
    startY = e.pageY || e.touches[0].pageY
    // Tắt transition CSS để điều khiển trực tiếp bằng JS
    drawerPanel.style.transition = 'none'
    drawerBackdrop.style.transition = 'none'

    document.addEventListener('mousemove', onDragging)
    document.addEventListener('mouseup', onDragEnd)
    document.addEventListener('touchmove', onDragging, { passive: false })
    document.addEventListener('touchend', onDragEnd)
  }

  const onDragging = (e) => {
    if (!isDragging) return

    // Ngăn cuộn trang trên mobile
    e.preventDefault()

    const currentY = e.pageY || e.touches[0].pageY
    const deltaY = Math.max(0, currentY - startY) // Chỉ cho phép kéo xuống
    currentTranslateY = deltaY

    // Sử dụng requestAnimationFrame để cập nhật vị trí mượt mà
    if (!animationFrameId) {
      animationFrameId = requestAnimationFrame(() => {
        // Cập nhật vị trí panel
        drawerPanel.style.transform = `translateY(${currentTranslateY}px)`

        // Cập nhật độ mờ của backdrop
        const panelHeight = drawerPanel.offsetHeight
        const opacity = 1 - (currentTranslateY / panelHeight) * 0.8 // *0.8 để không bị trong suốt hoàn toàn quá sớm
        drawerBackdrop.style.opacity = Math.max(0, opacity).toString()

        animationFrameId = null
      })
    }
  }

  const onDragEnd = (e) => {
    if (!isDragging) return
    isDragging = false

    document.removeEventListener('mousemove', onDragging)
    document.removeEventListener('mouseup', onDragEnd)
    document.removeEventListener('touchmove', onDragging)
    document.removeEventListener('touchend', onDragEnd)

    // Hủy animation frame đang chờ (nếu có)
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId)
      animationFrameId = null
    }

    // Bật lại transition CSS cho hiệu ứng "snap"
    drawerPanel.style.transition = ''
    drawerBackdrop.style.transition = ''

    const panelHeight = drawerPanel.offsetHeight

    // Nếu kéo quá 1/4 chiều cao, đóng lại. Ngược lại, trả về vị trí cũ.
    if (currentTranslateY > panelHeight / 4) {
      closeDrawer()
    } else {
      drawerBackdrop.style.opacity = '1'
      drawerPanel.style.transform = 'translateY(0)'
    }
  }
</script>

<!-- Nội dung chính của trang -->
<div class="min-h-screen flex flex-col items-center justify-center p-4">
  <div class="text-center">
    <h1 class="text-3xl md:text-4xl font-bold mb-4">
      Mô phỏng Drawer bằng JS thuần
    </h1>
    <p class="text-gray-600 mb-8 max-w-lg">
      Nhấp vào nút bên dưới để mở ngăn kéo. Hiệu ứng kéo và đóng đã được cải
      thiện để mượt mà hơn.
    </p>
    <button
      bind:this={openBtn}
      class="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
    >
      Mở Ngăn kéo
    </button>
  </div>
</div>

<!-- Container cho Drawer -->
<div bind:this={drawerContainer} class="fixed inset-0 z-50 pointer-events-none">
  <!-- Lớp phủ nền (Backdrop) -->
  <div
    bind:this={drawerBackdrop}
    id="drawer-backdrop"
    class="absolute inset-0 bg-black/40 opacity-0"
  ></div>

  <!-- Bảng điều khiển Drawer -->
  <div
    bind:this={drawerPanel}
    id="drawer-panel"
    class="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl max-h-[70vh] overflow-y-auto flex flex-col"
    style="transform: translateY(100%);"
  >
    <!-- Header của Drawer (Vùng để kéo) -->
    <div
      bind:this={drawerHeader}
      class="p-4 cursor-grab active:cursor-grabbing"
      on:mousedown={onDragStart}
      on:touchstart={onDragStart}
    >
      <div
        class="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-gray-300"
      ></div>
    </div>

    <!-- Nội dung của Drawer -->
    <div class="px-4 pb-4 flex-grow">
      <h2 class="text-xl font-bold text-gray-900 mb-4">Nội dung Ngăn kéo</h2>
      <p class="text-gray-600 mb-6">
        Đây là nơi bạn có thể đặt bất kỳ nội dung nào, chẳng hạn như biểu mẫu,
        thông tin, hoặc các tùy chọn cài đặt.
      </p>
    </div>

    <!-- Nút đóng -->
    <div class="px-4 pb-4 mt-6 flex-shrink-0">
      <button
        bind:this={closeBtn}
        class="w-full bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 transition-colors"
      >
        Đóng
      </button>
    </div>
  </div>
</div>

<style>
  /* Custom transition cho ngăn kéo và lớp phủ */
  #drawer-panel,
  #drawer-backdrop {
    transition:
      transform 0.4s cubic-bezier(0.32, 0.72, 0, 1),
      opacity 0.4s cubic-bezier(0.32, 0.72, 0, 1);
  }
  /* Loại bỏ viền xanh khi chạm trên mobile */
  * {
    -webkit-tap-highlight-color: transparent;
  }
</style>
