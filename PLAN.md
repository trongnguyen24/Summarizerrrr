# Kế hoạch triển khai tính năng "Save to Archive" (Tổng quát hóa)

## Mục tiêu

Thêm chức năng lưu tóm tắt trang web vào IndexedDB và hiển thị chúng trong trang Archive, với nội dung tóm tắt được định dạng Markdown. Đảm bảo `title` và `url` của trang được lưu chính xác tại thời điểm tóm tắt được tạo, và tính năng này có thể áp dụng cho tất cả các loại tóm tắt (web, YouTube, Course, Selected Text).

## Các tệp liên quan

- `src/lib/indexedDBService.js`: Dịch vụ tương tác với IndexedDB để thêm và lấy tóm tắt.
- `src/components/displays/*.svelte`: Các component hiển thị tóm tắt khác nhau, nơi nút "Save to Archive" sẽ được thêm chức năng.
- `src/entrypoints/archive/App.svelte`: Trang Archive, nơi các tóm tắt đã lưu sẽ được hiển thị.
- `src/stores/summaryStore.svelte.js`: Store toàn cục quản lý trạng thái tóm tắt, nơi `title` và `url` của trang sẽ được lưu trữ, và hàm lưu tóm tắt chung sẽ được định nghĩa.
- `src/services/chromeService.js`: Dịch vụ cung cấp hàm `getActiveTabInfo()` để lấy URL và tiêu đề của tab hiện tại (được sử dụng trong `summaryStore`).

## Kế hoạch chi tiết

### 1. Chỉnh sửa `src/stores/summaryStore.svelte.js`

**Mục đích:** Thêm hàm chung để lưu bất kỳ loại tóm tắt nào vào IndexedDB, sử dụng `pageTitle` và `pageUrl` đã được lưu trữ.

1.  **Thêm trạng thái `pageTitle` và `pageUrl` vào `summaryState`:**

    ```javascript
    export const summaryState = $state({
      summary: '',
      chapterSummary: '',
      courseSummary: '',
      courseConcepts: '',
      isLoading: false,
      isChapterLoading: false,
      isCourseSummaryLoading: false,
      isCourseConceptsLoading: false,
      error: '',
      chapterError: '',
      courseSummaryError: '',
      courseConceptsError: '',
      isYouTubeVideoActive: false,
      isCourseVideoActive: false,
      currentContentSource: '',
      selectedTextSummary: '',
      isSelectedTextLoading: false,
      selectedTextError: '',
      lastSummaryTypeDisplayed: null,
      activeYouTubeTab: 'videoSummary',
      activeCourseTab: 'courseSummary',
      pageTitle: '', // THÊM DÒNG NÀY
      pageUrl: '', // THÊM DÒNG NÀY
    })
    ```

2.  **Cập nhật hàm `fetchAndSummarize` để lưu `pageTitle` và `pageUrl`:**
    Trong hàm `fetchAndSummarize`, sau khi gọi `getActiveTabInfo()` và kiểm tra `tabInfo`, gán `tabInfo.title` và `tabInfo.url` vào `summaryState.pageTitle` và `summaryState.pageUrl`.

    ```javascript
    export async function fetchAndSummarize() {
      // ... (code hiện có)

      const tabInfo = await getActiveTabInfo()
      if (!tabInfo || !tabInfo.url) {
        throw new Error(
          'Could not get current tab information or URL. Please try switching to a different tab and back, or ing the extension. if this error persists, please clear your cookie.'
        )
      }

      // LƯU TIÊU ĐỀ VÀ URL VÀO STATE NGAY TẠI ĐÂY
      summaryState.pageTitle = tabInfo.title || 'Unknown Title'
      summaryState.pageUrl = tabInfo.url || 'Unknown URL'

      const YOUTUBE_MATCH_PATTERN = /youtube\.com\/watch/i
      const COURSE_MATCH_PATTERN =
        /udemy\.com\/course\/.*\/learn\/|coursera\.org\/learn\//i

      // ... (code còn lại)
    }
    ```

3.  **Cập nhật hàm `resetState` và `resetDisplayState`:**
    Đảm bảo `pageTitle` và `pageUrl` cũng được reset khi gọi các hàm này để tránh dữ liệu cũ.

    ```javascript
    export function resetState() {
      // ... (các dòng reset khác)
      summaryState.activeCourseTab = 'courseSummary'
      summaryState.pageTitle = ''
      summaryState.pageUrl = ''
    }

    export function resetDisplayState() {
      // ... (các dòng reset khác)
      summaryState.lastSummaryTypeDisplayed = null
      summaryState.activeYouTubeTab = 'videoSummary'
      summaryState.activeCourseTab = 'courseSummary'
      summaryState.pageTitle = ''
      summaryState.pageUrl = ''
    }
    ```

4.  **Thêm hàm `saveSummaryToArchive`:**
    Hàm này sẽ nhận vào nội dung tóm tắt (`summaryContent`) và một `summaryType` để phân biệt loại tóm tắt khi lưu.

    ```javascript
    // Đảm bảo import này có ở đầu file summaryStore.svelte.js
    import { addSummary } from '@/lib/indexedDBService'

    export async function saveSummaryToArchive(summaryContent, type) {
      if (!summaryContent || summaryContent.trim() === '') {
        console.warn(`Không có nội dung tóm tắt loại '${type}' để lưu.`)
        // TODO: Thêm thông báo cho người dùng (ví dụ: sử dụng CustomToast)
        return
      }

      try {
        const title = summaryState.pageTitle || 'Unknown Title'
        const url = summaryState.pageUrl || 'Unknown URL'

        const summaryToSave = {
          title: title,
          url: url,
          summary: summaryContent, // Nội dung markdown thô
          date: new Date().toISOString(),
          type: type, // Lưu loại tóm tắt để dễ quản lý sau này
        }

        await addSummary(summaryToSave)
        console.log(
          `Tóm tắt loại '${type}' đã được lưu vào Archive:`,
          summaryToSave
        )
        // TODO: Thêm thông báo thành công cho người dùng (ví dụ: CustomToast)
      } catch (error) {
        console.error(`Lỗi khi lưu tóm tắt loại '${type}' vào Archive:`, error)
        // TODO: Thêm thông báo lỗi cho người dùng (ví dụ: CustomToast)
      }
    }
    ```

### 2. Chỉnh sửa các display components (`src/components/displays/*.svelte`)

**Mục đích:** Thêm nút "Save to Archive" và gọi hàm `saveSummaryToArchive` từ `summaryStore` với nội dung và loại tóm tắt phù hợp.

**Các bước chung cho mỗi component:**

1.  **Import `summaryState` và `saveSummaryToArchive`:**
    Thêm vào phần `<script>` của mỗi component:
    ```javascript
    import {
      summaryState,
      saveSummaryToArchive,
    } from '@/stores/summaryStore.svelte'
    ```
2.  **Thêm nút "Save to Archive":**
    Thêm nút này vào phần HTML của component, thường là gần nơi hiển thị tóm tắt.
    ```html
    <button
      class="py-1 px-4 bg-blackwhite/5 hover:bg-blackwhite/10 rounded-md"
      onclick={() => saveSummaryToArchive(summaryContentVariable, 'summaryTypeString')}
    >
      Save to Archive
    </button>
    ```
    _Lưu ý:_
    - `summaryContentVariable` là biến `$props()` hoặc `$state()` chứa nội dung tóm tắt của riêng component đó (ví dụ: `summary`, `summaryState.chapterSummary`, v.v.).
    - `'summaryTypeString'` là một chuỗi mô tả loại tóm tắt (ví dụ: `'web'`, `'youtube'`, `'chapter'`, `'courseSummary'`, `'courseConcepts'`, `'selectedText'`).
    - Đảm bảo nút chỉ hiển thị khi có nội dung tóm tắt và/hoặc khi loại tóm tắt đó đang được hiển thị.

**Chi tiết cho từng component:**

- **`WebSummaryDisplay.svelte`:**

  - `summaryContentVariable`: `summary` (từ `$props()`)
  - `summaryTypeString`: `'web'`
  - Nút sẽ gọi: `onclick={() => saveSummaryToArchive(summary, 'web')}`.
  - Hiển thị khi `summary && !isLoading`.

- **`YouTubeSummaryDisplay.svelte`:**

  - `summaryContentVariable`: `summaryState.summary`
  - `summaryTypeString`: `'youtube'`
  - Nút sẽ gọi: `onclick={() => saveSummaryToArchive(summaryState.summary, 'youtube')}`.
  - Hiển thị khi `summaryState.summary && summaryState.lastSummaryTypeDisplayed === 'youtube'`.

- **`YouTubeChapterSummary.svelte`:**

  - `summaryContentVariable`: `summaryState.chapterSummary`
  - `summaryTypeString`: `'chapter'`
  - Nút sẽ gọi: `onclick={() => saveSummaryToArchive(summaryState.chapterSummary, 'chapter')}`.
  - Hiển thị khi `summaryState.chapterSummary && summaryState.lastSummaryTypeDisplayed === 'youtube' && summaryState.activeYouTubeTab === 'chapterSummary'`.

- **`CourseSummaryDisplay.svelte`:**

  - `summaryContentVariable`: `summaryState.courseSummary`
  - `summaryTypeString`: `'courseSummary'`
  - Nút sẽ gọi: `onclick={() => saveSummaryToArchive(summaryState.courseSummary, 'courseSummary')}`.
  - Hiển thị khi `summaryState.courseSummary && summaryState.lastSummaryTypeDisplayed === 'course'` (hoặc `summaryState.activeCourseTab === 'courseSummary'`).

- **`CourseConceptsDisplay.svelte`:**

  - `summaryContentVariable`: `summaryState.courseConcepts`
  - `summaryTypeString`: `'courseConcepts'`
  - Nút sẽ gọi: `onclick={() => saveSummaryToArchive(summaryState.courseConcepts, 'courseConcepts')}`.
  - Hiển thị khi `summaryState.courseConcepts && summaryState.lastSummaryTypeDisplayed === 'course'` (hoặc `summaryState.activeCourseTab === 'courseConcepts'`).

- **`SelectedTextSummaryDisplay.svelte`:**

  - `summaryContentVariable`: `summaryState.selectedTextSummary`
  - `summaryTypeString`: `'selectedText'`
  - Nút sẽ gọi: `onclick={() => saveSummaryToArchive(summaryState.selectedTextSummary, 'selectedText')}`.
  - Hiển thị khi `summaryState.selectedTextSummary && summaryState.lastSummaryTypeDisplayed === 'selectedText'`.

- **`CourseVideoSummary.svelte` và `YouTubeVideoSummary.svelte`:**
  - Các component này có vẻ là wrapper hoặc điều khiển hiển thị các loại tóm tắt khác nhau. Tôi sẽ không thêm nút "Save to Archive" trực tiếp vào các component này mà sẽ tập trung vào các component con hiển thị nội dung tóm tắt thực tế (như đã liệt kê ở trên).

### 3. Chỉnh sửa `src/entrypoints/archive/App.svelte`

**Mục đích:** Đảm bảo nội dung tóm tắt được lưu dưới dạng Markdown được hiển thị đúng cách trong trang Archive và các khối mã được highlight.

1.  **Thêm Imports:**
    Thêm các dòng import sau vào phần `<script>`:

    ```javascript
    import { marked } from 'marked'
    import hljs from 'highlight.js'
    ```

2.  **Cập nhật hiển thị tóm tắt:**
    Thay đổi cách hiển thị `selectedSummary.summary` để nó được phân tích cú pháp từ Markdown sang HTML bằng `marked.parse()`.

    ```html
    <div class="py-12" id="summary">
      {@html selectedSummary.summary ? marked.parse(selectedSummary.summary) :
      ''}
    </div>
    ```

3.  **Thêm `$effect` để highlight code:**
    Thêm một `$effect` hook để chạy sau khi `selectedSummary` được cập nhật và nội dung HTML đã được render. Hook này sẽ tìm tất cả các khối `<code>` bên trong `pre` và áp dụng highlight cú pháp bằng `highlight.js`.
    ```javascript
    $effect(() => {
      if (selectedSummary) {
        // Đảm bảo DOM đã được cập nhật trước khi làm nổi bật
        document.querySelectorAll('#summary pre code').forEach((block) => {
          hljs.highlightElement(block)
        })
      }
    })
    ```
    (Lưu ý: `$effect` này có thể được thêm vào `$effect` hiện có hoặc tạo một cái mới, tùy thuộc vào cấu trúc code hiện tại để đảm bảo nó chạy đúng thời điểm.)

## Các bước tiếp theo

Sau khi bạn xem xét kế hoạch tổng quát hóa này và đồng ý, vui lòng "toggle to Act mode" để tôi có thể bắt đầu thực hiện các thay đổi.
